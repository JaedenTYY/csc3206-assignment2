"""
src/algorithms/astar.py
-----------------------
A* Search with an MST-based lower-bound heuristic for the House Visit Tour problem.

State: (location: str, visited: frozenset)
f(n) = g(n) + h(n)
  g(n) = cumulative cost from start to n
  h(n) = lower-bound connection cost over remaining unvisited member nodes
"""

import heapq
import itertools
from src.data.graph import MEMBERS, get_cost, get_neighbours, validate_metric


# ── Heuristic: Minimum Spanning Tree lower bound ──────────────────────────────

_SP_CACHE = {}

def get_shortest_path_cost(u: str, v: str, metric: str) -> float:
    if (u, v, metric) in _SP_CACHE:
        return _SP_CACHE[(u, v, metric)]
        
    from src.data.graph import NODES
    dist = {n: float("inf") for n in NODES}
    dist[u] = 0.0
    frontier = [(0.0, u)]
    
    while frontier:
        d, curr = heapq.heappop(frontier)
        if d > dist[curr]:
            continue
        for nxt in get_neighbours(curr):
            try:
                c = get_cost(curr, nxt, metric)
                if dist[curr] + c < dist[nxt]:
                    dist[nxt] = dist[curr] + c
                    heapq.heappush(frontier, (dist[nxt], nxt))
            except ValueError:
                pass
                
    for n in NODES:
        _SP_CACHE[(u, n, metric)] = dist[n]
        
    return dist[v]


def _undirected_edge_lower_bound(node_a: str, node_b: str, metric: str) -> float:
    """
    Return the cheapest available shortest-path between two nodes.

    Treating each directed shortest path as an undirected edge gives a lower bound 
    for any directed route that connects the same nodes.
    """
    candidates = []
    for frm, to in ((node_a, node_b), (node_b, node_a)):
        c = get_shortest_path_cost(frm, to, metric)
        if c != float("inf"):
            candidates.append(c)

    if not candidates:
        return float("inf")

    return min(candidates)


def _prim_mst_cost(nodes: list[str], metric: str) -> float:
    """
    Compute an undirected lower-bound MST cost over a set of nodes using Prim's algorithm.
    Returns 0 if fewer than 2 nodes are provided.
    """
    validate_metric(metric)

    if len(nodes) < 2:
        return 0.0

    in_mst = {nodes[0]}
    total_cost = 0.0

    while len(in_mst) < len(nodes):
        min_edge = float("inf")
        next_node = None
        for u in in_mst:
            for v in nodes:
                if v not in in_mst:
                    c = _undirected_edge_lower_bound(u, v, metric)
                    if c < min_edge:
                        min_edge = c
                        next_node = v

        if next_node is None:
            return float("inf")

        total_cost += min_edge
        in_mst.add(next_node)

    return total_cost


def heuristic(state: tuple, metric: str) -> float:
    """
    Admissible lower-bound heuristic h(n).

    For one remaining node, the exact outgoing cost is known. For larger sets,
    the heuristic uses the cheapest outgoing edge from the current location plus
    an undirected MST over the remaining residences.
    """
    validate_metric(metric)

    location, visited = state
    remaining = [n for n in MEMBERS if n not in visited]
    if not remaining:
        return 0.0
    if len(remaining) == 1:
        return get_shortest_path_cost(location, remaining[0], metric)

    min_outgoing = min(get_shortest_path_cost(location, node, metric) for node in remaining)
    return min_outgoing + _prim_mst_cost(remaining, metric)


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
    validate_metric(metric)

    start_state = ("SU", frozenset())
    goal_visited = frozenset(MEMBERS)

    counter = itertools.count()

    # Priority queue entries: (f, g, sequence, state, path)
    start_h = heuristic(start_state, metric)
    frontier = [(start_h, 0.0, next(counter), start_state, ["SU"])]
    heapq.heapify(frontier)

    # explored: state → best g(n) seen
    explored = {}
    nodes_expanded = 0

    while frontier:
        f, g, _, state, path = heapq.heappop(frontier)

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
                heapq.heappush(frontier, (new_f, new_g, next(counter), new_state, path + [neighbour]))

    return {"error": "No solution found"}
