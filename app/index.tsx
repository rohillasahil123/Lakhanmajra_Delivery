import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function IndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Default behavior: if the user is not authenticated, send them to signup.
    // Later we'll replace this with a real auth check (AsyncStorage / server).
    // Try to replace immediately; if navigation isn't ready, retry on the next tick.
    try {
      router.replace('/signup');
    } catch {
      setTimeout(() => router.replace('/signup'), 0);
    }
  }, [router]);

  return null;
}
