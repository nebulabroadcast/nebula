class Probe(object):
    title = "Generic Probe"
    def __init__(self):
        pass

    def __repr__(self):
        return self.title

    def __call__(self, asset):
        return asset

    def accepts(self, asset):
        return False

