# Coupon System Testing Guide

This guide will help you test the coupon management system at `http://localhost:3000/admin/coupons`.

## Prerequisites

1. **MongoDB**: Ensure MongoDB is running and accessible
2. **Node.js**: Version 16+ installed
3. **Admin Account**: You need an admin account to access the coupons page

## Step 1: Start Backend Server

```bash
cd backend
npm install  # If not already installed
npm run dev
```

**Expected output:**
```
Server starting...
✅ MongoDB Connected Successfully
Server running in development mode on port 5001
```

**If you see errors:**
- **MongoDB connection error**: Check your `MONGODB_URI` in `backend/.env`
- **Port already in use**: Change `PORT` in `backend/.env` or stop the process using port 5001

## Step 2: Start Frontend Server

```bash
cd frontend
npm install  # If not already installed
npm run dev
```

**Expected output:**
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

## Step 3: Login as Admin

1. Navigate to `http://localhost:3000/login`
2. Login with your admin credentials
3. If you don't have an admin account, create one or use the admin secret key

## Step 4: Access Coupons Page

Navigate to: `http://localhost:3000/admin/coupons`

**What you should see:**
- ✅ Page loads successfully
- ✅ Statistics cards showing:
  - Total Coupons
  - Active coupons count
  - Total usage
  - Expired coupons
- ✅ Search and filter controls
- ✅ "Create Coupon" button
- ✅ Coupon list table (may be empty if no coupons exist)

## Step 5: Test CRUD Operations

### Create a Coupon (Test 1)

1. Click **"Create Coupon"** button
2. Fill in the form:
   - **Code**: `TEST20` (or use "Generate" button)
   - **Name**: `Test 20% Discount`
   - **Description**: `Test coupon for verification`
   - **Type**: Select "Percentage"
   - **Value**: `20`
   - **Valid From**: Today's date
   - **Valid Until**: Date 30 days from now
   - **Usage Limit**: `100`
   - **Per User Limit**: `1`
3. Click **"Create Coupon"**

**Expected result:**
- ✅ Success message: "Coupon created successfully"
- ✅ Modal closes
- ✅ New coupon appears in the table
- ✅ Status badge shows "Active"

### Read/View Coupons (Test 2)

1. Check that the coupon appears in the table
2. Verify all fields are displayed correctly:
   - Code, name, validity period, usage stats, status
3. Try the search box: Type "TEST20"
4. Try filters: Select "Active" from status dropdown

**Expected result:**
- ✅ Coupon is visible in table
- ✅ Search filters the list correctly
- ✅ Status filter works properly

### Update a Coupon (Test 3)

1. Click the **Edit** button (pencil icon) on your test coupon
2. Change the **Name** to `Updated Test Discount`
3. Change the **Value** to `25`
4. Click **"Update Coupon"**

**Expected result:**
- ✅ Success message: "Coupon updated successfully"
- ✅ Modal closes
- ✅ Coupon shows updated values in the table

### View Statistics (Test 4)

1. Click the **Stats** button (bar chart icon) on your coupon
2. Check the statistics modal

**Expected result:**
- ✅ Modal opens showing:
  - Total uses: 0 (since it's new)
  - Unique users: 0
  - Average discount: 0
  - Remaining uses: 100

### Delete a Coupon (Test 5)

1. Click the **Delete** button (trash icon) on your test coupon
2. Confirm the deletion in the prompt
3. Wait for the operation to complete

**Expected result:**
- ✅ Confirmation dialog appears
- ✅ Success message: "Coupon deleted successfully"
- ✅ Coupon disappears from the table
- ✅ Statistics update accordingly

### Bulk Operations (Test 6)

1. Create 2-3 test coupons
2. Check the checkboxes next to multiple coupons
3. Click **"Deactivate"** button in the header
4. Verify coupons change to "Inactive" status
5. Select them again and click **"Activate"**

**Expected result:**
- ✅ Bulk selection works
- ✅ Status updates for all selected coupons
- ✅ Success message shows count: "X coupons updated successfully"

## Troubleshooting

### Error: "Cannot connect to server"

**Solution:**
1. Check if backend is running: Open `http://localhost:5001/` in browser
2. You should see: `{"message":"Welcome to the Gema Backend API"...}`
3. If not, restart backend server

### Error: "Unauthorized. Please login again"

**Solution:**
1. Your session may have expired
2. Logout and login again
3. Check browser console for auth token issues

### Error: "You do not have permission to view coupons"

**Solution:**
1. Your account may not have admin role
2. Check user role in database: `db.users.findOne({email: "your@email.com"})`
3. Update role if needed: `db.users.updateOne({email: "your@email.com"}, {$set: {role: "admin"}})`

### Error: "Coupons endpoint not found"

**Solution:**
1. Verify backend routes are properly loaded
2. Check `backend/src/routes/index.ts` has `router.use('/coupons', couponRoutes);`
3. Restart backend server

### Page loads but shows "Network Error" in console

**Solution:**
1. Check `frontend/.env` has correct `VITE_API_BASE_URL=http://localhost:5001/api`
2. Check CORS configuration in `backend/src/server.ts` includes `http://localhost:3000`
3. Clear browser cache and reload

### Database Connection Issues

**Solution:**
1. Check MongoDB is running: `mongosh` or MongoDB Compass
2. Verify `MONGODB_URI` in `backend/.env` is correct
3. Test connection: `mongosh "your-connection-string"`

## API Endpoints Reference

All coupon endpoints are under `/api/coupons`:

- `GET /api/coupons` - Get all coupons (admin)
- `GET /api/coupons/:id` - Get single coupon (admin)
- `POST /api/coupons` - Create coupon (admin)
- `PUT /api/coupons/:id` - Update coupon (admin)
- `DELETE /api/coupons/:id` - Delete coupon (admin)
- `GET /api/coupons/:id/stats` - Get statistics (admin)
- `PUT /api/coupons/bulk/status` - Bulk update (admin)
- `GET /api/coupons/active` - Get active coupons (public)

## Testing with cURL

You can also test the API directly:

```bash
# Login to get token
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'

# Get all coupons (replace YOUR_TOKEN)
curl http://localhost:5001/api/coupons \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create a coupon
curl -X POST http://localhost:5001/api/coupons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "code": "CURL20",
    "name": "20% Curl Test",
    "description": "Test via cURL",
    "type": "percentage",
    "value": 20,
    "validFrom": "2025-10-24T00:00:00.000Z",
    "validUntil": "2025-11-24T00:00:00.000Z",
    "usageLimit": 100,
    "userUsageLimit": 1
  }'
```

## Success Criteria

All tests pass when:
- ✅ Page loads without errors
- ✅ Can create new coupons
- ✅ Can view all coupons with filters
- ✅ Can update existing coupons
- ✅ Can delete unused coupons
- ✅ Can view usage statistics
- ✅ Bulk operations work correctly
- ✅ Error messages are clear and helpful
- ✅ Console logs show successful API calls

## Next Steps

After verifying all CRUD operations work:

1. Test coupon validation on frontend (checkout page)
2. Test coupon application during order creation
3. Verify discount calculations are correct
4. Test usage limits and restrictions
5. Test expiry date handling
6. Test first-time user restrictions

## Support

If you continue to experience issues:

1. Check browser console for detailed error messages
2. Check backend logs in terminal
3. Review the enhanced error handling added to CouponList component
4. All operations now have detailed console logging with `[CouponList]` prefix
5. Error toasts will show specific error messages from the backend

## Files Modified

The following files have been updated with enhanced error handling:

- `frontend/src/components/admin/CouponList.tsx` - Enhanced error handling for all CRUD operations
- `frontend/src/components/admin/CouponForm.tsx` - Improved error logging
- Both files now have detailed console logging for debugging

Good luck with testing! 🎉
