"""Users resource: /api/v2/users"""

from fastapi import APIRouter, Depends

from rest.users import avatar, detail, listing
from server.dependencies import current_user

# Every route needs a logged-in user. What they may do is checked by
# nebula.User (see rest/README.md §2.1).
# The /users prefix is on each module's router: FastAPI doesn't allow an
# empty path ("") in a router included without a prefix.
router = APIRouter(
    tags=["Users"],
    dependencies=[Depends(current_user)],
)
router.include_router(listing.router)
router.include_router(detail.router)
router.include_router(avatar.router)
