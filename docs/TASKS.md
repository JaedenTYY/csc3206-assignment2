# 📋 TASKS.md — Assignment 2 Task Board

> **Deadline: 2 August 2026, 23:59 (End of Week 12)**  
> Update status as you go: `[ ]` → `[~]` (in progress) → `[x]` (done)

---

## 🔴 Phase 1 — Setup (Week 8–9)

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 1.1 | Create GitHub repo & invite all members | Evan | `[x]` | Done |
| 1.2 | Confirm algorithm choice for implementation | All | `[x]` | A* recommended from A1 |
| 1.3 | Set up Python project structure | Sohom | `[x]` | See `src/` |
| 1.4 | Encode distance matrix from A1 Table 1 | Raymond | `[x]` | `src/data/graph.py` |
| 1.5 | Encode travel time matrix from A1 Table 3 | Chin | `[x]` | `src/data/graph.py` |
| 1.6 | Encode carbon emission matrix from A1 Table 6 | Jaeden | `[x]` | `src/data/graph.py` |

---

## 🟡 Phase 2 — Core Implementation (Week 9–10)

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 2.1 | Implement state representation `(location, visited_set)` | Wai | `[x]` | Based on A1 §2.2 |
| 2.2 | Implement graph / transition model | Evan | `[x]` | Based on A1 §2.5 |
| 2.3 | Implement chosen algorithm (`src/algorithms/`) | Chin | `[x]` | A* or UCS |
| 2.4 | Implement UCS for comparison | Jaeden | `[x]` | `src/algorithms/ucs.py` |
| 2.5 | Implement GBFS for comparison | Raymond | `[x]` | `src/algorithms/gbfs.py` |
| 2.6 | Implement admissible MST-based heuristic for A* | Wai | `[x]` | `src/algorithms/astar.py` |
| 2.7 | Wire `main.py` entry point with CLI args | Sohom | `[x]` | `--compare`, `--visualize` |

---

## 🟢 Phase 3 — Output & Visualization (Week 10–11)

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 3.1 | Print optimal route + total cost to console | All | `[x]` | Required for code marks |
| 3.2 | Implement route visualization (matplotlib/networkx) | Evan | `[x]` | `src/visualization/plot.py` |
| 3.3 | Comparison table output (nodes expanded, cost, time) | Raymond | `[x]` | Print or export to CSV |
| 3.4 | Add map background (optional, bonus) | Chin | `[ ]` | Not implemented; current output uses networkx schematic |

---

## 🔵 Phase 4 — Testing & Polish (Week 11)

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 4.1 | Write unit tests for algorithm correctness | Wai | `[x]` | `tests/test_algorithms.py` |
| 4.2 | Verify all 6 members visited in output route | All | `[x]` | Goal state check |
| 4.3 | Test with different cost metrics (distance vs time vs CO₂) | Evan | `[x]` | Parameterise cost fn |
| 4.4 | Clean up code + add docstrings | All | `[x]` | Before submission |
| 4.5 | Final `README.md` / `SETUP.md` review | Jaeden | `[x]` | Must have run instructions |
| 4.6 | Add robust optimality, CLI, heuristic, and visualization tests | All | `[x]` | `15 passed` via `python -m pytest -q` |

---

## 📝 Phase 5 — Report (Week 11–12)

| # | Section | Owner | Status | Word/Page Target |
|---|---------|-------|--------|-----------------|
| 5.1 | Problem description + assumptions | Sohom | `[ ]` | ~1 page |
| 5.2 | Implementation explanation (state, cost fn, transitions) | Jaeden + Evan | `[ ]` | ~3 pages |
| 5.3 | Modifications for different configurations | Chin | `[ ]` | ~1 page |
| 5.4 | Results + discussion (route, cost, comparison) | Wai | `[ ]` | ~2 pages |
| 5.5 | Evidence of group discussion (screenshots) | Raymond | `[ ]` | Screenshots |
| 5.6 | AI usage transparency | All | `[ ]` | Prompts + outputs |
| 5.7 | Individual reflections (≤300 words each) | Each member | `[ ]` | 300 words max |
| 5.8 | Presentation video link in appendix | Sohom | `[ ]` | Must be shareable |
| 5.9 | Compile + proofread full report | Raymond | `[ ]` | Final check |

---

## 🎥 Phase 6 — Presentation Video (Week 12)

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 6.1 | Record code demo (live execution) | Chin | `[ ]` | Must show output |
| 6.2 | Record explanation slides (algorithm, formulation) | All | `[ ]` | Keep under 10 min total |
| 6.3 | Upload to OneDrive / Google Drive | Wai | `[ ]` | "Anyone with link" access |
| 6.4 | Paste shareable link into report appendix | Jaeden | `[ ]` | Required |

---

## ✅ Final Submission Checklist

- [x] `main.py` runs without errors on a fresh Python environment
- [x] Output shows the optimal route and total cost (text)
- [x] Visualization renders correctly
- [x] `SETUP.md` / `README.md` has clear run instructions
- [x] Automated tests pass
- [ ] Report PDF submitted on portal
- [ ] Code folder zipped and submitted on portal
- [ ] Video link in report appendix, access set to public

---

## 🗓️ Internal Deadlines (Suggested)

| Milestone | Date |
|-----------|------|
| Algorithm + data layer working | 13 July 2026 |
| Visualization working | 20 July 2026 |
| Report first draft | 25 July 2026 |
| Video recorded | 28 July 2026 |
| Final review + submit | 1 August 2026 |
