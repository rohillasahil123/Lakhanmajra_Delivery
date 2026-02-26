# Rider App – Project Details (Single Source)

## What we are building

This is a production-oriented Rider Delivery App built with Expo (React Native), connected to a Node.js + Express backend.

Rider login flow is backend JWT based (not Firebase):

- Admin/Superadmin creates rider accounts in admin panel
- Rider installs app
- Rider logs in with created credentials (`email/phone/objectId` + password)
- App gets JWT and calls protected rider APIs

## Tech stack

- Mobile app: Expo SDK 54, React Native 0.81, React 19, TypeScript
- Backend API: Node.js + Express + MongoDB
- Auth: JWT (`Bearer <token>`)
- Password hashing: bcrypt
- Realtime: Socket.io
- Location tracking: `expo-location`
- Secure token storage: `expo-secure-store` (fallback safe handling in app layer)

## Runtime requirements

- Node.js: latest LTS recommended (v20+)
- npm: v10+
- Expo Go: SDK 54 compatible version
- Backend must run on port `5000`

## Environment configuration

Current app env (Expo public vars):

- `EXPO_PUBLIC_API_BASE_URL=http://192.168.2.13:5000/api`
- `EXPO_PUBLIC_SOCKET_BASE_URL=http://192.168.2.13:5000`

Important:

- For physical phone + Expo Go, use your laptop LAN IP (same Wi-Fi)
- `10.0.2.2` is for Android emulator only, not physical phone

## Commands

From `rider-app`:

1. `npm install`
2. `npx expo start`

From `backend`:

1. `npm run dev`

## Rider login flow (working)

1. Login screen sends credentials to `POST /api/rider/login`
2. Backend validates:
   - rider exists
   - role is `rider`
   - bcrypt password match
3. Backend returns JWT (7 days)
4. App stores token securely
5. On app start:
   - app restores token
   - calls `GET /api/rider/me`
   - valid token => Dashboard
   - invalid token/401 => auto logout

## Your rider credential verification

Provided credential:

- Username: `sillu@example.com`
- Password: `1234567890`

Backend direct API check for this credential succeeds on `POST /api/rider/login`.

So if app login fails, root cause is network/env mismatch, not credential mismatch.

## Why login was failing earlier

Earlier `.env` had emulator host (`10.0.2.2`) while app was used on Expo Go (physical phone).

That host is unreachable from phone, causing request failures.

Now `.env` is aligned to LAN IP (`192.168.2.13`) so rider login works with superadmin-created account.

## Production flow guarantee

- Frontend never decides rider identity itself
- Backend extracts rider identity from JWT
- Rider orders are fetched by token-linked rider
- Unauthorized/expired token triggers immediate logout
