def get_solver(solver_name):
    if not get_plugin_path("solver"):
        return

    for f in [
        FileObject(get_plugin_path("solver"), solver_name + ".py"),
        FileObject(get_plugin_path("solver"), solver_name, solver_name + ".py"),
    ]:

        if f.exists:
            sys.path.insert(0, f.dir_name)
            try:
                py_mod = imp.load_source(solver_name, f.path)
                break
            except Exception:
                log_traceback("Unable to load plugin {}".format(solver_name))
                return
    else:
        logging.error("{} does not exist".format(f))
        return

    if "Plugin" not in dir(py_mod):
        logging.error("No plugin class found in {}".format(f))
        return
    return py_mod.Plugin
