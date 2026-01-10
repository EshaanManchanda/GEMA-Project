# Event Slug Migration - Testing Guide

## ✅ Migration Completed Successfully!

**Status:** All 11 events now have unique slugs generated ✨

---

## 🧪 Manual Testing Steps

### 1. Start the Backend Server
```bash
cd backend
npm run dev
```

Wait for the server to fully start (you'll see MongoDB connection success message).

---

### 2. Test API Responses Include Slug

**Get all events:**
```bash
curl http://localhost:5000/api/events?limit=1
```

**Expected response should include slug field:**
```json
{
  "success": true,
  "data": {
    "events": [{
      "_id": "...",
      "slug": "dubai-music-festival-2024",
      "title": "Dubai Music Festival 2024",
      ...
    }]
  }
}
```

---

### 3. Test Slug-Based URL (NEW)

**Using slug:**
```bash
curl http://localhost:5000/api/events/dubai-music-festival-2024
```

**Expected:** ✅ Returns the event successfully

**Sample slugs from migration:**
- `dubai-music-festival-2024`
- `tech-startup-conference`
- `sunset-yoga-retreat`
- `culinary-masterclass-with-chef-ahmad`
- `international-business-summit-2024`
- `desert-safari-cultural-experience`
- `art-design-exhibition`
- `rooftop-jazz-night`
- `marina-yacht-festival`
- `ai-innovation-workshop`
- `family-fun-day`

---

### 4. Test ID-Based URL (BACKWARD COMPATIBILITY)

**Using MongoDB ObjectId (get an ID from step 2):**
```bash
curl http://localhost:5000/api/events/[EVENT_ID_HERE]
```

**Expected:** ✅ Returns the same event (backward compatibility working)

---

### 5. Test Frontend Routes

**Start frontend:**
```bash
cd frontend
npm run dev
```

**Navigate to:**
- ✅ `http://localhost:3000/events` - Events list page
- ✅ `http://localhost:3000/events/dubai-music-festival-2024` - Event detail with slug
- ✅ `http://localhost:3000/events/[OLD_EVENT_ID]` - Event detail with ID (should still work)

---

### 6. Test EventCard Component Navigation

1. Go to homepage: `http://localhost:3000`
2. Click any event card
3. ✅ Verify URL uses slug format: `/events/event-name-slug`
4. ✅ Verify page loads correctly

---

### 7. Test Dashboard Links

**User Dashboard:**
1. Login as a user
2. Go to Favorites: `http://localhost:3000/favorites`
3. Click any event link
4. ✅ Verify uses slug URL

**Bookings:**
1. Go to Bookings: `http://localhost:3000/bookings`
2. Click "View Event" on any booking
3. ✅ Verify uses slug URL

---

### 8. Test SEO & Social Sharing

**Check canonical URLs:**
1. Navigate to any event detail page
2. View page source (Ctrl+U)
3. Search for `<link rel="canonical"`
4. ✅ Verify URL uses slug format

**Check structured data:**
1. In page source, search for `"@type": "Event"`
2. ✅ Verify `"url"` property uses slug format

**Test social sharing:**
1. Go to booking confirmation page
2. Click "Share Event" button
3. ✅ Verify shared URL uses slug format

---

### 9. Test Vendor Pages

**Vendor Dashboard:**
1. Login as vendor
2. Go to Events: `http://localhost:3000/vendor`
3. Click "Preview" on any event
4. ✅ Verify opens event detail with slug URL

**Claimed Events:**
1. Go to: `http://localhost:3000/vendor/claimed-events`
2. Click "View Event"
3. ✅ Verify uses slug URL

---

### 10. Test Cart & Checkout

**Cart Page:**
1. Add event to cart
2. Go to cart: `http://localhost:3000/cart`
3. Click event title
4. ✅ Verify navigates to slug URL

---

## 🔍 API Endpoint Tests

### Get Event by Slug (New)
```bash
GET /api/events/:slug
Example: GET /api/events/dubai-music-festival-2024
```

### Get Event by ID (Legacy - Still Works)
```bash
GET /api/events/:id
Example: GET /api/events/507f1f77bcf86cd799439011
```

### Create New Event
```bash
POST /api/events
```
**Test:** Create a new event and verify slug is auto-generated from title.

### Update Event Title
```bash
PUT /api/events/:id
Body: { "title": "Updated Event Title" }
```
**Test:** Update an event's title and verify slug regenerates.

---

## 🐛 Troubleshooting

### Issue: "Event not found" when using slug
**Check:**
1. Run migration: `npm run migrate:event-slugs`
2. Verify all events have slugs in MongoDB
3. Check slug matches exactly (case-insensitive, hyphens)

### Issue: Old ID URLs not working
**Check:**
1. Verify ID is valid 24-character hex string
2. Check backend logs for errors
3. Test with curl to isolate frontend vs backend

### Issue: SEO URLs still showing IDs
**Check:**
1. Clear browser cache
2. Check event object has `slug` property
3. Verify fallback logic: `event.slug || event._id`

### Issue: Duplicate slug error
**Check:**
1. Migration script handles duplicates automatically
2. Check for events with identical titles
3. Verify counter appended: `event-name-1`, `event-name-2`

---

## ✅ Success Criteria

All tests should pass:
- ✅ Migration ran successfully (11 events)
- ✅ All events have unique slugs
- ✅ Slug-based URLs work
- ✅ ID-based URLs work (backward compatibility)
- ✅ Frontend navigates with slugs
- ✅ SEO metadata uses slugs
- ✅ Social sharing uses slugs
- ✅ New events auto-generate slugs
- ✅ Title updates regenerate slugs
- ✅ Duplicate titles handled

---

## 📊 Migration Results

```
============================================================
📊 MIGRATION SUMMARY
============================================================
✅ Successfully generated slugs: 11
❌ Failed: 0
📝 Total processed: 11
```

**Generated Slugs:**
1. dubai-music-festival-2024
2. tech-startup-conference
3. sunset-yoga-retreat
4. culinary-masterclass-with-chef-ahmad
5. international-business-summit-2024
6. desert-safari-cultural-experience
7. art-design-exhibition
8. rooftop-jazz-night
9. marina-yacht-festival
10. ai-innovation-workshop
11. family-fun-day

---

## 🚀 Production Deployment Checklist

Before deploying to production:
- [ ] All local tests pass
- [ ] Migration script tested successfully
- [ ] Backward compatibility verified
- [ ] SEO meta tags correct
- [ ] Social sharing working
- [ ] Cache invalidation working
- [ ] Database backup created
- [ ] Rollback plan ready

**Deployment Order:**
1. Deploy backend first
2. Run migration on production DB
3. Verify migration success
4. Deploy frontend
5. Monitor for errors
6. Test key user flows

---

## 📝 Notes

- **Backward Compatibility:** Old ID-based URLs will continue to work indefinitely
- **SEO Impact:** Expect to see improved search rankings within 2-4 weeks
- **User Experience:** Users will see prettier, more descriptive URLs
- **Performance:** Slug lookups are indexed and perform similarly to ID lookups

---

**Testing Status:** ✅ READY FOR TESTING
**Migration Status:** ✅ COMPLETE
**Production Ready:** ✅ YES (after manual testing)

Run through this guide and verify all checkpoints before deploying to production!
