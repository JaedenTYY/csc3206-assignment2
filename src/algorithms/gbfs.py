"""
src/algorithms/gbfs.py
----------------------
Greedy Best-First Search (GBFS) for the House Visit Tour problem.

f(n) = h(n) only — ignores accumulated cost g(n).
Fast but NOT guaranteed optimal. Included for comparison.

Heuristic: MST of remaining unvisited nodes (same as A*, but g(n) is ignored).
"""

import heapq
from src.data.graph import MEMBERS, get_cost, get_neighbours, validate_metric
from src.algorithms.astar import heuristic  # Reuse MST heuristic


def gbfs(metric: str = "distance") -> dict:
    """
    Run Greedy Best-First Search on the House Visit Tour problem.

    Returns a dict with:
        route          : list of node names in order
        total_cost     : float (actual cost, even though not optimized for)
        nodes_expanded : int
        path_costs     : list of (from, to, cost) tuples
    """
    validate_metric(metric)

    start_state = ("SU", frozenset())
    goal_visited = frozenset(MEMBERS)

    # Priority queue: (h, state, g_actual, path)
    start_h = heuristic(start_state, metric)
    frontier = [(start_h, start_state, 0.0, ["SU"])]
    heapq.heapify(frontier)

    visited_states = set()
    nodes_expanded = 0

    while frontier:
        h, state, g, path = heapq.heappop(frontier)
        location, visited = state

        if state in visited_states:
            continue
        visited_states.add(state)
        nodes_expanded += 1

        # Goal check
        if visited == goal_visited:
            path_costs = []
            for i in range(len(path) - 1):
                c = get_cost(path[i], path[i + 1], metric)
                path_costs.append((path[i], path[i + 1], c))
            return {
                "algorithm": "Greedy Best-First Search",
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

            if new_state not in visited_states:
                new_h = heuristic(new_state, metric)
                heapq.heappush(frontier, (new_h, new_state, new_g, path + [neighbour]))

    return {"error": "No solution found"}
