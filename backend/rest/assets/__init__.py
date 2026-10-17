"""Assets resource: /api/v2/assets"""

from fastapi import APIRouter, Depends

from rest.assets import aux, detail, listing
from server.dependencies import current_user

# Every route needs a logged-in user. What they may do is checked by
# nebula.Asset (see rest/README.md §2.1).
router = APIRouter(
    tags=["Assets"],
    dependencies=[Depends(current_user)],
)
router.include_router(listing.router)  # /query must come before /{asset_id}
router.include_router(detail.router)
router.include_router(aux.router)
