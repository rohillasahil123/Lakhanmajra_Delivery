# Expo Go Setup Guide - Signup API Integration

## Current Status
✅ **Signup page is properly integrated with the backend API**
- Endpoint: `POST /api/auth/register`
- Fields: name, email, phone, password
- Response: Redirects to OTP verification on success

## Running the Application

### 1. Start the Backend Server

```bash
cd backend
npm install  # If not already installed
npm run dev
```

You should see:
```
🚀 Server started on http://localhost:5000
✅ MongoDB connected
✅ RabbitMQ connected
```

### 2. Get Your Machine's IP Address

You need your machine's **actual IP address** (not localhost) for Expo Go to connect from a physical device or when using the tunnel feature.

#### **Windows:**
```bash
ipconfig
```
Look for `IPv4 Address:` (usually `192.168.x.x`)

#### **macOS/Linux:**
```bash
ifconfig
```
Look for `inet` address (usually `192.168.x.x`)

#### **Example Output:**
```
IPv4 Address . . . . . . . . . . . : 192.168.1.100
```

### 3. Update Frontend API Configuration

Edit this file: [frontend/config/api.ts](../../config/api.ts)

Replace the IP address in the `API_BASE_URL`:

```typescript
export const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.100:5000'  // 👈 Replace with YOUR machine IP:port
  : 'http://localhost:5000';
```

### 4. Start the Frontend (Expo)

```bash
cd frontend
npm install  # If not already installed
npm start
```

### 5. Use Expo Go for Testing

#### **On Android Emulator:**
- Default gateway is `10.0.2.2` (already configured in api.ts)
- The app should connect automatically

#### **On Physical Device (with Expo Go):**
1. Run `npm start` in the frontend directory
2. Scan the QR code with your phone using Expo Go
3. The app will use your configured machine IP

#### **On Web Browser:**
1. After running `npm start`, press `w` to open in web browser
2. Uses `http://localhost:5000` (configured in api.ts)

## Testing the Signup Flow

1. **Open the signup page** in Expo Go
2. **Enter test data:**
   ```
   Name: Test User
   Email: test@example.com
   Phone: 9876543210
   Password: Pass@123
   Confirm: Pass@123
   ```
3. **Tap "Sign Up"**
4. **Expected response:** 
   - ✅ Success: "Account created. Please verify OTP sent to your phone."
   - ❌ Error: User already exists (if email exists in DB)

## Troubleshooting

### ❌ "Network Error: Unable to reach server"
1. ✅ Ensure backend is running: `npm run dev` in `/backend`
2. ✅ Verify the IP address is correct in [frontend/config/api.ts](../../config/api.ts)
3. ✅ Check firewall isn't blocking port 5000
4. ✅ Make sure your device is on the same network as your machine

### ❌ "CORS Error"
- ✅ This is now fixed with the updated CORS configuration
- ✅ If issue persists, restart the backend server

### ❌ "User already exists"
- The email is already registered in MongoDB
- Try with a different email address

### ❌ "Internal Server Error"
- Check backend logs for detailed error messages
- Ensure MongoDB and RabbitMQ are running

## Development Tips

**To see network requests:**
- Check browser DevTools (if running on web)
- In the code, you'll see console.log: `🌐 Calling API: {url}`

**Database Access:**
- MongoDB should be connected at `mongodb://localhost:27017` by default
- Use MongoDB Compass to view your collections

**Reset User Data (if needed):**
```bash
cd backend
npm run seed:rbac  # Re-seed roles and permissions
```

## Next Steps

After signup works:
1. Implement OTP verification with the backend
2. Integrate login API
3. Store JWT tokens in AsyncStorage
4. Implement protected routes with authentication

---

**Need help?** Check backend logs in the terminal where `npm run dev` is running.
