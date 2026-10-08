# Nebula REST API guidelines

This document is the rulebook for the resource-oriented API served under
`/api/v2`. Every resource in `rest/` follows it. When something here turns
out to be wrong, change this document first, then the code.

Status: **draft**. Items marked _open_ are not decided yet.


## 1. Two APIs, one server

Nebula has two APIs that coexist permanently:

| | RPC API | REST API |
|---|---|---|
| URL | `/api/{name}` | `/api/v2/{resource}...` |
| Source | `backend/api/` | `backend/rest/` |
| Shape | one class per endpoint (`APIRequest`), mostly `POST` | FastAPI `APIRouter` per resource |
| Purpose | highly optimized, feature-specific endpoints (browse, order, schedule, rundown...) | generic CRUD for integrations and frontend pages |
| Plugins | yes (`plugins["api"]`) | no |

Rules:

- RPC URLs never change. An RPC endpoint can be **deprecated** once a REST
  equivalent exists and the frontend and Firefly have moved to it (see §11),
  but it is not renamed or moved.
- The REST API does not reimplement optimized RPC endpoints for their own
  sake. `/api/browse`, `/api/order`, `/api/scheduler`, `/api/rundown` stay
  as they are until a REST replacement is proven at least as fast on a real
  database.
- `v2` is a version of the REST API's contract. A breaking change to
  resource shapes means `/api/v3`, not editing `v2` in place.


## 2. Code layout and where logic lives

```
backend/
  api/                     # RPC endpoints (unchanged)
  rest/
    README.md              # this document
    users/
      __init__.py          # combines the sub-routers, exports `router`
      models.py            # request/response models for this resource
      listing.py           # each handler module has its own `router`
      detail.py
      avatar.py
  server/
    query/                 # filter language, sorting, cursors (shared by all list endpoints)
    errors.py              # problem+json model and exception handlers
  nebula/
    objects/               # domain objects and their behaviour
    helpers/               # domain logic spanning several objects
```

- Every package in `rest/` that exports `router` is discovered at startup and
  mounted under `/api/v2`. Discovery stops at the package level. Inside a
  package, each module defines its own `APIRouter(prefix=...)` and
  `__init__.py` combines them explicitly, so route order is visible in one
  place and no module is imported only for its side effects. The prefix
  goes on each module's router because FastAPI doesn't allow an empty
  path (`""`, the collection itself) in a router included without one:

  ```python
  # rest/users/listing.py
  router = APIRouter(prefix="/users")

  @router.get("")
  async def list_users(...): ...

  # rest/users/__init__.py
  router = APIRouter(tags=["Users"], dependencies=[Depends(current_user)])
  router.include_router(listing.router)  # /query must come before /{user_id}
  router.include_router(detail.router)
  router.include_router(avatar.router)
  ```

- Avoid `rest/<name>/__init__.py` doing more than combining routers.
  Shared helpers of a resource go to `common.py`, models to `models.py`.

- **Handlers are thin.** A handler parses input, calls domain code and
  shapes the response. No business logic and no permission checks (see
  §2.1).
- Domain logic that concerns one object goes on the object
  (`nebula.User.apply_patch(...)`). Logic spanning several objects goes to
  `nebula/helpers`.
- Anything that needs the server (sessions, websocket messaging, request
  context) goes to `server/`. `nebula/` never imports `server/`.
- RPC endpoints and REST handlers that do the same thing call the same
  domain code. Neither calls the other.

### 2.1 Access control

Permission checks live in domain code (objects and helpers), not in
handlers. They read the acting user from `nebula.context`, so RPC endpoints,
REST handlers and plugins all get the same checks without repeating them.

`RequestContext` has a `system` flag:

- **Outside the server** (CLI tools, worker services) the process default
  is `system=True`, and ACL checks are skipped. These callers are trusted
  and need no changes.
- **The server process** sets the default to `system=False` once at
  startup. Every way into the server (HTTP, websocket, plugin hooks) is
  then denied unless a user is in context. The `RequestContextMiddleware`
  only sets the user for each request. It doesn't control `system`, and
  websocket traffic never passes through it anyway.
- In-server jobs that really are system tasks (storage monitor, background
  tasks) opt in explicitly with `with system_context():`.
- Background tasks spawned from a request inherit the request's context
  (contextvars), so they act on behalf of that user.

```python
def check_access(...) -> None:
    ctx = get_request_context()
    if ctx.system:
        return                                  # trusted caller
    if ctx.user is None:
        raise nebula.UnauthorizedException()
    ...                                         # actual permission check
```

Whether an endpoint allows anonymous access at all is decided by using the
`CurrentUser` dependency (or not). The domain check is still what actually
grants or denies access.


## 3. URLs and methods

```
GET     /api/v2/users                  list (simple filters in query string)
QUERY   /api/v2/users                  query (full query model in body)
POST    /api/v2/users/query            same as QUERY, for clients that can't send it
POST    /api/v2/users                  create
GET     /api/v2/users/{id}             read one
PATCH   /api/v2/users/{id}             partial update
DELETE  /api/v2/users/{id}             delete
GET     /api/v2/users/{id}/avatar      binary sub-resource
POST    /api/v2/users/{id}/avatar      upload binary sub-resource
```

- Path segments are `kebab-case`. Resource names are plural nouns:
  `/assets`, `/scheduling-templates`. The package in `rest/` keeps a
  Python name (`rest/scheduling_templates/`), and its router declares
  the kebab-case prefix.
- Path parameters are named `{<singular>_id}` (`{user_id}`), so handler
  arguments don't shadow `id`. Examples here write `{id}` for short. Nested resources
  are allowed one level deep (`/users/{id}/avatar`). Deeper relations
  are expressed with filters (`QUERY /items` with `id_bin`), not URLs.
- Actions that aren't CRUD use a verb sub-path with `POST`:
  `POST /api/v2/users/{id}/send-invitation`. Use these sparingly. If
  something is really a state change, prefer `PATCH`.
- `PUT` is not used. Full replacement of a Nebula object is never what
  the client actually wants.


## 4. Naming and payloads

- All JSON field names and query parameters are `snake_case`. No alias
  generators and no camelCase conversion in either direction. Paths are
  the only exception and use `kebab-case` (§3).
- Nebula metadata keys are used verbatim, including namespaced keys
  (`video/fps`, `qc/state`). They are the canonical identifiers, and the
  same strings are used in `fields`, `filter` and `sort`.
- Resources with a curated model may group namespaced keys into objects,
  e.g. users expose `can/*` as `permissions: {...}`. The storage format
  stays an internal detail. Document the grouping in the resource's
  `models.py`.
- Timestamps are Unix epoch seconds (float), matching existing metadata.
- Ids are integers. `id` is always present in responses.
- Responses for a single object are the object itself, without an envelope.

### 4.1 Partially typed models

Nebula objects are open-ended metadata, but every resource has fields it
can't work without. Models are therefore partially typed:

- **Core fields** are declared on the model. They're always present in
  responses and fully typed in OpenAPI.
- **Extra fields** are allowed (`extra="allow"`, so `additionalProperties`
  in OpenAPI) only when the key is a metatype in the resource's namespace
  (`ns`, e.g. `u` for users). Values go through `normalize_meta`. An
  unknown key is a 422, so typos never end up stored.
- Adding a metatype to the namespace makes the key readable and writable
  with no code change. Clients learn which keys exist from the metatypes
  in `init`.
- Read-only fields (`id`, `ctime`, `mtime`) and fields managed by actions
  are rejected in create/patch bodies with 422.
- Secrets are never plain fields. They're set through actions
  (`POST /users/{id}/password`, `POST /users/{id}/api-key`, which generates
  the key and returns it once), and read models expose only harmless
  derived values (`api_key_preview`, `has_password`).


## 5. Authentication and permissions

Authentication is shared with the RPC API and resolved by the middleware
(`server/middleware/context.py`). Handlers only ever see the `CurrentUser`
dependency. Credentials, in order of precedence:

1. `?token=<token>`
2. `Authorization: Bearer <token>`
3. `x-api-key` header or `?api_key=`
4. `nebula_token` cookie

If an explicit credential (1–3) is present, it decides the outcome. An
invalid explicit credential is a 401 even when a valid cookie is also sent,
so a broken integration never silently acts as the browser's logged-in user.
A malformed `Authorization` header (e.g. `Bearer null`) isn't a credential
and is ignored, as it always has been.

### Cookie

- Set by every endpoint that issues a session token (login, SSO, token
  exchange) and cleared by logout.
- Value is the session token, checked by `Session.check` like any other.
- `HttpOnly; SameSite=Lax; Path=/`, plus `Secure` when the request came
  over HTTPS.
- The name is `nebula_token`, kept separate from the `session` cookie
  used by `SessionMiddleware`.
- Browsers should prefer the cookie. `<img src>`, `<video src>` and download
  links then work without putting tokens in URLs.
- `?token=` stays for clients that can't use cookies (Firefly, shareable links).

### CSRF

The cookie is sent automatically, so on requests with unsafe methods
(`POST`, `PUT`, `PATCH`, `DELETE`) and `Sec-Fetch-Site: cross-site` the
cookie is ignored. The request is then anonymous: endpoints that require
a user return 401, and anonymous endpoints run as anonymous. Logout
rejects such requests without clearing anything. `SameSite=Lax` covers browsers that
don't send `Sec-Fetch-Site`. `QUERY` is safe: forms can't send it, and
cross-origin `fetch` with it requires a preflight.

There is deliberately no `Origin` vs `Host` comparison. The Vite dev proxy
(`changeOrigin: true`) would make every dev request fail it.

Requests authenticated by 1–3 aren't subject to this check. Browsers don't
attach those credentials automatically.

### WebSocket

The websocket keeps authenticating with the token in its first message.
Cookie authentication on the websocket would need an `Origin` check on the
upgrade request (cross-site websocket hijacking) and is out of scope for now.

### Permissions

See §2.1. Note that `APIRequest.scopes` / `scoped_endpoints` are unrelated
to permissions. They tell the frontend which plugin endpoints to offer in
context menus (e.g. the asset editor dropdown). REST routes don't use them.


## 6. Reading one object

```
GET /api/v2/assets/123?fields=id,title,duration,video/fps
```

- `fields` is a comma-separated list of keys to return. When omitted, the
  resource's default field set is returned. `id` is always included.
- Unknown fields are a validation error (422), not silently ignored.


## 7. Listing and querying

Every list endpoint accepts the same **query model**. With `fields`, a list
endpoint is a generic browse over any object type.

### 7.1 Query model

```json
{
  "fields": ["id", "title", "duration"],
  "filter": { ... },
  "q": "news 2026",
  "sort": ["-ctime", "title"],
  "limit": 100,
  "cursor": null
}
```

| Field | Default | Notes |
|---|---|---|
| `fields` | resource default | see §6 |
| `filter` | none | filter tree, §7.2 |
| `q` | none | fulltext search, §7.3 |
| `sort` | `["-id"]` | §7.4 |
| `limit` | 100 | max 1000 |
| `cursor` | none | from a previous response's `next_cursor` |

Transport:

- `QUERY /api/v2/{resource}` with the model as a JSON body is the canonical form.
- `POST /api/v2/{resource}/query` takes the same body and returns the same
  response. It is there for clients, proxies and tools that don't handle
  `QUERY`. Both routes use the same handler.
- `GET /api/v2/{resource}` covers simple cases:
  `?fields=id,title&sort=-ctime,title&limit=50&q=news&cursor=...`,
  plus equality filters as plain parameters (`?id_folder=1&status=1`).
  Repeating a parameter means `in` (`?id_folder=1&id_folder=2`).

### 7.2 Filter language

A filter is a tree of conditions and groups:

```json
{"and": [
  {"key": "id_folder", "op": "in", "value": [1, 2]},
  {"or": [
    {"key": "duration", "op": "gt", "value": 600},
    {"key": "title", "op": "ilike", "value": "%news%"}
  ]},
  {"not": {"key": "qc/state", "op": "eq", "value": 4}}
]}
```

Groups: `and` (list), `or` (list), `not` (single node). Nesting is
unlimited up to a depth of 8.

Operators:

| op | Meaning | Value |
|---|---|---|
| `eq`, `ne` | equal, not equal | scalar |
| `lt`, `lte`, `gt`, `gte` | comparison | number or string |
| `in`, `nin` | in list, not in list | list of scalars |
| `like`, `ilike` | SQL pattern, case-sensitive / insensitive | string |
| `exists` | key is set (`true`) or not set (`false`) | bool |
| `contains` | list/object metadata contains value (jsonb `@>`) | list or object |

Translation rules (implemented once in `server/query/`):

- Keys are validated against the metatypes in settings. An unknown key is
  a 422. Key names are never interpolated into SQL as raw strings.
- Values are always bound parameters.
- Casts follow the metatype. Numeric types compare numerically
  (`(meta->>'duration')::float`), integers use `= ANY($n::int[])` for
  `in`, strings compare as text. Comparing a numeric key with a string
  value is a 422.
- `ne` and `nin` do not match rows where the key is missing. Use
  `exists` explicitly when that matters.
- Columns that exist outside `meta` (`id`, `ctime`, `mtime`, `id_folder`,
  `status`...) translate to the column, so they use the column's index.

### 7.3 Fulltext

Each resource picks one search strategy:

- **Fulltext** (assets and other objects with fulltext metatypes): uses
  the existing `ft` token index, like browse. `q` is slugified into
  words of at least 3 characters, and every word must prefix-match. When
  `q` is set and `sort` is not, results are ordered by relevance (summed
  token weights). Relevance is also available as the sort key
  `_relevance`.
- **Substring** (resources with few rows, e.g. users): every
  whitespace-separated word must appear (ILIKE) in at least one of the
  resource's search keys. There's no relevance ordering.

### 7.4 Sorting

`sort` is a list of keys. A `-` prefix means descending. `id` is always
appended as the final tie-breaker, so the order is total and cursors are
stable. Sorting by a key that isn't a column needs an index to stay fast,
which is something to check before a resource advertises a sortable key.

### 7.5 Pagination

Keyset (cursor) pagination, following Google AIP-158 in spirit.

```json
{
  "items": [ ... ],
  "next_cursor": "eyJrIjpbMTcxMC4wLDEyM10sImgiOiI0ZjJhIn0",
  "has_more": true
}
```

- The cursor is opaque base64. Inside it holds the last row's sort-key
  values plus `id`, and a hash of `filter`, `q` and `sort`. A cursor used
  with a different query is a 400.
- To get the next page, repeat the same query with `cursor` set to `next_cursor`.
- `next_cursor` is `null` when there are no more results.
- No total count by default. `include_total: true` (or
  `?include_total=true`) adds `"total"`. It costs a separate count query.
- No offset pagination.


## 8. Writing

### Create

`POST /api/v2/{resource}` with the object's fields. Returns **201** with
the created object and a `Location` header.

### Partial update

`PATCH /api/v2/{resource}/{id}` with JSON Merge Patch semantics (RFC 7396):

- Keys that are present are set.
- `null` unsets the key (removes it from meta).
- Keys that are absent stay as they are.
- Nested objects (`permissions`) are merged the same way, recursively.

Returns **200** with the updated object (default field set).

Read-only fields (`id`, `ctime`, `mtime`...) in the body are a 422.

### Delete

`DELETE /api/v2/{resource}/{id}` returns **204** with no body.

### Bulk

Not in v2's first iteration. Bulk changes use the RPC API (`/api/set`)
until there's a concrete need.


## 9. Binary sub-resources

Avatars, and later thumbnails or attachments, follow the proxy pattern:

- Storage and path are configured in system settings. For avatars:
  `avatar_storage` (default 1) and `avatar_path`
  (default `.nx/avatars/{id}.webp`).
- `GET` streams the file with `ETag` and `Cache-Control: private, no-cache`
  (browsers keep it but revalidate), and honours `If-None-Match` (304).
- `POST` takes the raw file as the request body with a matching
  `Content-Type` (`image/png`, `image/jpeg`, `image/webp`), like `/upload`.
  No multipart. The server validates type and size, normalizes the image
  (avatars: cropped to 256×256 WebP) and returns **204**. Normalization uses ffmpeg,
  which is already in the server image, so there is no new Python dependency.
- `DELETE` removes the file and returns **204**.
- A missing file is a 404 (the frontend shows a placeholder).


## 10. Errors

REST errors use RFC 9457 problem details with
`Content-Type: application/problem+json`. The RPC API keeps its current
error body for now and moves to the same format later, once Firefly has
been checked against it.

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "Asset 123 not found",
  "instance": "/api/v2/assets/123"
}
```

- Clients rely on the HTTP status code and `detail`. `detail` is a
  human-readable message safe to show to the user.
- `status` repeats the HTTP status code so it shows up in logs and dumps
  of the body.
- There is no `code` field. The current RPC body has one, but no client reads it.
- `instance` is the request path.
- Validation errors (422) add `errors`:

  ```json
  "errors": [
    {"loc": ["body", "filter", "and", 0, "op"], "msg": "Unknown operator 'eqq'"}
  ]
  ```

- Handlers raise `nebula.*Exception` subclasses. They never build error
  responses by hand. Exception handlers live in `server/errors.py`.

Status codes:

| Status | When | Exception |
|---|---|---|
| 400 | malformed request that isn't a schema error (bad cursor) | `BadRequestException` |
| 401 | missing or invalid credentials | `UnauthorizedException` |
| 403 | authenticated but not allowed | `ForbiddenException` |
| 404 | resource doesn't exist | `NotFoundException` |
| 409 | conflict (duplicate login, stale state) | `ConflictException` |
| 422 | schema or semantic validation failed | `ValidationException` / pydantic |
| 500 | bug | anything else |


## 11. Deprecating RPC endpoints

1. The REST equivalent exists and is documented.
2. Set `deprecated = True` on the `APIRequest` class. It shows up as
   deprecated in OpenAPI, and the server adds a `Deprecation` response
   header (RFC 9745).
3. The frontend and Firefly move to the REST endpoint.
4. The RPC endpoint is removed in a later minor release, which is noted in
   the release notes.

Optimized endpoints listed in §1 are never deprecated by this process.


## 12. OpenAPI

- Every route has a summary, and models have field descriptions.
- `operation_id` is `{resource}_{action}` (`users_list`, `users_update`,
  `users_avatar_get`). It must be unique across both APIs.
- Tags are the resource name and are separate from RPC categories.
- QUERY routes appear as OpenAPI 3.2 `query` operations. The `POST .../query`
  twin is what older tooling sees.
