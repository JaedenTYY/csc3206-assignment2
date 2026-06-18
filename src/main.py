"""
src/main.py
-----------
Entry point for CSC3206 AI Assignment 2 — House Visit Tour.

Usage:
    python src/main.py                     # A* with driving distance
    python src/main.py --cost time         # A* with driving time
    python src/main.py --cost carbon       # A* with CO₂ emissions
    python src/main.py --compare           # Run all 3 algorithms
    python src/main.py --visualize         # Show route visualization
    python src/main.py --compare --visualize --cost distance
"""

import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.algorithms.astar import astar
from src.algorithms.ucs import ucs
from src.algorithms.gbfs import gbfs
from src.data.graph import get_node_label, COST_UNITS


BANNER = """
╔══════════════════════════════════════════════════════════════╗
║   CSC3206 Artificial Intelligence — Assignment 2            ║
║   House Visit Tour: AI Route Planning                       ║
║   Group 4 · Sunway University · May 2026                    ║
╚══════════════════════════════════════════════════════════════╝
"""


def print_result(result: dict, unit: str) -> None:
    if "error" in result:
        print(f"\n❌ {result['error']}")
        return

    route = result["route"]
    arrow_route = " → ".join(route)

    print(f"\n{'─'*60}")
    print(f"  Algorithm     : {result['algorithm']}")
    print(f"  Cost Metric   : {result['metric']} ({unit})")
    print(f"  Route         : {arrow_route}")
    print(f"  Total Cost    : {result['total_cost']:.4f} {unit}")
    print(f"  Nodes Expanded: {result['nodes_expanded']}")
    print(f"{'─'*60}")
    print("\n  Step-by-step breakdown:")
    for (frm, to, cost) in result["path_costs"]:
        label_from = get_node_label(frm)
        label_to   = get_node_label(to)
        print(f"    {frm} → {to}  |  {cost:.4f} {unit}  |  {label_from} → {label_to}")
    print()


def print_comparison(results: list, unit: str) -> None:
    print(f"\n{'═'*60}")
    print(f"  COMPARISON TABLE  (metric: {unit})")
    print(f"{'═'*60}")
    header = f"  {'Algorithm':<30} {'Cost':>10} {'Expanded':>10}  Route"
    print(header)
    print(f"  {'─'*28} {'─'*10} {'─'*10}  {'─'*30}")
    for r in results:
        if "error" not in r:
            route_str = " → ".join(r["route"])
            print(f"  {r['algorithm']:<30} {r['total_cost']:>10.2f} {r['nodes_expanded']:>10}  {route_str}")
    print(f"{'═'*60}\n")


def main():
    parser = argparse.ArgumentParser(description="CSC3206 AI Assignment 2 — House Visit Tour")
    parser.add_argument("--cost", choices=["distance", "time", "carbon"], default="distance",
                        help="Cost metric to optimize (default: distance)")
    parser.add_argument("--compare", action="store_true",
                        help="Run all 3 algorithms and compare results")
    parser.add_argument("--visualize", action="store_true",
                        help="Show route visualization")
    args = parser.parse_args()

    metric = args.cost
    unit = COST_UNITS[metric]

    print(BANNER)

    if args.compare:
        print(f"Running all algorithms with metric: {metric} ({unit})...\n")
        results = [
            astar(metric),
            ucs(metric),
            gbfs(metric),
        ]
        for r in results:
            print_result(r, unit)
        print_comparison(results, unit)
        primary_result = results[0]  # A* for visualization
    else:
        print(f"Running A* Search with metric: {metric} ({unit})...\n")
        primary_result = astar(metric)
        print_result(primary_result, unit)

    if args.visualize:
        try:
            from src.visualization.plot import plot_route
            plot_route(primary_result)
        except ImportError as e:
            print(f"⚠️  Visualization unavailable: {e}")
            print("    Install matplotlib and networkx: pip install matplotlib networkx")


if __name__ == "__main__":
    main()
