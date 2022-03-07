__all__ = ["modules"]

import cli.run as run
import cli.adduser as adduser
import cli.passwd as passwd
import cli.a as a
import cli.s as s
import cli.j as j
import cli.t as t
import cli.l as l


modules = {
    "run": run.run,
    "adduser": adduser.adduser,
    "passwd": passwd.passwd,
    "a": a.a,
    "s": s.s,
    "j": j.j,
    "t": t.t,
    "l": l.l,
}
