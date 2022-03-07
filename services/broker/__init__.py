from nxtools import xml, logging

from nx.db import DB
from nx.objects import Asset
from nx.base_service import BaseService
from nx.jobs import send_to, Action
from nx.core.enum import ObjectStatus


class Service(BaseService):
    def on_init(self):
        self.actions = []
        db = DB()
        db.query("SELECT id, title, settings FROM actions")
        for id, title, settings in db.fetchall():
            settings = xml(settings)
            self.actions.append(Action(id, title, settings))

    def on_main(self):
        db = DB()
        db.query("SELECT id, meta FROM assets WHERE status=%s", [ObjectStatus.ONLINE])
        for _, meta in db.fetchall():
            asset = Asset(meta=meta, db=db)
            self.proc(asset)

    def proc(self, asset):
        for action in self.actions:
            if action.created_key in asset.meta:
                continue

            if action.should_create(asset):
                logging.info(f"{asset} matches action condition {action.title}")
                result = send_to(
                    asset.id,
                    action.id,
                    restart_existing=False,
                    restart_running=False,
                    db=asset.db,
                )

                if result:
                    logging.info(result.message)
                else:
                    logging.error(result.message)

                asset[action.created_key] = 1
                asset.save(set_mtime=False)
