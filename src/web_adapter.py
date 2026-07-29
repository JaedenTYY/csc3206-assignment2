import json
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
