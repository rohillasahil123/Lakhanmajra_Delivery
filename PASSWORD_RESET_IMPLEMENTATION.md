# 🔐 PASSWORD RESET/CHANGE FEATURE - IMPLEMENTATION GUIDE

## 📋 Overview

Complete implementation of password reset/change functionality with **strict role-based permission hierarchy**. Allows admins to reset user passwords while preventing unauthorized changes based on role levels.

### Permission Hierarchy
```
Superadmin > Admin > Manager > User/Rider
```

| Actor Role  | Can Change Password For                | Cannot Change |
|-------------|----------------------------------------|--------------|
| Superadmin  | Anyone (including other superadmins)  | N/A          |
| Admin       | Manager, User, Rider                   | Superadmin, Admin |
| Manager     | User, Rider                            | Admin, Superadmin, Manager |
| User/Rider  | Only own password                      | Any other user |

---

## 🔧 Implementation Details

### 1. Backend Service (`passwordChange.service.ts`)

**Location:** `/backend/src/services/passwordChange.service.ts`

#### Functions:

**`validatePasswordStrength(password: string)`**
```typescript
// Requirements:
- Minimum 8 characters
- Uppercase letter (A-Z)
- Lowercase letter (a-z)
- Number (0-9)
- Special character (@$!%*?&)

// Example strong password: SecurePass123@
// Example weak password: weak123 (fails multiple rules)
```

**`adminChangeUserPassword(req, res)`**
- Admin/Manager resets another user's password
- Enforces role-based permission checks
- Logs to audit trail
- Sends email notification
- Body:
  ```json
  {
    "userId": "60eab4...",
    "newPassword": "SecurePass123@",
    "reason": "User forgot password" // optional
  }
  ```

**`userChangeOwnPassword(req, res)`**
- User changes their own password
- Requires current password verification
- Logs to audit trail
- Sends confirmation email
- Body:
  ```json
  {
    "oldPassword": "CurrentPass123!",
    "newPassword": "NewSecurePass123@"
  }
  ```

### 2. API Routes

**Admin Route:**
```
PATCH /api/admin/users/:id/reset-password
Authorization: Bearer <token> (requires users:update permission)
```

**User Route:**
```
POST /api/auth/change-password
Authorization: Bearer <token> (authenticated user)
```

### 3. Admin Frontend

**Password Reset Modal:** `/admin/src/components/users/PasswordResetModal.tsx`
- Real-time password strength indicator
- 5 security requirements displayed
- Optional reason field for audit
- Success/error toast notifications

**Integration Points:**
- Users page with password reset button (🔐)
- Link in UserTable > UserTableRow
- Calls `/api/admin/users/:id/reset-password`

### 4. Email Templates

**New template added:** `password_reset` in `/emailTemplates.ts`
- Different message for admin-reset vs user self-change
- Security tips and guidelines
- Account details and timestamp
- Support contact information

---

## 🔐 Security Features

### Password Hashing
- **Algorithm:** bcryptjs with 10 salt rounds
- **Never logged:** Plain passwords never stored or logged
- **Audit trail:** Only first 10 characters of hash (obfuscated)

### Permission Enforcement
```typescript
// Example: Admin trying to change superadmin password
const permissionCheck = await checkPasswordChangePermission(
  "admin-id",           // actor
  "superadmin-id",      // target
  adminRoleId,          // actor role
  superadminRoleId      // target role
);
// Result: { allowed: false, reason: "Admins cannot change superadmin passwords" }
```

### Audit Logging
Every password change recorded:
```typescript
recordAudit({
  actorId: "60eab4...",           // Who made the change
  action: "password_reset",        // Action type
  resource: "user_password",       // What was changed
  resourceId: "60eab5...",        // Which user
  before: { passwordHash: "hash..." },
  after: { passwordHash: "hash..." },
  meta: {
    targetUserEmail: "user@example.com",
    targetRole: "user",
    reason: "User forgot password",
    isAdminReset: true            // Admin vs self
  }
});
```

### Email Notifications
- User receives email immediately
- Different message for admin resets vs self-initiated
- Includes security tips
- Links to support for concerns

---

## 📝 Testing Scenarios

### Scenario 1: Superadmin resets admin password
```bash
# Login as superadmin
POST /api/auth/login
{ "email": "superadmin@...", "password": "..." }

# Reset admin password
PATCH /api/admin/users/60eab4.../reset-password
Authorization: Bearer <superadmin_token>
{
  "newPassword": "NewSecurePass123@",
  "reason": "Security reset"
}

# Expected: ✓ 200 OK
# Admin receives password reset email
# Audit log created
```

### Scenario 2: Admin attempts to reset superadmin password
```bash
# Login as admin
POST /api/auth/login
{ "email": "admin@...", "password": "..." }

# Try to reset superadmin password
PATCH /api/admin/users/60eab5.../reset-password
Authorization: Bearer <admin_token>
{
  "newPassword": "NewSecurePass123@"
}

# Expected: ✗ 403 Forbidden
# Response: "Admins cannot change superadmin passwords"
# No audit log created
```

### Scenario 3: Manager resets user password
```bash
# Login as manager
POST /api/auth/login
{ "email": "manager@...", "password": "..." }

# Reset user password
PATCH /api/admin/users/60eab6.../reset-password
Authorization: Bearer <manager_token>
{
  "newPassword": "NewSecurePass123@",
  "reason": "User requested reset"
}

# Expected: ✓ 200 OK
# User receives email
# Audit log created (manager as actor)
```

### Scenario 4: User changes own password
```bash
# Login as user
POST /api/auth/login
{ "email": "user@...", "password": "..." }

# Change own password
POST /api/auth/change-password
Authorization: Bearer <user_token>
{
  "oldPassword": "CurrentPass123!",
  "newPassword": "NewSecurePass123@"
}

# Expected: ✓ 200 OK
# Email confirmation sent
# Audit log: action="password_change", changeType="self_initiated"
```

### Scenario 5: User provides weak password
```bash
# User tries to change to weak password
POST /api/auth/change-password
Authorization: Bearer <user_token>
{
  "oldPassword": "CurrentPass123!",
  "newPassword": "weak123"  // ✗ No uppercase, special char
}

# Expected: ✗ 400 Bad Request
# Response: "Password must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)"
```

---

## 🎨 Frontend UI Components

### Password Reset Button
- Visible in Users table (UserTableRow)
- 🔐 Icon with red color (#d32f2f)
- Only visible if user has `users:update` permission
- Disabled button color for unauthorized
- Tooltip: "Reset Password"

### Password Reset Modal
**Features:**
- User email and name display
- Warning box (amber background)
- Password input with show/hide toggle
- Real-time validation with checkmarks:
  - ✓ At least 8 characters
  - ✓ Uppercase letter
  - ✓ Lowercase letter
  - ✓ Number
  - ✓ Special character (@$!%*?&)
- Optional reason textarea
- Error messages (red background)
- Cancel/Reset buttons
- Loading state while submitting

---

## 🐛 Error Handling

| Response Code | Message | When | Action |
|---|---|---|---|
| 400 | Invalid user ID | Missing/invalid userId | Return error |
| 400 | Password does not meet requirements | Weak password | Show requirements list |
| 400 | Missing passwords | No oldPassword or newPassword | Show error |
| 401 | Current password is incorrect | Wrong verification | Request correct password |
| 403 | You don't have permission | Lower role trying to change higher | Block action |
| 404 | User not found | userId not in database | Show error |
| 500 | Failed to reset password | Database/server error | Log and retry |

---

## 🚀 Deployment Checklist

- [x] Password change service created with validation
- [x] Admin API endpoint for password reset
- [x] User API endpoint for password change
- [x] Email template for password reset notification
- [x] Admin UI modal for password reset
- [x] Password strength validation
- [x] Role-based permission enforcement
- [x] Audit logging for all changes
- [x] Toast notifications in UI
- [x] TypeScript compilation check
- [ ] Manual testing scenarios
- [ ] Check audit logs
- [ ] Verify emails sending
- [ ] Performance testing

---

## 🔍 Monitoring & Debugging

### Check Server Logs
```bash
# Terminal running backend
npm run dev

# Look for:
# ✅ PasswordChange: Password updated successfully
# ⚠️ PasswordChange: Unauthorized attempt
# ❌ PasswordChange: Error
```

### Check Audit Logs
```javascript
// Database
db.audits.find({ action: "password_reset" }).pretty()
db.audits.find({ action: "password_change" }).pretty()
```

### Email Verification
- Check email inbox for: "Password Reset Notification"
- Verify email sent to correct user
- Check for security tips section
- Different message for admin vs self-reset

---

## 📚 File Structure

```
backend/
├── src/
│   ├── services/
│   │   └── passwordChange.service.ts    ← Password logic
│   └── routes/
│       ├── admin.routes.ts               ← Admin reset endpoint
│       └── auth.routes.ts                ← User change endpoint

admin/
├── src/
│   ├── components/
│   │   └── users/
│   │       ├── PasswordResetModal.tsx   ← Reset modal
│   │       ├── UserTable.tsx            ← Updated with reset button
│   │       └── UserTableRow.tsx         ← Updated with reset button
│   └── pages/
│       └── Users.tsx                    ← Updated with reset handler
```

---

## 💡 Future Enhancements

1. **Password Reset Token (Forgot Password)**
   - Generate time-limited reset tokens
   - Send reset link via email
   - User can reset password without admin

2. **Rate Limiting**
   - Limit password change attempts (e.g., 5 per hour per user)
   - Prevent brute force attacks
   - Log failed attempts

3. **Password History**
   - Prevent reusing old passwords
   - Store hashed password history
   - Check against previous passwords

4. **Two-Factor Authentication**
   - Require 2FA for password changes
   - Extra security for sensitive operations

5. **Password Expiration Policy**
   - Force password change on schedule
   - Warn users before expiration
   - Track password age

---

## ❓ FAQ

**Q: Why is the superadmin password protected?**
A: To prevent accidental lockout. Only the superadmin can change their own password.

**Q: What if admin provides weak password?**
A: The API validates and rejects with clear error message. UI prevents submission with live validation.

**Q: Are passwords logged anywhere?**
A: No. Only first 10 chars of password hash logged (obfuscated). Plain passwords never logged.

**Q: Who can see who changed passwords?**
A: Audit logs show exact who/what/when/why. Only accessible to users with `reports:view` permission.

**Q: Can I reset multiple users' passwords at once?**
A: Current implementation: One at a time. Could be enhanced for bulk operations.

**Q: What happens if email fails to send?**
A: Error logged but password change completes. User should contact support.

---

## 📞 Support & Issues

If you encounter issues:

1. **Check server logs** - Look for error messages
2. **Verify permissions** - Ensure user has correct role
3. **Test API directly** - Use curl/Postman to test endpoints
4. **Check database** - Verify user exists and role is correct
5. **Email logs** - Check if email service is configured correctly

---

## License

Part of Lakhanmajra Delivery System - Internal Use
