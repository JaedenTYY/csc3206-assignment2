"""
src/visualization/plot.py
-------------------------
Route visualization using matplotlib + networkx.
Renders the 7-node graph and highlights the optimal route.
"""

import os
import matplotlib.pyplot as plt
import networkx as nx
from src.data.graph import NODES, COST_MATRICES, COST_UNITS, get_node_label, validate_metric

# Approximate relative positions (x, y) for layout
# Based on Subang Jaya / Klang Valley geography
NODE_POSITIONS = {
    "SU": (2.0, 2.0),
    "M1": (3.0, 3.0),
    "M2": (3.5, 1.8),
    "M3": (1.8, 1.5),
    "M4": (3.0, 1.0),
    "M5": (0.0, 2.0),
    "M6": (2.5, 0.5),
}

NODE_COLORS = {
    "SU": "#4A90D9",   # Blue — start
    "M1": "#E74C3C",
    "M2": "#E67E22",
    "M3": "#2ECC71",
    "M4": "#9B59B6",
    "M5": "#1ABC9C",
    "M6": "#F39C12",
}


def build_route_edge_labels(route: list[str], metric: str) -> dict[tuple[str, str], str]:
    """Return formatted route-edge labels for the selected metric."""
    validate_metric(metric)
    unit = COST_UNITS[metric]
    matrix = COST_MATRICES[metric]
    labels = {}

    for u, v in zip(route, route[1:]):
        value = matrix[u][v]
        if value is not None:
            labels[(u, v)] = f"{value:.1f} {unit}"

    return labels


def plot_route(result: dict, output_path: str = "assets/route_output.png", show: bool = True) -> None:
    """Render the graph and highlight the solution route."""
    if "error" in result:
        print("No route to visualize.")
        return

    route = result["route"]
    metric = result["metric"]
    validate_metric(metric)
    unit = COST_UNITS[metric]
    matrix = COST_MATRICES[metric]

    G = nx.DiGraph()
    G.add_nodes_from(NODES)

    # Add all edges with weights for the selected metric.
    for frm in NODES:
        for to in NODES:
            if frm != to and matrix[frm][to] is not None:
                G.add_edge(frm, to, weight=matrix[frm][to])

    # Route edges
    route_edges = [(route[i], route[i + 1]) for i in range(len(route) - 1)]

    fig, ax = plt.subplots(figsize=(12, 8))
    ax.set_facecolor("#F8F9FA")
    fig.patch.set_facecolor("#F8F9FA")

    pos = NODE_POSITIONS
    node_colors = [NODE_COLORS.get(n, "#95A5A6") for n in G.nodes()]

    # Draw all edges (light gray)
    nx.draw_networkx_edges(G, pos, ax=ax, edge_color="#CCCCCC",
                           arrows=True, arrowsize=10, width=0.8, alpha=0.5)

    # Draw route edges (highlighted)
    nx.draw_networkx_edges(G, pos, edgelist=route_edges, ax=ax,
                           edge_color="#E74C3C", arrows=True,
                           arrowsize=20, width=2.5, alpha=0.9,
                           connectionstyle="arc3,rad=0.1")

    # Draw nodes
    nx.draw_networkx_nodes(G, pos, ax=ax, node_color=node_colors,
                           node_size=800, alpha=0.95)

    # Node labels
    nx.draw_networkx_labels(G, pos, ax=ax, font_size=9,
                            font_color="white", font_weight="bold")

    # Edge labels (only on route) for the selected metric.
    edge_labels = build_route_edge_labels(route, metric)
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels,
                                 ax=ax, font_size=7, font_color="#C0392B")

    # Legend / info box
    route_str = " → ".join(route)
    info = (
        f"Algorithm: {result['algorithm']}\n"
        f"Route: {route_str}\n"
        f"Total {metric}: {result['total_cost']:.2f} {unit}\n"
        f"Nodes expanded: {result['nodes_expanded']}"
    )
    ax.text(0.02, 0.02, info, transform=ax.transAxes, fontsize=8,
            verticalalignment="bottom",
            bbox=dict(boxstyle="round,pad=0.4", facecolor="white", alpha=0.85))

    # Node name legend
    for i, node in enumerate(NODES):
        ax.plot([], [], "o", color=NODE_COLORS.get(node, "#95A5A6"),
                label=f"{node}: {get_node_label(node)}", markersize=8)
    ax.legend(loc="upper right", fontsize=7, framealpha=0.9)

    ax.set_title("CSC3206 AI Assignment 2 — House Visit Tour\nOptimal Route (red arrows)",
                 fontsize=13, fontweight="bold", pad=15)
    ax.axis("off")

    plt.tight_layout()
    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    print(f"📊 Visualization saved to {output_path}")
    if show:
        plt.show()
    plt.close(fig)
