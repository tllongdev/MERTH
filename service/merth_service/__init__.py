"""MERTH route-planning service.

Scrapes Home Depot's interactive store-map SVG for a chosen store, reads each
cart item's drop-pin (x, y) straight off that SVG grid, optimizes the visiting
order with a simulated-annealing Traveling Salesman solver, and renders the
route back onto the real floor plan.
"""

__version__ = "2.0.0"
