# Automated Testing & Verification Report

## Phase 1: Inspection & Initial Findings
An initial analysis of the codebase and execution of the original test suite revealed several critical gaps:
1. **Heuristic Inadmissibility:** The MST heuristic implemented in A* used direct edge costs (`_undirected_edge_lower_bound`). For non-metric graphs (where triangle inequality is not guaranteed), direct edges do not provide a guaranteed lower bound for the remaining route cost, causing the heuristic to overestimate the true cost. This compromised the theoretical optimality guarantee of A*.
2. **Missing Edge Cases:** The test suite lacked edge case coverage for disconnected graphs, heuristic metric independence, and error branches within the search loops.
3. **Optimality Oracle Defect:** The original brute-force oracle relied on `itertools.permutations`. Because the problem allows for node revisitation if it yields a cheaper cost (or if required by missing direct edges), strict permutation checking is insufficient and could incorrectly penalize the search algorithms for finding a cheaper composite route.
4. **Coverage Gaps:** Test coverage was ~75%, missing visualization branches and multiple algorithm error paths.

## Phase 2 & 3: Test Suite Enhancements & Independent Verification
To ensure a robust and comprehensive evaluation, the test suite (`tests/test_algorithms.py`) was entirely rewritten:
- **Composite-State Dijkstra Oracle:** Replaced the brute-force permutation checker with an independent Dijkstra solver that searches the composite state space `(location, visited)`. This exact oracle guarantees the discovery of the true minimal cost, even in graphs where missing edges or triangle-inequality violations make revisitation optimal.
- **Strict Functional Correctness:** Added rigorous checks to ensure routes start at Sunway University (`SU`), visit all members at least once, match step-by-step path costs exactly, and terminate gracefully.
- **Metric Independence Testing:** Implemented monkeypatching tests to verify that `distance`, `time`, and `carbon` metrics do not unintentionally share graph state or cache structures.

## Phase 4: A* Heuristic Refactoring
To correct the inadmissibility of the A* heuristic, a minimal refactoring was applied to `src/algorithms/astar.py`:
- **Shortest Path Integration:** Instead of using direct edge costs for the Minimum Spanning Tree (MST), the heuristic now computes the All-Pairs Shortest Path cost using Dijkstra's algorithm `get_shortest_path_cost()`.
- **Admissibility Achieved:** By constructing the MST over the true shortest-path metric closure of the remaining nodes, the heuristic is mathematically guaranteed to be <= the true remaining cost, fully restoring A*'s optimality guarantee.
- **Robust Disconnected Handling:** Removed hardcoded `ValueError` crashes in the heuristic calculation when edges are missing. Disconnected components now gracefully evaluate to `h(n) = inf`, correctly steering the algorithm away from dead ends.

## Reproducible Evidence & Coverage
The newly implemented test suite guarantees deterministic execution and achieves near-perfect line and branch coverage across all modules.

**Coverage Report Summary:**
```text
Name                            Stmts   Miss Branch BrPart  Cover   Missing
---------------------------------------------------------------------------
src/__init__.py                     0      0      0      0   100%
src/algorithms/__init__.py          0      0      0      0   100%
src/algorithms/astar.py            97      0     48      0   100%
src/algorithms/gbfs.py             34      0     12      0   100%
src/algorithms/ucs.py              31      0     12      0   100%
src/data/__init__.py                0      0      0      0   100%
src/data/graph.py                  35      0      6      0   100%
src/main.py                        68      1     16      1    98%   114
src/visualization/__init__.py       0      0      0      0   100%
src/visualization/plot.py          60      0     18      0   100%
---------------------------------------------------------------------------
TOTAL                             325      1    112      1    99%
======================== 19 passed, 2 warnings in 4.05s ========================
```
*(The single missing statement is the standard `if __name__ == "__main__":` block in `main.py`, which is excluded by standard test runner invocation.)*

**Automated Test Invocations**
The full test suite can be reproducibly executed at any time using:
```bash
pytest tests/ --cov=src --cov-report=term-missing --cov-branch
```
