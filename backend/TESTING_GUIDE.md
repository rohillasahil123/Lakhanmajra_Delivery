# Phase 3: Product API - Complete Testing Guide

## ✅ Seed Completed Successfully

**6 Roles Created:**
- ✓ superadmin (18 permissions - full access)
- ✓ admin (10 permissions - manage products, categories, orders)
- ✓ manager (7 permissions - manage products/categories, no delete)
- ✓ vendor (4 permissions - manage own products)
- ✓ rider (2 permissions - manage assigned orders)
- ✓ user (4 permissions - customer/shopper)

**Test Credentials:**
```
Email: superadmin@example.com
Password: SuperAdmin@123
```

---

## 🚀 Phase 3: Product API Testing

### 1️⃣ **STEP 1: Login & Get JWT Token**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "superadmin@example.com",
    "password": "SuperAdmin@123"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "Super Admin",
    "email": "superadmin@example.com",
    "phone": "0000000000",
    "role": "superadmin"
  }
}
```

Save the `token` for next requests.

---

### 2️⃣ **STEP 2: Create Categories (Admin)**

```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Beverages",
    "icon": "https://cdn.example.com/beverages.png",
    "priority": 1
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Category created",
  "data": {
    "_id": "cat_123",
    "name": "Beverages",
    "slug": "beverages",
    "image": "https://cdn.example.com/beverages.png",
    "priority": 1,
    "isActive": true,
    "createdAt": "2026-02-05T...",
    "updatedAt": "2026-02-05T..."
  }
}
```

Create more categories:
```bash
# Groceries
curl -X POST http://localhost:5000/api/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Groceries","icon":"https://cdn.example.com/grocery.png","priority":2}'

# Snacks
curl -X POST http://localhost:5000/api/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Snacks","icon":"https://cdn.example.com/snacks.png","priority":3}'
```

---

### 3️⃣ **STEP 3: Get All Categories (Public)**

```bash
curl http://localhost:5000/api/categories
```

**Response:**
```json
{
  "success": true,
  "message": "Categories fetched",
  "data": [
    {
      "_id": "cat_123",
      "name": "Beverages",
      "slug": "beverages",
      "image": "https://cdn.example.com/beverages.png",
      "priority": 1,
      "isActive": true
    },
    ...
  ]
}
```

Save a `categoryId` for creating products.

---

### 4️⃣ **STEP 4: Create Products (Admin)**

Use one of the `categoryId` from step 3:

```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Coca Cola 500ml",
    "description": "Cold carbonated beverage",
    "images": ["https://cdn.example.com/coke.jpg"],
    "categoryId": "cat_123",
    "price": 40,
    "mrp": 50,
    "stock": 500,
    "tags": ["drink", "cold", "popular"]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Product created",
  "data": {
    "_id": "prod_123",
    "name": "Coca Cola 500ml",
    "slug": "coca-cola-500ml",
    "description": "Cold carbonated beverage",
    "images": ["https://cdn.example.com/coke.jpg"],
    "categoryId": "cat_123",
    "price": 40,
    "mrp": 50,
    "stock": 500,
    "tags": ["drink", "cold", "popular"],
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-02-05T...",
    "updatedAt": "2026-02-05T..."
  }
}
```

Create more products:
```bash
# Pepsi
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pepsi 500ml",
    "description": "Cold carbonated beverage",
    "images": ["https://cdn.example.com/pepsi.jpg"],
    "categoryId": "cat_123",
    "price": 40,
    "stock": 300,
    "tags": ["drink", "cold"]
  }'

# Sprite
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sprite 500ml",
    "description": "Lemon-lime flavored carbonated drink",
    "images": ["https://cdn.example.com/sprite.jpg"],
    "categoryId": "cat_123",
    "price": 40,
    "stock": 250,
    "tags": ["drink", "cold", "lemon"]
  }'
```

---

### 5️⃣ **STEP 5: Get All Products (Public)**

```bash
# Get all products
curl "http://localhost:5000/api/products?page=1&limit=10"

# Search by name (text search)
curl "http://localhost:5000/api/products?q=cola&page=1&limit=10"

# Filter by category
curl "http://localhost:5000/api/products?categoryId=cat_123&page=1&limit=10"

# Filter by price range
curl "http://localhost:5000/api/products?minPrice=30&maxPrice=50&page=1&limit=10"

# Filter by tags
curl "http://localhost:5000/api/products?tags=drink,cold&page=1&limit=10"

# Combined search
curl "http://localhost:5000/api/products?q=cola&categoryId=cat_123&minPrice=30&maxPrice=50&page=1&limit=10"
```

**Response:**
```json
{
  "success": true,
  "message": "Products fetched",
  "data": {
    "data": [
      {
        "_id": "prod_123",
        "name": "Coca Cola 500ml",
        "slug": "coca-cola-500ml",
        "price": 40,
        "stock": 500,
        ...
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 10
  }
}
```

---

### 6️⃣ **STEP 6: Get Single Product (Public)**

```bash
curl "http://localhost:5000/api/products/prod_123"
```

---

### 7️⃣ **STEP 7: Update Product (Admin)**

```bash
curl -X PATCH http://localhost:5000/api/products/prod_123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 35,
    "stock": 400,
    "description": "Cold carbonated beverage - Updated"
  }'
```

---

### 8️⃣ **STEP 8: Change Stock (Admin)**

```bash
# Decrease stock by 10
curl -X PATCH http://localhost:5000/api/products/prod_123/stock \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"delta": -10}'

# Increase stock by 50
curl -X PATCH http://localhost:5000/api/products/prod_123/stock \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"delta": 50}'
```

---

### 9️⃣ **STEP 9: Update Product Status (Admin)**

```bash
# Deactivate product
curl -X PATCH http://localhost:5000/api/products/prod_123/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

---

### 🔟 **STEP 10: Soft Delete Product (Admin)**

```bash
curl -X DELETE http://localhost:5000/api/products/prod_123 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔐 RBAC Testing

### List All Roles (Authenticated Users)

```bash
curl http://localhost:5000/api/admin/roles \
  -H "Authorization: Bearer $TOKEN"
```

### List All Permissions (Authenticated Users)

```bash
curl http://localhost:5000/api/admin/permissions \
  -H "Authorization: Bearer $TOKEN"
```

### Assign Role to User (Superadmin Only)

First, register a user:
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

Then assign admin role (use superadmin token):
```bash
curl -X PATCH http://localhost:5000/api/auth/users/<USER_ID>/role \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roleId": "role_admin_id"}'
```

### List All Users with Roles (Superadmin Only)

```bash
curl "http://localhost:5000/api/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN"
```

---

## 📊 Database Indexes Created

```
Products:
- Text index: name, description, tags (for search)
- Slug: unique
- Category ID: for filtering

Categories:
- Name: indexed
- Slug: unique

Users:
- Email: indexed
- Role ID: indexed
```

---

## ✨ Features Implemented

✅ **Product CRUD**
- Create product with slug generation
- Read products with pagination
- Update product details
- Soft delete products
- Stock management

✅ **Filtering & Search**
- Text search (name, description, tags)
- Category filter
- Price range filter
- Tag filter
- Combined filters

✅ **Pagination**
- Page-based with limit
- Total count returned

✅ **Input Validation**
- Joi schemas for create/update

✅ **Access Control**
- Admin-only routes
- Public read routes
- RBAC with permissions

✅ **Stock Management**
- Add/subtract stock
- Cannot go below 0

✅ **Slug Generation**
- Auto-generated from name
- Unique with timestamp fallback

✅ **Soft Delete**
- Products marked as deleted
- Not returned in queries
- Preserves data

---

## 🚨 Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error message",
  "details": {} // Optional validation details
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Validation error
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Server error

---

## 🎯 Next Steps

1. **Phase 4: Cart APIs** - Implement shopping cart functionality
2. **Phase 5: Order + Queue** - Order management with BullMQ queues
3. **Phase 6: Testing** - Unit & integration tests
4. **Phase 7: Docker** - Production deployment

All Phase 3 requirements completed! ✅
