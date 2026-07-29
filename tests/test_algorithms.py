"""
tests/test_algorithms.py
------------------------
Unit and integration tests for the route-planning algorithms, CLI, and plotting.
"""

import itertools
import math
import os
import subprocess
import sys
import heapq
from pathlib import Path

import pytest
import networkx as nx
import matplotlib

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from src.algorithms.astar import _prim_mst_cost, astar, heuristic, _undirected_edge_lower_bound
from src.algorithms.gbfs import gbfs
from src.algorithms.ucs import ucs
from src.data.graph import (
    CARBON_EMISSIONS,
    CARBON_FACTOR_KG_CO2E_PER_KM,
    COST_MATRICES,
    COST_UNITS,
    DATA_SOURCES,
    DRIVING_DISTANCE,
    MEMBERS,
    NODES,
    NODE_LOCATIONS,
    NODE_POSITIONS,
    get_cost,
    get_neighbours,
    has_edge,
)
import src.data.graph as graph_module

@pytest.fixture(autouse=True)
def clear_sp_cache():
    from src.algorithms.astar import _SP_CACHE
    _SP_CACHE.clear()

ALL_ALGORITHMS = [
    ("A*", astar),
    ("UCS", ucs),
    ("GBFS", gbfs),
]

OPTIMAL_ALGORITHMS = [
    ("A*", astar),
    ("UCS", ucs),
]

METRICS = ["distance", "time", "carbon"]
TOLERANCE = 1e-6

# PHASE 3: Independent optimality oracle (Dijkstra)
def dijkstra_optimal_route(metric: str) -> tuple[float, list[list[str]]]:
    """
    Independent Dijkstra solver over composite states (location, visited).
    Returns (minimum cost, list of all optimal paths).
    """
    start_state = ("SU", frozenset())
    goal_visited = frozenset(MEMBERS)
    
    frontier = [(0.0, start_state, ["SU"])]
    best_cost_for_state = {start_state: 0.0}
    
    optimal_cost = math.inf
    optimal_paths = []
    
    while frontier:
        cost, state, path = heapq.heappop(frontier)
        location, visited = state
        
        if cost > best_cost_for_state.get(state, math.inf):
            continue
            
        if visited == goal_visited:
            if cost < optimal_cost - TOLERANCE:
                optimal_cost = cost
                optimal_paths = [path]
            elif math.isclose(cost, optimal_cost, rel_tol=0, abs_tol=TOLERANCE):
                optimal_paths.append(path)
            continue
            
        if cost > optimal_cost:
            continue
            
        for neighbor in NODES:
            if neighbor == "SU" or neighbor == location:
                continue
            if not has_edge(location, neighbor, metric):
                continue
                
            edge_cost = get_cost(location, neighbor, metric)
            new_cost = cost + edge_cost
            new_visited = visited | frozenset([neighbor]) if neighbor in MEMBERS else visited
            new_state = (neighbor, new_visited)
            
            if new_cost < best_cost_for_state.get(new_state, math.inf):
                best_cost_for_state[new_state] = new_cost
                heapq.heappush(frontier, (new_cost, new_state, path + [neighbor]))
            elif math.isclose(new_cost, best_cost_for_state[new_state], rel_tol=0, abs_tol=TOLERANCE):
                heapq.heappush(frontier, (new_cost, new_state, path + [neighbor]))
                
    return optimal_cost, optimal_paths

def true_remaining_cost(location: str, visited: frozenset[str], metric: str) -> float:
    """Return the exact cheapest remaining cost from a search state using Dijkstra."""
    goal_visited = frozenset(MEMBERS)
    if visited == goal_visited:
        return 0.0
        
    start_state = (location, visited)
    frontier = [(0.0, start_state)]
    best_cost_for_state = {start_state: 0.0}
    
    while frontier:
        cost, state = heapq.heappop(frontier)
        loc, vis = state
        
        if cost > best_cost_for_state.get(state, math.inf):
            continue
            
        if vis == goal_visited:
            return cost
            
        for neighbor in NODES:
            if neighbor == "SU" or neighbor == loc:
                continue
            if not has_edge(loc, neighbor, metric):
                continue
                
            edge_cost = get_cost(loc, neighbor, metric)
            new_cost = cost + edge_cost
            new_visited = vis | frozenset([neighbor]) if neighbor in MEMBERS else vis
            new_state = (neighbor, new_visited)
            
            if new_cost < best_cost_for_state.get(new_state, math.inf):
                best_cost_for_state[new_state] = new_cost
                heapq.heappush(frontier, (new_cost, new_state))
                
    return math.inf

def reachable_states() -> list[tuple[str, frozenset[str]]]:
    """Generate states reachable in a member-only tour from SU."""
    states = [("SU", frozenset())]
    for size in range(1, len(MEMBERS) + 1):
        for subset in itertools.combinations(MEMBERS, size):
            visited = frozenset(subset)
            states.extend((location, visited) for location in subset)
    return states

# Functional Correctness Tests
def test_functional_correctness_all_algorithms():
    for name, algorithm in ALL_ALGORITHMS:
        for metric in METRICS:
            result = algorithm(metric)
            assert "error" not in result, f"{name}/{metric} returned error: {result['error']}"
            
            route = result["route"]
            assert route[0] == "SU"
            assert set(MEMBERS).issubset(set(route)), f"{name} did not visit all members"
            assert all(node in NODES for node in route)
            assert route.count("SU") == 1, "Should not return to SU"
            
            visited_in_route = set([node for node in route if node in MEMBERS])
            assert visited_in_route == set(MEMBERS)
            
            algo_name = result["algorithm"]
            assert name in algo_name or (name == "UCS" and "Uniform Cost" in algo_name) or (name == "GBFS" and "Greedy" in algo_name) or algo_name.startswith(name.split()[0])
            assert result["metric"] == metric
            assert result["total_cost"] > 0
            
            path_costs = result["path_costs"]
            assert len(path_costs) == len(route) - 1
            calculated_cost = 0.0
            for i in range(len(route) - 1):
                frm = route[i]
                to = route[i + 1]
                assert has_edge(frm, to, metric)
                edge_cost = get_cost(frm, to, metric)
                calculated_cost += edge_cost
                assert path_costs[i] == (frm, to, edge_cost)
                
            assert math.isclose(calculated_cost, result["total_cost"], rel_tol=0, abs_tol=TOLERANCE)
            
            result2 = algorithm(metric)
            assert result == result2


def test_demo_data_is_complete_and_carbon_matches_documented_formula():
    assert set(NODE_LOCATIONS) == set(NODES)
    assert set(NODE_POSITIONS) == set(NODES)

    for metric, matrix in COST_MATRICES.items():
        assert set(matrix) == set(NODES), metric
        for from_node, row in matrix.items():
            assert set(row) == set(NODES), (metric, from_node)

    for from_node, row in DRIVING_DISTANCE.items():
        for to_node, distance in row.items():
            expected = (
                None
                if distance is None
                else round(distance * CARBON_FACTOR_KG_CO2E_PER_KM, 4)
            )
            assert CARBON_EMISSIONS[from_node][to_node] == expected

def test_independent_optimality_verification():
    for metric in METRICS:
        optimal_cost, optimal_paths = dijkstra_optimal_route(metric)
        for name, algorithm in OPTIMAL_ALGORITHMS:
            result = algorithm(metric)
            assert math.isclose(result["total_cost"], optimal_cost, rel_tol=0, abs_tol=TOLERANCE)
            assert result["route"] in optimal_paths

def test_astar_expands_no_more_states_than_ucs():
    for metric in METRICS:
        ucs_res = ucs(metric)
        astar_res = astar(metric)
        assert astar_res["nodes_expanded"] <= ucs_res["nodes_expanded"]

# Heuristic Correctness
def test_heuristic_no_unvisited_residences():
    for metric in METRICS:
        state = ("M1", frozenset(MEMBERS))
        assert heuristic(state, metric) == 0.0
        
def test_heuristic_one_unvisited_residence():
    from src.algorithms.astar import get_shortest_path_cost
    for metric in METRICS:
        state = ("M2", frozenset(m for m in MEMBERS if m != "M5"))
        assert heuristic(state, metric) == get_shortest_path_cost("M2", "M5", metric)
        
def test_heuristic_properties():
    for metric in METRICS:
        for state in reachable_states():
            h_val = heuristic(state, metric)
            assert h_val >= 0.0
            assert h_val == heuristic(state, metric)
            
            loc, vis = state
            loc_copy, vis_copy = loc, frozenset(vis)
            heuristic((loc_copy, vis_copy), metric)
            assert loc == loc_copy and vis == vis_copy

def test_heuristic_metric_independence(monkeypatch):
    from src.algorithms.astar import _SP_CACHE
    state = ("SU", frozenset())
    orig_carbon = heuristic(state, "carbon")
    orig_distance = heuristic(state, "distance")
    
    monkeypatch.setitem(
        COST_MATRICES["carbon"]["M1"],
        "M2",
        COST_MATRICES["carbon"]["M1"]["M2"] * 10,
    )
    _SP_CACHE.clear()
    
    new_carbon = heuristic(state, "carbon")
    new_distance = heuristic(state, "distance")
    
    assert new_carbon != orig_carbon
    assert new_distance == orig_distance

def test_heuristic_admissibility():
    for metric in METRICS:
        for state in reachable_states():
            h_value = heuristic(state, metric)
            exact_cost = true_remaining_cost(state[0], state[1], metric)
            assert h_value <= exact_cost + TOLERANCE
            
# Edge Cases and Error Handling
def test_invalid_input_validation():
    for algorithm in ALL_ALGORITHMS:
        name, algo = algorithm
        with pytest.raises(ValueError, match="Unsupported cost metric"):
            algo("invalid")
            
    with pytest.raises(ValueError):
        get_cost("SU", "M1", "invalid")
        
    with pytest.raises(ValueError):
        get_cost("INVALID", "M1", "distance")
        
    with pytest.raises(ValueError):
        get_neighbours("INVALID")
        
    with pytest.raises(ValueError):
        has_edge("INVALID", "M1", "distance")
        
    with pytest.raises(ValueError):
        get_cost("SU", "SU", "distance")
        
    with pytest.raises(ValueError):
        _prim_mst_cost(["SU"], "invalid")
        
def test_astar_shortest_path_exception(monkeypatch):
    from src.algorithms.astar import _SP_CACHE, get_shortest_path_cost
    _SP_CACHE.clear()
    def mock_get_cost(frm, to, metric):
        raise ValueError("mock error")
    monkeypatch.setattr("src.algorithms.astar.get_cost", mock_get_cost)
    cost = get_shortest_path_cost("M1", "M2", "distance")
    assert cost == float("inf")
    _SP_CACHE.clear()

def test_prim_mst_cost_edge_cases():
    assert _prim_mst_cost([], "distance") == 0.0
    assert _prim_mst_cost(["M1"], "distance") == 0.0
    
def test_prim_mst_cost_disconnected(monkeypatch):
    monkeypatch.setattr("src.algorithms.astar.get_shortest_path_cost", lambda u, v, m: float("inf"))
    assert _undirected_edge_lower_bound("M1", "M2", "distance") == float("inf")
    assert _prim_mst_cost(["M1", "M2", "M3"], "distance") == float("inf")
        
def test_no_solution_branch(monkeypatch):
    monkeypatch.setattr("src.algorithms.astar.get_neighbours", lambda x: [])
    monkeypatch.setattr("src.algorithms.ucs.get_neighbours", lambda x: [])
    monkeypatch.setattr("src.algorithms.gbfs.get_neighbours", lambda x: [])
    for name, algo in ALL_ALGORITHMS:
        assert algo("distance") == {"error": "No solution found"}

def test_trace_collection_all():
    from src.algorithms.astar import astar
    from src.algorithms.ucs import ucs
    from src.algorithms.gbfs import gbfs
    
    for alg in (astar, ucs, gbfs):
        res = alg("distance", collect_trace=True)
        assert "trace" in res
        assert len(res["trace"]) > 0
        first_step = res["trace"][0]
        assert "step" in first_step
        assert "g" in first_step
        assert "h" in first_step
        assert "f" in first_step
        assert "priority" in first_step
        assert "frontierSizeBefore" in first_step
        assert "generatedSuccessors" in first_step
        assert "routeSoFar" in first_step

def test_web_adapter():
    import json
    import src.web_adapter as wa
    
    # run_algorithm
    res_str = wa.run_algorithm("astar", "distance", collect_trace=True)
    res = json.loads(res_str)
    assert "route" in res
    assert "trace" in res
    
    assert "error" in json.loads(wa.run_algorithm("invalid", "distance"))
    assert "error" in json.loads(wa.run_algorithm("astar", "invalid"))
    
    # run_all_algorithms
    res_all = json.loads(wa.run_all_algorithms("distance"))
    assert "astar" in res_all
    assert "error" in json.loads(wa.run_all_algorithms("invalid"))
    
    # get_graph_data: the browser must receive the exact shared source data.
    for metric in METRICS:
        graph_data = json.loads(wa.get_graph_data(metric))
        assert graph_data["nodes"] == NODES
        assert graph_data["locations"] == NODE_LOCATIONS
        assert graph_data["positions"] == {
            node: list(position) for node, position in NODE_POSITIONS.items()
        }
        assert graph_data["source"] == DATA_SOURCES[metric]
        assert graph_data["carbon_factor"] == CARBON_FACTOR_KG_CO2E_PER_KM

        edges = {
            (edge["source"], edge["target"]): edge["cost"]
            for edge in graph_data["edges"]
        }
        expected_edges = {
            (source, target): get_cost(source, target, metric)
            for source in NODES
            for target in get_neighbours(source)
        }
        assert edges == expected_edges

    assert "error" in json.loads(wa.get_graph_data("invalid"))
    
    # get_project_metadata
    meta = json.loads(wa.get_project_metadata())
    assert "algorithms" in meta
    
    # get_heuristic_data
    h_data = json.loads(wa.get_heuristic_data("SU", ["SU"], "distance"))
    assert "h" in h_data
    
    h_data_single = json.loads(wa.get_heuristic_data("SU", [n for n in MEMBERS if n != "M1"], "distance"))
    assert "h" in h_data_single
    
    h_data_none = json.loads(wa.get_heuristic_data("M1", MEMBERS, "distance"))
    assert h_data_none["h"] == 0.0
    
    # invalid heuristic
    assert "error" in json.loads(wa.get_heuristic_data("SU", ["SU"], "invalid"))

def test_cli_subprocess_execution():
    commands = [
        ["src/main.py"],
        ["src/main.py", "--cost", "time"],
        ["src/main.py", "--cost", "carbon"],
        ["src/main.py", "--compare"],
    ]
    for cmd in commands:
        res = subprocess.run([sys.executable, *cmd], capture_output=True, text=True, cwd=ROOT_DIR)
        assert res.returncode == 0
        assert "Algorithm" in res.stdout
        assert "Total Cost" in res.stdout

def test_cli_subprocess_help():
    res = subprocess.run([sys.executable, "src/main.py", "--help"], capture_output=True, text=True, cwd=ROOT_DIR)
    assert res.returncode == 0
    assert "usage:" in res.stdout.lower()

def test_cli_subprocess_invalid_cost():
    res = subprocess.run([sys.executable, "src/main.py", "--cost", "invalid"], capture_output=True, text=True, cwd=ROOT_DIR)
    assert res.returncode != 0
    assert "invalid choice" in res.stderr

def test_cli_subprocess_visualize(tmp_path):
    env = os.environ.copy()
    env["MPLBACKEND"] = "Agg"
    res = subprocess.run([sys.executable, str(ROOT_DIR / "src/main.py"), "--visualize"], capture_output=True, text=True, cwd=tmp_path, env=env)
    assert res.returncode == 0
    assert "Visualization saved" in res.stdout
    out_file = tmp_path / "assets" / "route_output.png"
    assert out_file.exists()
    assert out_file.stat().st_size > 0

def test_main_cli_execution_and_coverage(monkeypatch, capsys, tmp_path):
    from src.main import main, print_result
    
    monkeypatch.setattr(sys, "argv", ["main.py", "--compare"])
    main()
    out, _ = capsys.readouterr()
    assert "COMPARISON TABLE" in out
    
    # test error condition in print_result
    print_result({"error": "test error"}, "km")
    out, _ = capsys.readouterr()
    assert "test error" in out

def test_main_cli_print_comparison_error(capsys):
    from src.main import print_comparison
    print_comparison([{"error": "some error"}], "km")
    out, _ = capsys.readouterr()
    assert "some error" not in out

def test_main_cli_import_error(monkeypatch, capsys):
    from src.main import main
    monkeypatch.setattr(sys, "argv", ["main.py", "--visualize"])
    
    # Simulate missing matplotlib
    import sys as sys_module
    
    monkeypatch.setitem(sys_module.modules, "matplotlib", None)
    monkeypatch.setitem(sys_module.modules, "networkx", None)
    
    main()
        
    out, _ = capsys.readouterr()
    assert "Visualization unavailable" in out

# Visualization Tests coverage for plot.py
def test_visualization_plot_route_methods(tmp_path):
    matplotlib.use("Agg", force=True)
    from src.visualization.plot import plot_route, build_route_edge_labels
    
    # test build_route_edge_labels with a None edge
    labels = build_route_edge_labels(["SU", "SU"], "distance")
    assert labels == {}
    
    result = astar("distance")
    
    # test standard saving
    out_path = tmp_path / "route_distance.png"
    plot_route(result, output_path=str(out_path), show=True)
    assert out_path.exists()
    
    # test saving to current directory (no dir)
    cwd_path = "plot_in_cwd.png"
    plot_route(result, output_path=cwd_path, show=False)
    assert os.path.exists(cwd_path)
    os.remove(cwd_path)
    
def test_visualization_error_result(capsys):
    from src.visualization.plot import plot_route
    result = {"error": "No solution"}
    plot_route(result, output_path="should_not_exist.png", show=False)
    out, _ = capsys.readouterr()
    assert "No route to visualize." in out
    
def test_gbfs_ignores_visited_states(monkeypatch):
    # Force GBFS to hit visited state by making heuristic return 0, turning it into BFS
    monkeypatch.setattr("src.algorithms.gbfs.heuristic", lambda s, m: 0.0)
    res = gbfs("distance")
    assert res["total_cost"] > 0
