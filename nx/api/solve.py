from nx import *

__all__ = ["api_solve"]


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
