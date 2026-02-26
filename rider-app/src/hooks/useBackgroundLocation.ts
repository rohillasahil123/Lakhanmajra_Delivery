import {useEffect, useRef, useState} from 'react';
import {AppState} from 'react-native';
import * as Location from 'expo-location';
import {riderService} from '../services/riderService';
import {extractErrorMessage} from '../utils/errors';

const LOCATION_INTERVAL_MS = 15000;

export const useBackgroundLocation = (enabled: boolean) => {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const clearTimer = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const sendLocation = async () => {
      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!active) {
          return;
        }

        await riderService.sendLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? 0,
          timestamp: new Date(position.timestamp).toISOString(),
        });

        setError(null);
      } catch (err) {
        setError(extractErrorMessage(err));
      }
    };

    const startTracking = async () => {
      if (!enabled) {
        clearTimer();
        return;
      }

      const {status} = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';

      if (!granted) {
        setError('Location permission is required for online mode');
        clearTimer();
        return;
      }

      await sendLocation();
      clearTimer();
      timerRef.current = setInterval(() => {
        sendLocation().catch((err) => setError(extractErrorMessage(err)));
      }, LOCATION_INTERVAL_MS);
    };

    const handleAppState = (state: string) => {
      if (state === 'active') {
        startTracking().catch((err) => setError(extractErrorMessage(err)));
      } else {
        clearTimer();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    startTracking().catch((err) => setError(extractErrorMessage(err)));

    return () => {
      active = false;
      clearTimer();
      subscription.remove();
    };
  }, [enabled]);

  return {locationError: error};
};
