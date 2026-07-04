# CargoSync

A logistics consolidation and fleet management platform. Departments submit cargo transport requests, coordinators approve and consolidate them into trips, the system auto-assigns vehicles, drivers track trips with live GPS, and vendor cost claims get validated against actual GPS-derived distance.

Live demo: [cargo-sync-one.vercel.app](https://cargo-sync-one.vercel.app)

---

## What it does

Manually consolidating cargo shipments — figuring out which requests can share a truck, which vehicle fits the load, and whether a transport vendor's mileage claim is honest — is tedious and error-prone at any real volume. CargoSync automates the pipeline end to end:

1. **Request** — a department (or an external party via a public form) submits a shipment request with destination, weight, and priority.
2. **Approve** — a coordinator or admin reviews pending requests and approves or rejects them.
3. **Consolidate** — approved requests bound for the same destination within a 2-hour window are grouped into a single trip, a vehicle is auto-allocated by capacity fit, and a waypoint route is ordered by priority.
4. **Dispatch & track** — a driver is assigned, the trip is dispatched, and GPS pings are logged as it's in progress. A live map renders the trail.
5. **Settle** — actual distance is calculated from the GPS trail (Haversine formula) and used to validate vendor cost claims against a configurable tolerance, catching inflated mileage.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Database | PostgreSQL, via Prisma ORM |
| Auth | Supabase Auth (email/password) |
| Realtime | Supabase Realtime (live KPI counts, activity feed) |
| Maps | Leaflet / React-Leaflet, OpenStreetMap tiles |
| Styling | Tailwind CSS v4 |
| Deployment | Vercel |

## Roles & access control

CargoSync is role-gated at both the page and API level (not just hidden nav links):

| Role | Can do |
|---|---|
| **ADMIN** | Everything — manage vehicles, approve/consolidate requests, view all trips |
| **COORDINATOR** | Approve/reject requests, consolidate into trips, view trips and vehicles (read-only on vehicles) |
| **DEPT_USER** | Submit requests, view own request history, view dashboard KPIs |
| **DRIVER** | View assigned trips, update trip status, log GPS, submit cost claims |

Role checks live in `lib/auth/rbac.js` and are enforced independently in each server page/route — a hidden nav link is never the only line of defense.

## Project structure

```
app/
├── (auth)/login/          # Supabase email/password login
├── (dashboard)/           # Admin / coordinator / dept-user views
│   ├── dashboard/         # KPI cards + live activity feed
│   ├── requests/          # Request list, detail, new-request form
│   ├── trips/             # Trip list, detail (map, cost, claims)
│   ├── vehicles/          # Fleet list (admin can add vehicles)
│   └── admin/             # User management
├── (driver)/driver/       # Driver-only trip views + status updates
├── submit/                # Public, unauthenticated request form
└── api/                   # Route handlers (see below)

components/                # UI, grouped by feature (trips, vehicles, requests, admin, dashboard)

lib/
├── auth/rbac.js           # Role → permission mapping, used everywhere
├── engine/
│   ├── consolidate.js     # Groups requests by destination + time window
│   ├── allocate.js        # Picks smallest vehicle that fits the load
│   ├── route.js           # Orders waypoints by priority, then time
│   ├── gps.js             # Demo GPS simulation
│   └── cost.js            # Haversine distance, trip cost, claim validation
├── supabase/               # Server + browser Supabase clients
└── prisma.js               # Prisma client singleton

prisma/
├── schema.prisma           # Data model (see below)
└── seed.js                 # Demo users, vehicles, requests
```

## API routes

| Route | Methods | Purpose |
|---|---|---|
| `/api/requests` | GET, POST | List / create requests |
| `/api/requests/[id]/approve` | PATCH | Approve or reject a request |
| `/api/public/requests` | POST | Public (unauthenticated) request submission |
| `/api/trips` | GET, POST | List trips / run consolidation to create trips |
| `/api/trips/[id]/assign` | PATCH | Assign a driver to a trip |
| `/api/trips/[id]/dispatch` | PATCH | Mark a trip dispatched |
| `/api/trips/[id]/status` | PATCH | Driver updates trip status |
| `/api/trips/[id]/cost` | GET | Computed distance + cost for a trip |
| `/api/trips/[id]/claim` | GET, POST | Vendor cost claims for a trip |
| `/api/trips/[id]/claim/[claimId]` | PATCH | Approve/reject a claim, with GPS-validated verdict |
| `/api/vehicles` | GET, POST | List / add vehicles |
| `/api/gps` | POST | Log a GPS ping for a trip |
| `/api/admin/users` | GET, POST | User management |
| `/api/auth/role` | GET | Current user's role |

## Data model

Six core entities in `prisma/schema.prisma`:

- **User** — has a `Role` (`ADMIN` / `COORDINATOR` / `DEPT_USER` / `DRIVER`), optional department
- **Request** — a shipment ask: destination, weight, priority, status; optionally external (no `User`, just contact details)
- **Trip** — a consolidated run: destination, status, links to a `Vehicle`, a driver `User`, its `Request`s, `Waypoint`s, `GpsLog`s, and `Claim`s
- **Vehicle** — capacity, per-km rate, status (`AVAILABLE` / `IN_USE` / `MAINTENANCE`)
- **Waypoint** — ordered stop on a trip's route
- **GpsLog** — a timestamped lat/lng ping used to reconstruct the actual route
- **Claim** — a vendor's extra-km or waiting-time claim on a trip, verdictable against GPS-derived actual distance

## Getting started

### Prerequisites
- Node.js 18+
- A PostgreSQL database (e.g. [Supabase](https://supabase.com) — this project uses Supabase for both auth and the database)

### Setup

```bash
git clone https://github.com/yaswanth-hue/CargoSync.git
cd CargoSync
npm install
```

Create a `.env` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_postgres_connection_string      # pooled connection
DIRECT_URL=your_postgres_direct_connection_string # for migrations
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Push the schema and seed demo data:

```bash
npx prisma migrate dev
node prisma/seed.js
```

This creates one demo user per role (`admin@cargosync.com`, `coordinator@cargosync.com`, `dept@cargosync.com`, `driver@cargosync.com`) plus a few sample vehicles — you'll still need to create matching accounts in Supabase Auth with the same emails for login to work.

Run the dev server:

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

### Other scripts

```bash
npm run build   # production build
npm run start   # run the production build
npm run lint    # eslint
```

## Notes on the consolidation logic

- **Grouping** (`lib/engine/consolidate.js`): approved requests are grouped by exact destination string match and a ±2 hour window around `required_at`. This is intentionally simple — no geocoding or fuzzy address matching yet.
- **Vehicle allocation** (`lib/engine/allocate.js`): picks the *smallest available* vehicle whose capacity covers the group's total weight — a greedy first-fit, not a bin-packing optimizer.
- **Route ordering** (`lib/engine/route.js`): waypoints are ordered by priority (`HIGH` → `LOW`), then by required time within the same priority.
- **Distance/cost** (`lib/engine/cost.js`): actual trip distance is the sum of Haversine distances between consecutive GPS log points, and trip cost is `distance × vehicle.rate_per_km`. Claim validation allows a configurable tolerance (default 10%) above actual distance before flagging a claim as invalid.

These are deliberately straightforward heuristics — good starting points to swap for something more sophisticated (real geocoding, a proper VRP solver, etc.) as the fleet scales.