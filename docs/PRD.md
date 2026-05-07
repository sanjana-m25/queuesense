# Product Requirements Document
# Adaptive OPD Queue Management System ("QueueSense")

**Version:** 1.0  
**Status:** Draft  


---

## 1. Overview & Goal

### What Are We Building?
QueueSense is a real-time adaptive outpatient department (OPD) scheduling platform that dynamically reorders the patient queue based on predicted patient arrival times (ETA). The system uses consent-based GPS location sharing to estimate when each patient will arrive, and adjusts their queue position accordingly — moving early arrivals up and pushing delayed patients down (without removing them).

### The Core Problem
Traditional OPD queues are static. A patient scheduled at 10:00 AM who is stuck in traffic holds up the queue, while a patient scheduled for 10:30 AM who arrives at 9:50 AM sits idle. This causes:
- Unnecessary waiting for punctual patients
- Wasted consultation slots (no-shows, late arrivals)
- Doctor idle time between patients
- Poor patient experience and unpredictable wait times

### The Goal
Maximize OPD throughput and minimize patient wait times by dynamically reordering the queue based on real-world arrival data, while giving hospital administrators full override control.

### Success in One Line
*A patient who will arrive in 8 minutes should be seen before a patient who will arrive in 25 minutes — automatically, with no manual coordination.*

---

## 2. Target Users & Personas

### Persona 1: The Patient — "Ravi, 42, working professional"
- **Context:** Booked a 10:30 AM OPD slot, stuck in traffic
- **Pain:** Gets marked as late, loses his slot, has to wait 2 hours
- **Needs:** System to know he's 15 minutes away and hold his position or gracefully adjust
- **Tech comfort:** Uses WhatsApp, Google Maps daily. Fine with sharing location via a link

### Persona 2: The Hospital Admin / Receptionist — "Divya, 30, front desk coordinator"
- **Context:** Manages OPD flow for 3 doctors, 80+ patients/day
- **Pain:** Constant phone calls — "I'm 10 minutes away, don't give my slot." Manual reordering is chaos.
- **Needs:** A dashboard that auto-manages the queue, with the ability to lock, override, or manually bump patients
- **Tech comfort:** Comfortable with web dashboards; no coding knowledge

### Persona 3: The Doctor — "Dr. Mehta, 50, senior physician"
- **Context:** Sees 40+ patients/day, frequently has gaps between patients when someone is late
- **Pain:** Idle time due to no-shows or late arrivals; back-to-back rush when late patient arrives
- **Needs:** Predictable patient flow with minimal gaps
- **Tech comfort:** Prefers simple, non-intrusive tools. Does not interact with the queue system directly.

### Persona 4: The Hospital IT/Ops Manager — "Suresh, 35"
- **Context:** Responsible for deploying and maintaining the system
- **Needs:** Simple deployment, reliable uptime, no HIPAA/data compliance landmines, easy integration with existing hospital software
- **Tech comfort:** Technical; can configure environment variables and manage a server

---

## 3. User Stories

### Patient Stories
- As a patient, I want to receive a notification 30–45 minutes before my appointment so that I can decide whether to share my location.
- As a patient, I want to share my real-time location via a simple link (no app install) so that the system can estimate my arrival time.
- As a patient, I want to be informed of my updated queue position so that I know whether I need to rush or can take my time.
- As a patient, I want my queue position to be held (not cancelled) if I'm running late so that I don't lose my appointment entirely.
- As a patient, I want to decline location sharing without penalty so that I feel in control of my privacy.

### Admin / Receptionist Stories
- As an admin, I want to see a live queue dashboard showing all patients, their ETA, and current position so that I can monitor OPD flow at a glance.
- As an admin, I want to manually override any patient's queue position so that I can handle exceptions (VIPs, emergencies, walkins).
- As an admin, I want to lock a specific patient's queue position so that the system doesn't auto-move them.
- As an admin, I want to see which patients have "uncertain" status (location not shared) so that I can follow up manually.
- As an admin, I want the queue to auto-update every 30–60 seconds so that I don't have to refresh manually.
- As an admin, I want to pull waitlisted patients into open slots, ranked by proximity and urgency, so that idle slots are filled quickly.

### Doctor Stories
- As a doctor, I want my consultation duration history to inform the queue's slot timing estimates so that the schedule reflects my actual pace.
- As a doctor, I want to see who is "next" and their estimated arrival time so that I can plan short breaks or start early.

### System / IT Stories
- As a system, I want to calculate ETA using a maps API when a patient shares their location so that arrival predictions are accurate.
- As a system, I want to fall back to a static queue for any patient who hasn't shared location so that the queue never breaks.
- As a system, I want to recalculate queue order at fixed intervals (every 30–60 seconds) so that updates are stable and not overwhelming.

---

## 4. Functional Requirements

### 4.1 Patient Notification & Location Consent
1. The system SHALL send a push/SMS/WhatsApp notification to each patient 30–45 minutes before their scheduled appointment time.
2. The notification SHALL include a one-tap consent link to share real-time location.
3. The consent link SHALL be valid for a limited time window (e.g., expires after appointment time passes).
4. If the patient declines or ignores the consent request, their status SHALL be set to "uncertain" and their queue position SHALL remain static.
5. The system SHALL NOT require patients to install a mobile app. Location sharing SHALL work via a mobile web link.

### 4.2 ETA Calculation
6. When a patient accepts the location consent, the system SHALL calculate their ETA using a third-party maps/routing API (e.g., Google Maps Distance Matrix API or Mapbox).
7. ETA SHALL be recalculated periodically (every 2–3 minutes) while the patient is en route and within the active window.
8. If location data becomes unavailable mid-journey (e.g., phone dies), the system SHALL retain the last known ETA and mark the patient as "uncertain."

### 4.3 Queue Reordering
9. The system SHALL dynamically reorder the queue based on patient ETA, sorted from soonest arrival to latest.
10. Patients with "uncertain" status SHALL be placed at their original scheduled position in the queue (not removed).
11. Queue reordering SHALL occur at fixed intervals of 30–60 seconds (configurable by admin), NOT continuously.
12. Patients who are delayed SHALL be pushed down the queue, NOT removed.
13. A patient's queue position SHALL never go below their originally scheduled position + a configurable buffer (e.g., max 3 positions down), to prevent unfair demotion.

### 4.4 Variable Consultation Time Estimation
14. The system SHALL track each doctor's historical consultation durations (start/end time per patient).
15. The system SHALL compute a rolling average consultation duration per doctor.
16. This average SHALL be used to estimate when each queue slot will open, improving ETA-to-slot matching accuracy.

### 4.5 Waitlist Management
17. The system SHALL maintain a waitlist of patients seeking earlier slots.
18. When a slot opens (due to a patient no-show or early finish), the system SHALL automatically rank waitlisted patients by: (a) proximity to hospital (shortest ETA) and (b) urgency level (admin-assigned: Low / Medium / High).
19. The system SHALL suggest the top waitlist candidate to the admin. The admin SHALL confirm before the slot is filled.

### 4.6 Admin Dashboard
20. The admin dashboard SHALL display a live queue view showing: patient name, scheduled time, current queue position, ETA status (exact ETA, "uncertain", or "arrived"), and any locks/overrides.
21. Admins SHALL be able to manually drag-and-drop or input a new position for any patient.
22. Admins SHALL be able to "lock" a patient's position, preventing automatic reordering for that patient.
23. Admins SHALL be able to mark a patient as a no-show, which triggers waitlist resolution.
24. Admins SHALL be able to adjust the queue recalculation interval (30s / 45s / 60s) from the dashboard.
25. The dashboard SHALL display a visual indicator when the queue was last recalculated.
26. All admin actions (overrides, locks, no-shows) SHALL be logged with a timestamp and admin ID.

### 4.7 Doctor View (Read-Only)
27. Doctors SHALL have a simple read-only view showing the next 3–5 patients, their names, and their ETA status.
28. This view SHALL auto-refresh and require no manual interaction.

### 4.8 Notifications to Patients (Post-Reorder)
29. When a patient's queue position improves significantly (e.g., moves up by 2+ positions), the system SHALL optionally notify them to arrive sooner.
30. When a patient is pushed significantly down (e.g., 3+ positions), the system SHALL optionally notify them that they have more time.

---

## 5. Non-Functional Requirements

### Performance
- The queue recalculation engine SHALL complete a full recalculation pass in under 5 seconds for up to 200 patients.
- The admin dashboard SHALL reflect queue changes within 5 seconds of a recalculation cycle completing.
- ETA API calls SHALL be batched to avoid rate limiting; individual call latency SHALL not block queue updates.
- The patient location consent page SHALL load in under 2 seconds on a 4G mobile connection.

### Security & Privacy
- Patient location data SHALL be transmitted over HTTPS (TLS 1.2+) exclusively.
- Location data SHALL only be stored for the duration of the patient's active appointment window; it SHALL be auto-deleted after the appointment ends.
- The system SHALL not store raw GPS coordinates permanently; only processed ETA values are persisted.
- Consent SHALL be explicit and documented; the system SHALL log consent acceptance with a timestamp and patient identifier.
- Admin dashboard SHALL be protected by role-based authentication (admin, receptionist, doctor roles with different permissions).
- All API keys (Maps API, SMS/WhatsApp gateway) SHALL be stored in environment variables, never hardcoded.

### Scalability
- The system SHALL support up to 10 concurrent doctors and 500 patients per day per hospital installation without degradation.
- The architecture SHALL be stateless at the application layer to allow horizontal scaling (add more servers behind a load balancer).
- The system SHALL be deployable per-hospital (self-hosted or cloud-hosted per tenant) with no shared patient data between hospitals.
- Database design SHALL support multi-doctor, multi-department queues within a single hospital.

### Reliability & Availability
- The system SHALL gracefully degrade to static queue mode if the maps API is unavailable or rate-limited.
- The system SHALL remain operational for admin overrides and manual queue management even if ETA services are down.
- Target uptime: 99.5% during OPD operating hours.

### Usability
- The admin dashboard SHALL be fully functional on a tablet or desktop browser; no mobile app required for staff.
- The patient location-sharing page SHALL work on any modern smartphone browser with no app install.
- All admin actions SHALL provide immediate visual feedback (loading states, success/error toasts).

---

## 6. Out of Scope (What We Are NOT Building)



1. **Mobile app (iOS/Android)** — Location sharing is browser-based only. No native app.
2. **Payment or billing integration** — No fee collection, insurance processing, or billing features.
3. **Electronic Health Records (EHR) integration** — Patient medical history, prescriptions, and clinical notes are out of scope. Patient identity is name + phone number only.
4. **Telemedicine / video consultation** — All consultations are assumed in-person.
5. **Multi-hospital central dashboard** — Each hospital runs its own installation. No cross-hospital reporting.
6. **Automated calling / IVR system** — Notifications via WhatsApp/SMS only, no voice calls.
7. **AI-based urgency scoring** — Urgency level is admin-assigned manually, not ML-predicted.
8. **Patient self-scheduling / rebooking** — Patients cannot book, reschedule, or cancel appointments through this system.
9. **Doctor schedule management** — The system assumes appointment slots are pre-created externally. It manages the queue within those slots, not the slots themselves.
10. **Analytics & reporting dashboards** — Historical OPD performance reports, doctor efficiency analytics, and export features are deferred to v2.

---

## 7. Success Metrics

### Primary Metrics 
| Metric | Baseline (Before) | Target (After) |
|---|---|---|
| Average patient wait time (from arrival to seen) | ~45 min | < 25 min |
| Doctor idle time between patients | ~12 min/day | < 5 min/day |
| Location consent opt-in rate | N/A | > 60% of notified patients |
| Queue override actions by admins | N/A | < 15% of queue positions/day |
| No-show slots filled by waitlist | ~20% | > 50% |

### Secondary Metrics
- **Admin time saved:** Admin reports spending less than 10 mins/day on manual queue coordination (vs. ~45 mins before).
- **Patient complaints about queue:** Reduction in "why did they go before me" complaints tracked via reception log.
- **ETA accuracy:** Mean absolute error between predicted ETA and actual arrival < 5 minutes, for 80% of consenting patients.
- **System reliability:** Zero queue system outages during OPD hours across the first 30 days.

### Qualitative
- Admin NPS: Positive feedback from at least 3 out of 4 admin staff within first week.
- Doctor satisfaction: At least 2 doctors report fewer unexpected gaps in patient flow.

---

## 8. Tech Stack Recommendation


| Layer | Choice | Reasoning |
|---|---|---|
| **Frontend (Admin Dashboard)** | Next.js + Tailwind CSS | Fast to scaffold, great DX, deploy to Vercel in minutes. Use shadcn/ui for prebuilt components. |
| **Frontend (Patient Location Page)** | Same Next.js app (separate route) | Single codebase. No app install needed. Uses browser Geolocation API. |
| **Backend / API** | Next.js API Routes or Express.js | API routes are fastest to write alongside the frontend. If logic gets complex, split to Express. |
| **Database** | Supabase (PostgreSQL) | Instant hosted DB, real-time subscriptions built in (perfect for live queue updates), generous free tier, easy Auth. |
| **Real-time Queue Updates** | Supabase Realtime | Replaces the need for WebSockets. Admin dashboard subscribes to queue table changes and auto-updates. |
| **ETA Calculation** | Google Maps Distance Matrix API | Best accuracy. $5 free credit covers thousands of calls. Simple REST API. |
| **Notifications (SMS/WhatsApp)** | Twilio (SMS) or WhatsApp Business API via Twilio / Wati.io | Twilio has a free trial. WATI is easier for WhatsApp in India. One API call per notification. |
| **Authentication** | Supabase Auth | Built-in, zero-config auth with role support. |
| **Hosting** | Vercel (frontend + API routes) | Deploy in 30 seconds from GitHub. Free tier works. |
| **AI Tooling** | Cursor + Claude / Anthropic API | Use Cursor for code generation, Claude for logic review, Antigravity or similar for scaffolding. |

### Architecture Overview

```
[Patient Phone]
      |
      | (Consent link via SMS/WhatsApp)
      v
[Next.js Patient Location Page]
      |
      | (Geolocation API → lat/lng)
      v
[Next.js API Route: /api/update-location]
      |
      | (Calls Google Maps Distance Matrix)
      v
[Supabase DB: patients table]
      |
      | (Supabase Realtime subscription)
      v
[Next.js Admin Dashboard] ←→ [Admin: override, lock, no-show]
      |
      | (Periodic Queue Recalculation Job — every 30–60s)
      v
[Queue Ordering Engine (server-side function)]
      |
      v
[Supabase DB: queue table updated]
```

### Key Implementation Notes for Vibe Coder

- **Start with Supabase.** Create the schema first: `patients`, `queue_entries`, `doctors`, `waitlist`, `admin_logs` tables. This is your source of truth.
- **Use Supabase Realtime** to push queue changes to the admin dashboard — zero WebSocket code needed.
- **The queue engine is just a sort function.** Sort patients by ETA (ascending), keep "uncertain" patients at their original index. Run this on a server-side cron (use Vercel Cron Jobs, free).
- **The patient location page** needs only 2 things: browser `navigator.geolocation.watchPosition()` and a fetch to your API every 2 minutes.
- **Don't over-engineer the ETA call.** One Google Maps Distance Matrix call per active patient per 2-minute interval. Cache aggressively.
- **Use shadcn/ui Table + drag-and-drop** (dnd-kit library) for the admin queue view. Ship a working table first, add drag-and-drop in hour 2.
- **Skip auth complexity on day 1.** Use a single hardcoded admin password stored in an env variable. Add Supabase Auth with roles on day 2.

---

## 9. Future Roadmap

### V1.1 — 
- **Analytics Dashboard:** Average wait time trends, doctor throughput graphs, location consent rates over time.
- **Multi-department support:** Different queues for different departments (Cardiology, Pediatrics, etc.) within the same hospital.
- **Improved notification content:** Personalized messages with patient name, estimated wait time, and queue position.
- **Admin mobile view:** Responsive admin dashboard optimized for phone use by roving staff.

### V1.2 
- **Urgency scoring hints:** Suggest urgency level based on appointment type (e.g., post-op follow-up = High, routine = Low).
- **Doctor consultation time model improvement:** Weight recent sessions more than older ones for better rolling average accuracy.
- **Bulk no-show handling:** Mark multiple patients as no-show at once during high-volume days.
- **Patient feedback collection:** Post-visit 1-question SMS rating ("How was your wait time today? 1–5").

### V2.0
- **EHR integration hooks:** Read appointment data directly from existing hospital management systems (HMS) via API or HL7 FHIR.
- **ML-based urgency scoring:** Train a simple classifier on appointment type, patient history (with consent), and doctor notes to auto-assign urgency.
- **Multi-hospital SaaS mode:** Single cloud deployment, tenant isolation, per-hospital billing. Separate admin portals per hospital.
- **Native mobile app for patients:** React Native app with background location sharing for higher ETA accuracy.
- **Predictive no-show model:** Flag patients statistically likely to no-show based on history, and pre-call waitlisted patients proactively.
- **Doctor app:** Simple tablet/phone view for doctors to mark patients as "in consultation" and "done," improving slot timing data quality.

### V3.0 
- **AI-powered queue narrative:** Natural language summary for admins — "Dr. Mehta's queue is running 12 minutes behind. 3 patients are en route, 2 are uncertain. Recommend pulling Waitlist #1 (2.3 km away, High urgency) into Slot 4."
- **Interoperability:** Integration with national health ID systems (ABHA in India) for patient identity.
- **Cross-hospital waitlisting:** If a hospital's OPD is full, automatically offer the patient the next available slot at a partner hospital.

---


