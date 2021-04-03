
class BaseController():
    def __init__(self, parent):
        self.props = {
            }
        self.state = {
                "position" : 0,
                "duration" : 0,
                "paused" : False,
                "loop" : False
            }

