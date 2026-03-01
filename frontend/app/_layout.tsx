import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import useCart from '@/stores/cartStore';
import useLocationStore from '@/stores/locationStore';

export default function RootLayout() {
  const hydrateLocal = useCart((s) => s.hydrateLocal);
  const syncFromServer = useCart((s) => s.syncFromServer);
  const initialized = useCart((s) => s.initialized);
  const resetToDefaultLocation = useLocationStore((s) => s.resetToDefaultLocation);

  useEffect(() => {
    resetToDefaultLocation();
  }, [resetToDefaultLocation]);

  useEffect(() => {
    (async () => {
      if (!initialized) await hydrateLocal();
      await syncFromServer();
    })();
  }, [initialized, hydrateLocal, syncFromServer]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F9FAFB' }
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="location" />
      <Stack.Screen name="home" />
      <Stack.Screen name="cart" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="search" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="products" />
      <Stack.Screen name="productdetail" />
      <Stack.Screen name="checkout" />
    </Stack>
  );
}