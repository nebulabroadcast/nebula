from nx import *

__all__ = ["api_get", "get_objects"]

def get_objects(ObjectType, **kwargs):
    """objects lookup function. To be used inside services"""

    db          = kwargs.get("db", DB())
    raw_conds   = kwargs.get("conds", [])
    fulltext    = kwargs.get("fulltext", False)
    result_type = kwargs.get("result", False)
    limit       = kwargs.get("limit", False)
    offset      = kwargs.get("offset", False)
    order       = kwargs.get("order", False)
    id_view     = kwargs.get("id_view", False)
    objects     = kwargs.get("objects", [])
    id          = kwargs.get("id")

    if not objects:
        if id:
            try:
                objects = [int(id)]
            except ValueError:
                return NebulaResponse(400, "id must be integer")

    if order:
        try:
            order_key, order_trend = order.split(" ")
        except Exception:
            order_key = order
            order_trend = "ASC"

        if not order_trend.lower() in ["asc", "desc"]:
            order_trend = "ASC"


        if order_key in ObjectType.db_cols + ["id"]:
            order = "{} {}".format(order_key, order_trend)
        else:
            cast = None
            if order_key in meta_types:
                cls = meta_types[order_key]["class"]
                if cls in [NUMERIC, DATETIME, TIMECODE]:
                    cast = "FLOAT"
                elif cls in [INTEGER, COLOR]:
                    cast = "INTEGER"

            if cast:
                order = "CAST(meta->>'{}' AS {}) {}".format(order_key, cast, order_trend)
            else:
                order = "meta->>'{}' {}".format(order_key, order_trend)



    if objects:
        l = {"count": len(objects)}
        # We do not do database lookup. Just returning objects by their ids
        for id_object in objects:
            yield l, ObjectType(id_object, db=db)
        return


    if id_view and id_view in config["views"] and ObjectType.object_type_id == ASSET:
        view_config = config["views"][id_view]
        for key, col in [
                    ["folders", "id_folder"],
                    ["media_types", "media_type"],
                    ["content_types", "content_type"],
                    ["states", "status"],
                ]:
            if key in view_config and view_config[key]:
                if len(view_config[key]) == 1:
                    raw_conds.append("{}={}".format(col, view_config[key][0]))
                else:
                    raw_conds.append("{} IN ({})".format(col, ",".join([str(v) for v in view_config[key]])))
        for cond in view_config.get("conds", []):
            raw_conds.append(cond)

    conds = []
    for cond in raw_conds:
        for col in ObjectType.db_cols:
            if cond.startswith(col):
                conds.append(cond)
                break
        else:
            conds.append("meta->>"+cond)


    view_count = 0
    if fulltext:
        do_count = True
        if ":" in fulltext:
            key, value = fulltext.split(":")
            key = key.strip()
            value = value.strip().lower()
            conds.append("meta->>'{}' ILIKE '{}'".format(key, value))
        else:
            ft = slugify(fulltext, make_set=True)
            for word in ft:
                conds.append("id IN (SELECT id FROM ft WHERE object_type={} AND value LIKE '{}%')".format(ObjectType.object_type_id, word))
    else:
        try:
            view_count = int(cache.load("view-count-{}".format(id_view)))
        except:
            cache.delete("view-count-{}".format(id_view))
            view_count = False
        if view_count:
            do_count = False
        else:
            do_count = True

    conds = " WHERE " + " AND ".join(conds) if conds else ""
    counter = ", count(id) OVER() AS full_count" if do_count else ", 0"

    q = "SELECT id, meta{} FROM {}{}".format(counter, ObjectType.table_name, conds)
    q += " ORDER BY {}".format(order) if order else ""
    q += " LIMIT {}".format(limit) if limit else ""
    q += " OFFSET {}".format(offset) if offset else ""

    logging.debug("Executing get query:", q)
    db.query(q)

    count = 0
    for id, meta, count in db.fetchall():
        yield {"count": count or view_count}, ObjectType(meta=meta, db=db)

    if count:
        cache.save("view-count-{}".format(id_view), count)




def api_get(**kwargs):
    db            = kwargs.get("db", DB())
    user          = kwargs.get("user", anonymous)

    object_type   = kwargs.get("object_type", "asset")
    result_type   = kwargs.get("result", False)
    result_format = kwargs.get("result_format", False)
    result_lang   = kwargs.get("language", config.get("language", "en"))

    if not user:
        return NebulaResponse(ERROR_UNAUTHORISED)

    start_time = time.time()

    ObjectType = {
                "asset" : Asset,
                "item"  : Item,
                "bin"   : Bin,
                "event" : Event,
                "user"  : User
            }[object_type]

    result = {
            "message" : "Incomplete query",
            "response" : 500,
            "data" : [],
            "count" : 0
        }

    rformat = None
    if result_format:
        rformat = {
                "result" : result_format,
                "language" : result_lang
            }

    if type(result_type) == list:
        result_format = []
        for i, key in enumerate(result_type):
            form = key.split("@")
            if len(form) == 2:
                rf = json.loads(form[1] or "{}")
                if rformat:
                    rformat.update(rf)
                    result_format.append(rformat)
                else:
                    result_format.append(rf)
            else:
                if rformat:
                    result_format.append(rformat)
                else:
                    result_format.append(None)
            result_type[i] = form[0]

        for response, obj in get_objects(ObjectType, **kwargs):
            result["count"] |= response["count"]
            row = []
            for key, form in zip(result_type, result_format):
                if form is None:
                    row.append(obj[key])
                else:
                    form = form or {}
                    row.append(obj.show(key, **form))
            result["data"].append(row)


    elif result_type == "ids":
        # Result is an array of matching object IDs
        for response, obj in get_objects(ObjectType, **kwargs):
            result["count"] |= response["count"]
            result["data"].append(obj.id)

    else:
        # Result is an array of asset metadata sets
        for response, obj in get_objects(ObjectType, **kwargs):
            result["count"] |= response["count"]
            result["data"].append(obj.meta)

    result["count"] = min(result["count"], 10000)
    #
    # response
    #

    result["response"] = 200
    result["message"] = "{} {}s returned in {:.02}s".format(
            len(result["data"]),
            object_type,
            time.time() - start_time
        )
    return result
