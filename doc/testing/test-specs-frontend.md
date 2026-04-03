# Test Specifications: Frontend & End-to-End
> Gema Event Management Platform
> Generated: 2026-02-25

## 1. Frontend Route Navigation
| Test ID | Description | Preconditions | Input/Interaction | Expected Output | Priority |
|---------|-------------|---------------|-------------------|-----------------|----------|
| TC-FE-001 | Home Page Loads smoothly | None | Go to `/` | Loads < 2s; No Layout Shifts; shows `HomePageSkeleton` while loading data | High |
| TC-FE-002 | Search Input Debouncing | Events available | Type rapidly in search bar | Results filter ~300ms after typing stops; smooth UX | High |
| TC-FE-003 | Route Transition to Event Detail | Events loaded in grid | Click Event Card | Instantly changes route (< 200ms); URL is `/events/:slug` | High |

## 2. Event Routing (Slug vs ID)
*This specifically validates the Slug migration backward compatibility.*
| Test ID | Description | Preconditions | Input/Interaction | Expected Output | Priority |
|---------|-------------|---------------|-------------------|-----------------|----------|
| TC-FE-004 | Navigate via URL Slug | Event has slug | Go to `/events/event-slug-name` | Event loads normally | High |
| TC-FE-005 | Navigate via Legacy Mongo ID | Event ID exists | Go to `/events/:mongodb_id` | Event loads normally, UI identical to slug | High |
| TC-FE-006 | API responds with Slug | Event queried | GET `/api/events/:slug` | 200 OK; Response JSON includes `slug` field | High |
| TC-FE-007 | Share Event Link | On Event Page | Click "Share" | Shared URL automatically uses slug format, not ID | Medium |

## 3. Dynamic Form Behaviors (Admin/Vendor)
| Test ID | Description | Preconditions | Input/Interaction | Expected Output | Priority |
|---------|-------------|---------------|-------------------|-----------------|----------|
| TC-FE-008 | Offline Event Fields Required | Create Event mode | Select "Offline" teaching mode | Address and Coordinates fields render; forms fail submission if omitted | High |
| TC-FE-009 | Online Event Fields Required | Create Event mode | Select "Online" / "Hybrid" | Meeting link renders; form fails if omitted; physical address not required | High |

## 4. SEO & Meta Validation
| Test ID | Description | Preconditions | Input/Interaction | Expected Output | Priority |
|---------|-------------|---------------|-------------------|-----------------|----------|
| TC-FE-010 | Canonical Tags use correct URLs | On Event detail page | Inspect `<link rel="canonical">` | Value resolves to `/events/:slug` and matches OG tags | Medium |

## 5. Performance Checkpoints (Manual)
- **Lighthouse Score:** Ensure Lighthouse Performance score >= 80 on Desktop.
- **Scroll FPS:** Scroll through the Events grid with > 100 items. Ensure 60fps scrolling without stuttering (validating List Memoization).
