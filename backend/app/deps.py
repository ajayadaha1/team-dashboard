from fastapi import Header, HTTPException, Request, status


def current_user(
    request: Request,
    x_user_name: str | None = Header(default=None),
) -> str:
    """Light identity: trust the X-User-Name header set by the frontend.

    For non-GET requests, the header MUST be present and non-empty so that the
    audit log captures who made the change.
    """
    name = (x_user_name or "").strip()
    if request.method != "GET" and not name:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Pick your name in the top-right before making changes.",
        )
    return name or "anonymous"
