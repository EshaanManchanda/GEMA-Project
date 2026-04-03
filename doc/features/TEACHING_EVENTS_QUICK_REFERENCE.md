# Teaching Events Admin - Quick Reference

## What Was Changed?

### 1. **Teacher Assignment** 
Admin can now assign a specific teacher to each teaching event via dropdown.

**Before**: No teacher selector
**After**: Teacher dropdown in Basic Info tab with all active teachers

### 2. **Online vs Offline Handling**

#### Online Events:
- ✅ Meeting Link field (required)
- ✅ Service Location Country/City (required, for SEO)
- ❌ No Physical Address
- ❌ No Coordinates

#### Offline Events:
- ❌ No Meeting Link
- ✅ Physical Location Country/City (required)
- ✅ Full Address (required)
- ✅ Coordinates (optional)

#### Hybrid Events:
- ✅ Meeting Link (required) - Treated as Online
- ✅ Service Location Country/City (required, for SEO)
- ❌ No Physical Address
- ❌ No Coordinates

### 3. **Data Mapping**

The frontend uses `teachingMode` but sends `eventType` to backend:
- Frontend: teachingMode = 'Online' | 'Offline' | 'Hybrid'
- Backend: eventType = 'Online' | 'Offline'
- Hybrid gets converted to Online when sending to backend

---

## For Admin Users

### Creating a Teaching Event

**Step 1: Basic Info**
- Fill Title, Description
- Select Category
- Select Teaching Type (Class, Course, etc.)
- **NEW**: Select a Teacher from dropdown
- Set Age Range
- Select Teaching Mode (Online/Offline/Hybrid)
- Fill other basic fields

**Step 2: Schedule & Pricing**
- Set Base Price
- Add one or more schedules
- Set dates, times, seats, pricing

**Step 3: Advanced Settings**
- If **OFFLINE**: Fill Country, City, Address, Coordinates
- If **ONLINE/HYBRID**: Fill Country, City, Meeting Link
- Add FAQs
- Optimize SEO metadata

---

## For Developers

### Key Files Modified

```
frontend/
  ├── src/components/admin/
  │   ├── TeachingBasicInfoTab.tsx        (Added teacher dropdown)
  │   └── TeachingAdvancedTab.tsx         (Conditional fields)
  └── src/pages/admin/
      └── AdminTeachingEditEventPage.tsx  (Form handling & mapping)
```

### Data Structure

```javascript
// Form data (frontend)
{
  teachingMode: 'Online' | 'Offline' | 'Hybrid',
  teacherId: string,
  country: string,
  city: string,
  address: string,
  meetingLink: string,
  ...
}

// Sent to backend as (after transformation)
{
  eventType: 'Online' | 'Offline',  // teachingMode converted
  teacherId: string,
  location: {
    country: string,
    city: string,
    address: string | undefined,      // undefined for online
    coordinates: {lat, lng} | undefined  // undefined for online
  },
  meetingLink: string | undefined,    // undefined for offline
  ...
}
```

---

## Validation Rules

### For All Events:
- ✅ Title (required)
- ✅ Description (required)
- ✅ Category (required)
- ✅ Teacher (required) **NEW**
- ✅ Country (required) **NEW**
- ✅ City (required)
- ✅ Price (required)
- ✅ Schedule (required)

### For Offline Only:
- ✅ Address (required)
- ✅ Age Range (required)

### For Online/Hybrid Only:
- ✅ Meeting Link (required)

### Optional:
- Coordinates (offline)
- Latitude/Longitude (offline)
- Address (online/hybrid)

---

## Common Tasks

### Create an Online Teaching Event
1. Go to Admin → Teaching Events → Create
2. Fill basic info and select a teacher
3. Select "Online" from Teaching Mode
4. Fill country and city (for SEO)
5. Add meeting link (Zoom, Google Meet, etc.)
6. Fill schedule and pricing
7. Add FAQs and SEO metadata
8. Save

### Change Event Type from Offline to Online
1. Edit existing offline event
2. Change Teaching Mode from "Offline" to "Online"
3. Address field disappears (no longer required)
4. Meeting link field appears (now required)
5. Update meeting link
6. Save

### Assign Different Teacher
1. Edit teaching event
2. Change teacher in dropdown
3. Save
4. Teacher updated automatically

---

## Common Issues & Solutions

### Issue: Teacher Dropdown Empty
**Solution**: Ensure teachers are created in system and marked as active

### Issue: Meeting Link Field Not Showing
**Solution**: Change Teaching Mode to "Online" or "Hybrid"

### Issue: Address Field Validation Error (Online Event)
**Solution**: This field shouldn't appear for online. Check Teaching Mode selection.

### Issue: "Country is required" Error
**Solution**: Select a country in the Country dropdown (required for all events)

### Issue: Data Not Saving
**Solution**: Check that all required fields are filled (marked with red asterisk *)

---

## API Endpoints

### Get Available Teachers
```
GET /api/admin/teaching-events/teachers
Returns: [{_id, fullName, email}, ...]
```

### Create Teaching Event
```
POST /api/admin/teaching-events
Body: Complete teaching event data with eventType
```

### Update Teaching Event
```
PUT /api/admin/teaching-events/:id
Body: Partial teaching event data
```

### Change Only Teacher
```
PUT /api/admin/teaching-events/:id/change-teacher
Body: {teacherId}
```

---

## Form Submission Example

### Online Event Payload:
```json
{
  "eventType": "Online",
  "meetingLink": "https://zoom.us/j/123456",
  "location": {
    "country": "AE",
    "city": "Dubai",
    "address": null,
    "coordinates": null
  },
  "teacherId": "507f1f77bcf86cd799439011",
  "seoMeta": {
    "title": "Advanced React Mastery",
    "description": "Learn advanced React patterns",
    "keywords": ["react", "javascript", "web development"]
  }
}
```

### Offline Event Payload:
```json
{
  "eventType": "Offline",
  "meetingLink": null,
  "location": {
    "country": "AE",
    "city": "Dubai",
    "address": "123 Main Street, Business Bay",
    "coordinates": {
      "lat": 25.1972,
      "lng": 55.2744
    }
  },
  "teacherId": "507f1f77bcf86cd799439011",
  "seoMeta": {
    "title": "Advanced React Workshop",
    "description": "Hands-on React workshop in Dubai",
    "keywords": ["react", "workshop", "dubai"]
  }
}
```

---

## Quick Checklist for Creating Event

```
□ Title filled
□ Description filled
□ Category selected
□ Teaching Type selected
□ Teaching Mode selected (Online/Offline/Hybrid)
□ Teacher assigned from dropdown
□ Age range set (min & max)
□ Skill level selected
□ Country selected
□ City selected
□ If Offline: Address filled
□ If Online/Hybrid: Meeting link filled
□ Base price set
□ Currency selected
□ At least one schedule added
□ Schedule dates valid (future dates)
□ SEO title & description filled (or will auto-fill)
□ FAQs added (optional but recommended)
□ Ready to submit ✓
```

---

## FAQ

**Q: Can I use both address and meeting link?**
A: No, choose one based on event type. Online = meeting link, Offline = address.

**Q: What if I want a hybrid event in multiple cities?**
A: Create separate events for each city, or use one country/city as the primary location for SEO.

**Q: Can students see the teacher information?**
A: Yes, teacher name and email are displayed on the event details page.

**Q: What happens if I change the event type?**
A: The form fields update accordingly. Required fields change based on type.

**Q: Is teacher assignment mandatory?**
A: Yes, every teaching event must have a teacher assigned.

**Q: What if teacher goes inactive?**
A: Events won't be affected, but you won't be able to select that teacher for new events.

---

**Last Updated**: January 22, 2025
**Version**: 1.0
**Status**: ✅ Ready for Use

