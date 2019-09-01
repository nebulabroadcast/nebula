class APIPlugin(object):
    def __init__(self):
        self.mime = "application/json"
        self.headers = {
                "Connection" : "keep-alive",
                "Cache-Control" :  "no-cache"
            }

    def __call__(self, **kwargs):
        self.payload = self.main(**kwargs)
        return self

    def auth(self, user, **kwargs):
        return bool(user.id)

    def main(self, **kwargs):
        pass

