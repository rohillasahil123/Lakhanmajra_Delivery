# Superadmin Account Setup & Management Guide

## Overview

The superadmin is the master account with **full system access** to the admin panel. This guide explains how to set up, maintain, and protect your superadmin account.

---

## 🔐 Superadmin Credentials

**Email:** `superadmin@example.com`  
**Default Password:** `superadmin@123`  
**Role:** `superadmin` (full access to all features)

---

## 🚀 Initial Setup

### Step 1: Seed Roles & Permissions

First, create all roles, permissions, and the superadmin account:

```bash
cd backend
npm run seed
```

**What this does:**
- ✅ Creates 6 roles: superadmin, admin, manager, vendor, rider, user
- ✅ Creates all permissions (products, categories, orders, users, roles, reports)
- ✅ Creates the superadmin user **if it doesn't already exist**
- ✅ Does NOT overwrite existing superadmin (safe to run multiple times)

**Output:**
```
✅ Seed completed successfully!

📝 Test Credentials:
Email: superadmin@example.com
Password: superadmin@123

📊 Seeded:
- Permissions: 18
- Roles: 6
- Users: 1 (superadmin)
```

---

## 🔑 Logging into Admin Panel

### Access the Admin Panel

1. Open: `http://localhost:5173` (or your admin panel URL)
2. Enter **Email:** `superadmin@example.com`
3. Enter **Password:** `superadmin@123`
4. Click **Sign in**

### What You Can Do

Once logged in as superadmin, you have full access to:
- ✅ **Users** - Create, edit, delete, assign roles
- ✅ **Products** - Create, import (CSV), edit, delete
- ✅ **Categories** - Create, edit, delete
- ✅ **Orders** - View all, assign riders, update status
- ✅ **Riders** - Create, manage deliveries
- ✅ **Roles & Permissions** - Manage all roles and access control
- ✅ **Reports/Audit Logs** - View all system activities

### Access Control

⚠️ **Important:** Only superadmin can access the admin panel. The system enforces this by:
- Checking that the logged-in user has the `superadmin` role
- Redirecting non-superadmin users to the login page with error message
- No other role (admin, manager, vendor, rider) can access the admin panel

---

## 🔄 Managing Superadmin Account

### ✅ Superadmin Cannot Be Deleted

The system has protection to prevent accidentally deleting the superadmin account:

```
❌ ERROR: Cannot delete superadmin user
```

This protection prevents:
- Deleting via frontend UI
- Deleting via API endpoints
- Locking yourself out of the admin panel

---

## 🔧 When to Use resetSuperadmin.js

Use this script **ONLY** if you need to completely reset the superadmin account:

### Scenario 1: Lost/Forgotten Password

If you forget the superadmin password:

```bash
cd backend
FORCE_RESET=true npm run reset-superadmin
```

**⚠️ Warning:** This will:
- ❌ Delete the current superadmin user
- ✅ Create a new superadmin with default password: `superadmin@123`

**After reset, use new credentials:**
```
Email: superadmin@example.com
Password: superadmin@123
```

### Scenario 2: Corrupted Superadmin Account

If the superadmin account is corrupted or has missing data:

```bash
cd backend
FORCE_RESET=true npm run reset-superadmin
```

---

## ⚠️ Important: FORCE_RESET Safety

The resetSuperadmin.js script requires confirmation to prevent accidental deletion:

### ❌ WITHOUT confirmation (will fail):
```bash
npm run reset-superadmin
# Output: ⚠️ WARNING: This script will DELETE the existing superadmin user!
# To confirm, run: FORCE_RESET=true npm run reset-superadmin
```

### ✅ WITH confirmation (will execute):
```bash
FORCE_RESET=true npm run reset-superadmin
# ✅ New Superadmin Created!
```

---

## 📋 Full Script Usage Reference

### Seed Roles & Permissions (Safe to run multiple times)
```bash
npm run seed
```
- Creates roles, permissions, and superadmin if doesn't exist
- Idempotent (won't recreate if already exists)
- Recommended for initial setup

### Reset Superadmin (Destructive, use with caution)
```bash
FORCE_RESET=true npm run seed-superadmin
# or
FORCE_RESET=true npm run reset-superadmin
```
- Deletes current superadmin
- Creates new superadmin with default credentials
- Requires FORCE_RESET=true environment variable

---

## 🛡️ Security Best Practices

### Do's ✅
- Keep superadmin credentials secure
- Use strong password (change from default if in production)
- Only share superadmin access with trusted admins
- Regularly audit who has admin access (Users page → Role = superadmin)
- Enable environment variable for sensitive credentials

### Don'ts ❌
- Don't share superadmin password in chat or plain text
- Don't delete superadmin account manually via database
- Don't run resetSuperadmin.js without understanding consequences
- Don't let non-admin users access the admin panel

---

## 🔒 Changing Superadmin Password

### Option 1: Via Admin Panel (Manual)
1. Login as superadmin
2. Go to Users page
3. Find the superadmin user
4. Edit and update password (if password edit available)

### Option 2: Via Environment Variables
Set these variables in your `.env` file:

```env
SUPERADMIN_EMAIL=superadmin@example.com
SUPERADMIN_PASSWORD=your_new_secure_password_here
```

Then run seed script:
```bash
npm run seed
```
- If superadmin exists, password won't be updated (safe)
- If superadmin doesn't exist, it will be created with new password

### Option 3: Database Direct Update (Advanced)
Use MongoDB to update password (hash it with bcrypt first)

---

## 🚨 Troubleshooting

### Issue: "Cannot delete superadmin user" Error
**Cause:** Superadmin protection is working  
**Solution:** This is expected behavior. You cannot delete the superadmin account through the UI or API.

### Issue: Login Fails with Correct Credentials
**Cause:** User might not be superadmin or database issue  
**Solution:**
1. Check User document in MongoDB
2. Verify roleId points to superadmin role
3. Ensure email is exactly: `superadmin@example.com`
4. If corrupted, run: `FORCE_RESET=true npm run reset-superadmin`

### Issue: Admin Panel Shows "You don't have access"
**Cause:** Logged-in user is not superadmin  
**Solution:**
1. Logout (localStorage cleared)
2. Login with superadmin@example.com / superadmin@123
3. Check that user's role is exactly "superadmin"

### Issue: Can't Access Admin Panel After Some Time
**Cause:** Likely corrupted database or manual deletion  
**Solution:**
1. Run: `FORCE_RESET=true npm run reset-superadmin`
2. Login with new credentials: superadmin@example.com / superadmin@123

---

## 📊 Database Schema

### Users Collection (superadmin document)
```javascript
{
  _id: ObjectId("..."),
  name: "Super Admin",
  email: "superadmin@example.com",
  phone: "0000000000",
  password: "$2a$10$...(bcrypt hashed)...",
  roleId: ObjectId("..."), // references superadmin role
  isActive: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z"
}
```

### Roles Collection (superadmin role)
```javascript
{
  _id: ObjectId("..."),
  name: "superadmin",
  description: "Super admin - full system access",
  permissions: [ObjectId(...), ObjectId(...), ...], // all 18 permissions
  isActive: true,
  createdAt: "2024-01-01T00:00:00Z"
}
```

---

## ✅ Verification Checklist

- [ ] Run `npm run seed` successfully in backend
- [ ] See "Superadmin user created" or "already exists" message
- [ ] Admin panel accessible at http://localhost:5173
- [ ] Can login with superadmin@example.com / superadmin@123
- [ ] All pages visible: Users, Products, Categories, Orders, Riders, Roles
- [ ] Can create/edit/delete items (full permissions)
- [ ] Attempted delete of superadmin from Users page shows error
- [ ] Cannot login as non-superadmin user to admin panel

---

## 📞 Support

If you encounter issues:

1. **Check MongoDB connection:** Ensure MONGO_URI is correct
2. **Check backend logs:** Look for error messages
3. **Run seed script again:** `npm run seed`
4. **Reset if needed:** `FORCE_RESET=true npm run reset-superadmin`
5. **Check .env file:** Ensure all required variables are set

---

## Summary

| Action | Command | Effect | Safe? |
|--------|---------|--------|-------|
| Initial Setup | `npm run seed` | Creates roles, permissions, superadmin | ✅ Yes |
| Reset Password | `FORCE_RESET=true npm run reset-superadmin` | Deletes & recreates superadmin | ⚠️ Destructive |
| Delete Superadmin | Via UI/API | Blocked by system | ✅ Always Blocked |
| Change in Admin Panel | Edit user page | Updates superadmin properties | ✅ Yes |

**Remember:** Superadmin is protected both in code and database. You cannot accidentally lose access to your admin panel. 🔐
