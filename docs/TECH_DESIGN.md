Technical Design Document
QueueSense — Adaptive OPD Queue Management System
Version: 1.0  
Stack: Next.js 14 · Supabase · Tailwind CSS · Vercel  

---
Table of Contents
System Architecture
Database Schema
API Endpoints
Folder Structure
Third-Party Services & APIs
Authentication Flow
Deployment Strategy
---
1. System Architecture
1.1 High-Level Architecture Diagram
```
╔══════════════════════════════════════════════════════════════════════╗
║                        EXTERNAL ACTORS                              ║
╠═════════════════════╦════════════════════╦═════════════════════════╣
║   PATIENT (Mobile)  ║  ADMIN/RECEPTIONIST ║    DOCTOR (Tablet)      ║
║   Browser only,     ║  Desktop/Tablet,    ║   Read-only live view   ║
║   no app needed     ║  full dashboard     ║                         ║
╚═════════╦═══════════╩═════════╦══════════╩════════════╦════════════╝
          │                     │                       │
          │ HTTPS               │ HTTPS                 │ HTTPS
          ▼                     ▼                       ▼
╔═════════════════════════════════════════════════════════════════════╗
║                     VERCEL CDN / EDGE NETWORK                       ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  ┌─────────────────────────────────────────────────────────────┐   ║
║  │                  NEXT.JS APPLICATION                         │   ║
║  │                                                              │   ║
║  │  ┌──────────────────┐    ┌──────────────────────────────┐   │   ║
║  │  │   PAGES / APP    │    │       API ROUTES              │   │   ║
║  │  │                  │    │  /api/consent/send            │   │   ║
║  │  │  /               │    │  /api/consent/accept          │   │   ║
║  │  │  /admin          │    │  /api/location/update         │   │   ║
║  │  │  /admin/queue    │    │  /api/queue/recalculate       │   │   ║
║  │  │  /admin/waitlist │    │  /api/queue/override          │   │   ║
║  │  │  /admin/doctors  │    │  /api/queue/lock              │   │   ║
║  │  │  /doctor         │    │  /api/waitlist/resolve        │   │   ║
║  │  │  /patient/share  │    │  /api/patients/no-show        │   │   ║
║  │  │  /patient/status │    │  /api/admin/log               │   │   ║
║  │  │                  │    │  /api/doctors/consultation    │   │   ║
║  │  └──────────────────┘    └──────────────┬───────────────┘   │   ║
║  │                                         │                    │   ║
║  └─────────────────────────────────────────┼────────────────────┘   ║
║                                            │                        ║
╚════════════════════════════════════════════╪════════════════════════╝
                                             │
              ┌──────────────────────────────┼────────────────────────┐
              │                              │                        │
              ▼                              ▼                        ▼
╔═════════════════════╗  ╔════════════════════════╗  ╔══════════════════╗
║   SUPABASE           ║  ║  GOOGLE MAPS API       ║  ║  TWILIO / WATI   ║
║                      ║  ║                        ║  ║                  ║
║  ┌────────────────┐  ║  ║  Distance Matrix API   ║  ║  SMS / WhatsApp  ║
║  │  PostgreSQL DB │  ║  ║  (ETA calculation)     ║  ║  Notifications   ║
║  │  (patients,    │  ║  ║                        ║  ║                  ║
║  │   queue,       │  ║  ╚════════════════════════╝  ╚══════════════════╝
║  │   doctors,     │  ║
║  │   waitlist,    │  ║  ┌────────────────┐
║  │   logs)        │  ║  │  Realtime       │
║  └────────────────┘  ║  │  Subscriptions  │ ← Admin dashboard
║                      ║  │  (queue changes)│   auto-updates
║  ┌────────────────┐  ║  └────────────────┘
║  │  Supabase Auth │  ║
║  │  (JWT, RBAC)   │  ║  ┌────────────────┐
║  └────────────────┘  ║  │  Vercel Cron   │ → /api/queue/recalculate
║                      ║  │  (every 30–60s)│   runs queue engine
║  ┌────────────────┐  ║  └────────────────┘
║  │  Supabase      │  ║
║  │  Storage       │  ║
║  │  (future use)  │  ║
║  └────────────────┘  ║
╚══════════════════════╝
```
1.2 Request Flow — Patient Location Update
```
Patient phone (browser)
  │
  ├─\[1]─ Receives SMS/WhatsApp link: https://queuesense.app/patient/share?token=<jwt>
  │
  ├─\[2]─ Opens link in mobile browser → Next.js page /patient/share
  │        • Page validates token against Supabase (patient\_consent\_tokens table)
  │        • Displays consent screen: "Share location to improve your queue position?"
  │
  ├─\[3]─ Patient taps "Allow" → browser navigator.geolocation.watchPosition() fires
  │        • First reading sent immediately to POST /api/location/update
  │        • Subsequent readings sent every 120 seconds
  │
  ├─\[4]─ /api/location/update:
  │        • Validates token (JWT from URL param)
  │        • Calls Google Maps Distance Matrix API with patient lat/lng → hospital lat/lng
  │        • Receives ETA in seconds
  │        • Writes to patient\_locations table: { patient\_id, lat, lng, eta\_seconds, updated\_at }
  │        • Updates patients table: { eta\_status: 'known', eta\_at: timestamp }
  │
  └─\[5]─ Vercel Cron fires every 30–60s → POST /api/queue/recalculate
           • Reads all active patients for today's date
           • Sorts: known-ETA patients by eta\_seconds ASC, uncertain patients at original\_position
           • Applies lock overrides (locked patients keep their position)
           • Writes updated positions to queue\_entries table
           • Supabase Realtime broadcasts change → Admin dashboard re-renders instantly
```
1.3 Request Flow — Admin Queue Override
```
Admin (browser dashboard)
  │
  ├─\[1]─ Drags patient card to new position in /admin/queue
  │
  ├─\[2]─ Frontend calls PATCH /api/queue/override
  │        Body: { queue\_entry\_id, new\_position, lock: true }
  │
  ├─\[3]─ API route:
  │        • Verifies admin JWT (Supabase Auth)
  │        • Updates queue\_entries: { position: new\_position, is\_locked: true }
  │        • Inserts into admin\_logs: { admin\_id, action: 'OVERRIDE', target\_patient\_id, ... }
  │
  └─\[4]─ Supabase Realtime fires → all connected admin dashboards update live
```
1.4 Component Interaction Map
```
┌─────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APP LAYER                               │
│                                                                     │
│  Client Components          Server Components / API Routes          │
│  ─────────────────          ─────────────────────────────           │
│  <QueueBoard />      ←───── Supabase Realtime subscription          │
│  <PatientCard />     ←───── queue\_entries table changes             │
│  <WaitlistPanel />   ←───── waitlist table changes                  │
│  <DoctorView />      ←───── queue\_entries (filtered)               │
│                                                                     │
│  <ConsentPage />     ──────► POST /api/location/update              │
│  <AdminOverride />   ──────► PATCH /api/queue/override              │
│  <NoShowButton />    ──────► POST /api/patients/no-show             │
│  <LockToggle />      ──────► PATCH /api/queue/lock                  │
│                                                                     │
│  Vercel Cron         ──────► POST /api/queue/recalculate            │
│  (every 30–60s)                    │                                │
│                                    ▼                                │
│                             Queue Sort Engine                        │
│                             (pure function, testable)               │
└─────────────────────────────────────────────────────────────────────┘
```
---
2. Database Schema
All tables live in a single Supabase (PostgreSQL) project. Row-Level Security (RLS) is enabled on all tables.
2.1 Entity Relationship Overview
```
hospitals ──< doctors ──< consultations
    │
    └──< appointments ──< patients
              │
              ├──< queue\_entries
              ├──< patient\_locations
              ├──< patient\_consent\_tokens
              └──< waitlist\_entries

admin\_logs (references appointments, queue\_entries)
```
---
2.2 Table: `hospitals`
Supports future multi-tenant use. Currently one row per installation.
```sql
CREATE TABLE hospitals (
  id            UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
  name          TEXT NOT NULL,
  address       TEXT,
  lat           NUMERIC(10, 7) NOT NULL,   -- Hospital GPS latitude
  lng           NUMERIC(10, 7) NOT NULL,   -- Hospital GPS longitude
  timezone      TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created\_at    TIMESTAMPTZ DEFAULT now()
);
```
Indexes: Primary key only (low-cardinality table).
---
2.3 Table: `doctors`
```sql
CREATE TABLE doctors (
  id                        UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
  hospital\_id               UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name                      TEXT NOT NULL,
  specialty                 TEXT,
  avg\_consultation\_minutes  NUMERIC(5, 2) DEFAULT 10.00,  -- Rolling average, updated after each session
  user\_id                   UUID REFERENCES auth.users(id),  -- Supabase Auth UID for doctor login
  is\_active                 BOOLEAN DEFAULT TRUE,
  created\_at                TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx\_doctors\_hospital ON doctors(hospital\_id);
CREATE INDEX idx\_doctors\_user ON doctors(user\_id);
```
---
2.4 Table: `patients`
Minimal PII. No medical history stored.
```sql
CREATE TABLE patients (
  id            UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
  hospital\_id   UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,              -- E.164 format: +919876543210
  eta\_status    TEXT NOT NULL DEFAULT 'uncertain'
                  CHECK (eta\_status IN ('uncertain', 'known', 'arrived', 'no\_show')),
  eta\_seconds   INTEGER,                   -- Seconds until arrival (null if uncertain)
  eta\_updated\_at TIMESTAMPTZ,
  created\_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx\_patients\_hospital ON patients(hospital\_id);
CREATE INDEX idx\_patients\_phone ON patients(phone);
CREATE INDEX idx\_patients\_eta\_status ON patients(eta\_status);
```
---
2.5 Table: `appointments`
One row per scheduled appointment slot.
```sql
CREATE TABLE appointments (
  id                    UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
  hospital\_id           UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  doctor\_id             UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient\_id            UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  scheduled\_date        DATE NOT NULL,
  scheduled\_time        TIME NOT NULL,
  original\_position     INTEGER NOT NULL,   -- 1-based. Immutable after creation.
  status                TEXT NOT NULL DEFAULT 'scheduled'
                          CHECK (status IN ('scheduled', 'in\_consultation', 'completed', 'no\_show', 'cancelled')),
  consent\_notified\_at   TIMESTAMPTZ,        -- When the 30–45 min notification was sent
  arrived\_at            TIMESTAMPTZ,        -- When patient physically checked in at reception
  created\_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx\_appt\_doctor\_date ON appointments(doctor\_id, scheduled\_date);
CREATE INDEX idx\_appt\_patient ON appointments(patient\_id);
CREATE INDEX idx\_appt\_status ON appointments(status);
CREATE INDEX idx\_appt\_date ON appointments(scheduled\_date);
```
---
2.6 Table: `queue\_entries`
The live, dynamic queue. Rebuilt by the queue engine every 30–60 seconds.
```sql
CREATE TABLE queue\_entries (
  id              UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
  appointment\_id  UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  doctor\_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  queue\_date      DATE NOT NULL,
  position        INTEGER NOT NULL,       -- Current dynamic position (1 = next to be seen)
  is\_locked       BOOLEAN DEFAULT FALSE,  -- If TRUE, queue engine skips this entry
  last\_recalc\_at  TIMESTAMPTZ,            -- When queue engine last touched this row
  updated\_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE (doctor\_id, queue\_date, position)  -- No two patients at same position same doctor same day
);

CREATE INDEX idx\_queue\_doctor\_date ON queue\_entries(doctor\_id, queue\_date);
CREATE INDEX idx\_queue\_appointment ON queue\_entries(appointment\_id);
CREATE INDEX idx\_queue\_position ON queue\_entries(doctor\_id, queue\_date, position);
```
Note: Supabase Realtime is enabled on this table. Any UPDATE here triggers an event broadcast to all subscribed admin/doctor dashboard clients.
---
2.7 Table: `patient\_locations`
Short-lived GPS data. Retained only during the appointment window.
```sql
CREATE TABLE patient\_locations (
  id              UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
  patient\_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment\_id  UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  lat             NUMERIC(10, 7) NOT NULL,
  lng             NUMERIC(10, 7) NOT NULL,
  eta\_seconds     INTEGER,                -- Result of Maps API call
  accuracy\_meters NUMERIC(8, 2),          -- GPS accuracy from browser
  created\_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx\_locations\_patient ON patient\_locations(patient\_id);
CREATE INDEX idx\_locations\_appointment ON patient\_locations(appointment\_id);
CREATE INDEX idx\_locations\_created ON patient\_locations(created\_at DESC);

-- Auto-delete location rows older than 24 hours (pg\_cron or Supabase scheduled function)
-- This enforces the privacy requirement from the PRD
```
---
2.8 Table: `patient\_consent\_tokens`
One-time tokens sent in the SMS/WhatsApp notification link.
```sql
CREATE TABLE patient\_consent\_tokens (
  id              UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
  appointment\_id  UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,   -- Signed JWT or random hex token
  accepted        BOOLEAN DEFAULT FALSE,
  accepted\_at     TIMESTAMPTZ,
  expires\_at      TIMESTAMPTZ NOT NULL,   -- Appointment time + 30 min buffer
  created\_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx\_consent\_token ON patient\_consent\_tokens(token);
CREATE INDEX idx\_consent\_appointment ON patient\_consent\_tokens(appointment\_id);
```
---
2.9 Table: `waitlist\_entries`
Patients wanting an earlier slot.
```sql
CREATE TABLE waitlist\_entries (
  id              UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
  hospital\_id     UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  doctor\_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient\_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  waitlist\_date   DATE NOT NULL,
  urgency\_level   TEXT NOT NULL DEFAULT 'low'
                    CHECK (urgency\_level IN ('low', 'medium', 'high')),
  eta\_seconds     INTEGER,                -- Populated if patient has shared location
  status          TEXT NOT NULL DEFAULT 'waiting'
                    CHECK (status IN ('waiting', 'offered', 'accepted', 'declined', 'expired')),
  created\_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx\_waitlist\_doctor\_date ON waitlist\_entries(doctor\_id, waitlist\_date);
CREATE INDEX idx\_waitlist\_status ON waitlist\_entries(status);
```
---
2.10 Table: `consultations`
Tracks actual consultation start/end for rolling average calculation.
```sql
CREATE TABLE consultations (
  id              UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
  appointment\_id  UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  doctor\_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  started\_at      TIMESTAMPTZ NOT NULL,
  ended\_at        TIMESTAMPTZ,
  duration\_minutes NUMERIC(5, 2)         -- Computed: ended\_at - started\_at
);

CREATE INDEX idx\_consult\_doctor ON consultations(doctor\_id);
CREATE INDEX idx\_consult\_appointment ON consultations(appointment\_id);
```
---
2.11 Table: `admin\_logs`
Audit trail. Append-only.
```sql
CREATE TABLE admin\_logs (
  id              UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
  hospital\_id     UUID NOT NULL REFERENCES hospitals(id),
  admin\_user\_id   UUID NOT NULL REFERENCES auth.users(id),
  action          TEXT NOT NULL
                    CHECK (action IN (
                      'OVERRIDE\_POSITION',
                      'LOCK\_POSITION',
                      'UNLOCK\_POSITION',
                      'MARK\_NO\_SHOW',
                      'MARK\_ARRIVED',
                      'WAITLIST\_OFFER',
                      'WAITLIST\_ACCEPT',
                      'WAITLIST\_DECLINE',
                      'RECALC\_INTERVAL\_CHANGE',
                      'MANUAL\_RECALC'
                    )),
  target\_appointment\_id UUID REFERENCES appointments(id),
  metadata        JSONB,                  -- e.g., { old\_position: 3, new\_position: 1 }
  created\_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx\_logs\_hospital\_date ON admin\_logs(hospital\_id, created\_at DESC);
CREATE INDEX idx\_logs\_admin ON admin\_logs(admin\_user\_id);
```
---
2.12 Row-Level Security (RLS) Policies Summary
```sql
-- patients: hospital staff can read their hospital's patients only
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hospital\_isolation" ON patients
  USING (hospital\_id = (SELECT hospital\_id FROM hospital\_staff WHERE user\_id = auth.uid()));

-- queue\_entries: same isolation
ALTER TABLE queue\_entries ENABLE ROW LEVEL SECURITY;
-- (similar policies for all tables)

-- patient\_locations: only the patient's own token can insert; staff can read
-- admin\_logs: insert only via service role; admins can read their hospital's logs
```
---
2.13 Database Functions (PostgreSQL)
```sql
-- Function: Compute rolling average consultation time for a doctor
CREATE OR REPLACE FUNCTION update\_doctor\_avg\_consultation(p\_doctor\_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE doctors
  SET avg\_consultation\_minutes = (
    SELECT AVG(duration\_minutes)
    FROM consultations
    WHERE doctor\_id = p\_doctor\_id
      AND ended\_at IS NOT NULL
      AND created\_at > NOW() - INTERVAL '30 days'  -- Last 30 days only
  )
  WHERE id = p\_doctor\_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update avg after each consultation ends
CREATE TRIGGER trg\_update\_avg\_consultation
AFTER UPDATE OF ended\_at ON consultations
FOR EACH ROW
WHEN (NEW.ended\_at IS NOT NULL AND OLD.ended\_at IS NULL)
EXECUTE FUNCTION update\_doctor\_avg\_consultation(NEW.doctor\_id);
```
---
3. API Endpoints
Base URL: `https://queuesense.app/api`  
Auth: All admin/doctor endpoints require `Authorization: Bearer <supabase\_jwt>` header.  
Patient endpoints: Authenticated via `?token=<consent\_token>` query param (short-lived JWT).  
Error format: `{ "error": "Human-readable message", "code": "ERROR\_CODE" }`
---
3.1 Consent & Notification
`POST /api/consent/send`
Sends the 30–45 min notification with location-sharing link.  
Called by: Vercel Cron (runs every 5 minutes, checks appointments due in 30–45 min)
	
Auth	Service role (internal cron only)
Request Body	`{ "appointment\_id": "uuid" }`
Response 200	`{ "sent": true, "channel": "whatsapp", "token": "abc123" }`
Response 409	`{ "error": "Notification already sent", "code": "ALREADY\_NOTIFIED" }`
Side effects	Creates row in `patient\_consent\_tokens`; sends WhatsApp/SMS via Twilio; updates `appointments.consent\_notified\_at`
---
`POST /api/consent/accept`
Called when patient taps "Allow" on the consent page.
	
Auth	Token via `?token=` param
Request Body	`{}` (empty — consent is implicit by visiting the page and tapping allow)
Response 200	`{ "accepted": true, "hospital\_lat": 15.43, "hospital\_lng": 75.01 }`
Response 410	`{ "error": "Token expired", "code": "TOKEN\_EXPIRED" }`
Side effects	Updates `patient\_consent\_tokens.accepted = true`
---
3.2 Location Updates
`POST /api/location/update`
Receives patient GPS coordinates, calculates ETA, stores result.
	
Auth	Token via `?token=` param
Request Body	`{ "lat": 15.4321, "lng": 75.0234, "accuracy": 15.5 }`
Response 200	`{ "eta\_seconds": 720, "eta\_minutes": 12, "queue\_position": 3 }`
Response 400	`{ "error": "Invalid coordinates", "code": "INVALID\_COORDS" }`
Side effects	Calls Google Maps Distance Matrix API; inserts `patient\_locations` row; updates `patients.eta\_seconds` and `patients.eta\_status = 'known'`
---
3.3 Queue Management
`GET /api/queue`
Returns the current queue for a doctor on a given date.
	
Auth	Bearer JWT (admin or doctor role)
Query Params	`?doctor\_id=uuid\&date=2026-05-06`
Response 200	See below
```json
{
  "doctor\_id": "uuid",
  "date": "2026-05-06",
  "last\_recalculated\_at": "2026-05-06T09:31:02Z",
  "recalc\_interval\_seconds": 45,
  "queue": \[
    {
      "queue\_entry\_id": "uuid",
      "position": 1,
      "appointment\_id": "uuid",
      "patient": {
        "id": "uuid",
        "name": "Ravi Kumar",
        "phone": "+919876543210"
      },
      "scheduled\_time": "10:00",
      "eta\_status": "known",
      "eta\_seconds": 180,
      "eta\_minutes": 3,
      "is\_locked": false,
      "appointment\_status": "scheduled"
    }
  ]
}
```
---
`POST /api/queue/recalculate`
Core queue engine. Recalculates and persists new positions.
	
Auth	Service role (called by Vercel Cron or admin manual trigger)
Request Body	`{ "doctor\_id": "uuid", "date": "2026-05-06" }`
Response 200	`{ "recalculated": true, "patients\_sorted": 12, "locked\_skipped": 2, "duration\_ms": 87 }`
Queue Engine Logic (pseudocode):
```
1. Fetch all appointments for doctor\_id + date where status = 'scheduled' or 'in\_consultation'
2. Fetch matching queue\_entries with is\_locked flag
3. Separate into:
   a. locked\_entries  → keep their current positions
   b. known\_eta\_entries → sort by eta\_seconds ASC
   c. uncertain\_entries → sort by original\_position ASC
4. Build new position list:
   a. Fill locked positions first (they are immovable)
   b. Fill remaining positions with known\_eta patients (earliest ETA first)
   c. Insert uncertain patients at their original\_position if slot is free, else next available
5. UPSERT queue\_entries with new positions
6. Update last\_recalc\_at on all touched rows
```
---
`PATCH /api/queue/override`
Admin manually moves a patient to a new position.
	
Auth	Bearer JWT (admin role only)
Request Body	`{ "queue\_entry\_id": "uuid", "new\_position": 2, "lock": true }`
Response 200	`{ "updated": true, "position": 2, "is\_locked": true }`
Side effects	Shifts other queue entries to accommodate; inserts `admin\_logs` row
---
`PATCH /api/queue/lock`
Toggles lock on a queue entry without changing position.
	
Auth	Bearer JWT (admin role)
Request Body	`{ "queue\_entry\_id": "uuid", "locked": true }`
Response 200	`{ "queue\_entry\_id": "uuid", "is\_locked": true }`
Side effects	Inserts `admin\_logs` row with action `LOCK\_POSITION` or `UNLOCK\_POSITION`
---
3.4 Patient Status
`POST /api/patients/no-show`
Marks a patient as no-show, triggers waitlist resolution.
	
Auth	Bearer JWT (admin role)
Request Body	`{ "appointment\_id": "uuid" }`
Response 200	`{ "marked": true, "waitlist\_candidate": { "patient\_name": "Priya S", "urgency": "high", "eta\_minutes": 7 } }`
Side effects	Updates `appointments.status = 'no\_show'`; removes from queue; queries waitlist for top candidate; inserts `admin\_logs`
---
`POST /api/patients/arrived`
Marks patient as physically checked in at reception.
	
Auth	Bearer JWT (admin or receptionist role)
Request Body	`{ "appointment\_id": "uuid" }`
Response 200	`{ "arrived": true, "arrived\_at": "2026-05-06T09:47:00Z" }`
Side effects	Updates `patients.eta\_status = 'arrived'`; updates `appointments.arrived\_at`; stops ETA polling for this patient
---
3.5 Consultations
`POST /api/doctors/consultation/start`
Marks start of consultation, used for timing.
	
Auth	Bearer JWT (admin or doctor role)
Request Body	`{ "appointment\_id": "uuid" }`
Response 200	`{ "started\_at": "2026-05-06T09:50:00Z" }`
Side effects	Creates `consultations` row; updates `appointments.status = 'in\_consultation'`
---
`POST /api/doctors/consultation/end`
Marks end of consultation; triggers rolling average recalculation.
	
Auth	Bearer JWT (admin or doctor role)
Request Body	`{ "appointment\_id": "uuid" }`
Response 200	`{ "ended\_at": "...", "duration\_minutes": 11.5, "new\_avg\_minutes": 10.8 }`
Side effects	Updates `consultations.ended\_at`; triggers DB function `update\_doctor\_avg\_consultation`; updates `appointments.status = 'completed'`
---
3.6 Waitlist
`GET /api/waitlist`
Returns ranked waitlist for a doctor on a date.
	
Auth	Bearer JWT (admin role)
Query Params	`?doctor\_id=uuid\&date=2026-05-06`
Response 200	Array of waitlist entries sorted by urgency DESC then eta_seconds ASC
---
`POST /api/waitlist/resolve`
Confirms slot offer to a waitlisted patient.
	
Auth	Bearer JWT (admin role)
Request Body	`{ "waitlist\_entry\_id": "uuid", "appointment\_slot\_time": "10:30" }`
Response 200	`{ "resolved": true, "new\_appointment\_id": "uuid" }`
Side effects	Creates new appointment; adds to queue; sends SMS to patient; updates `waitlist\_entries.status = 'offered'`
---
3.7 Admin
`GET /api/admin/logs`
Returns audit log for the hospital.
	
Auth	Bearer JWT (admin role)
Query Params	`?date=2026-05-06\&limit=50\&offset=0`
Response 200	Paginated array of `admin\_logs` rows with joined patient/admin names
---
`PATCH /api/admin/settings`
Updates hospital-level settings (recalc interval etc).
	
Auth	Bearer JWT (admin role)
Request Body	`{ "recalc\_interval\_seconds": 45 }`
Response 200	`{ "updated": true }`
---
4. Folder Structure
```
queuesense/
├── .env.local                          # All secrets (never committed)
├── .env.example                        # Template with key names, no values
├── next.config.js
├── tailwind.config.js
├── package.json
│
├── app/                                # Next.js 14 App Router
│   │
│   ├── layout.tsx                      # Root layout (fonts, global styles)
│   ├── page.tsx                        # Landing / redirect to /admin or /patient
│   │
│   ├── (auth)/                         # Auth group layout (no sidebar)
│   │   ├── login/
│   │   │   └── page.tsx               # Admin/doctor login page
│   │   └── layout.tsx
│   │
│   ├── admin/                          # Admin protected routes
│   │   ├── layout.tsx                  # Sidebar + auth guard
│   │   ├── page.tsx                    # Redirect to /admin/queue
│   │   ├── queue/
│   │   │   └── page.tsx               # Live queue board (main dashboard)
│   │   ├── waitlist/
│   │   │   └── page.tsx               # Waitlist management
│   │   ├── doctors/
│   │   │   └── page.tsx               # Doctor list + avg consultation times
│   │   └── settings/
│   │       └── page.tsx               # Recalc interval, hospital config
│   │
│   ├── doctor/                         # Doctor read-only view
│   │   ├── layout.tsx                  # Minimal layout + auth guard
│   │   └── page.tsx                   # Next 5 patients + ETA status
│   │
│   ├── patient/                        # Public-facing patient pages (no auth)
│   │   ├── share/
│   │   │   └── page.tsx               # Consent + live location sharing page
│   │   └── status/
│   │       └── page.tsx               # Patient's queue position status page
│   │
│   └── api/                            # Next.js API Routes
│       ├── consent/
│       │   ├── send/route.ts
│       │   └── accept/route.ts
│       ├── location/
│       │   └── update/route.ts
│       ├── queue/
│       │   ├── route.ts               # GET /api/queue
│       │   ├── recalculate/route.ts
│       │   ├── override/route.ts
│       │   └── lock/route.ts
│       ├── patients/
│       │   ├── no-show/route.ts
│       │   └── arrived/route.ts
│       ├── doctors/
│       │   └── consultation/
│       │       ├── start/route.ts
│       │       └── end/route.ts
│       ├── waitlist/
│       │   ├── route.ts               # GET /api/waitlist
│       │   └── resolve/route.ts
│       └── admin/
│           ├── logs/route.ts
│           └── settings/route.ts
│
├── components/                         # Reusable UI components
│   ├── ui/                             # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   │
│   ├── queue/
│   │   ├── QueueBoard.tsx             # Main drag-and-drop queue table
│   │   ├── PatientCard.tsx            # Single patient row/card
│   │   ├── ETABadge.tsx               # Green/amber/grey ETA indicator
│   │   ├── LockToggle.tsx             # Lock/unlock button
│   │   └── RecalcCountdown.tsx        # "Next update in Xs" timer
│   │
│   ├── waitlist/
│   │   ├── WaitlistPanel.tsx
│   │   └── WaitlistRow.tsx
│   │
│   ├── doctor/
│   │   └── DoctorQueueView.tsx        # Read-only next-patients panel
│   │
│   ├── patient/
│   │   ├── ConsentScreen.tsx          # "Share location?" UI
│   │   ├── LocationTracker.tsx        # Handles watchPosition + API calls
│   │   └── PositionDisplay.tsx        # Patient's current queue position
│   │
│   └── layout/
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       └── AuthGuard.tsx              # Redirects unauthenticated users
│
├── lib/                                # Shared utilities \& services
│   ├── supabase/
│   │   ├── client.ts                  # Browser Supabase client
│   │   ├── server.ts                  # Server Supabase client (API routes)
│   │   └── admin.ts                   # Service role client (cron jobs)
│   │
│   ├── queue-engine.ts                # Pure function: takes patients\[], returns sorted\[]
│   ├── eta.ts                         # Google Maps Distance Matrix API wrapper
│   ├── notifications.ts               # Twilio/WATI SMS \& WhatsApp helpers
│   ├── tokens.ts                      # Consent token generation \& validation
│   └── auth.ts                        # Role checking helpers
│
├── hooks/                              # Custom React hooks
│   ├── useQueue.ts                    # Supabase Realtime subscription for queue
│   ├── useWaitlist.ts                 # Realtime subscription for waitlist
│   └── useAuth.ts                     # Current user + role
│
├── types/                              # TypeScript type definitions
│   ├── database.ts                    # Auto-generated from Supabase (supabase gen types)
│   └── app.ts                         # App-level types
│
├── supabase/                           # Supabase config \& migrations
│   ├── migrations/
│   │   ├── 001\_initial\_schema.sql
│   │   ├── 002\_rls\_policies.sql
│   │   └── 003\_functions\_triggers.sql
│   └── seed.sql                        # Dev seed data
│
└── public/
    ├── favicon.ico
    └── logo.svg
```
---
5. Third-Party Services & APIs
5.1 Services Overview
Service	Purpose	Free Tier	Cost at Scale
Supabase	PostgreSQL DB, Auth, Realtime, Storage	500MB DB, 2GB bandwidth/mo	$25/mo (Pro)
Vercel	Hosting, API routes, Cron jobs	Hobby: unlimited deploys, 100GB bandwidth	$20/mo (Pro)
Google Maps Distance Matrix	ETA calculation from patient to hospital	$200 credit/mo (~40,000 calls free)	$5 per 1,000 calls
Twilio	SMS notifications	$15 trial credit	~$0.007/SMS
WATI / Twilio WhatsApp	WhatsApp notifications (preferred in India)	Limited trial	~₹0.50–1.00 per message
5.2 Google Maps Distance Matrix API
Endpoint: `https://maps.googleapis.com/maps/api/distancematrix/json`
Example call:
```
GET https://maps.googleapis.com/maps/api/distancematrix/json
  ?origins=15.4321,75.0234          ← patient lat,lng
  \&destinations=15.4500,75.0100     ← hospital lat,lng
  \&mode=driving
  \&departure\_time=now               ← enables live traffic
  \&key=GOOGLE\_MAPS\_API\_KEY
```
Parsed response fields:
```json
{
  "rows": \[{
    "elements": \[{
      "duration\_in\_traffic": { "value": 720 },   // ← use this (seconds)
      "distance": { "value": 3200 }               // ← metres (for waitlist scoring)
    }]
  }]
}
```
Cost optimization: Batch up to 25 patients per API call using comma-separated origins. One cron cycle = 1 batch call for all active patients.
5.3 Twilio / WATI Setup
Environment variables needed:
```
TWILIO\_ACCOUNT\_SID=ACxxxxxx
TWILIO\_AUTH\_TOKEN=xxxxxx
TWILIO\_FROM\_NUMBER=+1415xxxxxxx   # Or WATI API key for WhatsApp
WATI\_API\_KEY=xxxxxx
WATI\_ENDPOINT=https://live-server.wati.io
```
Notification message template:
```
Hi {patient\_name}, your appointment with Dr. {doctor\_name} is in \~35 minutes.
Share your location to hold your queue position:
https://queuesense.app/patient/share?token={token}
(Link valid for 90 minutes)
```
5.4 Supabase Setup Checklist
[ ] Enable Realtime on the `queue\_entries` table (Supabase Dashboard → Database → Replication)
[ ] Enable Row Level Security on all tables
[ ] Generate TypeScript types: `npx supabase gen types typescript --project-id <id> > types/database.ts`
[ ] Enable pg_cron extension for automatic location data cleanup
[ ] Set up Supabase Auth with email provider (for admin/doctor login)
[ ] Configure Auth Redirect URLs to include `https://queuesense.app/api/auth/callback`
---
6. Authentication Flow
6.1 Roles
Role	Access Level	How Assigned
`admin`	Full dashboard, overrides, logs, settings	Manually set in `user\_metadata` by superadmin
`receptionist`	Queue view, mark arrived, mark no-show	Set in `user\_metadata`
`doctor`	Read-only queue view for their patients	Linked via `doctors.user\_id`
`patient`	No login — uses time-limited consent token	Token from SMS link
6.2 Admin/Doctor Login Flow
```
User visits /admin or /doctor
         │
         ▼
   AuthGuard checks:
   supabase.auth.getUser()
         │
    ┌────┴────┐
    │         │
  null    user exists
    │         │
    ▼         ▼
Redirect   Check user\_metadata.role
to /login       │
           ┌────┴──────────────┐
           │                   │
        admin/              doctor
        receptionist            │
           │                   ▼
           ▼            /doctor page
        /admin          (read-only)
        pages
```
Login page flow:
```typescript
// app/(auth)/login/page.tsx

const { error } = await supabase.auth.signInWithPassword({
  email: formData.email,
  password: formData.password,
});

// Supabase sets HttpOnly cookie automatically (Next.js SSR compatible)
// Redirect to /admin or /doctor based on user\_metadata.role
```
Auth middleware (middleware.ts):
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Protect /admin/\* and /doctor/\* routes
  // Allow /patient/\* without auth (token-based)
  // Allow /api/\* — individual routes check auth themselves
}
```
6.3 Patient Token Flow (No Login Required)
```
1. Cron generates consent token:
   token = crypto.randomUUID() + HMAC signature
   Stored in patient\_consent\_tokens with expires\_at = appointment\_time + 30min

2. Token embedded in SMS link:
   https://queuesense.app/patient/share?token=abc123xyz

3. Patient opens link → /api/consent/accept validates:
   SELECT \* FROM patient\_consent\_tokens
   WHERE token = $1 AND expires\_at > now() AND accepted = false

4. All subsequent /api/location/update calls pass:
   ?token=abc123xyz  (query param, validated same way)

5. Token never escalates to admin access.
   Token is single-use for consent; continues to validate for location updates until expires\_at.
```
6.4 API Route Auth Pattern
```typescript
// lib/auth.ts — reusable guard for API routes

import { createServerClient } from '@supabase/ssr'

export async function requireRole(
  request: NextRequest,
  allowedRoles: string\[]
): Promise<{ user: User; role: string } | NextResponse> {
  const supabase = createServerClient(...)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = user.user\_metadata?.role
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return { user, role }
}

// Usage in any API route:
// const authResult = await requireRole(request, \['admin', 'receptionist'])
// if (authResult instanceof NextResponse) return authResult
```
---
7. Deployment Strategy
7.1 Environment Variables
Create `.env.local` for development. Add all variables to Vercel dashboard for production.
```bash
# .env.local (NEVER commit this file)

# Supabase
NEXT\_PUBLIC\_SUPABASE\_URL=https://xxxx.supabase.co
NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY=eyJxxxxxx        # Safe to expose (client-side)
SUPABASE\_SERVICE\_ROLE\_KEY=eyJxxxxxx            # NEVER expose (server-only)

# Google Maps
GOOGLE\_MAPS\_API\_KEY=AIzaxxxxxx

# Hospital Config
HOSPITAL\_LAT=15.450000
HOSPITAL\_LNG=75.010000
HOSPITAL\_ID=uuid-of-hospital-row

# Notifications
TWILIO\_ACCOUNT\_SID=ACxxxxxx
TWILIO\_AUTH\_TOKEN=xxxxxx
TWILIO\_FROM\_NUMBER=+1415xxxxxxx
# OR for WhatsApp via WATI:
WATI\_API\_KEY=xxxxxx
WATI\_ENDPOINT=https://live-server.wati.io

# Cron secret (Vercel sends this to verify cron requests aren't spoofed)
CRON\_SECRET=a-long-random-string-you-generate

# Queue settings
QUEUE\_RECALC\_INTERVAL\_SECONDS=45
CONSENT\_NOTIFICATION\_WINDOW\_MINUTES=35   # Send notification this many min before appt
```
7.2 Vercel Configuration
`vercel.json`:
```json
{
  "crons": \[
    {
      "path": "/api/queue/recalculate",
      "schedule": "\*/1 \* \* \* \*"
    },
    {
      "path": "/api/consent/send",
      "schedule": "\*/5 \* \* \* \*"
    }
  ]
}
```
Cron security — validate in each cron route:
```typescript
// In /api/queue/recalculate/route.ts
if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON\_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```
7.3 Deployment Steps (First Deploy)
```bash
# Step 1: Push to GitHub
git init \&\& git add . \&\& git commit -m "initial commit"
git remote add origin https://github.com/you/queuesense.git
git push -u origin main

# Step 2: Connect to Vercel
# Go to vercel.com → New Project → Import from GitHub → queuesense
# Add all environment variables in the Vercel dashboard
# Deploy

# Step 3: Run Supabase migrations
npx supabase link --project-ref <your-project-ref>
npx supabase db push

# Step 4: Seed hospital data
npx supabase db reset --local   # local dev only
# For production: run seed.sql manually via Supabase SQL editor

# Step 5: Generate TypeScript types
npx supabase gen types typescript --project-id <id> > types/database.ts

# Step 6: Verify cron jobs are registered
# Vercel Dashboard → Project → Settings → Crons
```
7.4 Development Workflow
```bash
# Install dependencies
npm install

# Run locally
npm run dev        # http://localhost:3000

# Run Supabase locally (optional but recommended)
npx supabase start
# Local DB at: http://localhost:54323 (Supabase Studio)
# Local API at: http://localhost:54321

# Type check
npm run type-check

# Push DB changes
npx supabase db push
```
7.5 Deployment Architecture (Production)
```
GitHub (main branch)
      │
      │ push → auto-deploy
      ▼
Vercel (Global CDN)
  ├── Static assets (cached at edge)
  ├── Next.js Server (Node.js runtime)
  │     └── API Routes
  └── Cron Jobs
        ├── /api/queue/recalculate  (every 1 min, self-throttles by interval setting)
        └── /api/consent/send       (every 5 min, checks 30–45 min window)

Supabase (managed PostgreSQL + Realtime)
  ├── DB (PostgreSQL 15)
  ├── Auth (JWT issuance)
  ├── Realtime (WebSocket broadcast on queue\_entries changes)
  └── Storage (unused in v1)

Google Maps API (external)
Twilio / WATI (external)
```
7.6 Go-Live Checklist
[ ] All environment variables set in Vercel dashboard
[ ] Supabase migrations run successfully (`supabase db push`)
[ ] RLS policies verified — test with non-admin JWT that admin endpoints return 403
[ ] Realtime enabled on `queue\_entries` table in Supabase dashboard
[ ] Hospital row seeded in `hospitals` table with correct lat/lng
[ ] Test SMS/WhatsApp notification end-to-end with a real phone number
[ ] Test Google Maps API call returns valid ETA
[ ] Vercel cron jobs visible and active in Vercel dashboard
[ ] `/patient/share?token=test` returns 410 for invalid token (not 500)
[ ] Admin login works and redirects to `/admin/queue`
[ ] Doctor login works and redirects to `/doctor`
[ ] Queue reorder visible in real-time across two open browser tabs