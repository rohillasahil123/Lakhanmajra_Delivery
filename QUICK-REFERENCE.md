# ⚡ Quick Reference Card - Phase-1 MVP

**Print this page for desk reference while developing**

---

## 🚀 Quick Start (5 minutes)

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run seed      # Seed roles, permissions, superadmin
npm start         # Runs on http://localhost:3000

# Terminal 2 - Frontend
cd admin
npm install
npm run dev       # Runs on http://localhost:5173
```

**Login**: `superadmin@example.com` / `password123`

---

## 📂 File Locations

### Backend Key Files
```
backend/src/
├── controllers/     ← API business logic
├── routes/         ← API endpoints
├── models/         ← MongoDB schemas
├── services/       ← Reusable logic
├── middlewares/    ← Auth, permissions, errors
└── config/         ← DB, Redis, RabbitMQ
```

### Frontend Key Files
```
admin/src/
├── pages/          ← Full-page components (Products, Orders, Users, etc)
├── components/     ← Reusable components (ProtectedRoute)
├── api/           ← Axios client config
└── App.tsx        ← Main routing
```

---

## 🔌 API Endpoints Quick Map

### Products
- `GET /products` — List all
- `POST /products` — Create
- `POST /products/import` — Bulk import
- `PATCH /products/:id` — Update
- `DELETE /products/:id` — Delete

### Orders
- `GET /orders` — List (customer)
- `GET /admin/orders` — List (admin)
- `GET /admin/orders/:id` — Detail
- `PATCH /admin/orders/:id/status` — Status update
- `PATCH /admin/orders/:id/assign` — Rider assignment

### Users
- `GET /auth/users` — List
- `POST /auth/users` — Create
- `PATCH /auth/users/:id` — Update
- `PATCH /auth/users/:id/role` — Assign role
- `DELETE /auth/users/:id` — Delete

### Audit
- `GET /admin/audit` — View logs

---

## 🔑 Permission Matrix

```
SUPERADMIN → All operations
ADMIN      → Products, Orders, Users, Categories, Audit
RIDER      → Orders (assign to self), Profile
CUSTOMER   → Products, Orders (own), Cart, Profile
```

**Check permission in code**:
```javascript
if (hasPerm('create_product')) { // Show button }
```

---

## 📋 Common Tasks

### Add a new API endpoint
1. Create controller method in `backend/src/controllers/`
2. Create route in `backend/src/routes/`
3. Add permission middleware: `requirePermission('action_resource')`
4. Add audit logging: `auditService.log()`

### Add a new frontend page
1. Create component in `admin/src/pages/MyPage.tsx`
2. Add route in `admin/src/App.tsx`
3. Add navigation link in sidebar
4. Guard with `<ProtectedRoute>` if admin-only

### Add audit logging
```javascript
await auditService.log({
  userId: req.user._id,
  action: 'create',
  resource: 'product',
  resourceId: product._id,
  before: null,
  after: product,
  metadata: { importedFrom: 'csv' }
});
```

### Import CSV (frontend)
```javascript
POST /products/import
Body: {
  items: [
    { name: "Milk", price: 80, stock: 100, categoryId: "..." },
    { name: "Bread", price: 40, stock: 50, categoryId: "..." }
  ]
}
```

---

## 🧪 Testing Checklist

### Quick Test (5 min)
- [ ] Login works
- [ ] Can see dashboard
- [ ] Can create 1 product
- [ ] Can create 1 order
- [ ] Audit log appears

### Full Test (1 hour)
- [ ] All CRUD operations work
- [ ] CSV import works
- [ ] Bulk role assignment works
- [ ] Rider assignment works
- [ ] Order status update works
- [ ] Permissions respect roles
- [ ] Audit logs all operations

### Advanced Test (2 hours)
- [ ] Permission denial works (404)
- [ ] Pagination works (>20 items)
- [ ] Search filters work
- [ ] Modals open/close properly
- [ ] Mobile view responsive
- [ ] Errors handled gracefully

---

## 🐛 Debugging Tips

### Backend won't start?
```bash
# Check port 3000 in use
lsof -i :3000

# Check MongoDB connection
npm run seed

# Check environment variables
cat .env
```

### Frontend won't load?
```bash
# Clear cache
rm -rf node_modules/.vite

# Restart dev server
npm run dev

# Check if backend is running
curl http://localhost:3000/health
```

### API returns 403 (Forbidden)?
- [ ] Check JWT token valid
- [ ] Check role has permission
- [ ] Check permission exists in DB
- [ ] Check middleware order

### Page looks broken?
- [ ] Check console for TypeScript errors
- [ ] Check network tab for failed API calls
- [ ] Check Tailwind CSS loaded
- [ ] Verify page component exists

---

## 💾 Database Commands

### Connect to MongoDB
```bash
# Local MongoDB
mongo

# Remote MongoDB
mongo "mongodb+srv://user:pass@cluster.mongodb.net/dbname"
```

### View collections
```javascript
show collections

// View users
db.users.find()

// View audit logs
db.audits.find().sort({createdAt: -1}).limit(10)

// View products
db.products.find()
```

---

## 📊 Page Structure Reference

### Products Page
```
┌─ Header: "Products"
├─ Action buttons: [Create] [Import CSV]
├─ Search bar
├─ Table:
│  ├─ Name, Category, Price, Stock
│  ├─ Actions: [Edit] [Delete]
│  └─ Pagination: Prev [1] [2] [3] Next
├─ Create Modal: name, category, price, stock
└─ Import Modal: paste CSV (tab-separated)
```

### Orders Page
```
┌─ Header: "Orders"
├─ Search bar
├─ Filter buttons
├─ Table:
│  ├─ OrderID, Customer, Amount, Status, Date
│  ├─ Actions: [View Details]
│  └─ Pagination
├─ Detail Modal:
│  ├─ Order info grid
│  ├─ Items list
│  ├─ Status timeline
│  ├─ Rider assignment dropdown
│  ├─ Status update dropdown
│  └─ [Save] [Cancel]
```

### Users Page
```
┌─ Header: "Users"
├─ Action buttons: [Create] [Bulk Assign] [Audit Logs]
├─ Checkboxes: [Select All]
├─ Table:
│  ├─ Name, Email, Role, Status
│  ├─ Checkboxes for selection
│  ├─ Actions: [Edit] [Delete]
│  └─ Pagination
├─ Create Modal: name, email, role, phone
├─ Bulk Assign Modal: [role dropdown] [Assign]
└─ Audit Logs Modal: recent operations
```

---

## 🎨 Color Coding

```
PRIMARY    #3b82f6    Blue     Actions, primary buttons
SUCCESS    #10b981    Green    Active, completed, success
WARNING    #f59e0b    Amber    Pending, attention needed
DANGER     #ef4444    Red      Inactive, delete, errors
SECONDARY  #6b7280    Gray     Secondary actions, disabled
PURPLE     #8b5cf6    Purple   Special (bulk, admin)
```

---

## 🔒 Security Checklist

- [ ] No passwords in console.log
- [ ] No JWT tokens exposed in console
- [ ] No API keys in code
- [ ] All sensitive values in .env
- [ ] Permission checks on all routes
- [ ] Input validation on all forms
- [ ] HTTPS in production
- [ ] Rate limiting enabled

---

## 📱 Screen Sizes

**Test these breakpoints**:
- Mobile: 375px (iPhone SE)
- Tablet: 768px (iPad)
- Desktop: 1024px+

Tailwind classes:
```
sm:   640px
md:  768px
lg: 1024px
xl: 1280px
```

---

## 🚨 Error Codes

```
200  OK                        ✅
201  Created                   ✅
400  Bad Request              ❌ Check input
401  Unauthorized             ❌ Login required
403  Forbidden                ❌ Permission denied
404  Not Found                ❌ Resource missing
409  Conflict                 ❌ Duplicate entry
500  Server Error             ❌ Backend issue
```

---

## 📞 Quick Links

| Need | Link |
|------|------|
| Getting started? | START-HERE.md |
| How do I...? | INDEX.md |
| Testing? | PHASE-1-TESTING.md |
| Deploy? | DEPLOYMENT-CHECKLIST.md |
| Architecture? | README-PHASE1.md |
| Features? | PHASE-1-COMPLETION.md |
| UI looks wrong? | VISUAL-GUIDE.md |
| All features? | COMPLETION-SUMMARY.md |
| Checklist? | DELIVERABLES-CHECKLIST.md |

---

## ✨ Pro Tips

**Tip 1**: Use browser DevTools Network tab to debug API calls
**Tip 2**: Use `console.log` with JSON.stringify for pretty printing
**Tip 3**: Test permission changes by logging in as different roles
**Tip 4**: Check audit logs in Users page to verify operations logged
**Tip 5**: Use pagination to find bugs with >20 items
**Tip 6**: Test mobile view with DevTools device emulation
**Tip 7**: Clear browser cache if CSS looks wrong (Cmd+Shift+R)

---

## 🎯 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Backend won't start | Check port 3000, restart MongoDB |
| Frontend won't load | Clear `.vite` cache, restart dev |
| Can't login | Check superadmin seeded: npm run seed |
| 403 Forbidden | Check role/permission in DB |
| CSV import errors | Verify tab-separated, correct columns |
| Tables empty | Check API calls in Network tab |
| Modal won't show | Check state management, console for errors |
| Styling broken | Check Tailwind CSS loaded, clear cache |

---

## 🏃 30-Second Task Checklist

**I need to...**

- [ ] Add new product → Go to Products page, click [Create]
- [ ] Import products → Products page, click [Import CSV], paste CSV
- [ ] View order details → Orders page, click [View Details]
- [ ] Assign rider → Open order, select rider, click [Assign]
- [ ] Create user → Users page, click [Create]
- [ ] Bulk assign roles → Users page, select users, click [Bulk Assign]
- [ ] View audit logs → Users page, click [Audit Logs]
- [ ] Manage riders → Go to Riders page, CRUD operations
- [ ] Check permissions → See QUICK-REFERENCE.md permission matrix

---

**Last Updated**: 2024  
**Status**: Ready for Production  
**Questions?** Check INDEX.md for learning path

