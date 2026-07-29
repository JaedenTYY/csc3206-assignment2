import{loadPyodide as e}from"https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.mjs";var t=`import json
from src.algorithms.astar import astar, heuristic, get_shortest_path_cost, _prim_mst_cost
from src.algorithms.ucs import ucs
from src.algorithms.gbfs import gbfs
from src.data.graph import (
    get_cost,
    get_neighbours,
    NODES,
    MEMBERS,
    NODE_LOCATIONS,
    NODE_POSITIONS,
    DATA_SOURCES,
    CARBON_FACTOR_KG_CO2E_PER_KM,
)

def run_algorithm(algorithm: str, metric: str, collect_trace: bool = False) -> str:
    try:
        alg_map = {
            "astar": astar,
            "ucs": ucs,
            "gbfs": gbfs
        }
        if algorithm not in alg_map:
            return json.dumps({"error": f"Unknown algorithm {algorithm}"})
        
        result = alg_map[algorithm](metric, collect_trace=collect_trace)
        return json.dumps(result)
    except Exception as e:
        return json.dumps({"error": str(e)})

def run_all_algorithms(metric: str) -> str:
    try:
        results = {
            "astar": astar(metric),
            "ucs": ucs(metric),
            "gbfs": gbfs(metric)
        }
        return json.dumps(results)
    except Exception as e:
        return json.dumps({"error": str(e)})

def get_graph_data(metric: str) -> str:
    try:
        edges = []
        for u in NODES:
            for v in get_neighbours(u):
                c = get_cost(u, v, metric)
                edges.append({"source": u, "target": v, "cost": c})
        return json.dumps({
            "nodes": NODES,
            "edges": edges,
            "locations": NODE_LOCATIONS,
            "positions": NODE_POSITIONS,
            "source": DATA_SOURCES[metric],
            "carbon_factor": CARBON_FACTOR_KG_CO2E_PER_KM,
        })
    except Exception as e:
        return json.dumps({"error": str(e)})

def get_project_metadata() -> str:
    return json.dumps({
        "algorithms": ["astar", "ucs", "gbfs"],
        "metrics": ["distance", "time", "carbon"]
    })

def get_heuristic_data(location: str, visited_list: list, metric: str) -> str:
    """Returns detailed components of the heuristic calculation for visualization."""
    try:
        visited = frozenset(visited_list)
        state = (location, visited)
        remaining = [n for n in MEMBERS if n not in visited]
        
        h_val = heuristic(state, metric)
        
        if not remaining:
            return json.dumps({"h": 0.0, "components": {}})
            
        if len(remaining) == 1:
            sp = get_shortest_path_cost(location, remaining[0], metric)
            return json.dumps({
                "h": h_val,
                "components": {
                    "type": "single",
                    "target": remaining[0],
                    "cost": sp
                }
            })
            
        # Get MST data
        mst_cost = _prim_mst_cost(remaining, metric)
        outgoing_costs = {n: get_shortest_path_cost(location, n, metric) for n in remaining}
        min_outgoing = min(outgoing_costs.values())
        
        return json.dumps({
            "h": h_val,
            "components": {
                "type": "mst",
                "remaining": remaining,
                "outgoing_costs": outgoing_costs,
                "min_outgoing": min_outgoing,
                "mst_cost": mst_cost
            }
        })
    except Exception as e:
        return json.dumps({"error": str(e)})
`,n=`"""
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

def astar(metric: str = "distance", collect_trace: bool = False) -> dict:
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
    step = 0
    traces = []

    while frontier:
        frontier_size_before = len(frontier)
        f, g, _, state, path = heapq.heappop(frontier)

        location, visited = state

        if state in explored and explored[state] <= g:
            continue
        explored[state] = g
        nodes_expanded += 1
        step += 1

        h = f - g
        current_trace = None
        if collect_trace:
            current_trace = {
                "step": step,
                "state": {"location": location, "visited": list(visited)},
                "g": g,
                "h": h,
                "f": f,
                "priority": f,
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
                "algorithm": "A* Search",
                "metric": metric,
                "route": path,
                "total_cost": g,
                "nodes_expanded": nodes_expanded,
                "path_costs": path_costs,
            }
            if collect_trace:
                current_trace["frontierSizeAfter"] = len(frontier)
                current_trace["frontierLocations"] = list(set([item[3][0] for item in frontier]))
                traces.append(current_trace)
                res["trace"] = traces
            return res

        # Expand neighbours
        generated_successors = 0
        for neighbour in get_neighbours(location):
            edge_cost = get_cost(location, neighbour, metric)
            new_g = g + edge_cost
            new_visited = visited | {neighbour} if neighbour in MEMBERS else visited
            new_state = (neighbour, new_visited)

            if new_state not in explored or explored[new_state] > new_g:
                new_h = heuristic(new_state, metric)
                new_f = new_g + new_h
                heapq.heappush(frontier, (new_f, new_g, next(counter), new_state, path + [neighbour]))
                generated_successors += 1

        if collect_trace:
            current_trace["frontierSizeAfter"] = len(frontier)
            current_trace["generatedSuccessors"] = generated_successors
            current_trace["frontierLocations"] = list(set([item[3][0] for item in frontier]))
            traces.append(current_trace)

    return {"error": "No solution found"}
`,r=`"""
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
                current_trace["frontierLocations"] = list(set([item[2][0] for item in frontier]))
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
            current_trace["frontierLocations"] = list(set([item[2][0] for item in frontier]))
            traces.append(current_trace)

    return {"error": "No solution found"}
`,i=`"""
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
                current_trace["frontierLocations"] = list(set([item[2][0] for item in frontier]))
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
            current_trace["frontierLocations"] = list(set([item[2][0] for item in frontier]))
            traces.append(current_trace)
            
    return {"error": "No solution found"}
`,a=`"""
src/data/graph.py
-----------------
Distance, travel time, and carbon emission matrices from Assignment 1.
All data sourced from Google Maps (off-peak weekday, driving mode).

Nodes:
    SU  = Sunway University (start)
    M1  = Jaeden   (Tanamera, Subang Jaya)
    M2  = Evan     (USJ Heights, Subang Jaya)
    M3  = Wai      (Bandar Sunway)
    M4  = Sohom    (USJ 1)
    M5  = Raymond  (Taman Eng Ann, Klang)
    M6  = Chin     (Petaling Jaya)
"""

NODES = ["SU", "M1", "M2", "M3", "M4", "M5", "M6"]
MEMBERS = ["M1", "M2", "M3", "M4", "M5", "M6"]

# Shared presentation metadata. Both visualizations consume these values so
# node names and relative positions cannot drift apart.
NODE_LOCATIONS = {
    "SU": "Sunway University",
    "M1": "Tanamera, Subang Jaya",
    "M2": "USJ Heights, Subang Jaya",
    "M3": "Bandar Sunway",
    "M4": "USJ 1",
    "M5": "Taman Eng Ann, Klang",
    "M6": "Petaling Jaya",
}

# Approximate relative positions based on Subang Jaya / Klang Valley geography.
NODE_POSITIONS = {
    "SU": (2.0, 2.0),
    "M1": (3.0, 3.0),
    "M2": (3.5, 1.8),
    "M3": (1.8, 1.5),
    "M4": (3.0, 1.0),
    "M5": (0.0, 2.0),
    "M6": (2.5, 0.5),
}

DATA_SOURCES = {
    "distance": "Assignment 1 Table 1",
    "time": "Assignment 1 Table 3",
    "carbon": "Assignment 1 Table 6",
}

# ── Table 1: Driving Distance (km) ────────────────────────────────────────────
# Source: A1 Table 1
# None = same location / not applicable
DRIVING_DISTANCE = {
    "SU": {"SU": None, "M1": 12.3, "M2": 10.4, "M3": 1.6,  "M4": 4.1,  "M5": 20.4, "M6": 3.3},
    "M1": {"SU": None, "M1": None, "M2": 6.6,  "M3": 14.1, "M4": 7.0,  "M5": 17.2, "M6": 13.3},
    "M2": {"SU": None, "M1": 9.4,  "M2": None, "M3": 10.1, "M4": 8.1,  "M5": 15.7, "M6": 10.5},
    "M3": {"SU": None, "M1": 11.5, "M2": 9.4,  "M3": None, "M4": 3.6,  "M5": 21.1, "M6": 5.5},
    "M4": {"SU": None, "M1": 10.5, "M2": 9.4,  "M3": 5.0,  "M4": None, "M5": 24.8, "M6": 6.6},
    "M5": {"SU": None, "M1": 16.7, "M2": 16.7, "M3": 19.7, "M4": 21.0, "M5": None, "M6": 20.4},
    "M6": {"SU": None, "M1": 15.5, "M2": 9.3,  "M3": 4.9,  "M4": 6.6,  "M5": 19.1, "M6": None},
}

# ── Table 3: Driving Travel Time (minutes) ────────────────────────────────────
# Source: A1 Table 3
DRIVING_TIME = {
    "SU": {"SU": None, "M1": 15, "M2": 15, "M3": 5,  "M4": 11, "M5": 20, "M6": 6},
    "M1": {"SU": None, "M1": None,"M2": 14, "M3": 16, "M4": 15, "M5": 21, "M6": 14},
    "M2": {"SU": None, "M1": 16, "M2": None,"M3": 14, "M4": 15, "M5": 17, "M6": 13},
    "M3": {"SU": None, "M1": 12, "M2": 16, "M3": None,"M4": 9,  "M5": 22, "M6": 7},
    "M4": {"SU": None, "M1": 18, "M2": 19, "M3": 14, "M4": None,"M5": 31, "M6": 15},
    "M5": {"SU": None, "M1": 26, "M2": 28, "M3": 35, "M4": 45, "M5": None,"M6": 35},
    "M6": {"SU": None, "M1": 20, "M2": 16, "M3": 20, "M4": 24, "M5": 35, "M6": None},
}

# ── Table 6: CO₂ Emissions (kg CO₂e) ─────────────────────────────────────────
# Source: A1 Table 6
# Formula: distance_km × 0.16272 (UK Gov GHG 2025, Average Petrol Car)
CARBON_FACTOR_KG_CO2E_PER_KM = 0.16272
CARBON_EMISSIONS = {
    from_node: {
        to_node: (
            None
            if distance is None
            else round(distance * CARBON_FACTOR_KG_CO2E_PER_KM, 4)
        )
        for to_node, distance in row.items()
    }
    for from_node, row in DRIVING_DISTANCE.items()
}

COST_MATRICES = {
    "distance": DRIVING_DISTANCE,
    "time": DRIVING_TIME,
    "carbon": CARBON_EMISSIONS,
}

COST_UNITS = {
    "distance": "km",
    "time": "min",
    "carbon": "kg CO₂e",
}


def validate_metric(metric: str) -> None:
    """Raise ValueError if the requested optimization metric is unsupported."""
    if metric not in COST_MATRICES:
        valid_metrics = ", ".join(sorted(COST_MATRICES))
        raise ValueError(f"Unsupported cost metric: {metric}. Expected one of: {valid_metrics}")


def validate_node(node: str) -> None:
    """Raise ValueError if the node code is not part of the route graph."""
    if node not in NODES:
        valid_nodes = ", ".join(NODES)
        raise ValueError(f"Unknown node: {node}. Expected one of: {valid_nodes}")


def get_cost(from_node: str, to_node: str, metric: str = "distance") -> float:
    """Return the edge cost between two nodes for the given metric."""
    validate_metric(metric)
    validate_node(from_node)
    validate_node(to_node)
    val = COST_MATRICES[metric][from_node][to_node]
    if val is None:
        raise ValueError(f"No edge from {from_node} to {to_node} for metric '{metric}'")
    return val


def get_neighbours(node: str) -> list[str]:
    """Return all reachable nodes from the given node (excludes SU as destination)."""
    validate_node(node)
    return [n for n in NODES if n != node and n != "SU"]


def has_edge(from_node: str, to_node: str, metric: str = "distance") -> bool:
    """Return True if a valid edge exists between two nodes."""
    validate_metric(metric)
    validate_node(from_node)
    validate_node(to_node)
    val = COST_MATRICES[metric][from_node].get(to_node)
    return val is not None


def get_node_label(node: str) -> str:
    """Return a human-readable label for a node."""
    member_names = {
        "M1": "Jaeden",
        "M2": "Evan",
        "M3": "Wai",
        "M4": "Sohom",
        "M5": "Raymond",
        "M6": "Chin",
    }
    if node == "SU":
        return NODE_LOCATIONS[node]
    if node in member_names:
        return f"{member_names[node]} ({NODE_LOCATIONS[node]})"
    return node
`;let o=null,s=null;async function c(){try{self.postMessage({type:`STATUS`,payload:`Loading Python runtime...`}),s=await e({indexURL:`https://cdn.jsdelivr.net/pyodide/v0.25.0/full/`}),self.postMessage({type:`STATUS`,payload:`Loading search algorithms...`}),s.FS.mkdir(`src`),s.FS.mkdir(`src/algorithms`),s.FS.mkdir(`src/data`),s.FS.writeFile(`src/__init__.py`,``),s.FS.writeFile(`src/web_adapter.py`,t),s.FS.writeFile(`src/algorithms/__init__.py`,``),s.FS.writeFile(`src/algorithms/astar.py`,n),s.FS.writeFile(`src/algorithms/ucs.py`,r),s.FS.writeFile(`src/algorithms/gbfs.py`,i),s.FS.writeFile(`src/data/__init__.py`,``),s.FS.writeFile(`src/data/graph.py`,a),await s.runPythonAsync(`
import sys
sys.path.append(".")
import src.web_adapter as web_adapter
    `),self.postMessage({type:`STATUS`,payload:`Ready`})}catch(e){self.postMessage({type:`STATUS`,payload:`Error: ${e.message}`}),self.postMessage({id:-1,type:`ERROR`,payload:e.message||`Failed to initialize Python runtime`})}}o=c(),self.onmessage=async e=>{let{id:t,type:n,payload:r}=e.data;try{if(await o,n===`RUN_ALGORITHM`){let{algorithm:e,metric:n,collectTrace:i}=r,a=s.runPython(`web_adapter.run_algorithm('${e}', '${n}', ${i?`True`:`False`})`);self.postMessage({id:t,type:`RESULT`,payload:JSON.parse(a)})}else if(n===`RUN_ALL`){let{metric:e}=r,n=s.runPython(`web_adapter.run_all_algorithms('${e}')`);self.postMessage({id:t,type:`RESULT`,payload:JSON.parse(n)})}else if(n===`GET_GRAPH`){let{metric:e}=r,n=s.runPython(`web_adapter.get_graph_data('${e}')`);self.postMessage({id:t,type:`RESULT`,payload:JSON.parse(n)})}else if(n===`GET_HEURISTIC`){let{location:e,visited:n,metric:i}=r,a=`[${n.map(e=>`"${e}"`).join(`,`)}]`,o=s.runPython(`web_adapter.get_heuristic_data('${e}', ${a}, '${i}')`);self.postMessage({id:t,type:`RESULT`,payload:JSON.parse(o)})}}catch(e){self.postMessage({id:t,type:`ERROR`,payload:e.message})}};