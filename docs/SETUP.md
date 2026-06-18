# ⚙️ SETUP.md — Environment & Execution Guide

## Prerequisites

- Python **3.10+**
- pip

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd csc3206-a2

pip install -r requirements.txt
```

---

## 2. Run

```bash
# Run with default cost metric (driving distance, km)
python src/main.py

# Run with driving time as cost metric
python src/main.py --cost time

# Run with CO₂ emissions as cost metric
python src/main.py --cost carbon

# Run all three algorithms and compare
python src/main.py --compare

# Run with route visualization (opens matplotlib window)
python src/main.py --visualize

# Combine flags
python src/main.py --compare --visualize --cost time
```

---

## 3. Expected Console Output

```
============================================================
  CSC3206 AI Assignment 2 — House Visit Tour
  Algorithm: A* Search (MST Heuristic)
  Cost Metric: Driving Distance (km)
============================================================

Starting from: Sunway University (SU)

Searching...

✅ Solution Found!
   Route: SU → M3 → M6 → M4 → M2 → M1 → M5
   Total Distance: XX.X km
   Nodes Expanded: XX

Node-by-Node Breakdown:
  SU → M3 : 1.6 km
  M3 → M6 : 5.5 km
  ...

============================================================
```

---

## 4. Dependencies

| Package | Purpose |
|---------|---------|
| `networkx` | Graph data structure |
| `matplotlib` | Route visualization |
| `numpy` | Matrix operations |
| `heapq` | Built-in — priority queue (no install needed) |

---

## 5. Troubleshooting

**`ModuleNotFoundError`** — Run `pip install -r requirements.txt` again inside the correct Python environment.

**Visualization window doesn't open** — Make sure you have a display. On WSL/headless Linux, add `matplotlib.use('Agg')` and save to file instead.

**Wrong route output** — Check `src/data/graph.py` distance matrices match Assignment 1 Table 1 values exactly.
