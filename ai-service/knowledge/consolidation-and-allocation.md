# Consolidation engine

The consolidation engine groups APPROVED requests that are not yet attached to a trip. Two requests are grouped together when they have the same destination (compared case-insensitively, ignoring leading and trailing spaces) and their required times are within 2 hours of the first request in the group.

Each group becomes one trip. The trip is scheduled at the required time of the group's first request. All requests in the group are set to CONSOLIDATED and linked to the trip.

Requests with different destinations, or required times more than 2 hours apart, are never merged. A request that is still PENDING or REJECTED is never consolidated.

# Vehicle allocation

For each group, the allocation engine picks the smallest AVAILABLE vehicle whose capacity in kg is at least the group's total weight. Vehicles in IN_USE or MAINTENANCE status are never allocated.

If no available vehicle is large enough, the trip is still created but with no vehicle assigned, and a coordinator must resolve it. When a vehicle is allocated its status changes to IN_USE. It returns to AVAILABLE when the trip is COMPLETED or CANCELLED.

# Waypoint ordering

Stops on a trip are ordered by request priority first (HIGH, then MEDIUM, then LOW), and then by the earliest required time.