# Phase-1 Testing Guide

## Quick Start (5 minutes)

### 1. Start Backend
```bash
cd backend
npm install  # if needed
npm run seed # Creates superadmin@example.com
npm start    # http://localhost:3000
```

### 2. Start Frontend
```bash
cd admin
npm install  # if needed
npm run dev  # http://localhost:5173
```

### 3. Login
- URL: http://localhost:5173
- Email: `superadmin@example.com`
- Password: Check seed script output or check User model seed

---

## Feature Test Cases

### Products Page ✅
```
URL: http://localhost:5173/products

1. CREATE PRODUCT
   - Fill: name="Milk Tetra 1L", price=50, stock=100, category=(select from dropdown)
   - Click: Create
   - Expect: Success alert + product appears in table

2. BULK IMPORT CSV
   - Paste into textarea (tab-separated):
     ```
     Bread White	60	50	
     Butter 100g	120	30	
     Cheese Block	200	20	
     ```
   - Click: Import CSV
   - Expect: Success alert + "Imported 3 products"

3. SEARCH
   - Type: "Milk"
   - Click: Search
   - Expect: Only products with "milk" in name shown

4. PAGINATION
   - Add 25+ products
   - Check: Table shows 20 items
   - Click: Next
   - Expect: Page 2 shows remaining items

5. DELETE
   - Click: Delete on any row
   - Expect: Row removed, audit log created
```

### Orders Page ✅
```
URL: http://localhost:5173/orders

1. VIEW ORDER DETAIL
   - Click: View button on any order
   - Modal opens showing:
     - Order # / User / Amount / Status / Date
     - Items (product name, qty, price)
     - Timeline (status changes with timestamps)
   - Expect: All fields populated correctly

2. ASSIGN RIDER
   - In detail modal, find "Assign Rider" section (if has 'orders:assign' perm)
   - Select: Any rider from dropdown
   - Click: Assign
   - Expect: Modal closes, rider becomes current in order
   - CHECK AUDIT: GET /admin/audit should show this action

3. UPDATE STATUS
   - In detail modal, find "Update Status" section (if has 'orders:update' perm)
   - Select: ready → out_for_delivery
   - Click: Update
   - Expect: Status changes, timeline updates
   - CHECK AUDIT: GET /admin/audit should show status_change with oldStatus/newStatus

4. SEARCH & PAGINATION
   - Type order number or customer name
   - Click: Search
   - Test pagination (20 per page)
```

### Users Page ✅
```
URL: http://localhost:5173/users

1. CREATE USER
   - Fill: name="Test Admin", email="admin2@example.com", password="pass123"
   - Select: admin role
   - Click: Create user
   - Expect: User appears in list with admin role

2. BULK ASSIGN ROLE
   - Click checkboxes to select 2-3 users
   - Check "Bulk Assign (2)" button appears
   - Click: Bulk Assign
   - Modal opens
   - Select: rider role
   - Click: Assign
   - Expect: All selected users now have rider role
   - CHECK AUDIT: Multiple role_change entries created

3. AUDIT LOGS VIEWER
   - Click: Audit Logs button
   - Modal opens showing last 100 actions
   - Verify entries for:
     - User creates
     - Role assignments
     - Any deletes/updates
   - Check: Actor name, timestamp, action type populated
   - Close modal

4. INDIVIDUAL ROLE CHANGE
   - Find a user
   - Click: Role dropdown
   - Select: different role
   - Confirm dialog
   - Expect: Role changes, audit logged

5. DEACTIVATE / DELETE
   - Click: Deactivate button
   - Confirm dialog
   - Expect: User disappears from list
   - (Or Delete to remove permanently)
```

### Categories Page ✅
```
URL: http://localhost:5173/categories

1. CREATE CATEGORY
   - Fill: name="Dairy", icon="🥛", priority=1
   - Click: Create
   - Expect: Appears in table

2. EDIT CATEGORY (INLINE)
   - Click: Edit button
   - Modify: name="Dairy Products", priority=2
   - Click: Save
   - Expect: Changes persist, audit logged

3. DELETE CATEGORY
   - Click: Delete button
   - Confirm
   - Expect: Category removed (soft delete)

4. PAGINATION
   - 20 per page pagination should work
```

### Riders Page ✅ (NEW)
```
URL: http://localhost:5173/riders

1. CREATE RIDER
   - Fill: name="Rajesh Kumar", email="raj@riders.com", password="rider123"
   - Click: Create Rider
   - Expect: Rider appears in list with Active status
   - Verify: Rider role auto-assigned

2. EDIT RIDER (INLINE)
   - Click: Edit button
   - Modify: email/phone
   - Click: Save
   - Expect: Changes persist

3. DEACTIVATE RIDER
   - Click: Deactivate button
   - Confirm
   - Expect: Status becomes "Inactive"
   
4. ACTIVATE RIDER
   - Click: Activate button
   - Expect: Status becomes "Active"

5. DELETE RIDER
   - Click: Delete button
   - Confirm
   - Expect: Rider removed completely
```

---

## Permission Testing

### Test Different Roles

**As Superadmin** (all permissions):
- Can see all pages
- Can create/edit/delete everything
- Can assign roles in bulk
- Can view audit logs

**As Admin** (limited permissions):
- Can see Users, Products, Categories, Orders
- Cannot see Roles page (if no 'roles:manage')
- Cannot bulk assign (if no 'roles:manage')
- Cannot view audit (if no 'reports:view')

**As Customer** (minimal permissions):
- Can only see Dashboard
- Other pages hidden or show 403 error

### How to Change Role:
1. Go to Users page
2. Find user in table
3. Click role dropdown
4. Select different role
5. Confirm
6. Logout & login with that user to test permissions

---

## Audit Log Check

### View All Audit Logs (API)
```bash
# In terminal:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/admin/audit
```

### What to Verify
- Actor (user who performed action)
- Action (create/update/delete/bulk_import/assign)
- Resource (product/category/order/user/role)
- Timestamp
- Before/After (for updates)
- Meta (riderId, oldStatus, newStatus, etc.)

---

## Common Issues & Fixes

### Issue: "No riders found" in order detail modal
**Fix**: Create riders first (Riders page → Create Rider)

### Issue: Bulk Assign button disabled even with users selected
**Fix**: Verify user has 'roles:manage' permission or is superadmin

### Issue: Audit Logs modal shows empty
**Fix**: Perform some actions first, then reload modal. May need 100+ operations to see.

### Issue: Products not appearing after bulk import
**Fix**: Check import format (tab-separated, no headers). Sample valid format:
```
Milk	50	100	
Bread	40	150	
Butter	120	50	
```

### Issue: Modal won't close
**Fix**: Click X button or close button explicitly

### Issue: Permission denied on API call
**Fix**: Ensure logged-in user has permission. Go to Users page → check role → verify role has the required permission

---

## Performance Notes

- **Pagination**: 20 items per page (configurable in frontend state)
- **Search**: Client-side filter (can add server-side if needed)
- **Audit Logs**: Load 100 recent entries
- **Bulk Operations**: Process sequentially (not parallel) to avoid API overload

---

## Next Phase Improvements

After Phase-1 testing complete:
1. CSV file upload widget (not just paste)
2. Advanced filtering (date range, status, etc.)
3. Real-time updates (WebSocket for orders)
4. Export to PDF/CSV
5. Rider performance dashboard
6. Inventory low-stock alerts
7. Order auto-assignment algorithm

---

**Test Completed**: ✅ Phase-1 all features working
**Ready for**: Phase-2 enhancements

