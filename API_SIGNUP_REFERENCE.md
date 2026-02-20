# API Quick Reference

## Signup/Register Endpoint

### **Endpoint Details**
- **URL:** `POST /api/auth/register`
- **Base:** `http://YOUR_MACHINE_IP:5000`
- **Full URL:** `http://YOUR_MACHINE_IP:5000/api/auth/register`

### **Request**
```json
{
  "name": "Rahul Singh",
  "email": "rahul@example.com",
  "phone": "9876543210",
  "password": "Pass@123"
}
```

### **Headers**
```
Content-Type: application/json
```

### **Success Response (201)**
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "65f123abc...",
    "name": "Rahul Singh",
    "email": "rahul@example.com",
    "phone": "9876543210",
    "roleId": "65f456def...",
    "createdAt": "2026-02-20T10:30:00Z"
  }
}
```

### **Error Responses**

**400 - User Already Exists**
```json
{
  "message": "User already exists"
}
```

**500 - Role Not Found**
```json
{
  "message": "Default user role not found. Please seed roles first."
}
```

**500 - Server Error**
```json
{
  "message": "Register failed"
}
```

---

## Current Integration

| Entry Point | File | Status |
|---|---|---|
| **Frontend Page** | [frontend/app/signup.tsx](../frontend/app/signup.tsx) | ✅ Ready |
| **API Config** | [frontend/config/api.ts](../frontend/config/api.ts) | ✅ Ready |
| **Backend Controller** | [backend/src/controllers/auth.controller.ts](../backend/src/controllers/auth.controller.ts) | ✅ Ready |
| **Backend Routes** | [backend/src/routes/auth.routes.ts](../backend/src/routes/auth.routes.ts) | ✅ Ready |
| **Database Model** | [backend/src/models/user.model.ts](../backend/src/models/user.model.ts) | ✅ Ready |

---

## Testing with cURL

```bash
curl --location 'http://localhost:5000/api/auth/register' \
--header 'Content-Type: application/json' \
--data-raw '{
    "name": "Rahul Singh",
    "email": "rahul@example.com",
    "phone": "9876543210",
    "password": "Pass@123"
}'
```

---

## Field Validation

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | ✅ Yes | User's full name |
| `email` | string | ✅ Yes | Must be unique, valid email format |
| `phone` | string | ✅ Yes | Phone with country code |
| `password` | string | ✅ Yes | Should be strong (as per requirements) |

---

## Next: OTP Integration

After successful signup, the app:
1. Shows success alert
2. Extracts phone number from response
3. Navigates to OTP verification page: `/otp?phone=9876543210`

**OTP Endpoint** (to be integrated):
- `POST /api/auth/verify-otp`
- Fields: `phone, otp`

