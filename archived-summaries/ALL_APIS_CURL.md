# 🚀 Complete API CURL Commands - All APIs

> **Base URL:** `http://localhost:5000`  
> **Date:** February 14, 2026

---

## � **API Access Legend**

| Symbol | Meaning |
|--------|---------|
| 🔓 | Public (No Auth Required) |
| 🔐 | Authenticated User Required |
| 👑 | Superadmin Only |

---

## �📋 Quick Setup Variables

```bash
TOKEN="your_jwt_token_here"
SUPERADMIN_TOKEN="superadmin_jwt_token"
CATEGORY_ID="your_category_id"
PRODUCT_ID="your_product_id"
USER_ID="user_id_to_promote"
ROLE_ID="role_id_to_assign"
ORDER_ID="your_order_id"
ITEM_ID="your_cart_item_id"
SESSION_ID="guest_123456"
COUPON_CODE="SAVE10"
```

---

## 🔐 **AUTHENTICATION APIs**

### 1️⃣ Register User 🔓 (Public)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "password": "Pass@123"
  }'
```

### 2️⃣ Login (Get JWT Token) 🔓 (Public)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "john@example.com",
    "password": "Pass@123"
  }'
```

**Login by Phone:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "9876543210",
    "password": "Pass@123"
  }'
```

### 3️⃣ Login as Superadmin 🔓 (Public)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "superadmin@example.com",
    "password": "SuperAdmin@123"
  }'
```

### 4️⃣ Get Logged-In User Details 🔐 (Authenticated)
```bash
curl -X GET http://localhost:5000/api/auth/users \
  -H "Authorization: Bearer $TOKEN"
```

### 5️⃣ Update User Profile 🔐 (Authenticated)
```bash
curl -X PUT http://localhost:5000/api/auth/users/USER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe Updated",
    "email": "newemail@example.com"
  }'
```

### 6️⃣ Delete User 🔐 (Authenticated)
```bash
curl -X DELETE http://localhost:5000/api/auth/users/USER_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 7️⃣ Assign Role to User 👑 (Superadmin Only)
```bash
curl -X PATCH http://localhost:5000/api/auth/users/USER_ID/role \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": "ROLE_ID"
  }'
```

---

## 📂 **CATEGORY APIs**

### 1️⃣ Get All Categories 🔓 (Public)
```bash
curl -X GET http://localhost:5000/api/categories
```

### 2️⃣ Create Category 👑 (Superadmin Only)
```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Beverages",
    "icon": "https://cdn.example.com/beverages.png",
    "priority": 1
  }'
```

### 3️⃣ Get Single Category 🔓 (Public)
```bash
curl -X GET http://localhost:5000/api/categories/CATEGORY_ID
```

### 4️⃣ Update Category 👑 (Superadmin Only)
```bash
curl -X PATCH http://localhost:5000/api/categories/CATEGORY_ID \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Category",
    "priority": 2
  }'
```

### 5️⃣ Delete Category 👑 (Superadmin Only)
```bash
curl -X DELETE http://localhost:5000/api/categories/CATEGORY_ID \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN"
```

---

## 🛍️ **PRODUCT APIs**

### 1️⃣ Get All Products 🔓 (Public - Paginated & Searchable)
```bash
curl -X GET "http://localhost:5000/api/products?page=1&limit=10"
```

**Search by name:**
```bash
curl -X GET "http://localhost:5000/api/products?q=cola&page=1&limit=10"
```

**Filter by category:**
```bash
curl -X GET "http://localhost:5000/api/products?categoryId=CATEGORY_ID&page=1&limit=10"
```

**Filter by price range:**
```bash
curl -X GET "http://localhost:5000/api/products?minPrice=20&maxPrice=100&page=1&limit=10"
```

**Filter by tags:**
```bash
curl -X GET "http://localhost:5000/api/products?tags=drink,cold&page=1&limit=10"
```

**Advanced filters (Combined):**
```bash
curl -X GET "http://localhost:5000/api/products?q=cola&categoryId=CATEGORY_ID&minPrice=30&maxPrice=50&tags=drink,cold&page=1&limit=10"
```

### 2️⃣ Create Product 👑 (Superadmin Only)
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Coca Cola 500ml",
    "description": "Cold carbonated beverage",
    "images": ["https://cdn.example.com/coke.jpg"],
    "categoryId": "CATEGORY_ID",
    "price": 40,
    "mrp": 50,
    "stock": 500,
    "tags": ["drink", "cold", "popular"]
  }'
```

### 3️⃣ Get Single Product 🔓 (Public)
```bash
curl -X GET http://localhost:5000/api/products/PRODUCT_ID
```

### 4️⃣ Update Product 👑 (Superadmin Only)
```bash
curl -X PATCH http://localhost:5000/api/products/PRODUCT_ID \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 35,
    "stock": 400,
    "description": "Updated description"
  }'
```

### 5️⃣ Update Stock 👑 (Superadmin Only)
```bash
curl -X PATCH http://localhost:5000/api/products/PRODUCT_ID/stock \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delta": -10
  }'
```

### 6️⃣ Update Product Status 👑 (Superadmin Only)
```bash
curl -X PATCH http://localhost:5000/api/products/PRODUCT_ID/status \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

### 7️⃣ Soft Delete Product 👑 (Superadmin Only)
```bash
curl -X DELETE http://localhost:5000/api/products/PRODUCT_ID \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN"
```

---

## 🛒 **CART APIs**

### 1️⃣ Get Cart 🔐 (Authenticated)
```bash
curl -X GET http://localhost:5000/api/cart \
  -H "Authorization: Bearer $TOKEN"
```

**Get Guest Cart:**
```bash
curl -X GET http://localhost:5000/api/cart \
  -H "x-session-id: $SESSION_ID"
```

### 2️⃣ Add to Cart 🔐 (Authenticated)
```bash
curl -X POST http://localhost:5000/api/cart/add \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID",
    "quantity": 2,
    "variant": { "size": "500ml", "color": "red" }
  }'
```

**Add to Guest Cart:**
```bash
curl -X POST http://localhost:5000/api/cart/add \
  -H "x-session-id: $SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID",
    "quantity": 2
  }'
```

### 3️⃣ Update Cart Item Quantity 🔐 (Authenticated)
```bash
curl -X PUT http://localhost:5000/api/cart/update/ITEM_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "quantity": 3 }'
```

### 4️⃣ Remove Item from Cart 🔐 (Authenticated)
```bash
curl -X DELETE http://localhost:5000/api/cart/remove/ITEM_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 5️⃣ Clear Cart 🔐 (Authenticated)
```bash
curl -X DELETE http://localhost:5000/api/cart/clear \
  -H "Authorization: Bearer $TOKEN"
```

### 6️⃣ Merge Guest Cart to User Cart 🔐 (Authenticated)
```bash
curl -X POST http://localhost:5000/api/cart/merge \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "guestSessionId": "GUEST_SESSION_ID"
  }'
```

### 7️⃣ Apply Coupon 🔐 (Authenticated)
```bash
curl -X POST http://localhost:5000/api/cart/coupon/apply \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "SAVE10"
  }'
```

### 8️⃣ Remove Coupon 🔐 (Authenticated)
```bash
curl -X DELETE http://localhost:5000/api/cart/coupon/remove \
  -H "Authorization: Bearer $TOKEN"
```

### 9️⃣ Get Cart Summary 🔐 (Authenticated)
```bash
curl -X GET http://localhost:5000/api/cart/summary \
  -H "Authorization: Bearer $TOKEN"
```

### 🔟 Validate Cart 🔐 (Authenticated)
```bash
curl -X POST http://localhost:5000/api/cart/validate \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📦 **ORDER APIs**

### 1️⃣ Create Order 🔐 (Authenticated - Uses Cart Items)
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "street": "123 MG Road",
      "city": "Bengaluru",
      "state": "KA",
      "pincode": "560001",
      "phone": "9876543210"
    }
  }'
```

### 2️⃣ Get My Orders 🔐 (Authenticated)
```bash
curl -X GET http://localhost:5000/api/orders \
  -H "Authorization: Bearer $TOKEN"
```

**With Pagination:**
```bash
curl -X GET "http://localhost:5000/api/orders?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 3️⃣ Get Single Order by ID 🔐 (Authenticated)
```bash
curl -X GET http://localhost:5000/api/orders/ORDER_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 4️⃣ Update Order Status 👑 (Superadmin Only)
```bash
curl -X PATCH http://localhost:5000/api/orders/ORDER_ID \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "shipped"
  }'
```

---

## 👥 **ADMIN/RBAC APIs**

### 1️⃣ Get All Roles 🔐 (Authenticated)
```bash
curl -X GET http://localhost:5000/api/admin/roles \
  -H "Authorization: Bearer $TOKEN"
```

### 2️⃣ Get Single Role with Permissions 🔐 (Authenticated)
```bash
curl -X GET http://localhost:5000/api/admin/roles/ROLE_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 3️⃣ Get All Permissions 🔐 (Authenticated)
```bash
curl -X GET http://localhost:5000/api/admin/permissions \
  -H "Authorization: Bearer $TOKEN"
```

### 4️⃣ Create New Role 👑 (Superadmin Only)
```bash
curl -X POST http://localhost:5000/api/admin/roles \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "store_manager",
    "description": "Store manager - manage products and inventory",
    "permissionIds": [
      "perm_001",
      "perm_002",
      "perm_003"
    ]
  }'
```

### 5️⃣ Update Role & Permissions 👑 (Superadmin Only)
```bash
curl -X PATCH http://localhost:5000/api/admin/roles/ROLE_ID \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated role description",
    "permissionIds": [
      "perm_001",
      "perm_002"
    ]
  }'
```

### 6️⃣ List All Users 👑 (Superadmin Only)
```bash
curl -X GET "http://localhost:5000/api/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN"
```

---

## 🧪 **Complete Testing Flow**

### Step 1: Register & Login
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "password": "Pass@123"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "john@example.com",
    "password": "Pass@123"
  }'
```

### Step 2: Get Superadmin Token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "superadmin@example.com",
    "password": "SuperAdmin@123"
  }'
```

### Step 3: Create Category (Admin)
```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Beverages",
    "icon": "https://cdn.example.com/beverages.png",
    "priority": 1
  }'
```

### Step 4: Create Products (Admin)
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Coca Cola 500ml",
    "description": "Cold carbonated beverage",
    "images": ["https://cdn.example.com/coke.jpg"],
    "categoryId": "CATEGORY_ID",
    "price": 40,
    "mrp": 50,
    "stock": 500,
    "tags": ["drink", "cold"]
  }'
```

### Step 5: Add Product to Cart (User)
```bash
curl -X POST http://localhost:5000/api/cart/add \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID",
    "quantity": 2
  }'
```

### Step 6: View Cart (User)
```bash
curl -X GET http://localhost:5000/api/cart \
  -H "Authorization: Bearer $TOKEN"
```

### Step 7: Create Order (User)
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "street": "123 MG Road",
      "city": "Bengaluru",
      "state": "KA",
      "pincode": "560001",
      "phone": "9876543210"
    }
  }'
```

### Step 8: Get My Orders (User)
```bash
curl -X GET http://localhost:5000/api/orders \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✅ **Common Response Examples**

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "id": "123456",
    "name": "Example"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "details": [
    {
      "message": "Field validation error",
      "path": ["fieldName"]
    }
  ]
}
```

---

**🎯 Quick Copy-Paste Guide:**

1. **Register User:** Paste register curl
2. **Login:** Paste login curl, save TOKEN
3. **Create Category:** Use SUPERADMIN_TOKEN
4. **Create Products:** Use SUPERADMIN_TOKEN + CATEGORY_ID
5. **Add to Cart:** Use TOKEN
6. **Create Order:** Use TOKEN
7. **Admin Operations:** Use SUPERADMIN_TOKEN

---

## 📚 **API Access Summary Table**

### Authentication APIs (🔐 Auth Section)
| API | Access Level | Token Needed |
|-----|-------------|--------------|
| Register | 🔓 Public | ❌ No |
| Login | 🔓 Public | ❌ No |
| Get User Details | 🔐 Authenticated | ✔️ Yes (User) |
| Update Profile | 🔐 Authenticated | ✔️ Yes (User) |
| Delete User | 🔐 Authenticated | ✔️ Yes (User) |
| Assign Role | 👑 Superadmin | ✔️ Yes (Superadmin) |

### Category APIs
| API | Access Level | Token Needed |
|-----|-------------|--------------|
| Get All Categories | 🔓 Public | ❌ No |
| Get Single Category | 🔓 Public | ❌ No |
| Create Category | 👑 Superadmin | ✔️ Yes (Superadmin) |
| Update Category | 👑 Superadmin | ✔️ Yes (Superadmin) |
| Delete Category | 👑 Superadmin | ✔️ Yes (Superadmin) |

### Product APIs
| API | Access Level | Token Needed |
|-----|-------------|--------------|
| Get All Products (Search/Filter) | 🔓 Public | ❌ No |
| Get Single Product | 🔓 Public | ❌ No |
| Create Product | 👑 Superadmin | ✔️ Yes (Superadmin) |
| Update Product | 👑 Superadmin | ✔️ Yes (Superadmin) |
| Update Stock | 👑 Superadmin | ✔️ Yes (Superadmin) |
| Update Status | 👑 Superadmin | ✔️ Yes (Superadmin) |
| Delete Product | 👑 Superadmin | ✔️ Yes (Superadmin) |

### Cart APIs
| API | Access Level | Token Needed |
|-----|-------------|--------------|
| Get Cart | 🔐 Authenticated | ✔️ Yes (User) |
| Add to Cart | 🔐 Authenticated | ✔️ Yes (User) |
| Update Item Quantity | 🔐 Authenticated | ✔️ Yes (User) |
| Remove Item | 🔐 Authenticated | ✔️ Yes (User) |
| Clear Cart | 🔐 Authenticated | ✔️ Yes (User) |
| Merge Guest Cart | 🔐 Authenticated | ✔️ Yes (User) |
| Apply Coupon | 🔐 Authenticated | ✔️ Yes (User) |
| Remove Coupon | 🔐 Authenticated | ✔️ Yes (User) |
| Cart Summary | 🔐 Authenticated | ✔️ Yes (User) |
| Validate Cart | 🔐 Authenticated | ✔️ Yes (User) |

### Order APIs
| API | Access Level | Token Needed |
|-----|-------------|--------------|
| Create Order | 🔐 Authenticated | ✔️ Yes (User) |
| Get My Orders | 🔐 Authenticated | ✔️ Yes (User) |
| Get Order Details | 🔐 Authenticated | ✔️ Yes (User) |
| Update Order Status | 👑 Superadmin | ✔️ Yes (Superadmin) |

### Admin/RBAC APIs
| API | Access Level | Token Needed |
|-----|-------------|--------------|
| Get All Roles | 🔐 Authenticated | ✔️ Yes (Any User) |
| Get Role Details | 🔐 Authenticated | ✔️ Yes (Any User) |
| Get All Permissions | 🔐 Authenticated | ✔️ Yes (Any User) |
| Create Role | 👑 Superadmin | ✔️ Yes (Superadmin) |
| Update Role | 👑 Superadmin | ✔️ Yes (Superadmin) |
| List All Users | 👑 Superadmin | ✔️ Yes (Superadmin) |

---

## 🛠️ **How to Use Tokens**

### Get Superadmin Token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "superadmin@example.com",
    "password": "SuperAdmin@123"
  }'
```

### Get User Token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "john@example.com",
    "password": "Pass@123"
  }'
```

### Use Token in Headers
```bash
# Set variable
TOKEN="your_jwt_token_from_login_response"

# Use in API call
curl -X GET http://localhost:5000/api/cart \
  -H "Authorization: Bearer $TOKEN"
```

---

**All ready! Copy any curl from above & test! 🚀**
