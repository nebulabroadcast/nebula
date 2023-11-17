def parse_access_token(authorization: str) -> str | None:
    """Parse an authorization header value.

    Get a TOKEN from "Bearer TOKEN" and return a token
    string or None if the input value does not match
    the expected format (64 bytes string)
    """
    if (not authorization) or not isinstance(authorization, str):
        return None
    try:
        ttype, token = authorization.split()
    except ValueError:
        return None
    if ttype.lower() != "bearer":
        return None
    if len(token) != 64:
        return None
    return token
