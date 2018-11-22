import imp

from nx import *

__all__ = ["api_solve"]

def get_solver(solver_name):
    plugin_path = os.path.join(
            storages[int(config.get("plugin_storage", 1))].local_path,
            config.get("plugin_root", ".nx/scripts/v5")
        )
    if not os.path.exists(plugin_path):
        return

    f = FileObject(plugin_path, "solver", solver_name + ".py")
    if f.exists:
        try:
            py_mod = imp.load_source(solver_name, f.path)
        except:
            log_traceback("Unable to load plugin {}".format(solver_name))
            return
    else:
        logging.error("{} does not exist".format(f))
        return

    if not "Plugin" in dir(py_mod):
        logging.error("No plugin class found in {}".format(f))
        return
    return py_mod.Plugin




def api_solve(**kwargs):
    id_item = kwargs.get("id_item", False)
    solver_name = kwargs.get("solver", False)
    items = kwargs.get("items", [])
    user = kwargs.get("user", anonymous)

    #TODO: SMARTER ACL
    if not user.has_right("rundown_edit", anyval=True):
        return NebulaResponse(ERROR_ACCESS_DENIED)

    if id_item:
        items.append(id_item)

    if not (items and solver_name):
        return NebulaResponse(400, "You must specify placeholder item ID and a solver name")

    Solver = get_solver(solver_name)
    if Solver is None:
        return NebulaResponse(500, "Unable to load the solver. Check logs for details")

    db = DB()
    for id_item in items:
        solver = Solver(Item(id_item, db=db), db=db)
        response = solver.main()
        if response.is_error:
            return response

    return response
