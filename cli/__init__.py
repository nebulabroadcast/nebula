import cli.run
import cli.adduser
import cli.passwd
import cli.a
import cli.s
import cli.j
import cli.t
import cli.l

__all__ = ["modules"]

modules = {
        "run" : run.run,
        "adduser" :  adduser.adduser,
        "passwd" :  passwd.passwd,
        "a" : a.a,
        "s" : s.s,
        "j" : j.j,
        "t" : t.t,
        "l" : l.l
    }
