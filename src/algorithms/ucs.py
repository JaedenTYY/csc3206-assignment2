"""
src/algorithms/ucs.py
---------------------
Uniform Cost Search (UCS) for the House Visit Tour problem.

Expands the node with the lowest cumulative cost g(n). No heuristic.
Guaranteed optimal. Blind search — explores in all directions.
"""

import heapq
from src.data.graph import MEMBERS, get_cost, get_neighbours, validate_metric


def ucs(metric: str = "distance") -> dict:
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

    # Priority queue: (g, state, path)
    frontier = [(0.0, start_state, ["SU"])]
    heapq.heapify(frontier)

    explored = {}
    nodes_expanded = 0

    while frontier:
        g, state, path = heapq.heappop(frontier)
        location, visited = state

        if state in explored and explored[state] <= g:
            continue
        explored[state] = g
        nodes_expanded += 1

        # Goal check
        if visited == goal_visited:
            path_costs = []
            for i in range(len(path) - 1):
                c = get_cost(path[i], path[i + 1], metric)
                path_costs.append((path[i], path[i + 1], c))
            return {
                "algorithm": "Uniform Cost Search",
                "metric": metric,
                "route": path,
                "total_cost": g,
                "nodes_expanded": nodes_expanded,
                "path_costs": path_costs,
            }

        for neighbour in get_neighbours(location):
            edge_cost = get_cost(location, neighbour, metric)
            new_g = g + edge_cost
            new_visited = visited | {neighbour} if neighbour in MEMBERS else visited
            new_state = (neighbour, new_visited)

            if new_state not in explored or explored[new_state] > new_g:
                heapq.heappush(frontier, (new_g, new_state, path + [neighbour]))

    return {"error": "No solution found"}
