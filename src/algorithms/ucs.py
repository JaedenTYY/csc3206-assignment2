"""
src/algorithms/ucs.py
---------------------
Uniform Cost Search (UCS) for the House Visit Tour problem.

Expands the node with the lowest cumulative cost g(n). No heuristic.
Guaranteed optimal. Blind search — explores in all directions.
"""

import heapq
import itertools
from src.data.graph import MEMBERS, get_cost, get_neighbours, validate_metric


def ucs(metric: str = "distance", collect_trace: bool = False) -> dict:
    """
    Run Uniform Cost Search on the House Visit Tour problem.

    Returns a dict with:
        route          : list of node names in order
        total_cost     : float
        nodes_expanded : int
        path_costs     : list of (from, to, cost) tuples
    """
    validate_metric(metric)

    start_state = ("SU", frozenset())
    goal_visited = frozenset(MEMBERS)

    counter = itertools.count()

    # Priority queue: (g, sequence, state, path)
    frontier = [(0.0, next(counter), start_state, ["SU"])]
    heapq.heapify(frontier)

    explored = {}
    nodes_expanded = 0
    step = 0
    traces = []

    while frontier:
        frontier_size_before = len(frontier)
        g, _, state, path = heapq.heappop(frontier)
        location, visited = state

        if state in explored and explored[state] <= g:
            continue
        explored[state] = g
        nodes_expanded += 1
        step += 1
        
        current_trace = None
        if collect_trace:
            current_trace = {
                "step": step,
                "state": {"location": location, "visited": list(visited)},
                "g": g,
                "h": 0.0,
                "f": g,
                "priority": g,
                "frontierSizeBefore": frontier_size_before,
                "generatedSuccessors": 0,
                "routeSoFar": path
            }

        # Goal check
        if visited == goal_visited:
            path_costs = []
            for i in range(len(path) - 1):
                c = get_cost(path[i], path[i + 1], metric)
                path_costs.append((path[i], path[i + 1], c))
            res = {
                "algorithm": "Uniform Cost Search",
                "metric": metric,
                "route": path,
                "total_cost": g,
                "nodes_expanded": nodes_expanded,
                "path_costs": path_costs,
            }
            if collect_trace:
                current_trace["frontierSizeAfter"] = len(frontier)
                traces.append(current_trace)
                res["trace"] = traces
            return res

        generated_successors = 0
        for neighbour in get_neighbours(location):
            edge_cost = get_cost(location, neighbour, metric)
            new_g = g + edge_cost
            new_visited = visited | {neighbour} if neighbour in MEMBERS else visited
            new_state = (neighbour, new_visited)

            if new_state not in explored or explored[new_state] > new_g:
                heapq.heappush(frontier, (new_g, next(counter), new_state, path + [neighbour]))
                generated_successors += 1
                
        if collect_trace:
            current_trace["frontierSizeAfter"] = len(frontier)
            current_trace["generatedSuccessors"] = generated_successors
            traces.append(current_trace)

    return {"error": "No solution found"}
