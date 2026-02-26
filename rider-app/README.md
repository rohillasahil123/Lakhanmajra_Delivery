# Rider App (Expo Go)

Production-focused React Native Rider app with custom JWT auth, strict order state machine, real-time socket updates, and location tracking, now configured for Expo Go.

## Features

- Rider ID + password login via backend JWT
- Session token stored with SecureStore (fallback to AsyncStorage)
- Rider role-only access control
- Dashboard with assigned + ongoing orders
- Real-time updates via Socket.io
- New order assignment modal
- Strict backend-driven order transitions
- Order details with phone, payment type, address, Google Maps navigation
- Background location updates every 15 seconds while online
- Earnings summary (today/weekly/pending payouts)
- Online/offline rider toggle

## Folder Structure

```txt
src/
  components/
  context/
  hooks/
  navigation/
  screens/
  services/
  types/
  utils/
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Update env values in `.env` (Expo uses `EXPO_PUBLIC_*` vars).
4. Run app (Expo Go):
   ```bash
   npx expo start
   ```

## Env Switching (Android)

- Emulator config file: `.env.android` (`10.0.2.2`)
- Physical device config file: `.env.device` (set your laptop LAN IP)

Use:

```bash
# Expo + Android emulator env
npm run start:expo:emulator

# Expo + physical Android device env
npm run start:expo:device
```

Note: set `.env.device` with your machine's LAN IP before running on physical devices.

## Backend API Contracts Expected

- `POST /rider/login` -> `{ token, rider }`
- `GET /rider/me` -> `{ rider }`
- `GET /rider/orders`
- `GET /rider/orders/:orderId`
- `PATCH /rider/orders/:orderId/status`
- `PATCH /rider/status`
- `POST /rider/location`
- `GET /rider/earnings`

## Socket Events Expected

- `rider:orderAssigned` -> `{ order }`
- `rider:orderUpdated` -> `{ order }`
