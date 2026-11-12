# Roles

ADMIN: full access, including user and vehicle management. COORDINATOR: approves or rejects requests, runs consolidation, assigns drivers, dispatches trips, reviews claims and views vehicles. DEPT_USER: submits transport requests and sees only their own requests. DRIVER: sees and updates only their own trips, shares GPS, and submits claims.

Only ADMIN and COORDINATOR can use the AI assistant.

# Request lifecycle

A new request starts as PENDING. An admin or coordinator approves it (APPROVED) or rejects it (REJECTED). Approved requests wait for the consolidation run, which attaches them to a trip and sets them to CONSOLIDATED.

Each request has a destination, weight in kg, a priority (LOW, MEDIUM, HIGH) and a required time. Requests can also come from the public submission form; those are marked as external and carry contact details instead of a user.

A request is overdue when it is still PENDING or APPROVED and its required time has already passed.