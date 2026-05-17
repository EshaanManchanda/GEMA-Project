# Booking Attachment Not Visible in Production — Fix Guide

## Problem
The "Booking Attachment" field in Admin > Events is not visible or showing existing attachments in production, even though it works in development.

## Root Causes
1. **Missing field in production DB**: Existing events may not have the `bookingAttachments` field (created before feature was added)
2. **Stale cache**: Updates to booking attachments might not be clearing the Redis cache, so old cached data is returned
3. **API response issue**: The endpoint may be returning empty bookingAttachments due to schema mismatch

## Solutions Applied

### ✅ Solution 1: Run Migration to Initialize Field (Production)

The migration script ensures all events have the `bookingAttachments` field initialized.

**On Production Server:**
```bash
cd /var/www/GEMA-Project/backend
npm run migrate:booking-attachments
```

**What it does:**
- Finds all events without `bookingAttachments` field
- Initializes them with empty array `[]`
- Verifies the migration completed successfully

**Output Example:**
```
2026-05-17T18:45:30Z info: Found 45 events without bookingAttachments field
2026-05-17T18:45:32Z info: Updated: 45 documents
2026-05-17T18:45:32Z info: ✓ Migration verified: all events have bookingAttachments field
```

### ✅ Solution 2: Cache Invalidation (Deployed)

Added automatic cache clearing after event updates in:
- **File**: `backend/src/controllers/admin.event.controller.ts` (updateEvent function)
- **Change**: Now calls `invalidateEventCaches(eventId)` after save
- **Benefit**: Ensures old cached bookingAttachments are cleared when updated

### ✅ Solution 3: Verify Schema Field (Backend)

The schema in `backend/src/models/Event.ts` line 150 correctly defines:
```typescript
bookingAttachments?: Array<{
  originalName?: string;
  filename?: string;
  url: string;
  size?: number;
  mimetype?: string;
  provider?: "local" | "cloudinary";
  cloudinaryUrl?: string;
  uploadedAt?: Date;
}>;
```

## Testing Steps

### Step 1: Verify Migration (if needed)
```bash
# Local development
npm run migrate:booking-attachments

# Production
ssh root@YOUR_SERVER
cd /var/www/GEMA-Project/backend
npm run migrate:booking-attachments
```

### Step 2: Test Admin Form
1. Go to Admin > Events
2. Edit any event
3. Scroll to "Booking Attachment" section (should be visible in BasicInfoTab)
4. Upload a file (PDF, image, CSV, etc.)
5. Save event
6. Refresh page (Ctrl+F5 to clear browser cache)
7. Re-open event — attachment should persist

### Step 3: Test Booking Email
When a user books this event:
1. They should receive email with booking receipt PDF
2. Plus the uploaded booking attachments
3. Check logs: `"Booking receipt PDF email sent"`

### Step 4: Verify Cache Invalidation
After updating booking attachments:
1. Check backend logs for: `Cache invalidated for event {id} after update`
2. Next GET request should return fresh data with new attachments

## Quick Deployment Checklist

- [ ] Deploy `backend/src/controllers/admin.event.controller.ts` (cache invalidation added)
- [ ] Deploy `backend/src/scripts/migrate-booking-attachments.ts` (new migration script)
- [ ] Deploy updated `backend/package.json` (new npm script)
- [ ] Run migration: `npm run migrate:booking-attachments`
- [ ] Test on production: upload attachment to test event, verify it persists after refresh
- [ ] Clear browser cache and try again

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Migration fails with "Cannot connect to MongoDB" | Check MONGODB_URI env var is set correctly |
| Booking attachments still empty after migration | Run: `db.events.updateMany({}, {$set: {bookingAttachments: []}})` manually in MongoDB |
| Field still not visible in UI | Clear browser localStorage: Dev Tools > Application > Local Storage > Clear All |
| Attachments disappear after refresh | Cache not invalidating — restart backend: `pm2 restart gema-backend` |

## Files Modified
- `backend/src/controllers/admin.event.controller.ts` — Added cache invalidation
- `backend/src/scripts/migrate-booking-attachments.ts` — New migration script
- `backend/package.json` — Added migration script entry

## API References

**Get Event (returns bookingAttachments):**
```bash
GET /api/admin/events/{eventId}

Response:
{
  "data": {
    "event": {
      "title": "...",
      "bookingAttachments": [
        {
          "originalName": "terms.pdf",
          "filename": "terms.pdf",
          "url": "/api/uploads/files/...",
          "mimetype": "application/pdf",
          "provider": "local",
          "uploadedAt": "2026-05-17T12:00:00Z"
        }
      ]
    }
  }
}
```

**Update Event (with attachments):**
```bash
PUT /api/admin/events/{eventId}

Payload:
{
  "title": "...",
  "bookingAttachments": [
    {
      "originalName": "...",
      "filename": "...",
      "url": "...",
      ...
    }
  ]
}
```

## Support

If issues persist after deployment:
1. Check MongoDB directly: `db.events.findOne({_id: ObjectId("...")}).bookingAttachments`
2. Check Redis cache is working: `redis-cli GET event:{eventId}`
3. Check backend logs for errors during attachment upload/update
4. Verify file upload endpoint is working: `POST /api/uploads`

