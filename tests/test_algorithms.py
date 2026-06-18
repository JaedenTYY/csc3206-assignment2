"""
tests/test_algorithms.py
------------------------
Unit tests for all three search algorithms.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.algorithms.astar import astar
from src.algorithms.ucs import ucs
from src.algorithms.gbfs import gbfs
from src.data.graph import MEMBERS


ALL_ALGORITHMS = [
    ("A*",   astar),
    ("UCS",  ucs),
    ("GBFS", gbfs),
]

METRICS = ["distance", "time", "carbon"]


def test_all_members_visited():
    """Every algorithm must visit all 6 member residences."""
    for name, algo in ALL_ALGORITHMS:
        result = algo("distance")
        assert "error" not in result, f"{name} returned error: {result['error']}"
        route_set = set(result["route"])
        for member in MEMBERS:
            assert member in route_set, f"{name}: {member} not visited in route {result['route']}"
        print(f"✅ {name}: all members visited")


def test_starts_at_su():
    """Route must start at Sunway University."""
    for name, algo in ALL_ALGORITHMS:
        result = algo("distance")
        assert result["route"][0] == "SU", f"{name}: route does not start at SU"
        print(f"✅ {name}: starts at SU")


def test_positive_cost():
    """Total cost must be positive for all metrics."""
    for name, algo in ALL_ALGORITHMS:
        for metric in METRICS:
            result = algo(metric)
            assert result["total_cost"] > 0, f"{name}/{metric}: cost is not positive"
        print(f"✅ {name}: positive cost for all metrics")


def test_ucs_optimal_vs_astar():
    """UCS and A* should return the same optimal cost (both are optimal)."""
    for metric in METRICS:
        r_ucs = ucs(metric)
        r_astar = astar(metric)
        assert abs(r_ucs["total_cost"] - r_astar["total_cost"]) < 0.001, (
            f"UCS cost {r_ucs['total_cost']:.4f} != A* cost {r_astar['total_cost']:.4f} for {metric}"
        )
        print(f"✅ UCS == A* cost for metric={metric}: {r_ucs['total_cost']:.4f}")


def test_astar_fewer_expansions_than_ucs():
    """A* should expand fewer or equal nodes than UCS (heuristic advantage)."""
    for metric in METRICS:
        r_ucs = ucs(metric)
        r_astar = astar(metric)
        assert r_astar["nodes_expanded"] <= r_ucs["nodes_expanded"], (
            f"A* expanded {r_astar['nodes_expanded']} > UCS {r_ucs['nodes_expanded']} for {metric}"
        )
        print(f"✅ A* ({r_astar['nodes_expanded']}) ≤ UCS ({r_ucs['nodes_expanded']}) expansions for {metric}")


if __name__ == "__main__":
    print("\n=== Running Tests ===\n")
    test_all_members_visited()
    test_starts_at_su()
    test_positive_cost()
    test_ucs_optimal_vs_astar()
    test_astar_fewer_expansions_than_ucs()
    print("\n=== All Tests Passed ✅ ===\n")
