# 🧠 FORMULATION.md — AI Problem Formulation Reference

> Extracted from Assignment 1 §2.0 for quick reference during implementation.

---

## State Representation

A state is a tuple `(L, V)` where:
- `L` — current location ∈ `{SU, M1, M2, M3, M4, M5, M6}`
- `V` — visited set ⊆ `{M1, M2, M3, M4, M5, M6}`

```python
# In code:
state = ("SU", frozenset())           # Initial state
state = ("M3", frozenset(["M3"]))     # After visiting M3
state = ("M5", frozenset(["M1","M2","M3","M4","M5","M6"]))  # Goal state
```

**Total state space size:** 7 locations × 2⁶ visited subsets = **448 possible states**

---

## Initial State

```
s0 = (SU, {})
```
Vehicle at Sunway University, no members visited yet.

---

## Goal State

```
sg = (Lg, {M1, M2, M3, M4, M5, M6})
```
All 6 members visited. Final location `Lg` can be any member node.

```python
def is_goal(state):
    location, visited = state
    return visited == frozenset(["M1","M2","M3","M4","M5","M6"])
```

---

## Actions

From any state `(L, V)`, the agent can drive to any other node `L' ≠ L`:

```python
ALL_NODES = ["SU", "M1", "M2", "M3", "M4", "M5", "M6"]

def get_actions(state):
    location, visited = state
    return [n for n in ALL_NODES if n != location]
```

---

## Transition Model

```python
def result(state, action):
    location, visited = state
    new_location = action
    new_visited = visited | {new_location} if new_location != "SU" else visited
    return (new_location, frozenset(new_visited))
```

---

## Path Cost Functions

Three metrics available — all from Assignment 1 data tables:

| Metric | Source | Unit |
|--------|--------|------|
| Driving Distance | A1 Table 1 | km |
| Driving Time | A1 Table 3 | minutes |
| CO₂ Emissions | A1 Table 6 | kg CO₂e |

```python
# Step cost: driving distance
def step_cost(from_node, to_node, metric="distance"):
    return COST_MATRICES[metric][from_node][to_node]

# Cumulative cost g(n) = sum of step costs from start to n
```

---

## A* Heuristic — MST (Prim's Algorithm)

For a state `(L, V)`, the heuristic `h(n)` estimates the minimum cost to visit all remaining unvisited nodes.

**Remaining nodes** = `{M1..M6} - V`

The MST of the remaining nodes (using driving distances) gives an admissible lower bound, since any tour visiting all remaining nodes must use at least as many edges as the MST.

```python
def mst_heuristic(state, cost_matrix):
    location, visited = state
    remaining = [n for n in MEMBERS if n not in visited]
    if not remaining:
        return 0
    # Build MST over (remaining ∪ {location}) using Prim's
    # Return total MST weight
    ...
```

**Why admissible:** MST never overestimates — it's the minimum possible cost to connect all nodes without revisiting.

---

## Environment Properties (from A1 §2.1)

| Property | Value |
|----------|-------|
| Observable | Fully observable |
| Deterministic | Yes — fixed edge costs |
| Static | Yes — snapshot data |
| Discrete | Yes — 7 nodes |
| Sequential | Yes — order of visits matters |
| Agent | Single agent |
