# 🚀 Complete API CURL Commands - Phase 3

> **Setup:** Server running on `http://localhost:5000`

---

## 📌 Quick Variables

```bash
# Save these after login
TOKEN="your_jwt_token_here"
SUPERADMIN_TOKEN="superadmin_jwt_token"
CATEGORY_ID="your_category_id"
PRODUCT_ID="your_product_id"
USER_ID="user_id_to_promote"
ROLE_ID="role_id_to_assign"
```

---

## 🔐 **AUTHENTICATION APIs**

### 1️⃣ **Register User**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Singh",
    "email": "rahul@example.com",
    "phone": "9876543210",
    "password": "Pass@123"
  }'
```

**Response:**
```json
{
  "message": "User registered successfully"
}
```

---

### 2️⃣ **Login (Get JWT Token)**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "rahul@example.com",
    "password": "Pass@123"
  }'
```

**Alternative (By Phone):**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "9876543210",  
    "password": "Pass@123"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1YzJkYjU2ZDg5YzEyMzQ1Njc4OTBhYiIsImVtYWlsIjoicmFodWxAZXhhbXBsZS5jb20iLCJyb2xlSWQiOiI2NWMyZGI1NmQ4OWMxMjM0NTY3ODkwYzEiLCJyb2xlTmFtZSI6InVzZXIifQ.abc123xyz",
  "user": {
    "id": "65c2db56d89c1234567890ab",
    "name": "Rahul Singh",
    "email": "rahul@example.com",
    "phone": "9876543210",
    "role": "user"
  }
}
```

**Save token:**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1YzJkYjU2ZDg5YzEyMzQ1Njc4OTBhYiIsImVtYWlsIjoicmFodWxAZXhhbXBsZS5jb20iLCJyb2xlSWQiOiI2NWMyZGI1NmQ4OWMxMjM0NTY3ODkwYzEiLCJyb2xlTmFtZSI6InVzZXIifQ.abc123xyz"
```

---

### 3️⃣ **Login as Superadmin**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "superadmin@example.com",
    "password": "SuperAdmin@123"
  }'
```

**Save superadmin token:**
```bash
SUPERADMIN_TOKEN="your_superadmin_token_here"
```

---

### 4️⃣ **Get Logged-In User Details**
```bash
curl -X GET http://localhost:5000/api/auth/users \
  -H "Authorization: Bearer $TOKEN"
```

---

### 5️⃣ **Update User Profile**
```bash
curl -X PUT http://localhost:5000/api/auth/users/USER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Singh Updated",
    "email": "newemail@example.com"
  }'
```

---

### 6️⃣ **Delete User**
```bash
curl -X DELETE http://localhost:5000/api/auth/users/USER_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📂 **CATEGORY APIs**

### 1️⃣ **Get All Categories (Public)**
```bash
curl -X GET http://localhost:5000/api/categories
```

**Response:**
```json
{
  "success": true,
  "message": "Categories fetched",
  "data": [
    {
      "_id": "65c2db56d89c1234567890ab",
      "name": "Beverages",
      "slug": "beverages",
      "image": "https://cdn.example.com/beverages.png",
      "priority": 1,
      "isActive": true,
      "createdAt": "2026-02-05T10:30:00Z",
      "updatedAt": "2026-02-05T10:30:00Z"
    }
  ]
}
```

---

### 2️⃣ **Create Category (Admin)**
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

**Save category ID:**
```bash
CATEGORY_ID="65c2db56d89c1234567890ab"
```

---

### 3️⃣ **Create More Categories**

**Groceries:**
```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Groceries",
    "icon": "https://cdn.example.com/groceries.png",
    "priority": 2
  }'
```

**Snacks:**
```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Snacks",
    "icon": "https://cdn.example.com/snacks.png",
    "priority": 3
  }'
```

**Dairy:**
```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dairy & Eggs",
    "icon": "https://cdn.example.com/dairy.png",
    "priority": 4
  }'
```

**Bakery:**
```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bakery",
    "icon": "https://cdn.example.com/bakery.png",
    "priority": 5
  }'
```

---

## 🛍️ **PRODUCT APIs**

### 1️⃣ **Create Product (Admin)**

**Coca Cola:**
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Coca Cola 500ml",
    "description": "Cold carbonated beverage",
    "images": ["https://cdn.example.com/coke.jpg"],
    "categoryId": "65c2db56d89c1234567890ab",
    "price": 40,
    "mrp": 50,
    "stock": 500,
    "tags": ["drink", "cold", "popular"]
  }'
```

**Pepsi:**
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pepsi 500ml",
    "description": "Refreshing cola beverage",
    "images": ["https://cdn.example.com/pepsi.jpg"],
    "categoryId": "65c2db56d89c1234567890ab",
    "price": 40,
    "mrp": 50,
    "stock": 300,
    "tags": ["drink", "cold"]
  }'
```

**Sprite:**
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sprite 500ml",
    "description": "Lemon-lime flavored carbonated drink",
    "images": ["https://cdn.example.com/sprite.jpg"],
    "categoryId": "65c2db56d89c1234567890ab",
    "price": 40,
    "mrp": 50,
    "stock": 250,
    "tags": ["drink", "cold", "lemon"]
  }'
```

**Lay\'s Chips:**
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lays Potato Chips 45g",
    "description": "Crispy potato snack",
    "images": ["https://cdn.example.com/lays.jpg"],
    "categoryId": "SNACKS_CATEGORY_ID",
    "price": 20,
    "mrp": 25,
    "stock": 800,
    "tags": ["snack", "chips", "salty"]
  }'
```

**Amul Milk:**
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Amul Milk 500ml",
    "description": "Fresh pasteurized milk",
    "images": ["https://cdn.example.com/amul.jpg"],
    "categoryId": "DAIRY_CATEGORY_ID",
    "price": 24,
    "mrp": 26,
    "stock": 1000,
    "tags": ["dairy", "milk", "fresh"]
  }'
```

**Brown Bread:**
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Brown Bread 400g",
    "description": "Whole wheat brown bread",
    "images": ["https://cdn.example.com/bread.jpg"],
    "categoryId": "BAKERY_CATEGORY_ID",
    "price": 35,
    "mrp": 40,
    "stock": 200,
    "tags": ["bread", "bakery", "healthy"]
  }'
```

---

### 2️⃣ **Get All Products (Public)**

**Basic (All products, paginated):**
```bash
curl "http://localhost:5000/api/products?page=1&limit=10"
```

**Search by name:**
```bash
curl "http://localhost:5000/api/products?q=cola&page=1&limit=10"
```

**Search by multiple keywords:**
```bash
curl "http://localhost:5000/api/products?q=drink&page=1&limit=10"
```

**Filter by category:**
```bash
curl "http://localhost:5000/api/products?categoryId=65c2db56d89c1234567890ab&page=1&limit=10"
```

**Filter by price range:**
```bash
curl "http://localhost:5000/api/products?minPrice=30&maxPrice=50&page=1&limit=10"
```

**Filter by multiple price ranges:**
```bash
curl "http://localhost:5000/api/products?minPrice=20&maxPrice=100&page=1&limit=20"
```

**Filter by tags:**
```bash
curl "http://localhost:5000/api/products?tags=drink&page=1&limit=10"
```

**Filter by multiple tags:**
```bash
curl "http://localhost:5000/api/products?tags=drink,cold&page=1&limit=10"
```

**Combined filters (Advanced):**
```bash
curl "http://localhost:5000/api/products?q=cola&categoryId=65c2db56d89c1234567890ab&minPrice=30&maxPrice=50&tags=drink,cold&page=1&limit=10"
```

**Different page sizes:**
```bash
curl "http://localhost:5000/api/products?page=2&limit=20"
curl "http://localhost:5000/api/products?page=3&limit=50"
```

---

### 3️⃣ **Get Single Product (Public)**

```bash
curl -X GET "http://localhost:5000/api/products/65c2db56d89c1234567890ab"
```

---

### 4️⃣ **Update Product (Admin)**

**Update price:**
```bash
curl -X PATCH http://localhost:5000/api/products/65c2db56d89c1234567890ab \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 35
  }'
```

**Update stock:**
```bash
curl -X PATCH http://localhost:5000/api/products/65c2db56d89c1234567890ab \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stock": 400
  }'
```

**Update description:**
```bash
curl -X PATCH http://localhost:5000/api/products/65c2db56d89c1234567890ab \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description here"
  }'
```

**Update multiple fields:**
```bash
curl -X PATCH http://localhost:5000/api/products/65c2db56d89c1234567890ab \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 35,
    "stock": 350,
    "mrp": 45,
    "description": "Cold carbonated beverage - Updated price"
  }'
```

**Update tags:**
```bash
curl -X PATCH http://localhost:5000/api/products/65c2db56d89c1234567890ab \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tags": ["drink", "cold", "popular", "discount"]
  }'
```

---

### 5️⃣ **Change Stock (Admin)**

**Decrease stock by 10 units:**
```bash
curl -X PATCH http://localhost:5000/api/products/65c2db56d89c1234567890ab/stock \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delta": -10
  }'
```

**Increase stock by 50 units:**
```bash
curl -X PATCH http://localhost:5000/api/products/65c2db56d89c1234567890ab/stock \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delta": 50
  }'
```

**Bulk refill:**
```bash
curl -X PATCH http://localhost:5000/api/products/65c2db56d89c1234567890ab/stock \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delta": 200
  }'
```

---

### 6️⃣ **Update Product Status (Admin)**

**Deactivate product:**
```bash
curl -X PATCH http://localhost:5000/api/products/65c2db56d89c1234567890ab/status \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

**Reactivate product:**
```bash
curl -X PATCH http://localhost:5000/api/products/65c2db56d89c1234567890ab/status \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": true
  }'
```

---

### 7️⃣ **Soft Delete Product (Admin)**

```bash
curl -X DELETE http://localhost:5000/api/products/65c2db56d89c1234567890ab \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN"
```

---

## 🔐 **RBAC / ADMIN APIs**

### 1️⃣ **Get All Roles**

```bash
curl -X GET http://localhost:5000/api/admin/roles \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Roles fetched",
  "data": [
    {
      "_id": "65c2db56d89c1234567890ab",
      "name": "superadmin",
      "description": "Super admin - full system access",
      "permissions": [
        {
          "_id": "perm_001",
          "name": "products:create",
          "resource": "products",
          "action": "create"
        }
        // ... more permissions
      ],
      "isActive": true
    }
    // ... more roles
  ]
}
```

---

### 2️⃣ **Get Single Role with Permissions**

```bash
curl -X GET http://localhost:5000/api/admin/roles/65c2db56d89c1234567890ab \
  -H "Authorization: Bearer $TOKEN"
```

---

### 3️⃣ **Get All Permissions**

```bash
curl -X GET http://localhost:5000/api/admin/permissions \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Permissions fetched",
  "data": [
    {
      "_id": "perm_001",
      "name": "products:view",
      "description": "View products",
      "resource": "products",
      "action": "view"
    },
    {
      "_id": "perm_002",
      "name": "products:create",
      "description": "Create products",
      "resource": "products",
      "action": "create"
    }
    // ... 16 more permissions
  ]
}
```

---

### 4️⃣ **Create New Role (Superadmin)**

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
      "perm_003",
      "perm_004"
    ]
  }'
```

---

### 5️⃣ **Update Role & Permissions (Superadmin)**

```bash
curl -X PATCH http://localhost:5000/api/admin/roles/65c2db56d89c1234567890ab \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated role description",
    "permissionIds": [
      "perm_001",
      "perm_002",
      "perm_003"
    ]
  }'
```

---

### 6️⃣ **Assign Role to User (Superadmin)**

```bash
curl -X PATCH http://localhost:5000/api/auth/users/65c2db56d89c1234567890ab/role \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": "65c2db56d89c1234567890cd"
  }'
```

**Assign admin role:**
```bash
curl -X PATCH http://localhost:5000/api/auth/users/USER_ID/role \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": "ADMIN_ROLE_ID"
  }'
```

**Assign manager role:**
```bash
curl -X PATCH http://localhost:5000/api/auth/users/USER_ID/role \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": "MANAGER_ROLE_ID"
  }'
```

**Assign vendor role:**
```bash
curl -X PATCH http://localhost:5000/api/auth/users/USER_ID/role \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": "VENDOR_ROLE_ID"
  }'
```

**Assign rider role:**
```bash
curl -X PATCH http://localhost:5000/api/auth/users/USER_ID/role \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": "RIDER_ROLE_ID"
  }'
```

---

### 7️⃣ **List All Users with Roles (Superadmin)**

**Page 1:**
```bash
curl -X GET "http://localhost:5000/api/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN"
```

**Page 2:**
```bash
curl -X GET "http://localhost:5000/api/admin/users?page=2&limit=10" \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN"
```

**With different limit:**
```bash
curl -X GET "http://localhost:5000/api/admin/users?page=1&limit=20" \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN"
```

---

## 🧪 **Complete Testing Flow (Copy-Paste Ready)**

### **Step 1: Setup**
```bash
# Open PowerShell/Terminal

# Set base URL
$baseURL = "http://localhost:5000"

# Start server (in another terminal)
npm run dev
```

### **Step 2: Register User**
```bash
$registerBody = @{
    name = "John Doe"
    email = "john@example.com"
    phone = "9876543210"
    password = "Pass@123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$baseURL/api/auth/register" `
  -Method POST -Body $registerBody -ContentType "application/json"
```

### **Step 3: Login Superadmin**
```bash
$loginBody = @{
    identifier = "superadmin@example.com"
    password = "SuperAdmin@123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseURL/api/auth/login" `
  -Method POST -Body $loginBody -ContentType "application/json"

$TOKEN = $loginResponse.token
Write-Host "Token: $TOKEN"
```

### **Step 4: Create Category**
```bash
$catBody = @{
    name = "Beverages"
    icon = "https://cdn.example.com/beverages.png"
    priority = 1
} | ConvertTo-Json

$catResponse = Invoke-RestMethod -Uri "$baseURL/api/categories" `
  -Method POST -Body $catBody -ContentType "application/json" `
  -Headers @{Authorization = "Bearer $TOKEN"}

$CATEGORY_ID = $catResponse.data._id
Write-Host "Category ID: $CATEGORY_ID"
```

### **Step 5: Create Product**
```bash
$prodBody = @{
    name = "Coca Cola 500ml"
    description = "Cold carbonated beverage"
    images = @("https://cdn.example.com/coke.jpg")
    categoryId = $CATEGORY_ID
    price = 40
    mrp = 50
    stock = 500
    tags = @("drink", "cold", "popular")
} | ConvertTo-Json

$prodResponse = Invoke-RestMethod -Uri "$baseURL/api/products" `
  -Method POST -Body $prodBody -ContentType "application/json" `
  -Headers @{Authorization = "Bearer $TOKEN"}

$PRODUCT_ID = $prodResponse.data._id
Write-Host "Product ID: $PRODUCT_ID"
```

### **Step 6: Get Products**
```bash
Invoke-RestMethod -Uri "$baseURL/api/products?q=cola&page=1&limit=10" `
  -Method GET | ConvertTo-Json
```

### **Step 7: Update Product**
```bash
$updateBody = @{
    price = 35
    stock = 400
} | ConvertTo-Json

Invoke-RestMethod -Uri "$baseURL/api/products/$PRODUCT_ID" `
  -Method PATCH -Body $updateBody -ContentType "application/json" `
  -Headers @{Authorization = "Bearer $TOKEN"} | ConvertTo-Json
```

### **Step 8: Change Stock**
```bash
$stockBody = @{ delta = -10 } | ConvertTo-Json

Invoke-RestMethod -Uri "$baseURL/api/products/$PRODUCT_ID/stock" `
  -Method PATCH -Body $stockBody -ContentType "application/json" `
  -Headers @{Authorization = "Bearer $TOKEN"} | ConvertTo-Json
```

### **Step 9: Get All Roles**
```bash
Invoke-RestMethod -Uri "$baseURL/api/admin/roles" `
  -Method GET -Headers @{Authorization = "Bearer $TOKEN"} | ConvertTo-Json
```

### **Step 10: List Users**
```bash
Invoke-RestMethod -Uri "$baseURL/api/admin/users?page=1&limit=10" `
  -Method GET -Headers @{Authorization = "Bearer $TOKEN"} | ConvertTo-Json
```

---

## ✅ **Error Responses (Examples)**

### **Missing Token**
```bash
curl http://localhost:5000/api/products \
  -H "Authorization: Bearer invalid_token"
```
Response:
```json
{
  "message": "Invalid token"
}
```

### **Insufficient Permissions**
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'
```
Response:
```json
{
  "message": "Admin privileges required"
}
```

### **Validation Error**
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": ""}'
```
Response:
```json
{
  "success": false,
  "message": "Validation failed",
  "details": [
    {
      "message": "name is required",
      "path": ["name"]
    }
  ]
}
```

---

## 📋 **Helpful Bash Aliases (Optional)**

```bash
# Add to your ~/.bashrc or ~/.zshrc

alias api-login-admin='curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"identifier\":\"superadmin@example.com\",\"password\":\"SuperAdmin@123\"}"'

alias api-products='curl http://localhost:5000/api/products'

alias api-categories='curl http://localhost:5000/api/categories'

alias api-roles='curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/roles'
```

---

**All APIs Ready! 🚀**



cart Api All 

BASE_URL="http://localhost:5000"
TOKEN="your_jwt_token_here"
SESSION_ID="guest_123456"   # any string for guest cart
PRODUCT_ID="your_product_id"
ITEM_ID="your_cart_item_id"
COUPON_CODE="SAVE10"
GUEST_SESSION_ID="guest_123456"




curl -X GET "$BASE_URL/api/cart" \
  -H "x-session-id: $SESSION_ID"


curl -X GET "$BASE_URL/api/cart" \
  -H "Authorization: Bearer $TOKEN"




Add to cart 
curl -X POST "$BASE_URL/api/cart/add" \
  -H "Content-Type: application/json" \
  -H "x-session-id: $SESSION_ID" \
  -d '{
    "productId": "'"$PRODUCT_ID"'",
    "quantity": 2,
    "variant": { "size": "500ml", "color": "red" }
  }'


curl -X POST "$BASE_URL/api/cart/add" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "productId": "'"$PRODUCT_ID"'",
    "quantity": 2,
    "variant": { "size": "500ml", "color": "red" }
  }'



. Update Quantity
curl -X PUT "$BASE_URL/api/cart/update/$ITEM_ID" \
  -H "Content-Type: application/json" \
  -H "x-session-id: $SESSION_ID" \
  -d '{ "quantity": 3 }'


  curl -X PUT "$BASE_URL/api/cart/update/$ITEM_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "quantity": 3 }'



4. Remove Item


curl -X DELETE "$BASE_URL/api/cart/remove/$ITEM_ID" \
  -H "x-session-id: $SESSION_ID"


curl -X DELETE "$BASE_URL/api/cart/remove/$ITEM_ID" \
  -H "Authorization: Bearer $TOKEN"

Clear Cart
curl -X DELETE "$BASE_URL/api/cart/clear" \
  -H "Authorization: Bearer $TOKEN"


curl -X DELETE "$BASE_URL/api/cart/clear" \
  -H "x-session-id: $SESSION_ID"

Merge Guest Cart (Auth Only)

curl -X POST "$BASE_URL/api/cart/merge" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "guestSessionId": "'"$GUEST_SESSION_ID"'"
  }'


. Apply Coupon (Auth Only)
curl -X POST "$BASE_URL/api/cart/coupon/apply" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "'"$COUPON_CODE"'"
  }'


 Remove Coupon (Auth Only)
  curl -X DELETE "$BASE_URL/api/cart/coupon/remove" \
  -H "Authorization: Bearer $TOKEN"

 Cart Summary (Auth Only)
 curl -X GET "$BASE_URL/api/cart/summary" \
  -H "Authorization: Bearer $TOKEN"

10. Validate Cart (Auth Only)

curl -X POST "$BASE_URL/api/cart/validate" \
  -H "Authorization: Bearer $TOKEN"

---

## 🧾 **ORDER APIs**

**Variables**

```bash
ORDER_ID="your_order_id_here"
SHIPPING='{
  "shippingAddress": {
    "street": "123 MG Road",
    "city": "Bengaluru",
    "state": "KA",
    "pincode": "560001",
    "phone": "9876543210"
  }
}'
```

---

### 1️⃣ **Create Order (Auth only)**

```bash
curl -X POST "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$SHIPPING"
```

**Note:** This will clear the user's cart and enqueue a message to `order_queue` (see worker `orderWorker`).

---

### 2️⃣ **Get My Orders (Auth only)**

```bash
curl -X GET "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 3️⃣ **Get Single Order by ID (Auth only)**

```bash
curl -X GET "$BASE_URL/api/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

> Tip: to capture the created order id in bash you can do:
>
> ```bash
> ORDER_ID=$(curl -s -X POST "$BASE_URL/api/orders" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$SHIPPING" | jq -r '.order._id')
> echo $ORDER_ID
> ```

