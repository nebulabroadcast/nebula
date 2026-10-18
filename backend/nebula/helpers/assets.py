"""Asset operations shared by the RPC and REST APIs.

They live in nebula.objects.asset now (access.py, changes.py); this module
re-exports them, so existing imports keep working.
"""

__all__ = ["asset_acl", "ensure_can_save", "save_asset_changes"]

from nebula.objects.asset.access import asset_acl
from nebula.objects.asset.changes import ensure_can_save, save_asset_changes
