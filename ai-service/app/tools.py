"""Read-only database tools for the LangChain agent (@tool = function calling).

Design rules
- Tools only SELECT. They run inside read_conn() (READ ONLY transaction).
- Filter values are validated against allow-lists; all values are bind parameters.
- Numbers the model sees (load %, GPS km, excess %) are computed HERE in code,
  so the LLM never does arithmetic on business data.
- A failing tool returns {"error": ...} so the agent can recover instead of crashing.
"""
import functools
import json
import logging
import math
from typing import Any

from langchain.tools import tool

from .db import jsonable, read_conn, rows

log = logging.getLogger("cargosync.ai.tools")

REQUEST_STATUSES = {"PENDING", "APPROVED", "REJECTED", "CONSOLIDATED"}
TRIP_STATUSES = {"PLANNED", "PICKED_UP", "IN_PROGRESS", "COMPLETED", "CANCELLED"}
VEHICLE_STATUSES = {"AVAILABLE", "IN_USE", "MAINTENANCE"}
CLAIM_STATUSES = {"PENDING", "APPROVED", "REJECTED"}
PRIORITIES = {"LOW", "MEDIUM", "HIGH"}

NOW_UTC = "(now() AT TIME ZONE 'utc')"  # Prisma stores timestamps as UTC without tz


# ----------------------------------------------------------------- helpers
def _enum(value: Any, allowed: set[str], name: str) -> str | None:
    if value is None or value == "":
        return None
    v = str(value).upper()
    if v not in allowed:
        raise ValueError(f"{name} must be one of {sorted(allowed)}")
    return v


def _limit(value: Any, default: int = 20, hi: int = 50) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        n = default
    return max(1, min(n, hi))


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Mirror of lib/engine/cost.js so the AI sees the same distance the app computes."""
    r = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng / 2) ** 2
    )
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _safe(fn):
    """Run the tool, return JSON text; turn any failure into {"error": ...}."""

    @functools.wraps(fn)
    async def wrapper(*args, **kwargs):
        try:
            return json.dumps(jsonable(await fn(*args, **kwargs)))
        except ValueError as exc:  # bad argument from the model
            return json.dumps({"error": str(exc)})
        except Exception:  # noqa: BLE001 - never let a tool crash the request
            log.exception("Tool %s failed", fn.__name__)
            return json.dumps({"error": "The tool failed to run"})

    return wrapper


# ------------------------------------------------------------------- tools
@tool(parse_docstring=True)
@_safe
async def get_operations_overview(include_attention_flags: bool = True) -> str:
    """Counts of requests, trips, vehicles and claims by status, plus attention flags.

    Flags: overdue open requests, approved requests waiting for a trip, planned trips
    missing a driver or vehicle, ready-but-undispatched trips. Call this first for broad
    questions or briefings.

    Args:
        include_attention_flags: If true (default), also return the attention flags described above.
    """
    async with read_conn() as c:
        requests = await c.fetch('SELECT status::text AS status, COUNT(*)::int AS count FROM "Request" GROUP BY 1')
        trips = await c.fetch('SELECT status::text AS status, COUNT(*)::int AS count FROM "Trip" GROUP BY 1')
        vehicles = await c.fetch('SELECT status::text AS status, COUNT(*)::int AS count FROM "Vehicle" GROUP BY 1')
        claims = await c.fetch('SELECT status::text AS status, COUNT(*)::int AS count FROM "Claim" GROUP BY 1')
        flags: dict = {}
        if include_attention_flags:
            flags = {
                "overdue_open_requests": await c.fetchval(
                    f"""SELECT COUNT(*)::int FROM "Request"
                        WHERE status::text IN ('PENDING','APPROVED') AND required_at < {NOW_UTC}"""
                ),
                "approved_requests_waiting_for_trip": await c.fetchval(
                    """SELECT COUNT(*)::int FROM "Request" WHERE status::text = 'APPROVED' AND trip_id IS NULL"""
                ),
                "planned_trips_without_driver": await c.fetchval(
                    """SELECT COUNT(*)::int FROM "Trip" WHERE status::text = 'PLANNED' AND driver_id IS NULL"""
                ),
                "planned_trips_without_vehicle": await c.fetchval(
                    """SELECT COUNT(*)::int FROM "Trip" WHERE status::text = 'PLANNED' AND vehicle_id IS NULL"""
                ),
                "ready_but_undispatched_trips": await c.fetchval(
                    """SELECT COUNT(*)::int FROM "Trip"
                       WHERE status::text = 'PLANNED' AND dispatched_at IS NULL
                         AND driver_id IS NOT NULL AND vehicle_id IS NOT NULL"""
                ),
            }
    return {
        "requests_by_status": rows(requests),
        "trips_by_status": rows(trips),
        "vehicles_by_status": rows(vehicles),
        "claims_by_status": rows(claims),
        **flags,
    }


@tool(parse_docstring=True)
@_safe
async def list_requests(
    status: str = "", priority: str = "", unassigned_only: bool = False, limit: int = 20
) -> str:
    """List transport requests with requester, weight, priority, due time and an overdue flag.

    Args:
        status: Optional filter: PENDING, APPROVED, REJECTED or CONSOLIDATED. Empty for all.
        priority: Optional filter: LOW, MEDIUM or HIGH. Empty for all.
        unassigned_only: If true, only requests not yet attached to a trip.
        limit: Max rows to return, 1 to 50.
    """
    status = _enum(status, REQUEST_STATUSES, "status")
    priority = _enum(priority, PRIORITIES, "priority")
    async with read_conn() as c:
        recs = await c.fetch(
            f"""
            SELECT r.id, r.title, r.destination, r.weight_kg,
                   r.priority::text AS priority, r.status::text AS status,
                   r.required_at, r.trip_id, r.is_external,
                   u.name AS requester, u.department,
                   (r.required_at < {NOW_UTC} AND r.status::text IN ('PENDING','APPROVED')) AS overdue
            FROM "Request" r
            LEFT JOIN "User" u ON u.id = r.user_id
            WHERE ($1::text IS NULL OR r.status::text = $1)
              AND ($2::text IS NULL OR r.priority::text = $2)
              AND (NOT $3::boolean OR r.trip_id IS NULL)
            ORDER BY r.required_at ASC
            LIMIT $4
            """,
            status, priority, bool(unassigned_only), _limit(limit),
        )
    return rows(recs)


@tool(parse_docstring=True)
@_safe
async def list_trips(status: str = "", limit: int = 20) -> str:
    """List trips with vehicle, driver, number of requests, total weight and load percentage.

    Args:
        status: Optional filter: PLANNED, PICKED_UP, IN_PROGRESS, COMPLETED or CANCELLED. Empty for all.
        limit: Max rows to return, 1 to 50.
    """
    status = _enum(status, TRIP_STATUSES, "status")
    async with read_conn() as c:
        recs = await c.fetch(
            """
            SELECT t.id, t.destination, t.status::text AS status, t.scheduled_at, t.dispatched_at,
                   v.name AS vehicle_name, v.plate AS vehicle_plate, v.capacity_kg,
                   d.name AS driver_name,
                   COUNT(r.id)::int AS request_count,
                   COALESCE(SUM(r.weight_kg), 0) AS total_weight_kg
            FROM "Trip" t
            LEFT JOIN "Vehicle" v ON v.id = t.vehicle_id
            LEFT JOIN "User" d ON d.id = t.driver_id
            LEFT JOIN "Request" r ON r.trip_id = t.id
            WHERE ($1::text IS NULL OR t.status::text = $1)
            GROUP BY t.id, v.id, d.id
            ORDER BY t.scheduled_at DESC
            LIMIT $2
            """,
            status, _limit(limit),
        )
    out = rows(recs)
    for t in out:
        cap = t.get("capacity_kg")
        t["load_pct"] = round(100 * t["total_weight_kg"] / cap, 1) if cap else None
    return out


@tool(parse_docstring=True)
@_safe
async def get_trip_details(trip_id: str) -> str:
    """Full detail for ONE trip: requests, waypoints, GPS-derived distance, estimated cost and claims.

    Args:
        trip_id: The trip id.
    """
    trip_id = str(trip_id).strip()
    if not trip_id:
        return {"error": "trip_id is required"}
    async with read_conn() as c:
        trip = await c.fetchrow(
            """
            SELECT t.id, t.destination, t.status::text AS status, t.scheduled_at, t.dispatched_at,
                   v.name AS vehicle_name, v.plate AS vehicle_plate, v.capacity_kg, v.rate_per_km,
                   d.name AS driver_name
            FROM "Trip" t
            LEFT JOIN "Vehicle" v ON v.id = t.vehicle_id
            LEFT JOIN "User" d ON d.id = t.driver_id
            WHERE t.id = $1
            """,
            trip_id,
        )
        if trip is None:
            return {"error": f"No trip found with id {trip_id}"}
        reqs = await c.fetch(
            """SELECT id, title, destination, weight_kg, priority::text AS priority,
                      status::text AS status, required_at
               FROM "Request" WHERE trip_id = $1 ORDER BY required_at""",
            trip_id,
        )
        waypoints = await c.fetch(
            'SELECT label, "order" FROM "Waypoint" WHERE trip_id = $1 ORDER BY "order"', trip_id
        )
        gps = await c.fetch(
            'SELECT lat, lng, "timestamp" FROM "GpsLog" WHERE trip_id = $1 ORDER BY "timestamp"', trip_id
        )
        claims = await c.fetch(
            """SELECT c.id, c.type::text AS type, c.claimed_km, c.claimed_minutes, c.reason,
                      c.status::text AS status, c.verdict, c.actual_km
               FROM "Claim" c WHERE c.trip_id = $1 ORDER BY c.created_at""",
            trip_id,
        )

    result = jsonable(dict(trip))
    req_rows = rows(reqs)
    total_weight = sum(r["weight_kg"] or 0 for r in req_rows)
    cap = result.get("capacity_kg")
    km = round(sum(_haversine_km(a["lat"], a["lng"], b["lat"], b["lng"]) for a, b in zip(gps, gps[1:])), 2)
    rate = result.get("rate_per_km")

    result["requests"] = req_rows
    result["waypoints"] = rows(waypoints)
    result["total_weight_kg"] = total_weight
    result["load_pct"] = round(100 * total_weight / cap, 1) if cap else None
    result["gps"] = {
        "points": len(gps),
        "actual_km": km,
        "first_point_at": jsonable(gps[0]["timestamp"]) if gps else None,
        "last_point_at": jsonable(gps[-1]["timestamp"]) if gps else None,
    }
    result["estimated_cost"] = round(km * rate, 2) if rate is not None else None
    result["claims"] = rows(claims)
    return result


@tool(parse_docstring=True)
@_safe
async def list_vehicles(status: str = "") -> str:
    """List vehicles with capacity, status, open trips and committed load percentage.

    Args:
        status: Optional filter: AVAILABLE, IN_USE or MAINTENANCE. Empty for all.
    """
    status = _enum(status, VEHICLE_STATUSES, "status")
    async with read_conn() as c:
        recs = await c.fetch(
            """
            SELECT v.id, v.name, v.plate, v.capacity_kg, v.rate_per_km, v.status::text AS status,
                   (SELECT COUNT(*)::int FROM "Trip" t
                     WHERE t.vehicle_id = v.id
                       AND t.status::text IN ('PLANNED','PICKED_UP','IN_PROGRESS')) AS open_trips,
                   COALESCE((SELECT SUM(r.weight_kg) FROM "Request" r
                              JOIN "Trip" t ON t.id = r.trip_id
                             WHERE t.vehicle_id = v.id
                               AND t.status::text IN ('PLANNED','PICKED_UP','IN_PROGRESS')), 0) AS committed_weight_kg
            FROM "Vehicle" v
            WHERE ($1::text IS NULL OR v.status::text = $1)
            ORDER BY v.name
            """,
            status,
        )
    out = rows(recs)
    for v in out:
        cap = v.get("capacity_kg")
        v["committed_load_pct"] = round(100 * v["committed_weight_kg"] / cap, 1) if cap else None
    return out


@tool(parse_docstring=True)
@_safe
async def list_claims(status: str = "", limit: int = 20) -> str:
    """List driver claims (EXTRA_KM / WAITING_TIME) with the rules engine's verdict and claimed vs actual GPS km.

    Args:
        status: Optional filter: PENDING, APPROVED or REJECTED. Empty for all.
        limit: Max rows to return, 1 to 50.
    """
    status = _enum(status, CLAIM_STATUSES, "status")
    async with read_conn() as c:
        recs = await c.fetch(
            """
            SELECT c.id, c.trip_id, t.destination AS trip_destination, u.name AS submitted_by,
                   c.type::text AS type, c.claimed_km, c.claimed_minutes, c.reason,
                   c.status::text AS status, c.verdict, c.actual_km, c.created_at
            FROM "Claim" c
            JOIN "Trip" t ON t.id = c.trip_id
            JOIN "User" u ON u.id = c.submitted_by
            WHERE ($1::text IS NULL OR c.status::text = $1)
            ORDER BY c.created_at DESC
            LIMIT $2
            """,
            status, _limit(limit),
        )
    out = rows(recs)
    for cl in out:
        if cl.get("claimed_km") is not None and cl.get("actual_km"):
            cl["claimed_vs_actual_pct"] = round(100 * (cl["claimed_km"] - cl["actual_km"]) / cl["actual_km"], 1)
    return out


TOOLS = [
    get_operations_overview,
    list_requests,
    list_trips,
    get_trip_details,
    list_vehicles,
    list_claims,
]