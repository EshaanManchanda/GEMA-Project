# Event Schedule System — Detailed Reference

> **Last updated:** 2026-04-12  
> **Scope:** Full stack — MongoDB schema → Express validation → React UI → booking flow

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Model](#2-data-model)
   - 2.1 [DateSchedule Interface](#21-dateschedule-interface)
   - 2.2 [Mongoose Schema](#22-mongoose-schema)
   - 2.3 [TimeSlot Sub-document](#23-timeslot-sub-document)
   - 2.4 [Field Reference Table](#24-field-reference-table)
3. [Schedule Selection Logic](#3-schedule-selection-logic)
   - 3.1 [scheduleContainsDate Helper](#31-schedulecontainsdate-helper)
   - 3.2 [findBestScheduleForDate Helper](#32-findbestschedulefordate-helper)
   - 3.3 [Override Priority System](#33-override-priority-system)
4. [Seat Management](#4-seat-management)
   - 4.1 [hasAvailableSeats()](#41-hasavailableseats)
   - 4.2 [reduceSeats()](#42-reduceseats)
   - 4.3 [Unlimited Seats Mode](#43-unlimited-seats-mode)
   - 4.4 [Atomic Reservation (Booking Controller)](#44-atomic-reservation-booking-controller)
5. [Backend Validation](#5-backend-validation)
6. [Frontend: Date Picker](#6-frontend-date-picker)
   - 6.1 [Available Dates Calculation](#61-available-dates-calculation)
   - 6.2 [Schedule Lookup](#62-schedule-lookup)
   - 6.3 [Time Slot Picker](#63-time-slot-picker)
7. [Frontend: Event Detail Page](#7-frontend-event-detail-page)
   - 7.1 [currentSchedule Memo](#71-currentschedule-memo)
   - 7.2 [Derived State](#72-derived-state)
   - 7.3 [handleBookNow Flow](#73-handlebooknow-flow)
8. [Admin Modals](#8-admin-modals)
   - 8.1 [Create Modal](#81-create-modal)
   - 8.2 [Edit Modal](#82-edit-modal)
9. [End-to-End Booking Flow](#9-end-to-end-booking-flow)
10. [Edge Cases & Gotchas](#10-edge-cases--gotchas)
11. [Architecture Diagram](#11-architecture-diagram)

---

## 1. Overview

The schedule system lets a single event span **multiple date ranges**, each with its own pricing, capacity, and optional time slots. Key design decisions:

| Decision | Rationale |
|---|---|
| Array of schedules per event | One event can run on multiple weekends, seasons, or price tiers |
| `startDate` + `endDate` range (not single date) | Supports multi-day or recurring windows without duplicating records |
| `isOverride` flag | Allows a special-price or sold-out override to supersede the base schedule for a date range |
| `timeSlots[]` nested inside each schedule | Multiple sessions per day (e.g. 9 AM / 2 PM classes) without needing a separate event |
| `unlimitedSeats` flag | Online/webinar events don't need capacity tracking |
| Atomic MongoDB `$inc` for seat deduction | Prevents double-booking under concurrent requests |

---

## 2. Data Model

### 2.1 DateSchedule Interface

`src/models/Event.ts` — TypeScript interface section

```typescript
dateSchedule: Array<{
  _id?: mongoose.Types.ObjectId;

  // ── Date range ───────────────────────────────────────────────
  date?: Date;          // Legacy: single-date events (kept for backward compat)
  startDate?: Date;     // Range start (current format)
  endDate?: Date;       // Range end   (current format)

  // ── Time of day (HH:mm strings, e.g. "09:00") ───────────────
  startTime?: string;
  endTime?: string;

  // ── Capacity ─────────────────────────────────────────────────
  availableSeats: number;   // Remaining bookable seats (decremented on purchase)
  totalSeats?: number;      // Capacity ceiling (reference only, not enforced by DB)
  soldSeats?: number;       // Cumulative sold (analytics)
  reservedSeats?: number;   // Held seats (pending payment, not yet confirmed)
  unlimitedSeats?: boolean; // Bypass all capacity checks (webinars, online)

  // ── Pricing ──────────────────────────────────────────────────
  price: number;            // Price for this schedule (overrides event-level price)

  // ── Special / Override ───────────────────────────────────────
  isSpecialDate?: boolean;  // UI hint: this schedule has non-standard pricing
  specialDates?: Date[];    // Specific calendar days with special pricing
  priority?: number;        // Higher value = higher precedence when overlapping
  isOverride?: boolean;     // When true, beats any non-override schedule for same dates

  // ── Time Slots ───────────────────────────────────────────────
  timeSlots?: TimeSlot[];   // Multiple sessions per day (see §2.3)
}>;
```

### 2.2 Mongoose Schema

`src/models/Event.ts` — Mongoose definition

```typescript
dateSchedule: [
  {
    date:           { type: Date,    required: false },
    startDate:      { type: Date,    required: false },
    endDate:        { type: Date,    required: false },
    startTime:      { type: String,  required: false },
    endTime:        { type: String,  required: false },

    availableSeats: { type: Number, required: true, min: 0 },
    totalSeats:     { type: Number, min: 0 },
    soldSeats:      { type: Number, default: 0, min: 0 },
    reservedSeats:  { type: Number, default: 0, min: 0 },
    unlimitedSeats: { type: Boolean, default: false },

    price:          { type: Number, required: true, min: 0 },

    isSpecialDate:  { type: Boolean, default: false },
    specialDates:   { type: [Date],  default: [] },
    priority:       { type: Number,  default: 0 },
    isOverride:     { type: Boolean, default: false },

    timeSlots: [ /* see §2.3 */ ],
  }
]
```

### 2.3 TimeSlot Sub-document

Each `dateSchedule` entry can contain an array of `timeSlots` for multi-session days.

```typescript
timeSlots: [
  {
    date:           { type: Date,   required: false }, // Scopes slot to one specific day
    startTime:      { type: String, required: false }, // HH:mm (e.g. "09:00")
    endTime:        { type: String, required: false }, // HH:mm (e.g. "11:00")
    availableSeats: { type: Number, min: 0 },
    soldSeats:      { type: Number, default: 0, min: 0 },
    price:          { type: Number, min: 0 },          // Overrides schedule price if set
  }
]
```

**Scoping rule:** if a slot has a `date` field, it only appears on that calendar day. If `date` is absent, the slot applies to every day in the parent schedule's `startDate`–`endDate` range.

### 2.4 Field Reference Table

| Field | Type | Required | Description |
|---|---|---|---|
| `date` | `Date` | No | Legacy single-date format |
| `startDate` | `Date` | No | Range start (preferred) |
| `endDate` | `Date` | No | Range end (preferred) |
| `startTime` | `string` | No | HH:mm — display-only on detail page |
| `endTime` | `string` | No | HH:mm — display-only on detail page |
| `availableSeats` | `number` | **Yes** | Bookable remaining seats |
| `totalSeats` | `number` | No | Max capacity (informational) |
| `soldSeats` | `number` | No | Analytics counter (default 0) |
| `reservedSeats` | `number` | No | Held (default 0) |
| `unlimitedSeats` | `boolean` | No | Skip all capacity checks |
| `price` | `number` | **Yes** | Schedule-level price override |
| `isSpecialDate` | `boolean` | No | UI badge hint |
| `specialDates` | `Date[]` | No | Per-day special pricing anchors |
| `priority` | `number` | No | Tie-breaker when overlapping (default 0) |
| `isOverride` | `boolean` | No | Beats non-override schedules for the same dates |
| `timeSlots` | `TimeSlot[]` | No | Sessions within a day |

---

## 3. Schedule Selection Logic

The backend (and frontend independently) both implement the same logic to find the right schedule for a given date.

### 3.1 scheduleContainsDate Helper

```typescript
// src/models/Event.ts — private helper, ~line 1621
const scheduleContainsDate = (s: any, targetDate: Date): boolean => {
  if (s.startDate && s.endDate) {
    // Range format: check containment
    const start = new Date(s.startDate); start.setHours(0,  0,  0,   0);
    const end   = new Date(s.endDate);   end.setHours(23, 59, 59, 999);
    return targetDate >= start && targetDate <= end;
  }
  if (s.date) {
    // Legacy: exact day match
    const d = new Date(s.date); d.setHours(0, 0, 0, 0);
    return d.getTime() === targetDate.getTime();
  }
  if (s.startDate) {
    // Only startDate: treat as single-day event
    const d = new Date(s.startDate); d.setHours(0, 0, 0, 0);
    return d.getTime() === targetDate.getTime();
  }
  return false;
};
```

### 3.2 findBestScheduleForDate Helper

```typescript
// src/models/Event.ts — private helper, ~line 1644
const findBestScheduleForDate = (dateSchedule: any[], targetDate: Date): any => {
  const matches = dateSchedule.filter(s => scheduleContainsDate(s, targetDate));
  if (!matches.length) return null;
  // Override schedules win; otherwise first match wins
  return matches.find(s => s.isOverride === true) ?? matches[0];
};
```

> **Note:** The frontend `EventDetailPage.tsx` `currentSchedule` memo replicates this logic using ISO date string comparison (`YYYY-MM-DD`) to avoid timezone issues in the browser.

### 3.3 Override Priority System

When two schedules overlap the same date range:

```
Event has:
  Schedule A: 2026-06-01 → 2026-06-30, price: 100, isOverride: false
  Schedule B: 2026-06-15 → 2026-06-20, price: 80,  isOverride: true

For a date of 2026-06-18:
  → Both A and B match
  → Schedule B (isOverride: true) wins → price = 80
```

Use cases:
- Flash sale window within a larger season
- Blocked/sold-out override (set `availableSeats: 0` on the override)
- Holiday pricing for a specific sub-range

---

## 4. Seat Management

### 4.1 hasAvailableSeats()

Instance method on `EventDocument`. Returns `true` if `quantity` seats can be booked on `date`.

```typescript
event.hasAvailableSeats(date: Date, quantity: number = 1): boolean
```

**Decision tree:**
```
1. Validate date param
2. Find best schedule for date (findBestScheduleForDate)
3. If schedule has timeSlots[]:
     Find matching slot by date
     → return slot.availableSeats >= quantity
     → no matching slot → false
4. If schedule.unlimitedSeats → true
5. return schedule.availableSeats >= quantity
```

### 4.2 reduceSeats()

Instance method on `EventDocument`. Decrements `availableSeats` (and increments `soldSeats`) in-place. **Does NOT save — caller must call `event.save()`.**

```typescript
event.reduceSeats(date: Date, quantity: number): boolean
```

**Decision tree:**
```
1. Validate date and quantity
2. Find best schedule (findBestScheduleForDate)
3. If schedule has timeSlots[]:
     Find matching slot
     → slot.availableSeats -= quantity; slot.soldSeats += quantity; return true
     → no match → false
4. If schedule.unlimitedSeats:
     → schedule.soldSeats += quantity (analytics only); return true
5. If schedule.availableSeats >= quantity:
     → schedule.availableSeats -= quantity
     → schedule.soldSeats += quantity
     → return true
6. return false (insufficient seats)
```

> **Warning:** `reduceSeats()` mutates the Mongoose document in memory. The actual DB write happens when the booking controller calls `event.save()` or the atomic `$inc` query (see §4.4). Do not mix both approaches for the same booking.

### 4.3 Unlimited Seats Mode

Set `unlimitedSeats: true` on a schedule to bypass all capacity checks.

- `hasAvailableSeats()` returns `true` unconditionally
- `reduceSeats()` only increments `soldSeats` (for analytics), skips `availableSeats` decrement
- The booking controller skips the `$inc` atomic query entirely
- The frontend `EventDatePicker` shows dates as available regardless of `availableSeats` value
- The frontend UI shows "Unlimited seats" badge instead of a seat count

Typical use: online webinars, live streams, digital downloads.

### 4.4 Atomic Reservation (Booking Controller)

`src/controllers/booking.controller.ts` — `initiateBooking()`

The booking controller performs a **single atomic MongoDB operation** to reserve seats, preventing race conditions under concurrent bookings:

```typescript
// Only runs when schedule.unlimitedSeats === false
const seatResult = await EventModel.findOneAndUpdate(
  {
    _id: eventId,
    "dateSchedule._id": dateScheduleId,        // target specific schedule
    "dateSchedule.availableSeats": { $gte: seats }, // ensure seats still available
  },
  {
    $inc: { "dateSchedule.$.availableSeats": -seats }, // positional operator
  },
  { new: true },
);

if (!seatResult) {
  // The update found no matching document — seats ran out between check and write
  return next(new AppError(`Only ${schedule.availableSeats} seats available`, 400));
}
```

The `$` positional operator updates **only the matching `dateSchedule` sub-document**, not the entire array. The `$gte` filter inside the query itself acts as the capacity guard — if another request consumed the last seats between the `findById` read and this write, the filter fails and `findOneAndUpdate` returns `null`.

---

## 5. Backend Validation

`src/validators/event.validator.ts` — applied to both `validateCreateEvent` and `validateUpdateEvent`

```
dateSchedule          → isArray, min 1 entry required

dateSchedule.*.startDate
  → optional, ISO 8601, must not be in the past

dateSchedule.*.endDate
  → optional, ISO 8601, must be > startDate (cross-field check by index)

dateSchedule.*.availableSeats
  → required, integer 0–999,999

dateSchedule.*.price
  → required, float ≥ 0

dateSchedule.*.timeSlots           → optional array
dateSchedule.*.timeSlots.*.date    → optional, ISO 8601
dateSchedule.*.timeSlots.*.startTime → optional, regex /^([01]\d|2[0-3]):([0-5]\d)$/
dateSchedule.*.timeSlots.*.endTime   → optional, same regex
dateSchedule.*.timeSlots.*.availableSeats → optional, integer 0–10,000
dateSchedule.*.timeSlots.*.price         → optional, float ≥ 0
```

The `endDate > startDate` check uses the request body index to look up the sibling `startDate`:
```typescript
body("dateSchedule.*.endDate").custom((value, { req, path }) => {
  const match = path.match(/\[(\d+)\]/);
  if (match) {
    const index = parseInt(match[1]);
    const startDate = req.body.dateSchedule[index]?.startDate;
    if (startDate && new Date(value) < new Date(startDate))
      throw new Error("End date must be after start date");
  }
  return true;
});
```

---

## 6. Frontend: Date Picker

**File:** `frontend/src/components/ui/EventDatePicker.tsx`

### 6.1 Available Dates Calculation

A `useMemo` iterates every schedule, walks day-by-day from `max(today, startDate)` to `endDate`, and includes days where `availableSeats > 0` OR `unlimitedSeats === true`.

```
For each schedule in dateSchedules:
  minDate = isAfter(today, startDate) ? today : startDate
  Walk currentDate from minDate to endDate (inclusive):
    if unlimitedSeats OR availableSeats > 0:
      add currentDate to dates[]
  
Deduplicate by timestamp → sort ascending
```

Result: a flat `Date[]` of every bookable day across all schedules.

### 6.2 Schedule Lookup

`getScheduleForDate(date)` mirrors `findBestScheduleForDate` on the backend:

```typescript
const matches = dateSchedules.filter(s => {
  const start = startOfDay(new Date(s.startDate));
  const end   = startOfDay(new Date(s.endDate));
  return !isBefore(target, start) && !isAfter(target, end);
});
return matches.find(s => s.isOverride) ?? matches[0];
```

Used by:
- The info card rendered below the calendar (shows time range, seats, price for selected day)
- `availableTimeSlotsForDate` memo

### 6.3 Time Slot Picker

After a date is selected, `availableTimeSlotsForDate` filters the parent schedule's `timeSlots[]`:

```
1. getScheduleForDate(selectedDate)
2. If schedule has no timeSlots → [] (no picker shown)
3. For each slot in timeSlots:
     if slot.date exists → must match selectedDate (day-level)
     if slot.availableSeats > 0 → include
4. Return filtered list
```

The picker renders a responsive button grid. Each button shows:
- `startTime` – `endTime` (formatted HH:mm → 12-hour)
- Available seat count
- Effective price (slot.price ?? schedule.price)

Clicking a slot fires `onTimeSlotSelect(slot)`. Clicking the same slot again deselects it (`null`). Changing the date automatically clears the selected slot.

---

## 7. Frontend: Event Detail Page

**File:** `frontend/src/pages/EventDetailPage.tsx`

### 7.1 currentSchedule Memo

Replicates backend selection logic using ISO string comparison to avoid timezone bugs:

```typescript
const currentSchedule = useMemo(() => {
  if (!event?.dateSchedule?.length) return null;

  if (selectedDate) {
    // Build YYYY-MM-DD in local time (avoids UTC shift)
    const y  = selectedDate.getFullYear();
    const m  = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d  = String(selectedDate.getDate()).padStart(2, '0');
    const targetDate = `${y}-${m}-${d}`;

    const matches = event.dateSchedule.filter((s: any) => {
      const start = new Date(s.startDate).toISOString().split('T')[0];
      const end   = new Date(s.endDate).toISOString().split('T')[0];
      return targetDate >= start && targetDate <= end;
    });

    if (!matches.length) return event.dateSchedule[0]; // fallback
    return matches.find((s: any) => s.isOverride) ?? matches[0];
  }

  return event.dateSchedule[0]; // default: first schedule before date selected
}, [event?.dateSchedule, selectedDate]);
```

### 7.2 Derived State

```typescript
const currentPrice = useMemo(
  () => currentSchedule?.price || event?.price || 0,
  [currentSchedule, event?.price]
);

const currentAvailableSeats = useMemo(
  () => currentSchedule?.availableSeats || event?.availableSpots || 0,
  [currentSchedule, event?.availableSpots]
);

const isUnlimited = !!(currentSchedule?.unlimitedSeats || currentAvailableSeats >= 999_999);
```

- **`currentPrice`** — price that shows in the checkout summary. Updates reactively as the user picks a different date.
- **`currentAvailableSeats`** — drives the quantity selector max and the "X spots left" warning (shown when ≤ 10).
- **`isUnlimited`** — hides capacity UI elements and disables the max-quantity constraint on the quantity stepper.

### 7.3 handleBookNow Flow

```
1. Guard: event._id must exist
2. If event.externalBookingLink:
     Track affiliate click (if affiliate event) → open link in new tab → return
3. Guard: selectedDate must be set
4. Get currentSchedule via getCurrentSchedule()
5. Guard: if currentSchedule.timeSlots.length > 0 AND no selectedTimeSlot → toast error
6. Guard: quantity must not exceed currentAvailableSeats (unless unlimited)
7. Guard: currentSchedule._id must exist
8. dispatch(resetBookingFlow())
9. dispatch(setBookingEvent(event._id))
10. Build initialParticipants array (length = quantity)
11. dispatch(setBookingParticipants(initialParticipants))
12. navigate(`/booking/${event.slug}`, {
      state: {
        event,
        quantity,
        selectedDate: selectedDate.toISOString(),
        schedule: currentSchedule,
        scheduleId: currentSchedule._id,  // ← used by booking controller
        selectedTimeSlot?,                // ← included only if slot was chosen
        totalPrice,
        currency
      }
    })
```

---

## 8. Admin Modals

### 8.1 Create Modal

**File:** `frontend/src/components/admin/EventCreateModal.tsx`

State: `dateSchedule` is a `DateSchedule[]` managed with individual `useState`.

| Function | Purpose |
|---|---|
| `handleAddSchedule()` | Push a blank schedule entry |
| `handleRemoveSchedule(index)` | Filter out by index |
| `handleScheduleChange(index, field, value)` | Update a field; auto-parses numeric fields |
| Inline time slot handlers | Mutate `timeSlots[]` inside the target schedule entry |

**Frontend validation** (before API call):
- `endDate > startDate` per schedule
- `availableSeats <= totalSeats` if `totalSeats > 0`
- City/address required only when `venueType !== 'Online'`

**Payload sent to `POST /api/admin/events`:** the full `dateSchedule` array including any `timeSlots`.

### 8.2 Edit Modal

**File:** `frontend/src/components/admin/EventEditModal.tsx`

State: `formData.dateSchedule` (part of the full `EventData` form state).

| Function | Purpose |
|---|---|
| `addDateSchedule()` | Push a blank entry to `formData.dateSchedule` |
| `removeDateSchedule(index)` | Splice out by index |
| `handleDateScheduleChange(index, field, value)` | Update field, auto-parse numbers |
| Inline time slot handlers | Call `handleInputChange('dateSchedule', updated)` after mutating the slots array |

**Note:** Significant changes to `dateSchedule` trigger re-approval on the backend:
```typescript
const requiresReapproval =
  event.isApproved &&
  JSON.stringify(req.body.dateSchedule) !== JSON.stringify(event.dateSchedule);
```

---

## 9. End-to-End Booking Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. EVENT DETAIL PAGE                                                 │
│    User picks date in EventDatePicker                               │
│    → availableDates memo filters valid days from dateSchedule[]     │
│    → currentSchedule memo finds the matching/override schedule      │
│    → currentPrice & currentAvailableSeats derive from schedule      │
│                                                                     │
│    (Optional) User picks time slot from slot grid                   │
│    → availableTimeSlotsForDate filters timeSlots[] for that day     │
│    → selectedTimeSlot state updated                                 │
│                                                                     │
│    User clicks "Book Now"                                           │
│    → handleBookNow validates guards                                 │
│    → dispatches Redux booking state                                 │
│    → navigate("/booking/:slug", { state: { scheduleId, ... } })    │
└────────────────────────┬────────────────────────────────────────────┘
                         │  React Router location.state
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. BOOKING PAGE                                                      │
│    Collects participant details                                      │
│    Sends POST /api/bookings/initiate with:                          │
│      { eventId, dateScheduleId, seats, participants, ... }          │
└────────────────────────┬────────────────────────────────────────────┘
                         │  HTTP POST
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. booking.controller.ts — initiateBooking()                        │
│    a. Fetch event, user, adminSettings in parallel                  │
│    b. Idempotency check (30-min window, same event+date+seats)      │
│    c. Find schedule: event.dateSchedule.find(s => s._id == id)      │
│    d. Validate schedule date                                         │
│    e. Atomic seat reservation (unless unlimitedSeats):              │
│         findOneAndUpdate({                                           │
│           _id: eventId,                                             │
│           "dateSchedule._id": dateScheduleId,                       │
│           "dateSchedule.availableSeats": { $gte: seats }            │
│         }, { $inc: { "dateSchedule.$.availableSeats": -seats } })  │
│    f. Create Order document                                         │
│    g. Create Stripe Payment Intent                                  │
│    h. Return { clientSecret, orderId }                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. Edge Cases & Gotchas

### Timezone Safety
- The backend normalizes all dates to `00:00:00.000` before comparison.
- The frontend `currentSchedule` memo builds `YYYY-MM-DD` strings in **local time** (not UTC) to avoid off-by-one errors when the browser and server are in different timezones.
- `EventDatePicker` uses `date-fns/startOfDay` which also works in local time.

### Overlapping Schedules
If two schedules overlap the same date and neither has `isOverride: true`, `findBestScheduleForDate` returns **the first one** (`matches[0]`). This is insertion-order dependent. If specific behavior is needed, set `priority` or `isOverride`.

### Legacy `date` Field
Some older events store a single `date` field instead of `startDate`/`endDate`. Both the backend helpers and the frontend `EventDatePicker` handle this:
- Backend: `scheduleContainsDate()` checks `date` as a fallback.
- Frontend: `dateSchedule` is normalized in the `event` memo: `startDate: schedule.startDate || schedule.date`.

### Time Slots Without a `date` Field
A `timeSlot` without a `date` is applied to **every day** in the parent schedule's range. This is useful for recurring daily sessions (e.g. a class that runs at 9 AM and 2 PM every day for a week). Use `slot.date` to scope a slot to one specific day.

### availableSeats vs totalSeats
- `availableSeats` is the **live counter** — it decrements on every booking.
- `totalSeats` is a **read-only reference** stored at creation time and shown as "Capacity: X" in the UI.
- Restoring seats on order cancellation increments `availableSeats` back (handled in the cancellation controller).

### Re-approval on Schedule Edit
When a vendor edits `dateSchedule` (via `PUT /api/events/:id`), the backend compares the serialized arrays:
```typescript
JSON.stringify(req.body.dateSchedule) !== JSON.stringify(event.dateSchedule)
```
If different, `isApproved` is set to `false` and the event re-enters the moderation queue. Admins can use `PUT /api/admin/events/:id` to bypass this.

### Concurrent Booking Race Condition
The `findOneAndUpdate` atomic query is the only safe path for seat reduction. Never use `event.save()` after `reduceSeats()` in a booking context — use the atomic query exclusively to prevent overselling.

---

## 11. Architecture Diagram

```
MongoDB Document (Event)
└── dateSchedule[]                     ← Array of schedule sub-documents
    ├── _id                            ← Used as FK in booking
    ├── startDate / endDate            ← Date range
    ├── availableSeats                 ← Decremented atomically on booking
    ├── price                          ← Per-schedule price
    ├── isOverride                     ← Priority flag
    └── timeSlots[]                    ← Optional sessions per day
        ├── startTime / endTime        ← HH:mm display
        ├── availableSeats             ← Per-slot seat pool
        └── price?                     ← Per-slot price override

                    ┌─────────────────────────────┐
                    │  findBestScheduleForDate()   │
                    │  (backend + frontend mirror) │
                    │  1. Filter by date range     │
                    │  2. Prefer isOverride=true   │
                    │  3. Fallback: first match    │
                    └─────────────────────────────┘
                         │               │
              ┌──────────┘               └──────────┐
              ▼                                     ▼
   hasAvailableSeats()                   EventDetailPage
   reduceSeats()                         currentSchedule memo
   (instance methods)                    currentPrice / isUnlimited
              │                                     │
              ▼                                     ▼
   Booking Controller                    EventDatePicker
   atomic $inc reservation               availableDates calc
                                         timeSlot picker grid
```

---

*This document reflects the codebase as of 2026-04-12. Key files: `src/models/Event.ts`, `src/controllers/booking.controller.ts`, `src/validators/event.validator.ts`, `frontend/src/components/ui/EventDatePicker.tsx`, `frontend/src/pages/EventDetailPage.tsx`.*
