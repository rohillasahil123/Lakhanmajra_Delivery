# 🚀 Blinkit Admin Panel - Professional Edition

A modern, fully-functional admin panel for managing a Blinkit-like grocery delivery platform.

## ✨ Features

### 📊 Dashboard
- Real-time metrics and KPIs
- Interactive charts for orders, revenue, and performance
- Customizable date range filters (7, 30, 90 days)
- Order status breakdown
- Top products analysis
- Rider performance tracking

### 👥 User Management
- View, create, edit, and delete users
- Role-based access control
- User filtering by role
- Real-time search
- Pagination support
- User summary statistics

### 🚴 Rider Management
- Delivery rider tracking
- Availability status monitoring
- Performance metrics
- Vehicle information
- Rating system
- Order completion statistics

### 📦 Product Management
- Complete CRUD operations
- Category assignment
- Stock management
- Price and discount pricing
- Image gallery support
- Multiple units (kg, g, L, ml, piece, pack)
- Search and filter capabilities

### 🗂️ Category Management
- Create and organize product categories
- Custom ordering
- Category activation/deactivation
- Description and image support

### 🛒 Order Management
- Order tracking and status updates
- Real-time order monitoring
- Rider assignment
- Order details view
- Status history timeline
- Multiple order statuses (pending, confirmed, preparing, ready, assigned, picked, delivered, cancelled)

### 🔐 Roles & Permissions
- Dynamic role creation
- Granular permission system
- Role assignment to users
- Permission management interface
- Built-in superadmin role

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Routing**: React Router DOM v6
- **Build Tool**: Vite
- **Code Quality**: ESLint + TypeScript

## 📋 Prerequisites

- Node.js 18+ and npm
- Backend API (compatible with the defined endpoints)

## ⚙️ Installation

1. **Clone or extract the project**

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
Create a `.env` file in the root directory:
```env
VITE_API_URL=http://localhost:5000/api
```

4. **Start development server**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🏗️ Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist` directory.

## 📁 Project Structure

```
blinkit-admin-professional/
├── src/
│   ├── api/
│   │   └── client.ts          # Axios configuration
│   ├── components/
│   │   ├── Header.tsx          # Top navigation bar
│   │   ├── Sidebar.tsx         # Side navigation menu
│   │   ├── Loading.tsx         # Loading spinner component
│   │   ├── Modal.tsx           # Reusable modal component
│   │   └── ProtectedRoute.tsx  # Route authentication guard
│   ├── pages/
│   │   ├── Dashboard.tsx       # Main dashboard with metrics
│   │   ├── Login.tsx           # Authentication page
│   │   ├── Users.tsx           # User management
│   │   ├── Riders.tsx          # Rider management
│   │   ├── Products.tsx        # Product catalog management
│   │   ├── Categories.tsx      # Category management
│   │   ├── Orders.tsx          # Order tracking and management
│   │   └── Roles.tsx           # Role and permission management
│   ├── styles/
│   │   └── index.css           # Global styles and Tailwind
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   ├── utils/
│   │   └── helpers.ts          # Utility functions
│   ├── App.tsx                 # Main application component
│   ├── auth.ts                 # Authentication utilities
│   └── main.tsx                # Application entry point
├── public/                     # Static assets
├── index.html                  # HTML template
├── package.json                # Dependencies and scripts
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── vite.config.ts              # Vite configuration
```

## 🔐 Authentication

The admin panel uses JWT-based authentication. Tokens are stored in localStorage.

Default credentials (if backend supports):
- Email: `admin@blinkit.com`
- Password: `admin123`

## 🎨 Design Features

- **Modern UI**: Clean, professional interface with smooth animations
- **Responsive**: Fully responsive design for desktop, tablet, and mobile
- **Dark Mode Ready**: Built with dark mode compatibility in mind
- **Accessibility**: ARIA labels and keyboard navigation support
- **Performance**: Optimized rendering and lazy loading

## 🔑 Key Features

### Permission System
The admin panel includes a comprehensive permission system:
- `users:view`, `users:create`, `users:update`, `users:delete`
- `products:view`, `products:create`, `products:update`, `products:delete`
- `orders:view`, `orders:update`
- `categories:view`, `categories:create`, `categories:update`, `categories:delete`
- `roles:view`, `roles:create`, `roles:update`, `roles:delete`, `roles:manage`
- `reports:view`

### API Endpoints Expected

The admin panel expects the following API structure:

**Authentication**
- POST `/auth/login` - User login
- GET `/auth/users` - Get current user
- GET `/auth/permissions` - Get user permissions

**Users**
- GET `/admin/users` - List users (with pagination, search, role filter)
- GET `/admin/users/summary` - Get user summary by role
- PATCH `/auth/users/:id/role` - Update user role
- DELETE `/auth/users/:id` - Delete user

**Products**
- GET `/products` - List products (with pagination and search)
- POST `/products` - Create product
- PUT `/products/:id` - Update product
- DELETE `/products/:id` - Delete product

**Categories**
- GET `/categories` - List categories
- POST `/categories` - Create category
- PUT `/categories/:id` - Update category
- DELETE `/categories/:id` - Delete category

**Orders**
- GET `/orders` - List orders (with pagination)
- GET `/admin/orders/:id` - Get order details
- PATCH `/orders/:id/status` - Update order status
- PATCH `/orders/:id/assign` - Assign rider to order

**Roles**
- GET `/admin/roles` - List roles
- GET `/admin/permissions` - List all permissions
- POST `/admin/roles` - Create role
- PUT `/admin/roles/:id` - Update role
- DELETE `/admin/roles/:id` - Delete role

**Metrics**
- GET `/admin/metrics?range=30` - Get dashboard metrics

## 🐛 Troubleshooting

### API Connection Issues
- Verify `VITE_API_URL` in `.env` file
- Check if backend server is running
- Ensure CORS is enabled on the backend

### Build Errors
- Delete `node_modules` and `package-lock.json`, then run `npm install` again
- Clear npm cache: `npm cache clean --force`

## 📄 License

This project is licensed under the MIT License.

## 💡 Support

For issues or questions:
1. Check the documentation
2. Review the code comments
3. Check API endpoint compatibility

## 🎉 Acknowledgments

Built with modern web technologies to provide the best admin experience for grocery delivery platforms like Blinkit.
