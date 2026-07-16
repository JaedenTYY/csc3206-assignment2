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
from pathlib import Path

import pytest

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from src.algorithms.astar import _prim_mst_cost, astar, heuristic
from src.algorithms.gbfs import gbfs
from src.algorithms.ucs import ucs
from src.data.graph import COST_UNITS, MEMBERS, NODES, get_cost, get_neighbours, has_edge


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


def brute_force_optimal_route(metric: str) -> tuple[float, tuple[str, ...]]:
    """Enumerate all 6! member orders and return the exact minimum route cost."""
    best_cost = math.inf
    best_route = ()

    for order in itertools.permutations(MEMBERS):
        route = ("SU", *order)
        cost = sum(get_cost(frm, to, metric) for frm, to in zip(route, route[1:]))

        if cost < best_cost:
            best_cost = cost
            best_route = route

    return best_cost, best_route


def true_remaining_cost(location: str, visited: frozenset[str], metric: str) -> float:
    """Return the exact cheapest remaining cost from a search state."""
    remaining = [member for member in MEMBERS if member not in visited]
    if not remaining:
        return 0.0

    return min(
        sum(get_cost(frm, to, metric) for frm, to in zip((location, *order), order))
        for order in itertools.permutations(remaining)
    )


def reachable_states() -> list[tuple[str, frozenset[str]]]:
    """Generate states reachable in a member-only tour from SU."""
    states = [("SU", frozenset())]

    for size in range(1, len(MEMBERS) + 1):
        for subset in itertools.combinations(MEMBERS, size):
            visited = frozenset(subset)
            states.extend((location, visited) for location in subset)

    return states


def test_all_routes_have_valid_member_structure():
    """Routes start at SU, contain only valid nodes, and visit each member exactly once."""
    expected_nodes = {"SU", *MEMBERS}

    for name, algorithm in ALL_ALGORITHMS:
        for metric in METRICS:
            result = algorithm(metric)

            assert "error" not in result, f"{name}/{metric} returned error: {result['error']}"
            assert result["route"][0] == "SU"
            assert len(result["route"]) == len(MEMBERS) + 1
            assert set(result["route"]) == expected_nodes
            assert all(node in NODES for node in result["route"])
            assert result["route"].count("SU") == 1

            for member in MEMBERS:
                assert result["route"].count(member) == 1


def test_total_cost_and_path_cost_breakdown_are_consistent():
    """Each path_costs edge must match the route and sum exactly to total_cost."""
    for name, algorithm in ALL_ALGORITHMS:
        for metric in METRICS:
            result = algorithm(metric)
            route = result["route"]
            path_costs = result["path_costs"]

            assert len(path_costs) == len(route) - 1

            for index, (frm, to, cost) in enumerate(path_costs):
                assert (frm, to) == (route[index], route[index + 1])
                assert math.isclose(cost, get_cost(frm, to, metric), rel_tol=0, abs_tol=TOLERANCE)

            summed_cost = sum(cost for _, _, cost in path_costs)
            assert math.isclose(
                summed_cost,
                result["total_cost"],
                rel_tol=0,
                abs_tol=TOLERANCE,
            ), f"{name}/{metric} path_costs do not sum to total_cost"


def test_astar_and_ucs_match_independent_bruteforce_optimum():
    """A* and UCS must match the independently enumerated optimal route cost."""
    for metric in METRICS:
        optimal_cost, _ = brute_force_optimal_route(metric)

        for name, algorithm in OPTIMAL_ALGORITHMS:
            result = algorithm(metric)
            assert math.isclose(
                result["total_cost"],
                optimal_cost,
                rel_tol=0,
                abs_tol=TOLERANCE,
            ), f"{name}/{metric} does not match brute-force optimum"


def test_astar_expands_no_more_states_than_ucs():
    """A* should expand fewer or equal nodes than UCS on the same metric."""
    for metric in METRICS:
        ucs_result = ucs(metric)
        astar_result = astar(metric)

        assert astar_result["nodes_expanded"] <= ucs_result["nodes_expanded"]


def test_invalid_input_validation_is_explicit():
    """Invalid metrics, unknown nodes, unavailable edges, and self-edges raise ValueError."""
    for algorithm in (astar, ucs, gbfs):
        with pytest.raises(ValueError, match="Unsupported cost metric"):
            algorithm("fuel")

    with pytest.raises(ValueError, match="Unsupported cost metric"):
        get_cost("SU", "M1", "fuel")

    with pytest.raises(ValueError, match="Unknown node"):
        get_cost("INVALID", "M1", "distance")

    with pytest.raises(ValueError, match="Unknown node"):
        get_cost("SU", "INVALID", "distance")

    with pytest.raises(ValueError, match="Unknown node"):
        get_neighbours("INVALID")

    with pytest.raises(ValueError, match="Unknown node"):
        has_edge("INVALID", "M1", "distance")

    with pytest.raises(ValueError, match="No edge"):
        get_cost("SU", "SU", "distance")

    with pytest.raises(ValueError, match="No edge"):
        get_cost("M1", "SU", "distance")


def test_mst_heuristic_edge_cases():
    """The heuristic handles empty, single-node, goal, and one-remaining states correctly."""
    assert _prim_mst_cost([], "distance") == 0.0
    assert _prim_mst_cost(["SU"], "distance") == 0.0

    goal_state = ("M1", frozenset(MEMBERS))
    assert heuristic(goal_state, "distance") == 0.0

    one_remaining_visited = frozenset(member for member in MEMBERS if member != "M5")
    one_remaining_state = ("M2", one_remaining_visited)
    assert heuristic(one_remaining_state, "distance") == get_cost("M2", "M5", "distance")

    for metric in METRICS:
        assert _prim_mst_cost(MEMBERS, metric) >= 0.0


def test_heuristic_is_admissible_for_every_reachable_state():
    """The A* heuristic must never exceed the true remaining optimal cost."""
    for metric in METRICS:
        for state in reachable_states():
            h_value = heuristic(state, metric)
            exact_cost = true_remaining_cost(*state, metric)

            assert h_value <= exact_cost + TOLERANCE, (
                f"Heuristic overestimates for state={state}, metric={metric}: "
                f"h={h_value}, exact={exact_cost}"
            )


@pytest.mark.parametrize(
    ("args", "expected_metric"),
    [
        ([], "distance (km)"),
        (["--cost", "time"], "time (min)"),
        (["--cost", "carbon"], "carbon (kg CO₂e)"),
        (["--compare"], "distance (km)"),
    ],
)
def test_cli_execution_and_output_content(args, expected_metric):
    """The CLI should run common modes and print the key route-planning fields."""
    completed = subprocess.run(
        [sys.executable, "src/main.py", *args],
        cwd=ROOT_DIR,
        capture_output=True,
        text=True,
        check=True,
    )

    output = completed.stdout
    assert "Algorithm" in output
    assert "Route" in output
    assert "Total Cost" in output
    assert "Nodes Expanded" in output
    assert expected_metric in output

    if "--compare" in args:
        assert "COMPARISON TABLE" in output
        assert "Uniform Cost Search" in output
        assert "Greedy Best-First Search" in output


def test_cli_rejects_invalid_cost():
    """argparse should reject unsupported cost metrics before running algorithms."""
    completed = subprocess.run(
        [sys.executable, "src/main.py", "--cost", "fuel"],
        cwd=ROOT_DIR,
        capture_output=True,
        text=True,
        check=False,
    )

    assert completed.returncode != 0
    assert "invalid choice" in completed.stderr


def test_visualization_file_generation_and_metric_edge_labels(tmp_path):
    """Visualization should save a non-empty PNG with labels for the selected metric."""
    import matplotlib

    matplotlib.use("Agg", force=True)

    from src.visualization.plot import build_route_edge_labels, plot_route

    for metric in METRICS:
        result = astar(metric)
        output_path = tmp_path / f"route_{metric}.png"

        labels = build_route_edge_labels(result["route"], metric)
        first_edge = tuple(result["route"][:2])
        expected_first_label = f"{get_cost(*first_edge, metric):.1f} {COST_UNITS[metric]}"

        assert labels[first_edge] == expected_first_label
        assert all(label.endswith(COST_UNITS[metric]) for label in labels.values())

        plot_route(result, output_path=str(output_path), show=False)

        assert output_path.exists()
        assert output_path.stat().st_size > 0


def test_cli_visualize_generates_output_file_headlessly(tmp_path):
    """The CLI visualization mode should work under a non-GUI matplotlib backend."""
    env = os.environ.copy()
    env["MPLBACKEND"] = "Agg"

    completed = subprocess.run(
        [sys.executable, str(ROOT_DIR / "src/main.py"), "--cost", "time", "--visualize"],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
        check=True,
    )

    output_file = tmp_path / "assets" / "route_output.png"
    assert "Visualization saved to assets/route_output.png" in completed.stdout
    assert output_file.exists()
    assert output_file.stat().st_size > 0


def test_no_solution_branch_when_graph_is_disconnected(monkeypatch):
    """Algorithms should return a controlled no-solution result if no neighbours exist."""
    import src.algorithms.astar as astar_module
    import src.algorithms.gbfs as gbfs_module
    import src.algorithms.ucs as ucs_module

    for module in (astar_module, ucs_module, gbfs_module):
        monkeypatch.setattr(module, "get_neighbours", lambda node: [])

    assert astar_module.astar("distance") == {"error": "No solution found"}
    assert ucs_module.ucs("distance") == {"error": "No solution found"}
    assert gbfs_module.gbfs("distance") == {"error": "No solution found"}


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__]))
