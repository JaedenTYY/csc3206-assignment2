# 🧪 Testing & Edge Cases

This document outlines the automated testing strategy for the AI route-planning implementation.

## 1. Core Correctness Tests

The test suite in `tests/test_algorithms.py` verifies the required behavior for A*, UCS, and GBFS:

- **Route structure**: `test_all_routes_have_valid_member_structure()` checks that every route starts at `SU`, contains only valid nodes, has exactly 7 nodes, and visits each member exactly once.
- **Cost breakdown**: `test_total_cost_and_path_cost_breakdown_are_consistent()` checks that every `path_costs` edge matches consecutive route nodes and that the edge-cost sum equals `total_cost`.
- **Independent optimality**: `test_astar_and_ucs_match_independent_bruteforce_optimum()` enumerates all `6! = 720` possible member orders for distance, time, and carbon, then confirms A* and UCS match the true minimum.
- **Efficiency comparison**: `test_astar_expands_no_more_states_than_ucs()` confirms A* expands no more states than UCS for every metric.

## 2. Robustness Tests

The suite also checks invalid or unusual inputs:

- **Explicit validation**: `test_invalid_input_validation_is_explicit()` verifies unsupported metrics, unknown nodes, self-edges, and unavailable edges raise controlled `ValueError` exceptions.
- **No-solution behavior**: `test_no_solution_branch_when_graph_is_disconnected()` monkeypatches the graph expansion to simulate a disconnected graph and confirms all algorithms return `{"error": "No solution found"}`.

## 3. Heuristic Tests

A* depends on an admissible MST-based lower-bound heuristic. The tests verify:

- **Boundary conditions**: `test_mst_heuristic_edge_cases()` checks empty MST input, one-node MST input, goal states, one-remaining-node states, and non-negative MST values.
- **Admissibility**: `test_heuristic_is_admissible_for_every_reachable_state()` compares the heuristic against the exact brute-force remaining cost for every reachable state and every metric.

## 4. CLI and Visualization Tests

The output-display requirements are covered through subprocess and plotting tests:

- **CLI modes**: `test_cli_execution_and_output_content()` checks default execution, `--cost time`, `--cost carbon`, and `--compare`.
- **CLI rejection**: `test_cli_rejects_invalid_cost()` confirms `argparse` rejects unsupported CLI metrics.
- **Visualization labels**: `test_visualization_file_generation_and_metric_edge_labels()` confirms route-edge labels use the selected metric and unit.
- **Headless visualization**: `test_cli_visualize_generates_output_file_headlessly()` runs `--visualize` with the `Agg` backend and verifies a non-empty PNG is created.

## 5. Running the Test Suite

From the project root:

```bash
python -m pytest -q
```

Current verified result:

```text
15 passed
```
