import {useEffect, useState} from 'react';
import * as Location from 'expo-location';
import {Alert} from 'react-native';
import {DELIVERY_ZONES, DeliveryZone} from '../constants/geofencingZones';

interface GeofencingResult {
  isInsideZone: boolean;
  currentZone: DeliveryZone | null;
  distance: number | null;
  loading: boolean;
  error: string | null;
}

export const useGeofencing = (checkOnMount = true): GeofencingResult => {
  const [result, setResult] = useState<GeofencingResult>({
    isInsideZone: false,
    currentZone: null,
    distance: null,
    loading: true,
    error: null,
  });

  // Haversine formula - Distance calculate karo
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Check if user is inside any delivery zone
  const checkGeofence = async (): Promise<void> => {
    try {
      setResult((prev) => ({...prev, loading: true, error: null}));

      // Request location permission
      const {status} = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setResult((prev) => ({
          ...prev,
          loading: false,
          error: 'Location permission denied',
        }));
        Alert.alert('Permission Denied', 'Location access chahiye delivery zone check karne ke liye');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const userLat = location.coords.latitude;
      const userLon = location.coords.longitude;

      // Check distance from each zone
      let isInside = false;
      let closestZone: DeliveryZone | null = null;
      let minDistance = Infinity;

      for (const zone of DELIVERY_ZONES) {
        const distance = getDistanceKm(userLat, userLon, zone.latitude, zone.longitude);

        // Update closest zone for reference
        if (distance < minDistance) {
          minDistance = distance;
          closestZone = zone;
        }

        // Check if inside this zone
        if (distance <= zone.radiusKm) {
          isInside = true;
          setResult({
            isInsideZone: true,
            currentZone: zone,
            distance: parseFloat(distance.toFixed(2)),
            loading: false,
            error: null,
          });
          return;
        }
      }

      // If not inside any zone - show alert with closest zone info
      setResult({
        isInsideZone: false,
        currentZone: closestZone,
        distance: parseFloat(minDistance.toFixed(2)),
        loading: false,
        error: null,
      });

      if (!isInside && closestZone) {
        Alert.alert(
          'Service Unavailable',
          `Aapka area delivery zone mein nahi hai.\n\nClosest area: ${closestZone.name}\nDoor: ${minDistance.toFixed(1)} km`,
          [{text: 'OK'}]
        );
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unable to check location';
      setResult((prev) => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }));
      Alert.alert('Error', 'Location check mein error aaya');
    }
  };

  useEffect(() => {
    if (checkOnMount) {
      checkGeofence();
    }
  }, [checkOnMount]);

  return result;
};
