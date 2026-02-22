# 📋 Curl Commands Guide - Add Categories & Products

## Prerequisites

1. **Backend running** on `http://localhost:5000` (or update host as needed)
2. **Admin user logged in** to get auth token
3. **Admin has permissions**: `categories:create` and `products:create`

---

## Step 1: Login & Get Token

First, login as admin to get an auth token:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@example.com",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": { "id": "...", "name": "Admin", "role": "admin" }
  }
}
```

**Save the token** in a variable:
```bash
TOKEN="eyJhbGc..."
```

---

## Step 2: Create a Category

Add a new product category (e.g., **Vegetables**):

```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Vegetables",
    "icon": "https://example.com/vegetables.png",
    "priority": 1
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Vegetables",
    "slug": "vegetables",
    "image": "https://example.com/vegetables.png",
    "priority": 1,
    "isActive": true,
    "createdAt": "2025-02-22T10:00:00Z"
  }
}
```

**Save the category ID:**
```bash
CATEGORY_ID="507f1f77bcf86cd799439011"
```

---

## Step 3a: Add Single Product to Category

Add one product to the category you just created:

```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Fresh Tomatoes",
    "description": "Organic fresh red tomatoes",
    "categoryId": "'$CATEGORY_ID'",
    "price": 40,
    "mrp": 50,
    "stock": 100,
    "images": ["https://example.com/tomatoes.jpg"],
    "tags": ["organic", "fresh", "red"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Fresh Tomatoes",
    "categoryId": "507f1f77bcf86cd799439011",
    "price": 40,
    "mrp": 50,
    "stock": 100,
    "isActive": true,
    "createdAt": "2025-02-22T10:05:00Z"
  }
}
```

---

## Step 3b: Add Multiple Products at Once (Bulk Import)

Add 3+ products in a single API call:

```bash
curl -X POST http://localhost:5000/api/products/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [
      {
        "name": "Fresh Onions",
        "description": "White onions",
        "categoryId": "'$CATEGORY_ID'",
        "price": 30,
        "mrp": 40,
        "stock": 150,
        "images": ["https://example.com/onions.jpg"],
        "tags": ["white", "onion"]
      },
      {
        "name": "Green Bell Peppers",
        "description": "Crispy green peppers",
        "categoryId": "'$CATEGORY_ID'",
        "price": 60,
        "mrp": 75,
        "stock": 80,
        "images": ["https://example.com/peppers.jpg"],
        "tags": ["bell", "green", "fresh"]
      },
      {
        "name": "Organic Carrots",
        "description": "Orange carrots from local farm",
        "categoryId": "'$CATEGORY_ID'",
        "price": 50,
        "mrp": 65,
        "stock": 120,
        "images": ["https://example.com/carrots.jpg"],
        "tags": ["organic", "root-vegetable"]
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 3,
    "results": [
      { "_id": "...", "name": "Fresh Onions", "price": 30, ... },
      { "_id": "...", "name": "Green Bell Peppers", "price": 60, ... },
      { "_id": "...", "name": "Organic Carrots", "price": 50, ... }
    ]
  }
}
```

---

## Step 4: Verify - Get All Categories

Check that your category was created:

```bash
curl -X GET http://localhost:5000/api/categories \
  -H "Content-Type: application/json"
```

---

## Step 5: Verify - Get All Products in Category

Get products in the "Vegetables" category:

```bash
curl -X GET "http://localhost:5000/api/products?categoryId=$CATEGORY_ID" \
  -H "Content-Type: application/json"
```

---

## Complete Workflow Script (Bash)

Save this as `add-category-and-products.sh`:

```bash
#!/bin/bash

# Configuration
API_URL="http://localhost:5000"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin123"

# Step 1: Login
echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "'$ADMIN_EMAIL'",
    "password": "'$ADMIN_PASSWORD'"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Check credentials."
  exit 1
fi
echo "✅ Token: $TOKEN"

# Step 2: Create Category
echo "📂 Creating category..."
CATEGORY_RESPONSE=$(curl -s -X POST $API_URL/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Vegetables",
    "icon": "https://example.com/vegetables.png",
    "priority": 1
  }')

CATEGORY_ID=$(echo $CATEGORY_RESPONSE | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -z "$CATEGORY_ID" ]; then
  echo "❌ Category creation failed."
  echo "$CATEGORY_RESPONSE"
  exit 1
fi
echo "✅ Category ID: $CATEGORY_ID"

# Step 3: Import Products
echo "🛒 Adding 3 products..."
IMPORT_RESPONSE=$(curl -s -X POST $API_URL/api/products/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [
      {
        "name": "Fresh Onions",
        "description": "White onions",
        "categoryId": "'$CATEGORY_ID'",
        "price": 30,
        "mrp": 40,
        "stock": 150,
        "tags": ["white", "onion"]
      },
      {
        "name": "Green Bell Peppers",
        "description": "Crispy green peppers",
        "categoryId": "'$CATEGORY_ID'",
        "price": 60,
        "mrp": 75,
        "stock": 80,
        "tags": ["bell", "green"]
      },
      {
        "name": "Organic Carrots",
        "description": "Orange carrots",
        "categoryId": "'$CATEGORY_ID'",
        "price": 50,
        "mrp": 65,
        "stock": 120,
        "tags": ["organic"]
      }
    ]
  }')

echo "✅ Import response:"
echo "$IMPORT_RESPONSE" | grep -o '"imported":[0-9]*'

echo ""
echo "🎉 Success! Category created with products."
```

**Run it:**
```bash
chmod +x add-category-and-products.sh
./add-category-and-products.sh
```

---

## Field Mapping

### Category Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | Min 2, max 100 chars |
| `icon` | string (URL) | ❌ | Image URL or emoji |
| `priority` | number | ❌ | Sort order (0, 1, 2...) |
| `parentCategory` | string (ID) | ❌ | For nested categories |

### Product Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | Min 2, max 200 chars |
| `description` | string | ❌ | Product details |
| `categoryId` | string (ID) | ✅ | MongoDB ObjectId |
| `subcategoryId` | string (ID) | ❌ | Nested category |
| `price` | number | ✅ | Selling price (₹) |
| `mrp` | number | ❌ | Original/marked price |
| `stock` | number | ❌ | Quantity available |
| `images` | array (URLs) | ❌ | Product photos |
| `tags` | array | ❌ | Search keywords |

---

## Common Errors & Fixes

### ❌ 401 Unauthorized
**Cause:** Invalid or missing token.  
**Fix:** Re-login and copy the fresh token.

### ❌ 400 Validation Failed
**Cause:** Missing required field or invalid format.  
**Fix:** Check field names and types match schema above.

### ❌ 404 Category Not Found
**Cause:** `categoryId` doesn't exist.  
**Fix:** Create category first, then use its returned `_id`.

### ❌ 403 Forbidden
**Cause:** User doesn't have `categories:create` or `products:create` permission.  
**Fix:** Ensure user is Admin or has explicit permissions.

---

## Example: Add Multiple Categories

```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Fruits",
    "icon": "https://example.com/fruits.png",
    "priority": 2
  }'

curl -X POST http://localhost:5000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Dairy",
    "icon": "https://example.com/dairy.png",
    "priority": 3
  }'

curl -X POST http://localhost:5000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Bakery",
    "icon": "https://example.com/bakery.png",
    "priority": 4
  }'
```

---

## Frontend Integration

Your frontend is already configured to fetch categories and products:

**Endpoints used:**
- `GET /api/categories` → `catalogService.fetchCategories()`
- `GET /api/products` → `catalogService.fetchProducts()` 
- `GET /api/products/:id` → `catalogService.fetchProducts()`

When you add categories/products via curl, they'll automatically show in the app (next reload).

---

**Need help?** Check backend logs:
```bash
cd backend
npm run dev
```
