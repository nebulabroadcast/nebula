from nebula import *

class BaseAnalyzer(object):
    condition = False
    proc_name = "base"
    version   = 1.0

    def __init__(self, asset):
        self.asset = asset
        self.result = {}
        self.status = self.proc()

    def update(self, key, value):
        self.result[key] = value

    def proc(self):
        pass


class Analyzer_AV(BaseAnalyzer):
    condition = "asset['content_type'] in [AUDIO, VIDEO]"
    proc_name = "av"
    version   = 1.2

    def proc(self):
        fname = self.asset.file_path
        res = ffanalyse(fname, video=False)
        for key in res:
            self.update(key, res[key])
        return True


class Analyzer_BPM(BaseAnalyzer):
    condition = "asset['id_folder'] == 5"
    proc_name = "bpm"
    version   = 1.0

    def proc(self):
        fname = self.asset.file_path
        s = Shell("ffmpeg -i \"{}\" -vn -ar 44100 -f f32le - 2> /dev/null | bpm".format(fname))
        try:
            bpm = float(s.stdout().read())
        except:
            log_traceback("Unable to read BPM")
            return False
        self.update("audio/bpm", bpm)
        return True


class Service(BaseService):
    def on_init(self):
      self.max_mtime = 0
      self.analyzers = [
              Analyzer_AV,
              Analyzer_BPM
          ]

    def on_main(self):
        db = DB()
        db.query("SELECT id_object, mtime FROM nx_assets WHERE status = '{}' and mtime > {} ORDER BY mtime DESC".format(ONLINE, self.max_mtime))
        res = db.fetchall()
        if res:
            logging.debug("Analysing {} assets".format(len(res)))
            for id_asset, mtime in res:
                self.max_mtime = max(self.max_mtime, mtime)
                self._proc(id_asset, db)

    def _proc(self, id_asset, db):
        asset = Asset(id_asset, db = db)
        for analyzer in self.analyzers:

            qinfo = asset["qc/analyses"] or {}
            if type(qinfo) in [str, unicode]:
                qinfo = json.loads(qinfo)

            if analyzer.proc_name in qinfo and (qinfo[analyzer.proc_name] == -1 or qinfo[analyzer.proc_name] >= analyzer.version):
                continue

            if eval(analyzer.condition):
                logging.info("Analyzing {} using '{}'".format(asset, analyzer.proc_name))
                a = analyzer(asset)

                #
                # Reload asset (it may be changed by someone during analysis
                #

                del(asset)
                asset = Asset(id_asset, db=db)
                result = -1 if not a.status else analyzer.version

                qinfo = asset["qc/analyses"] or {}
                if type(qinfo) in [str, unicode]:
                    qinfo = json.loads(qinfo)
                qinfo[analyzer.proc_name] = result
                asset["qc/analyses"] = qinfo

                #
                # Save result
                #

                for key in a.result:
                    value = a.result[key]
                    if value:
                        logging.debug("Set {} {} to {}".format(asset, key, value))
                        asset[key] = value
                asset.save()
                self.heartbeat()
