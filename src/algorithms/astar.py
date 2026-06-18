"""
src/algorithms/astar.py
-----------------------
A* Search with MST (Prim's) heuristic for the House Visit Tour problem.

State: (location: str, visited: frozenset)
f(n) = g(n) + h(n)
  g(n) = cumulative cost from start to n
  h(n) = MST cost over remaining unvisited member nodes (admissible lower bound)
"""

import heapq
from src.data.graph import NODES, MEMBERS, get_cost, get_neighbours


# ── Heuristic: Minimum Spanning Tree (Prim's) ─────────────────────────────────

def _prim_mst_cost(nodes: list[str], metric: str) -> float:
    """
    Compute the MST cost over a set of nodes using Prim's algorithm.
    Returns 0 if fewer than 2 nodes are provided.
    """
    if len(nodes) < 2:
        return 0.0

    in_mst = {nodes[0]}
    total_cost = 0.0

    while len(in_mst) < len(nodes):
        min_edge = float("inf")
        for u in in_mst:
            for v in nodes:
                if v not in in_mst:
                    c = get_cost(u, v, metric)
                    if c < min_edge:
                        min_edge = c
        total_cost += min_edge
        # Add the closest node to MST
        for u in in_mst:
            for v in nodes:
                if v not in in_mst and get_cost(u, v, metric) == min_edge:
                    in_mst.add(v)
                    break
            else:
                continue
            break

    return total_cost


def heuristic(state: tuple, metric: str) -> float:
    """
    MST heuristic h(n): minimum cost to connect all remaining unvisited nodes.
    Includes current location in the MST nodes to estimate cost of leaving it.
    """
    location, visited = state
    remaining = [n for n in MEMBERS if n not in visited]
    if not remaining:
        return 0.0
    mst_nodes = [location] + remaining
    return _prim_mst_cost(mst_nodes, metric)


# ── A* Search ─────────────────────────────────────────────────────────────────

def astar(metric: str = "distance") -> dict:
    """
    Run A* Search on the House Visit Tour problem.

    Returns a dict with:
        route       : list of node names in order
        total_cost  : float
        nodes_expanded : int
        path_costs  : list of (from, to, cost) tuples
    """
    start_state = ("SU", frozenset())
    goal_visited = frozenset(MEMBERS)

    # Priority queue entries: (f, g, state, path)
    start_h = heuristic(start_state, metric)
    frontier = [(start_h, 0.0, start_state, ["SU"])]
    heapq.heapify(frontier)

    # explored: state → best g(n) seen
    explored = {}
    nodes_expanded = 0

    while frontier:
        f, g, state, path = heapq.heappop(frontier)

        location, visited = state

        # Skip if we've already found a cheaper path to this state
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
                "algorithm": "A* Search",
                "metric": metric,
                "route": path,
                "total_cost": g,
                "nodes_expanded": nodes_expanded,
                "path_costs": path_costs,
            }

        # Expand neighbours
        for neighbour in get_neighbours(location):
            edge_cost = get_cost(location, neighbour, metric)
            new_g = g + edge_cost
            new_visited = visited | {neighbour} if neighbour in MEMBERS else visited
            new_state = (neighbour, new_visited)

            if new_state not in explored or explored[new_state] > new_g:
                new_h = heuristic(new_state, metric)
                new_f = new_g + new_h
                heapq.heappush(frontier, (new_f, new_g, new_state, path + [neighbour]))

    return {"error": "No solution found"}
