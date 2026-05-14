# Schedule System Architecture

> **Document Type:** Architecture Reference  
> **Last Updated:** 2026-05-14  
> **Stack:** MongoDB + Express (Backend) + React (Frontend)  
> **Version:** 2.0 (Pattern-based with Grade Support)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Pattern Types](#2-pattern-types)
3. [Data Model](#3-data-model)
4. [Schedule Generation Logic](#4-schedule-generation-logic)
5. [Grade Filtering System](#5-grade-filtering-system)
6. [Time Slot Configuration](#6-time-slot-configuration)
7. [Seat Management](#7-seat-management)
8. [Frontend Architecture](#8-frontend-architecture)
9. [User Booking Flow](#9-user-booking-flow)
10. [API Integration](#10-api-integration)
11. [Migration Strategy](#11-migration-strategy)
12. [Key Files](#12-key-files)

---

## 1. Overview

The Schedule System (v2.0) provides a **pattern-based** approach to creating and managing event schedules. Instead of manually entering each date, administrators define scheduling patterns that automatically generate all required dates.

### Key Features

| Feature | Description |
|---------|-------------|
| **Pattern-based Scheduling** | Define recurrence patterns instead of manual dates |
| **Days of Week** | Select specific days (Mon, Wed, Fri) for weekly events |
| **Frequency Options** | Daily, weekly (with day selection), monthly |
| **Grade Filtering** | Sessions can target specific grade ranges |
| **Per-Slot Pricing** | Different time slots can have different prices |
| **Capacity Management** | Per-slot or per-schedule seat limits |
| **Atomic Booking** | Concurrent bookings handled safely |

### Use Case Examples

**Example 1: Weekly Recurring Class**
- Start: June 1, 2026 | End: August 31, 2026
- Days: Monday, Wednesday, Friday
- Time Slots: 9 AM (Grades 1-3), 2 PM (Grades 4-6)
- Generates ~39 sessions automatically

**Example 2: Monthly Workshop**
- Start: Jan 1, 2026 | End: Dec 31, 2026
- Frequency: Monthly on 15th
- Single time slot: 10 AM - 1 PM

**Example 3: Specific Dates**
- Custom dates: [Jun 10, Jun 17, Jun 24]
- Time slot: 2 PM - 5 PM

---

## 2. Pattern Types

The system supports two primary pattern types, selectable via a toggle in the UI.

### 2.1 Pattern: Recurring

Used for events that repeat on specific days of the week within a date range.

```typescript
interface RecurringPattern {
  type: 'recurring';
  startDate: Date;           // First occurrence
  endDate: Date;            // Last occurrence
  daysOfWeek: number[];     // [1,3,5] = Mon, Wed, Fri
  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}
```

**UI Representation:**
```
Start Date: [Jun 1, 2026]  End Date: [Aug 31, 2026]

Select Days:
[Mon ✓] [Tue  ] [Wed ✓] [Thu  ] [Fri ✓] [Sat  ] [Sun  ]
```

**Generation Rule:**
- Iterate from startDate to endDate
- Include only dates matching daysOfWeek
- Example: Jun 1 (Mon) → Jun 3 (Wed) → Jun 5 (Fri) → ...

### 2.2 Pattern: Specific Dates

Used for events on specific dates with configurable frequency.

```typescript
interface SpecificDatesPattern {
  type: 'specific_dates';
  mode: 'custom' | 'daily' | 'weekly' | 'monthly';
  
  // Mode: custom
  customDates?: Date[];     // Explicit list [Jun 10, Jun 17, Jun 24]
  
  // Mode: daily
  startDate?: Date;
  endDate?: Date;
  
  // Mode: weekly
  startDate?: Date;
  endDate?: Date;
  weekDays?: number[];      // Same as daysOfWeek
  
  // Mode: monthly
  startDate?: Date;
  endDate?: Date;
  monthDay?: number;        // 1-31, day of month
}
```

**UI Representation:**
```
Pattern Mode: (•) Custom  ( ) Daily  ( ) Weekly  ( ) Monthly

[ ] Custom Dates:
    + Add Date: [Jun 10] [Add]
    - Jun 10, 2026
    - Jun 17, 2026
    - Jun 24, 2026

[ ] Weekly:
    Start: [Jun 1]  End: [Aug 31]
    Days: [Mon ✓] [Tue ✓] [Wed  ] ...

[ ] Monthly:
    Start: [Jan 1]  End: [Dec 31]
    Day of Month: [15]
```

---

## 3. Data Model

### 3.1 Schedule Entry Structure

Each schedule entry contains the pattern configuration and time slots.

```typescript
interface ScheduleEntry {
  // Pattern Configuration
  _id: mongoose.Types.ObjectId;
  pattern: 'recurring' | 'specific_dates';
  
  // Recurring Pattern
  startDate: Date;
  endDate: Date;
  daysOfWeek?: number[];        // [1,3,5] = Mon, Wed, Fri
  
  // Specific Dates Pattern
  specificDateMode?: 'custom' | 'daily' | 'weekly' | 'monthly';
  customDates?: Date[];         // Explicit dates
  weekDays?: number[];         // For weekly mode
  monthDay?: number;           // For monthly mode (1-31)
  
  // Time Slots (applies to all generated dates)
  timeSlots: TimeSlot[];
  
  // Pricing & Capacity (defaults for all slots)
  price: number;
  availableSeats: number;
  totalSeats?: number;
  soldSeats?: number;
  reservedSeats?: number;
  unlimitedSeats?: boolean;
  
  // Grade Configuration (NEW)
  gradeMin?: number;            // Minimum grade (e.g., 1)
  gradeMax?: number;           // Maximum grade (e.g., 3)
  gradeLabel?: string;         // Display: "Grades 1-3"
  
  // Override & Priority
  isOverride?: boolean;
  priority?: number;
  
  // Legacy Support
  date?: Date;                  // Original single-date field
}
```

### 3.2 Time Slot Structure

Each time slot can have its own pricing, capacity, and grade range.

```typescript
interface TimeSlot {
  _id?: mongoose.Types.ObjectId;
  
  // Timing
  startTime: string;            // "09:00" (HH:mm)
  endTime: string;             // "11:00" (HH:mm)
  
  // Override: Slot-level pricing
  price?: number;              // Overrides schedule.price
  
  // Override: Slot-level capacity
  availableSeats?: number;     // If not set, uses schedule.availableSeats
  totalSeats?: number;
  soldSeats?: number;
  
  // Override: Slot-level grade (optional)
  gradeMin?: number;           // If not set, uses schedule.gradeMin
  gradeMax?: number;
  gradeLabel?: string;
  
  // Metadata
  label?: string;              // Optional: "Morning Session", "Afternoon Class"
}
```

### 3.3 Complete Schema Diagram

```
Event
└── dateSchedule[]
    ├── _id
    ├── pattern                      ← "recurring" | "specific_dates"
    │
    ├── Pattern: Recurring
    │   ├── startDate
    │   ├── endDate
    │   └── daysOfWeek               ← [1,3,5] = Mon/Wed/Fri
    │
    ├── Pattern: Specific Dates
    │   ├── specificDateMode         ← "custom" | "daily" | "weekly" | "monthly"
    │   ├── customDates?             ← [Date, Date, ...]
    │   ├── weekDays?                ← [1,3,5]
    │   └── monthDay?                ← 15
    │
    ├── price                        ← Default price
    ├── availableSeats              ← Default capacity
    ├── unlimitedSeats              ← Skip capacity checks
    │
    ├── gradeMin / gradeMax         ← Grade range (optional)
    ├── gradeLabel                  ← "Grades 1-3"
    │
    └── timeSlots[]
        ├── startTime / endTime     ← "09:00" - "11:00"
        ├── price?                  ← Slot override
        ├── availableSeats?        ← Slot override
        └── gradeMin / gradeMax?   ← Slot-specific grade
```

---

## 4. Schedule Generation Logic

### 4.1 Backend Generation

The backend provides a utility function to expand patterns into actual dates.

```typescript
// backend/src/utils/scheduleGenerator.ts

interface GeneratedDate {
  date: Date;
  dayOfWeek: number;           // 0-6
  scheduleId: string;
}

/**
 * Expand a schedule pattern into actual dates
 * @param schedule - The ScheduleEntry with pattern config
 * @returns Array of generated dates
 */
function generateScheduleDates(schedule: ScheduleEntry): GeneratedDate[] {
  const dates: GeneratedDate[] = [];
  
  if (schedule.pattern === 'recurring') {
    // Recurring: iterate daysOfWeek within range
    const current = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (schedule.daysOfWeek.includes(dayOfWeek)) {
        dates.push({
          date: new Date(current),
          dayOfWeek,
          scheduleId: schedule._id.toString()
        });
      }
      current.setDate(current.getDate() + 1);
    }
  }
  
  if (schedule.pattern === 'specific_dates') {
    switch (schedule.specificDateMode) {
      case 'custom':
        return schedule.customDates.map(d => ({
          date: new Date(d),
          dayOfWeek: new Date(d).getDay(),
          scheduleId: schedule._id.toString()
        }));
        
      case 'daily':
        // Generate every day in range
        // ...
        
      case 'weekly':
        // Generate only on specified weekDays
        // ...
        
      case 'monthly':
        // Generate on specific day of each month
        // ...
    }
  }
  
  return dates;
}
```

### 4.2 Frontend Generation (scheduleUtils.ts)

The frontend replicates the same logic for UI display.

```typescript
// frontend/src/utils/scheduleUtils.ts

interface ScheduleConfig {
  pattern: 'recurring' | 'specific_dates';
  startDate: Date;
  endDate: Date;
  daysOfWeek?: number[];
  specificDateMode?: 'custom' | 'daily' | 'weekly' | 'monthly';
  customDates?: Date[];
  weekDays?: number[];
  monthDay?: number;
}

/**
 * Generate all dates for a schedule pattern
 */
export function expandSchedule(config: ScheduleConfig): Date[] {
  const dates: Date[] = [];
  
  if (config.pattern === 'recurring' && config.daysOfWeek) {
    const current = startOfDay(new Date(config.startDate));
    const end = startOfDay(new Date(config.endDate));
    
    while (!isAfter(current, end)) {
      if (config.daysOfWeek.includes(current.getDay())) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
  }
  
  // ... handle other modes
  
  return dates;
}
```

### 4.3 Generation Example

**Input:**
```json
{
  "pattern": "recurring",
  "startDate": "2026-06-01",
  "endDate": "2026-06-07",
  "daysOfWeek": [1, 3, 5],
  "timeSlots": [
    { "startTime": "09:00", "endTime": "11:00", "gradeMin": 1, "gradeMax": 3 },
    { "startTime": "14:00", "endTime": "16:00", "gradeMin": 4, "gradeMax": 6 }
  ]
}
```

**Output (Generated Dates):**
```
Jun 1 (Mon): Slot 1 (Grades 1-3), Slot 2 (Grades 4-6)
Jun 3 (Wed): Slot 1 (Grades 1-3), Slot 2 (Grades 4-6)
Jun 5 (Fri): Slot 1 (Grades 1-3), Slot 2 (Grades 4-6)
```

---

## 5. Grade Filtering System

### 5.1 Grade Configuration

Grades can be set at two levels:

| Level | Fields | Description |
|-------|--------|-------------|
| **Schedule Level** | `gradeMin`, `gradeMax`, `gradeLabel` | Applies to all time slots unless overridden |
| **Slot Level** | `gradeMin`, `gradeMax`, `gradeLabel` | Overrides schedule-level grade for specific slot |

### 5.2 Grade UI (Frontend)

```
┌─────────────────────────────────────────────────────────┐
│ Grade Filter                                            │
├─────────────────────────────────────────────────────────┤
│ My Child's Grade: [Select Grade ▼]                      │
│                                                          │
│ Available Sessions for Grade 4:                         │
│ ┌────────────────────┬────────────────────────────┐      │
│ │ Mon, Jun 1         │ 9:00 AM - 11:00 AM        │      │
│ │ Grades 1-3         │ $50 | 15 seats left       │      │
│ ├────────────────────┼────────────────────────────┤      │
│ │ Mon, Jun 1         │ 2:00 PM - 4:00 PM         │      │
│ │ Grades 4-6         │ $60 | 8 seats left  ✓    │      │
│ └────────────────────┴────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 5.3 Grade Filtering Logic

```typescript
// Filter sessions by user's grade
function filterSessionsByGrade(sessions: Session[], userGrade: number): Session[] {
  return sessions.filter(session => {
    const min = session.gradeMin ?? 0;
    const max = session.gradeMax ?? 999;
    return userGrade >= min && userGrade <= max;
  });
}
```

### 5.4 Grade Display Labels

| Range | Display Label |
|-------|---------------|
| gradeMin=1, gradeMax=3 | "Grades 1-3" |
| gradeMin=4, gradeMax=6 | "Grades 4-6" |
| gradeMin=1, gradeMax=12 | "All Grades" |
| (not set) | "All Ages" |

---

## 6. Time Slot Configuration

### 6.1 Slot Structure

Each schedule entry can have multiple time slots, each with independent:
- Time range (startTime, endTime)
- Price (optional override)
- Capacity (optional override)
- Grade range (optional override)

### 6.2 UI Representation

```
┌─────────────────────────────────────────────────────────────┐
│ Time Slots                                                │
├─────────────────────────────────────────────────────────────┤
│ [+ Add Time Slot]                                          │
│                                                             │
│ ┌─ Slot 1 ─────────────────────────────────────────────┐   │
│ │ Label: [Morning Class            ] (optional)         │   │
│ │ Start Time: [09:00] End Time: [11:00]                │   │
│ │ Price: [$50    ] (or leave blank for schedule price)│   │
│ │ Seats: [20   ] (or leave blank for schedule seats)   │   │
│ │ Grade: [1  ] to [3  ] or [All]                       │   │
│ │                                              [Delete]│   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ Slot 2 ─────────────────────────────────────────────┐   │
│ │ Label: [Afternoon Class          ]                  │   │
│ │ Start Time: [14:00] End Time: [16:00]                │   │
│ │ Price: [$60    ]                                      │   │
│ │ Seats: [15   ]                                        │   │
│ │ Grade: [4  ] to [6  ]                                │   │
│ │                                              [Delete]│   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Slot Inheritance

```
Schedule Level (Defaults)
├── price: $50
├── availableSeats: 20
├── gradeMin: 1, gradeMax: 3
│
└── timeSlots[]
    ├── Slot 1
    │   ├── startTime: "09:00"
    │   ├── endTime: "11:00"
    │   ├── (inherits: price=$50, seats=20, grades=1-3)
    │   └── price: (override to $45)
    │
    └── Slot 2
        ├── startTime: "14:00"
        ├── endTime: "16:00"
        ├── (inherits: price=$50, seats=20, grades=1-3)
        └── gradeMin: 4, gradeMax: 6 (override)
```

---

## 7. Seat Management

### 7.1 Capacity Types

| Type | Field | Behavior |
|------|-------|----------|
| **Schedule-level** | `availableSeats` | Shared pool for all slots on all dates |
| **Slot-level** | `timeSlots[].availableSeats` | Individual pool per slot |
| **Unlimited** | `unlimitedSeats: true` | No capacity checks |

### 7.2 Seat Calculation for Bookings

```typescript
/**
 * Determine available seats for a specific slot on a specific date
 */
function getAvailableSeatsForSlot(
  schedule: ScheduleEntry,
  date: Date,
  slotIndex: number
): number {
  const slot = schedule.timeSlots[slotIndex];
  
  // Slot has its own seat count
  if (slot?.availableSeats !== undefined) {
    return slot.availableSeats;
  }
  
  // Fall back to schedule-level seats
  return schedule.availableSeats;
}
```

### 7.3 Atomic Seat Reservation

When a user books, the system uses atomic MongoDB operations to prevent overselling:

```typescript
// Atomic decrement for schedule-level seats
const result = await EventModel.findOneAndUpdate(
  {
    _id: eventId,
    "dateSchedule._id": scheduleId,
    "dateSchedule.availableSeats": { $gte: quantity }
  },
  {
    $inc: { "dateSchedule.$.availableSeats": -quantity }
  },
  { new: true }
);

// Atomic decrement for slot-level seats
const slotResult = await EventModel.findOneAndUpdate(
  {
    _id: eventId,
    "dateSchedule._id": scheduleId,
    "dateSchedule.timeSlots._id": slotId,
    "dateSchedule.timeSlots.$.availableSeats": { $gte: quantity }
  },
  {
    $inc: { "dateSchedule.$.timeSlots.$.availableSeats": -quantity }
  },
  { new: true }
);
```

---

## 8. Frontend Architecture

### 8.1 Component Structure

```
frontend/src/
├── components/
│   ├── admin/
│   │   ├── ScheduleBuilder.tsx        ← NEW: Pattern-based schedule editor
│   │   ├── ScheduleEditor.tsx        ← Edit existing schedule
│   │   └── TimeSlotEditor.tsx        ← Time slot configuration
│   │
│   └── ui/
│       ├── EventDatePicker.tsx       ← Date selection (updated)
│       ├── TimeSlotPicker.tsx        ← Slot selection
│       └── GradeFilter.tsx           ← NEW: Grade dropdown
│
├── pages/
│   ├── EventDetailPage.tsx           ← Event display + booking
│   └── BookingPage.tsx               ← Checkout flow
│
└── utils/
    ├── scheduleUtils.ts              ← getAllSessions, expandSchedule
    └── gradeUtils.ts                 ← NEW: Grade filtering
```

### 8.2 ScheduleBuilder Component

The new ScheduleBuilder provides a user-friendly interface:

```typescript
interface ScheduleBuilderProps {
  initialSchedule?: ScheduleEntry;
  onSave: (schedule: ScheduleEntry) => void;
  onCancel: () => void;
}

// UI State
interface ScheduleBuilderState {
  pattern: 'recurring' | 'specific_dates';
  
  // Recurring fields
  startDate: Date;
  endDate: Date;
  daysOfWeek: number[];
  
  // Specific dates fields
  specificDateMode: 'custom' | 'daily' | 'weekly' | 'monthly';
  customDates: Date[];
  weekDays: number[];
  monthDay: number;
  
  // Shared
  timeSlots: TimeSlot[];
  price: number;
  availableSeats: number;
  gradeMin?: number;
  gradeMax?: number;
}
```

### 8.3 Session Flattening

The `getAllSessions()` function expands patterns into flat sessions:

```typescript
interface Session {
  id: string;                    // "{scheduleId}-{YYYY-MM-DD}-{slotIndex}"
  date: Date;
  displayDate: string;           // "Mon, Jun 1"
  startTime: string;
  endTime: string;
  price: number;
  availableSeats: number;
  isUnlimited: boolean;
  isOverride: boolean;
  scheduleId: string;
  slotIndex: number;
  gradeMin?: number;
  gradeMax?: number;
  gradeLabel?: string;
}

/**
 * Expand all schedules into flat Session array
 */
function getAllSessions(
  schedules: ScheduleEntry[],
  options: { 
    includeUnavailable?: boolean;
    includePast?: boolean;
    filterGrade?: number;       // NEW: filter by user grade
  }
): Session[]
```

---

## 9. User Booking Flow

### 9.1 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Event Detail Page                                            │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │ Grade Filter: [Select Grade ▼]                         │  │
│    │                                                         │  │
│    │ Available Sessions (filtered by grade):                │  │
│    │ ┌─────────────────────────────────────────────────┐   │  │
│    │ │ Mon, Jun 1  |  9:00-11:00  |  Grades 1-3  | $50  │   │  │
│    │ │ Mon, Jun 1  | 14:00-16:00  |  Grades 4-6  | $60  │   │  │
│    │ │ Wed, Jun 3  |  9:00-11:00  |  Grades 1-3  | $50  │   │  │
│    │ └─────────────────────────────────────────────────┘   │  │
│    └─────────────────────────────────────────────────────────┘  │
│    User selects a session → captures {scheduleId, slotIndex}   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Booking Page                                                 │
│    User enters quantity, participant details                   │
│    POST /api/bookings/initiate                                 │
│    { eventId, scheduleId, slotId, quantity, grade, ... }       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Backend Processing                                          │
│    - Validate schedule/slot exists                             │
│    - Check grade eligibility                                   │
│    - Atomic seat reservation (schedule or slot level)          │
│    - Create Order + Payment Intent                             │
│    - Return { clientSecret, orderId }                          │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Booking Payload

```typescript
interface BookingRequest {
  eventId: string;
  scheduleId: string;              // dateSchedule._id
  slotId?: string;                 // timeSlots._id (if slot selected)
  date: string;                    // YYYY-MM-DD
  quantity: number;
  userGrade?: number;              // For grade validation
  
  participants: Array<{
    name: string;
    grade?: number;               // Validate matches slot grade
    email: string;
  }>;
}
```

---

## 10. API Integration

### 10.1 Event Creation (Admin)

**Endpoint:** `POST /api/admin/events`

**Payload:**
```json
{
  "title": "Summer Coding Camp",
  "dateSchedule": [
    {
      "pattern": "recurring",
      "startDate": "2026-06-01",
      "endDate": "2026-08-31",
      "daysOfWeek": [1, 3, 5],
      "price": 50,
      "availableSeats": 20,
      "gradeMin": 1,
      "gradeMax": 3,
      "timeSlots": [
        {
          "startTime": "09:00",
          "endTime": "11:00",
          "label": "Morning Session"
        },
        {
          "startTime": "14:00",
          "endTime": "16:00",
          "price": 60,
          "gradeMin": 4,
          "gradeMax": 6
        }
      ]
    }
  ]
}
```

### 10.2 Get Available Sessions (Public)

**Endpoint:** `GET /api/events/:id/sessions`

**Query Params:**
- `grade` (optional): Filter by user grade

**Response:**
```json
{
  "sessions": [
    {
      "id": "abc123-2026-06-01-0",
      "date": "2026-06-01",
      "displayDate": "Mon, Jun 1",
      "startTime": "09:00",
      "endTime": "11:00",
      "price": 50,
      "availableSeats": 15,
      "gradeMin": 1,
      "gradeMax": 3,
      "gradeLabel": "Grades 1-3"
    },
    {
      "id": "abc123-2026-06-01-1",
      "date": "2026-06-01",
      "displayDate": "Mon, Jun 1",
      "startTime": "14:00",
      "endTime": "16:00",
      "price": 60,
      "availableSeats": 8,
      "gradeMin": 4,
      "gradeMax": 6,
      "gradeLabel": "Grades 4-6"
    }
  ]
}
```

---

## 11. Migration Strategy

### 11.1 Legacy Support

The existing `dateSchedule` format will be supported via a migration layer:

```typescript
/**
 * Convert legacy dateSchedule to new pattern format
 */
function migrateLegacySchedule(legacy: LegacyScheduleEntry): ScheduleEntry {
  // If schedule has date (single date), convert to single-day recurring
  if (legacy.date && !legacy.startDate) {
    return {
      pattern: 'specific_dates',
      startDate: legacy.date,
      endDate: legacy.date,
      specificDateMode: 'custom',
      customDates: [legacy.date],
      timeSlots: legacy.timeSlots?.map(ts => ({
        startTime: ts.startTime,
        endTime: ts.endTime,
        price: ts.price,
        availableSeats: ts.availableSeats
      })) || [],
      price: legacy.price,
      availableSeats: legacy.availableSeats,
      ...
    };
  }
  
  // If schedule has startDate/endDate, convert to recurring
  // with single day
  if (legacy.startDate && legacy.endDate) {
    return {
      pattern: 'recurring',
      startDate: legacy.startDate,
      endDate: legacy.endDate,
      daysOfWeek: [new Date(legacy.startDate).getDay()],
      ...
    };
  }
}
```

### 11.2 Phased Rollout

| Phase | Description |
|-------|-------------|
| **Phase 1** | Add new pattern fields to schema (backward compatible) |
| **Phase 2** | Update ScheduleBuilder UI for pattern input |
| **Phase 3** | Add grade fields to schema |
| **Phase 4** | Implement grade filtering on frontend |
| **Phase 5** | Create migration script for existing events |
| **Phase 6** | Deprecate legacy fields (future release) |

---

## 12. Key Files

### Backend Files

| File | Purpose |
|------|---------|
| `backend/src/models/Event.ts` | Schema with pattern fields, instance methods |
| `backend/src/utils/scheduleGenerator.ts` | Pattern expansion (NEW) |
| `backend/src/controllers/booking.controller.ts` | Atomic reservation with grade check |
| `backend/src/validators/event.validator.ts` | Pattern validation rules |
| `backend/src/modules/events/routes.ts` | Session endpoint with grade filter |

### Frontend Files

| File | Purpose |
|------|---------|
| `frontend/src/utils/scheduleUtils.ts` | Session flattening with grade support |
| `frontend/src/utils/gradeUtils.ts` | Grade filtering utilities (NEW) |
| `frontend/src/components/admin/ScheduleBuilder.tsx` | Pattern-based schedule editor (NEW) |
| `frontend/src/components/ui/EventDatePicker.tsx` | Updated with grade filter |
| `frontend/src/components/ui/TimeSlotPicker.tsx` | Slot selection UI |
| `frontend/src/components/ui/GradeFilter.tsx` | Grade dropdown (NEW) |
| `frontend/src/pages/EventDetailPage.tsx` | Session display with grade filtering |

---

## Appendix A: Day of Week Reference

| Value | Day | Abbreviation |
|-------|-----|--------------|
| 0 | Sunday | Sun |
| 1 | Monday | Mon |
| 2 | Tuesday | Tue |
| 3 | Wednesday | Wed |
| 4 | Thursday | Thu |
| 5 | Friday | Fri |
| 6 | Saturday | Sat |

---

## Appendix B: Example Configurations

### Example 1: Mon/Wed/Fri Summer Class

```json
{
  "pattern": "recurring",
  "startDate": "2026-06-01",
  "endDate": "2026-08-31",
  "daysOfWeek": [1, 3, 5],
  "price": 50,
  "availableSeats": 20,
  "gradeMin": 1,
  "gradeMax": 6,
  "timeSlots": [
    {
      "startTime": "09:00",
      "endTime": "11:00",
      "gradeMin": 1,
      "gradeMax": 3,
      "label": "Junior Class"
    },
    {
      "startTime": "14:00",
      "endTime": "16:00",
      "gradeMin": 4,
      "gradeMax": 6,
      "price": 60,
      "label": "Senior Class"
    }
  ]
}
```

**Generated:** 39 sessions (13 weeks × 3 days)

### Example 2: Monthly Workshop

```json
{
  "pattern": "specific_dates",
  "specificDateMode": "monthly",
  "startDate": "2026-01-01",
  "endDate": "2026-12-31",
  "monthDay": 15,
  "price": 100,
  "availableSeats": 30,
  "timeSlots": [
    {
      "startTime": "10:00",
      "endTime": "13:00"
    }
  ]
}
```

**Generated:** 12 sessions (one per month)

### Example 3: Custom Dates

```json
{
  "pattern": "specific_dates",
  "specificDateMode": "custom",
  "customDates": ["2026-06-10", "2026-06-17", "2026-06-24"],
  "price": 75,
  "availableSeats": 25,
  "timeSlots": [
    {
      "startTime": "14:00",
      "endTime": "17:00"
    }
  ]
}
```

**Generated:** 3 sessions

---

*Document Version: 2.0 | Last Updated: 2026-05-14*