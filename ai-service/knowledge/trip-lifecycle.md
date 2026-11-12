# Trip statuses

A trip moves through these statuses: PLANNED, PICKED_UP, IN_PROGRESS, COMPLETED. A trip can also be CANCELLED. New trips start as PLANNED.

Admins and coordinators can set any trip status. The assigned driver can set PICKED_UP, IN_PROGRESS, COMPLETED or CANCELLED on their own trips only; drivers cannot set a trip back to PLANNED.

When a trip becomes COMPLETED or CANCELLED, its vehicle is released and becomes AVAILABLE again.

# Assignment and dispatch

A coordinator or admin assigns a driver to a trip and can set the vehicle's rate per km. A trip can only be dispatched when it has both a driver and a vehicle assigned. A trip can only be dispatched once; dispatching records the dispatched time.

A PLANNED trip that has a driver and vehicle but no dispatched time is ready to dispatch.

# GPS tracking and cost

While a trip is active the driver's browser records GPS points. Trip distance is the sum of the Haversine distances between consecutive GPS points. Trip cost is the GPS distance in km multiplied by the vehicle's rate per km (default 10 per km).