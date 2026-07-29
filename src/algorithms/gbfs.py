"""
src/algorithms/gbfs.py
----------------------
Greedy Best-First Search (GBFS) for the House Visit Tour problem.

f(n) = h(n) only — ignores accumulated cost g(n).
Fast but NOT guaranteed optimal. Included for comparison.

Heuristic: MST of remaining unvisited nodes (same as A*, but g(n) is ignored).
"""

import heapq
import itertools
from src.data.graph import MEMBERS, get_cost, get_neighbours, validate_metric
from src.algorithms.astar import heuristic  # Reuse MST heuristic


def gbfs(metric: str = "distance", collect_trace: bool = False) -> dict:
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

    counter = itertools.count()

    # Priority queue: (h, sequence, state, g_actual, path)
    start_h = heuristic(start_state, metric)
    frontier = [(start_h, next(counter), start_state, 0.0, ["SU"])]
    heapq.heapify(frontier)

    visited_states = set()
    nodes_expanded = 0
    step = 0
    traces = []

    while frontier:
        frontier_size_before = len(frontier)
        h, _, state, g, path = heapq.heappop(frontier)
        location, visited = state

        if state in visited_states:
            continue
        visited_states.add(state)
        nodes_expanded += 1
        step += 1
        
        current_trace = None
        if collect_trace:
            current_trace = {
                "step": step,
                "state": {"location": location, "visited": list(visited)},
                "g": g,
                "h": h,
                "f": h,
                "priority": h,
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
                "algorithm": "Greedy Best-First Search",
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

            if new_state not in visited_states:
                new_h = heuristic(new_state, metric)
                heapq.heappush(frontier, (new_h, next(counter), new_state, new_g, path + [neighbour]))
                generated_successors += 1

        if collect_trace:
            current_trace["frontierSizeAfter"] = len(frontier)
            current_trace["generatedSuccessors"] = generated_successors
            traces.append(current_trace)
            
    return {"error": "No solution found"}
