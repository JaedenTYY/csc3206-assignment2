# 📝 Assignment 2 Report Draft
*This document contains pre-written drafts for the remaining sections of the Group 4 Phase 5 Report. You can copy-paste these into your final report document and modify them as needed.*

---

## 5.1 Problem Description & Assumptions

### Problem Description
This project solves a variation of the classic Traveling Salesperson Problem (TSP) using Artificial Intelligence search algorithms. The objective is to design a "House Visit Tour" that begins at Sunway University and visits the residential locations of all 6 group members (M1 to M6) exactly once, finding the most optimal sequence of visits. The optimization metrics evaluated include total driving distance (km), driving time (minutes), and environmental impact via carbon emissions (kg CO₂e).

### Assumptions
1. **Static Environment:** Traffic conditions, weather, and road closures are assumed to be static. The distance and time matrices represent average off-peak weekday driving conditions sourced from Google Maps.
2. **Infinite Capacity:** The vehicle used for the tour is assumed to have enough fuel and seating capacity for the entire journey without needing mid-route stops.
3. **Graph Connectivity:** The state space graph is fully connected (every member's house can be reached from any other member's house).
4. **No Return to Origin:** Unlike a strict TSP, the agent is not required to return to Sunway University at the end of the tour; the goal state is simply reached once the final unvisited group member is reached.

---

## 5.3 Modifications for Different Configurations

To ensure our AI algorithms were flexible, we parameterized the `metric` evaluation function. Rather than hard-coding driving distance as the heuristic and edge cost, our program accepts three different metrics via the `--cost` CLI argument: `distance`, `time`, and `carbon`.

When evaluating different configurations, the core logic of the A*, UCS, and GBFS algorithms remains identical. However, the `get_cost(from, to, metric)` function dynamically looks up the corresponding matrix from Assignment 1. Furthermore, our A* MST-based heuristic dynamically calculates its admissible lower bound using the exact same chosen metric. Because the graph is directed and asymmetric, the heuristic uses exact direct cost for one remaining node and undirected cheaper-direction MST edges for larger remaining sets, ensuring it remains admissible whether we are optimizing for shortest physical distance, fastest travel time, or lowest carbon emissions.

---

## 5.4 Results & Discussion

### Route & Cost Analysis
We successfully implemented and executed three distinct algorithms to solve the tour. When optimizing for **Driving Distance (km)**, the results were as follows:

- **Optimal Route:** `SU → M6 → M3 → M4 → M1 → M2 → M5`
- **Total Distance:** 44.60 km

### Algorithm Comparison
| Algorithm | Cost (km) | Nodes Expanded | Optimality |
|-----------|-----------|----------------|------------|
| **A\* Search (with MST)** | 44.60 | 11 | Optimal |
| **Uniform Cost Search (UCS)** | 44.60 | 132 | Optimal |
| **Greedy Best-First Search (GBFS)** | 60.70 | 7 | Suboptimal |

### Discussion
The comparison table clearly highlights the strengths and weaknesses of each search strategy:

1. **A* vs UCS:** Both A* and UCS found the exact same optimal route (44.60 km). However, UCS operated blindly, expanding radially in all directions resulting in **132 nodes expanded**. In contrast, A* utilized the Minimum Spanning Tree (MST) heuristic to intelligently guide the search toward the goal, finding the optimal path after expanding only **11 nodes**. This demonstrates a massive 91% reduction in computational effort, proving the immense value of an admissible and informed heuristic.
2. **Greedy Best-First Search:** GBFS was the fastest algorithm, expanding only 7 nodes. However, because it only looks at the heuristic $h(n)$ and ignores the accumulated travel cost $g(n)$, it greedily took poor long-term paths, resulting in a suboptimal total distance of **60.70 km** (a 36% increase in distance compared to the optimal route).

---

## 5.6 AI Usage Transparency

*Below is a template for your AI Usage Transparency section. Fill in any additional details if you used AI for anything else.*

In accordance with academic integrity guidelines, we transparently declare the use of AI assistants (Google Gemini) during the development of this assignment. 

**How AI was used:**
- **Code Refactoring & Styling:** AI was utilized to format the terminal outputs into clean, readable tables and to generate the `matplotlib` network visualization code (`src/visualization/plot.py`).
- **Documentation Generation:** AI assisted in drafting the Markdown documentation (such as `README.md`, `ALGORITHM_IMPLEMENTATION.md`, and `TESTING.md`), formatting our Mermaid flowchart diagrams, and restructuring our `TASKS.md` board.
- **Unit Testing:** AI was used to help write edge-case mathematical tests for the MST heuristic and graph matrix bounds in `tests/test_algorithms.py`.

**What AI was NOT used for:**
- The core algorithmic logic (A*, UCS, GBFS) and problem formulation were designed and implemented manually based on the Assignment 1 report matrices.
- The raw data collection (distances, times, carbon emissions) was collected manually via Google Maps.
