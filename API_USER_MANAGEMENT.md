# API Documentation - User Management 🔐

## Overview

मैं तुम्हें बता रहा हूँ कि अब API कैसे काम करेगी:

### 📱 Mobile App (Frontend)
- **Register:** सिर्फ `user` role बनता है (regular customer)
- **Login:** सभी users login कर सकते हैं (user, rider, admin, etc.)

### 🖥️ Admin Panel (Frontend)
- **Create Users:** Superadmin सभी roles के साथ users create कर सकता है
- **Edit Users:** Name, email, phone, role सब कुछ edit कर सकता है
- **Delete Users:** Superadmin को छोड़ कर सभी को delete कर सकता है

---

## 1️⃣ Public API - Customer Signup (Mobile App)

### `POST /api/auth/register`

**यह endpoint public है - कोई भी call कर सकता है**

#### Request
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Khushi Sharma",
    "email": "khushi@gmail.com",
    "phone": "9991462406",
    "password": "Password@123"
  }'
```

#### Request Body
```json
{
  "name": "string (required)",
  "email": "string (required, unique)",
  "phone": "string (required)",
  "password": "string (required, min 6 chars)"
}
```

#### Response (✅ Success 201)
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Khushi Sharma",
    "email": "khushi@gmail.com",
    "phone": "9991462406",
    "roleId": {
      "_id": "507f1f77bcf86cd799439018",
      "name": "user",
      "description": "Regular customer"
    },
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Response (❌ Error)
```json
{
  "message": "User already exists"
}
```

**Key Points:**
- ✅ **Role automatically:** `user` (hardcoded, cannot be changed)
- ✅ **Public endpoint:** किसी को token की जरूरत नहीं
- ✅ **सिर्फ mobile app customers के लिए**

---

## 2️⃣ Admin API - Login (Mobile + Admin)

### `POST /api/auth/login`

**यह endpoint सभी के लिए है**

#### Request
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "khushi@gmail.com",
    "password": "Password@123"
  }'
```

#### Request Body
```json
{
  "identifier": "email या phone (required)",
  "password": "string (required)"
}
```

#### Response (✅ Success)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Khushi Sharma",
    "email": "khushi@gmail.com",
    "phone": "9991462406",
    "role": "user"
  }
}
```

**Key Points:**
- ✅ **किसी भी role के साथ login कर सकता है**
- ✅ **Email या phone से login हो सकता है**
- ✅ **7 दिन की token validity**

---

## 3️⃣ Admin Panel API - Create User (Superadmin Only)

### `POST /api/admin/users`

**⚠️ सिर्फ superadmin call कर सकता है**

#### Request
```bash
# Admin बनाना
curl -X POST http://localhost:5000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUPERADMIN_TOKEN" \
  -d '{
    "name": "Khushi Admin",
    "email": "khushi.admin@gmail.com",
    "phone": "9991462406",
    "password": "AdminPass@123",
    "roleId": "ADMIN_ROLE_ID"
  }'

# Rider बनाना
curl -X POST http://localhost:5000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUPERADMIN_TOKEN" \
  -d '{
    "name": "Rajesh Rider",
    "email": "rajesh@gmail.com",
    "phone": "9876543210",
    "password": "RiderPass@123",
    "roleId": "RIDER_ROLE_ID"
  }'

# Manager बनाना
curl -X POST http://localhost:5000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUPERADMIN_TOKEN" \
  -d '{
    "name": "Priya Manager",
    "email": "priya@gmail.com",
    "phone": "9988776655",
    "password": "ManagerPass@123",
    "roleId": "MANAGER_ROLE_ID"
  }'
```

#### Request Body
```json
{
  "name": "string (required)",
  "email": "string (required, unique)",
  "phone": "string (required)",
  "password": "string (required, min 6 chars)",
  "roleId": "string (required, mongoose ObjectId)"
}
```

#### Response (✅ Success 201)
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439022",
    "name": "Khushi Admin",
    "email": "khushi.admin@gmail.com",
    "phone": "9991462406",
    "roleId": {
      "_id": "507f1f77bcf86cd799439015",
      "name": "admin",
      "description": "Admin - manage store, products, categories, orders"
    },
    "isActive": true,
    "createdAt": "2024-01-15T10:35:00Z"
  },
  "message": "User created successfully"
}
```

#### Response (❌ Errors)
```json
// Missing required field
{
  "success": false,
  "message": "name, email, phone, password, and roleId are required"
}

// Email already exists
{
  "success": false,
  "message": "User with this email already exists"
}

// Role not found
{
  "success": false,
  "message": "Role not found"
}

// Not superadmin
{
  "success": false,
  "message": "Unauthorized - requires superadmin role"
}
```

**Key Points:**
- ✅ **Superadmin only** - token check करो
- ✅ **Role specify कर सकते हो** - किसी भी role
- ✅ **सभी fields required हैं**

---

## 4️⃣ Admin Panel API - Update User (Superadmin Only)

### `PATCH /api/admin/users/:id`

**⚠️ सिर्फ superadmin call कर सकता है**

#### Request
```bash
curl -X PATCH http://localhost:5000/api/admin/users/507f1f77bcf86cd799439022 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUPERADMIN_TOKEN" \
  -d '{
    "name": "Khushi Admin Updated",
    "phone": "9991462406",
    "roleId": "MANAGER_ROLE_ID"
  }'
```

#### Request Body (सभी optional हैं)
```json
{
  "name": "string (optional)",
  "email": "string (optional, unique)",
  "phone": "string (optional)",
  "roleId": "string (optional, mongoose ObjectId)"
}
```

#### Response (✅ Success)
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439022",
    "name": "Khushi Admin Updated",
    "email": "khushi.admin@gmail.com",
    "phone": "9991462406",
    "roleId": {
      "_id": "507f1f77bcf86cd799439016",
      "name": "manager",
      "description": "Manager - manage products and categories (no delete)"
    },
    "isActive": true
  },
  "message": "User updated successfully"
}
```

#### Response (❌ Errors)
```json
// Cannot edit superadmin
{
  "success": false,
  "message": "Cannot edit superadmin user"
}

// User not found
{
  "success": false,
  "message": "User not found"
}

// Role not found
{
  "success": false,
  "message": "Role not found"
}

// Email already in use
{
  "success": false,
  "message": "Email already in use"
}
```

**Key Points:**
- ✅ **Superadmin only**
- ✅ **Superadmin को edit नहीं कर सकते**
- ✅ **सभी fields optional हैं**

---

## 5️⃣ Admin Panel API - Delete User (Superadmin Only)

### `DELETE /api/admin/users/:id`

**⚠️ सिर्फ superadmin call कर सकता है**

#### Request
```bash
curl -X DELETE http://localhost:5000/api/admin/users/507f1f77bcf86cd799439022 \
  -H "Authorization: Bearer SUPERADMIN_TOKEN"
```

#### Response (✅ Success)
```json
{
  "success": true,
  "data": null,
  "message": "User deleted successfully"
}
```

#### Response (❌ Errors)
```json
// Cannot delete superadmin
{
  "success": false,
  "message": "Cannot delete superadmin user"
}

// User not found
{
  "success": false,
  "message": "User not found"
}

// Not superadmin
{
  "success": false,
  "message": "Unauthorized - requires superadmin role"
}
```

**Key Points:**
- ✅ **Superadmin को delete नहीं कर सकते**
- ✅ **सिर्फ superadmin ही delete कर सकता है**

---

## 6️⃣ Helper API - Get All Roles (for dropdowns)

### `GET /api/admin/roles`

**सभी role देखने के लिए (dropdown के लिए)**

#### Request
```bash
curl -X GET http://localhost:5000/api/admin/roles \
  -H "Authorization: Bearer SUPERADMIN_TOKEN"
```

#### Response
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "superadmin",
      "description": "Super admin - full system access",
      "permissions": [...],
      "isActive": true
    },
    {
      "_id": "507f1f77bcf86cd799439014",
      "name": "admin",
      "description": "Admin - manage store, products, categories, orders",
      "permissions": [...],
      "isActive": true
    },
    {
      "_id": "507f1f77bcf86cd799439015",
      "name": "manager",
      "description": "Manager - manage products and categories (no delete)",
      "permissions": [...],
      "isActive": true
    },
    // ... more roles
  ],
  "message": "Roles fetched"
}
```

**Key Points:**
- ✅ Frontend में role dropdown fill करने के लिए
- ✅ roleId copy करके POST में use करो

---

## 📊 Summary - API Endpoints

| Method | Endpoint | Auth | Purpose | Who |
|--------|----------|------|---------|-----|
| POST | `/api/auth/register` | ❌ Public | Customer signup | Mobile App |
| POST | `/api/auth/login` | ❌ Public | Login (सभी) | Mobile + Admin |
| POST | `/api/admin/users` | ✅ Superadmin | User create किसी भी role के साथ | Admin Panel |
| PATCH | `/api/admin/users/:id` | ✅ Superadmin | User edit | Admin Panel |
| DELETE | `/api/admin/users/:id` | ✅ Superadmin | User delete | Admin Panel |
| GET | `/api/admin/roles` | ✅ Authenticated | Roles list (dropdown) | Admin Panel |

---

## 🎯 Frontend Integration

### Mobile App - Signup/Login
```javascript
// Signup (सिर्फ customer)
POST /api/auth/register {
  name, email, phone, password
  // role automatically = "user"
}

// Login (किसी भी role)
POST /api/auth/login {
  identifier (email/phone), password
}
```

### Admin Panel - Add User Dialog
```javascript
// Get roles for dropdown
GET /api/admin/roles

// Create user (किसी भी role के साथ)
POST /api/admin/users {
  name, email, phone, password, roleId
}

// Update user
PATCH /api/admin/users/:id {
  name, email, phone, roleId (optional)
}

// Delete user
DELETE /api/admin/users/:id
```

---

## 🔐 Security Features

✅ **Superadmin Protected:**
- ❌ Delete नहीं कर सकते
- ❌ निकाल नहीं सकते
- ✅ Edit कर सकते हो (carefully)

✅ **Role-Based Access:**
- ✅ Superadmin ही user create/edit/delete कर सकता है
- ✅ Public signup सिर्फ "user" role बनाता है
- ✅ Token validation सभी admin endpoints में

✅ **Data Validation:**
- ✅ Email unique है
- ✅ Phone required है
- ✅ Password हashed है (bcrypt)
- ✅ Role exists है या नहीं check करते हैं

---

## 🚀 Implementation Ready!

अब तुम्हारा admin panel:
- ✅ API से users create करेगा (किसी भी role के साथ)
- ✅ Mobile app से सिर्फ customers signup करेंगे
- ✅ সभी पूरी तरह protected है
- ✅ Production-ready!
