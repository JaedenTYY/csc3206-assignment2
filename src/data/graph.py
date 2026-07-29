"""
src/data/graph.py
-----------------
Distance, travel time, and carbon emission matrices from Assignment 1.
All data sourced from Google Maps (off-peak weekday, driving mode).

Nodes:
    SU  = Sunway University (start)
    M1  = Jaeden   (Tanamera, Subang Jaya)
    M2  = Evan     (USJ Heights, Subang Jaya)
    M3  = Wai      (Bandar Sunway)
    M4  = Sohom    (USJ 1)
    M5  = Raymond  (Taman Eng Ann, Klang)
    M6  = Chin     (Petaling Jaya)
"""

NODES = ["SU", "M1", "M2", "M3", "M4", "M5", "M6"]
MEMBERS = ["M1", "M2", "M3", "M4", "M5", "M6"]

# Shared presentation metadata. Both visualizations consume these values so
# node names and relative positions cannot drift apart.
NODE_LOCATIONS = {
    "SU": "Sunway University",
    "M1": "Tanamera, Subang Jaya",
    "M2": "USJ Heights, Subang Jaya",
    "M3": "Bandar Sunway",
    "M4": "USJ 1",
    "M5": "Taman Eng Ann, Klang",
    "M6": "Petaling Jaya",
}

# Approximate relative positions based on Subang Jaya / Klang Valley geography.
NODE_POSITIONS = {
    "SU": (2.0, 2.0),
    "M1": (3.0, 3.0),
    "M2": (3.5, 1.8),
    "M3": (1.8, 1.5),
    "M4": (3.0, 1.0),
    "M5": (0.0, 2.0),
    "M6": (2.5, 0.5),
}

DATA_SOURCES = {
    "distance": "Assignment 1 Table 1",
    "time": "Assignment 1 Table 3",
    "carbon": "Assignment 1 Table 6",
}

# ── Table 1: Driving Distance (km) ────────────────────────────────────────────
# Source: A1 Table 1
# None = same location / not applicable
DRIVING_DISTANCE = {
    "SU": {"SU": None, "M1": 12.3, "M2": 10.4, "M3": 1.6,  "M4": 4.1,  "M5": 20.4, "M6": 3.3},
    "M1": {"SU": None, "M1": None, "M2": 6.6,  "M3": 14.1, "M4": 7.0,  "M5": 17.2, "M6": 13.3},
    "M2": {"SU": None, "M1": 9.4,  "M2": None, "M3": 10.1, "M4": 8.1,  "M5": 15.7, "M6": 10.5},
    "M3": {"SU": None, "M1": 11.5, "M2": 9.4,  "M3": None, "M4": 3.6,  "M5": 21.1, "M6": 5.5},
    "M4": {"SU": None, "M1": 10.5, "M2": 9.4,  "M3": 5.0,  "M4": None, "M5": 24.8, "M6": 6.6},
    "M5": {"SU": None, "M1": 16.7, "M2": 16.7, "M3": 19.7, "M4": 21.0, "M5": None, "M6": 20.4},
    "M6": {"SU": None, "M1": 15.5, "M2": 9.3,  "M3": 4.9,  "M4": 6.6,  "M5": 19.1, "M6": None},
}

# ── Table 3: Driving Travel Time (minutes) ────────────────────────────────────
# Source: A1 Table 3
DRIVING_TIME = {
    "SU": {"SU": None, "M1": 15, "M2": 15, "M3": 5,  "M4": 11, "M5": 20, "M6": 6},
    "M1": {"SU": None, "M1": None,"M2": 14, "M3": 16, "M4": 15, "M5": 21, "M6": 14},
    "M2": {"SU": None, "M1": 16, "M2": None,"M3": 14, "M4": 15, "M5": 17, "M6": 13},
    "M3": {"SU": None, "M1": 12, "M2": 16, "M3": None,"M4": 9,  "M5": 22, "M6": 7},
    "M4": {"SU": None, "M1": 18, "M2": 19, "M3": 14, "M4": None,"M5": 31, "M6": 15},
    "M5": {"SU": None, "M1": 26, "M2": 28, "M3": 35, "M4": 45, "M5": None,"M6": 35},
    "M6": {"SU": None, "M1": 20, "M2": 16, "M3": 20, "M4": 24, "M5": 35, "M6": None},
}

# ── Table 6: CO₂ Emissions (kg CO₂e) ─────────────────────────────────────────
# Source: A1 Table 6
# Formula: distance_km × 0.16272 (UK Gov GHG 2025, Average Petrol Car)
CARBON_FACTOR_KG_CO2E_PER_KM = 0.16272
CARBON_EMISSIONS = {
    from_node: {
        to_node: (
            None
            if distance is None
            else round(distance * CARBON_FACTOR_KG_CO2E_PER_KM, 4)
        )
        for to_node, distance in row.items()
    }
    for from_node, row in DRIVING_DISTANCE.items()
}

COST_MATRICES = {
    "distance": DRIVING_DISTANCE,
    "time": DRIVING_TIME,
    "carbon": CARBON_EMISSIONS,
}

COST_UNITS = {
    "distance": "km",
    "time": "min",
    "carbon": "kg CO₂e",
}


def validate_metric(metric: str) -> None:
    """Raise ValueError if the requested optimization metric is unsupported."""
    if metric not in COST_MATRICES:
        valid_metrics = ", ".join(sorted(COST_MATRICES))
        raise ValueError(f"Unsupported cost metric: {metric}. Expected one of: {valid_metrics}")


def validate_node(node: str) -> None:
    """Raise ValueError if the node code is not part of the route graph."""
    if node not in NODES:
        valid_nodes = ", ".join(NODES)
        raise ValueError(f"Unknown node: {node}. Expected one of: {valid_nodes}")


def get_cost(from_node: str, to_node: str, metric: str = "distance") -> float:
    """Return the edge cost between two nodes for the given metric."""
    validate_metric(metric)
    validate_node(from_node)
    validate_node(to_node)
    val = COST_MATRICES[metric][from_node][to_node]
    if val is None:
        raise ValueError(f"No edge from {from_node} to {to_node} for metric '{metric}'")
    return val


def get_neighbours(node: str) -> list[str]:
    """Return all reachable nodes from the given node (excludes SU as destination)."""
    validate_node(node)
    return [n for n in NODES if n != node and n != "SU"]


def has_edge(from_node: str, to_node: str, metric: str = "distance") -> bool:
    """Return True if a valid edge exists between two nodes."""
    validate_metric(metric)
    validate_node(from_node)
    validate_node(to_node)
    val = COST_MATRICES[metric][from_node].get(to_node)
    return val is not None


def get_node_label(node: str) -> str:
    """Return a human-readable label for a node."""
    member_names = {
        "M1": "Jaeden",
        "M2": "Evan",
        "M3": "Wai",
        "M4": "Sohom",
        "M5": "Raymond",
        "M6": "Chin",
    }
    if node == "SU":
        return NODE_LOCATIONS[node]
    if node in member_names:
        return f"{member_names[node]} ({NODE_LOCATIONS[node]})"
    return node
