import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/text-field';
import useLocationStore from '@/stores/locationStore';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function LocationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialAddress = (params.address as string) || undefined;
  const initialDeliveryInstructions = (params.deliveryInstructions as string) || '';
  const initialLatitude = Number(params.latitude);
  const initialLongitude = Number(params.longitude);
  const rawReturnTo = typeof params.returnTo === 'string' ? params.returnTo : '/home';
  const returnTo = rawReturnTo === '/profile' || rawReturnTo === '/checkout' || rawReturnTo === '/home'
    ? rawReturnTo
    : '/home';
  const hasInitialCoords = Number.isFinite(initialLatitude) && Number.isFinite(initialLongitude);
  const setSelectedLocationInStore = useLocationStore((state) => state.setSelectedLocation);

  const [selectedLocation, setSelectedLocation] = useState({
    latitude: hasInitialCoords ? initialLatitude : 30.7333,
    longitude: hasInitialCoords ? initialLongitude : 76.7794,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  });
  const [address, setAddress] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState(initialDeliveryInstructions);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // Helper: Better address formatting for India (use only known fields, fall back safely)
  const formatAddress = (addr: Location.LocationGeocodedAddress | null) => {
    if (!addr) return 'Pinned location';

    // Some geocoders return slightly different field names depending on platform/provider.
    // Use a relaxed accessor via `any` locally so TS is happy but only known fields are used.
    const a: any = addr;

    const parts = [
      a.name || a.street || a.streetNumber || '',
      a.subLocality || a.subRegion || a.subRegionLevel1 || '',
      a.city || a.locality || '',
      a.district || '',
      a.region || '',
      a.postalCode ? ` - ${a.postalCode}` : '',
    ].filter(Boolean);

    return parts.join(', ').trim() || 'Selected location';
  };

  // Reverse geocode helper
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      const addressData = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });

      if (addressData.length > 0) {
        setAddress(formatAddress(addressData[0]));
      } else {
        setAddress('Pinned location');
      }
    } catch (error) {
      console.warn('Reverse geocode error:', error);
      setAddress('Pinned location');
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // Detect current location
  const detectLocation = async () => {
    setIsDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      setSelectedLocation({
        latitude,
        longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      });

      await reverseGeocode(latitude, longitude);
    } catch (error) {
      console.warn('Detect location error:', error);
      Alert.alert('Error', 'Could not detect location. Try manually.');
    } finally {
      setIsDetecting(false);
    }
  };

  // Handle map tap
  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation((prev) => ({
      ...prev,
      latitude,
      longitude,
    }));
    reverseGeocode(latitude, longitude);
  };

  // Confirm and navigate
  const confirmLocation = () => {
    if (!address.trim()) {
      Alert.alert('Location Required', 'Please select or detect a location.');
      return;
    }

    const payload = {
      address: address.trim(),
      deliveryInstructions: deliveryInstructions.trim(),
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
    };

    setSelectedLocationInStore(payload);

    router.replace({
      pathname: returnTo,
      params: {
        address: payload.address,
        deliveryInstructions: payload.deliveryInstructions,
        latitude: payload.latitude.toString(),
        longitude: payload.longitude.toString(),
      },
    });
  };

  // Optional: Load initial address if coming back or default
  useEffect(() => {
    const loadInitial = async () => {
      if (initialAddress && hasInitialCoords) {
        setAddress(initialAddress);
        setSelectedLocation((prev) => ({
          ...prev,
          latitude: initialLatitude,
          longitude: initialLongitude,
        }));
      } else if (initialAddress) {
        setAddress(initialAddress);
        try {
          // Request location permission before geocoding to avoid authorization errors
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(
              'Permission required',
              'Location permission is required to convert address to coordinates. You can still pick a location on the map or use current location.'
            );
            return;
          }

          const results = await Location.geocodeAsync(initialAddress);
          if (results && results.length > 0) {
            const { latitude, longitude } = results[0];
            setSelectedLocation({
              latitude,
              longitude,
              latitudeDelta: 0.012,
              longitudeDelta: 0.012,
            });
            await reverseGeocode(latitude, longitude);
          } else {
            Alert.alert('Not found', 'Could not find coordinates for the provided address. Please select a location on the map.');
          }
        } catch (err) {
          console.warn('Geocode error:', err);
          Alert.alert('Geocode error', 'Could not convert address to location. Please select manually.');
        }
      } else if (!address) {
        setAddress('Tap on map or detect location');
      }
    };
    loadInitial();
  }, [hasInitialCoords, initialAddress, initialLatitude, initialLongitude]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.headerText}>Select Delivery Location</ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={selectedLocation}
            onPress={handleMapPress}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            <Marker
              coordinate={{
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
              }}
              title="Delivery Here"
              description={address}
              draggable
              onDragEnd={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setSelectedLocation((prev) => ({ ...prev, latitude, longitude }));
                reverseGeocode(latitude, longitude);
              }}
            />
          </MapView>

          {/* Floating address badge */}
          <View style={styles.locationBadge}>
            <View style={styles.locationBadgeContent}>
              <ThemedText style={styles.locationIcon}>📍</ThemedText>
              {isLoadingAddress ? (
                <ActivityIndicator size="small" color="#0E7A3D" />
              ) : (
                <ThemedText style={styles.locationText} numberOfLines={2}>
                  {address}
                </ThemedText>
              )}
            </View>
          </View>
        </View>

        {/* Bottom content */}
        <ScrollView style={styles.bottomSection} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.detectButton}
            onPress={detectLocation}
            disabled={isDetecting}
          >
            <View style={styles.detectButtonContent}>
              {isDetecting ? (
                <ActivityIndicator size="small" color="#0E7A3D" />
              ) : (
                <ThemedText style={styles.detectIcon}>📍</ThemedText>
              )}
              <ThemedText style={styles.detectButtonText}>
                {isDetecting ? 'Detecting...' : 'Use Current Location'}
              </ThemedText>
            </View>
          </TouchableOpacity>

          <View style={styles.instructionsContainer}>
            <ThemedText style={styles.instructionsLabel}>
              Delivery Instructions (optional)
            </ThemedText>
            <TextField
              placeholder="E.g., Call on arrival, leave at gate, etc."
              value={deliveryInstructions}
              onChangeText={setDeliveryInstructions}
              style={styles.instructionsInput}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={{ height: 100 }} /> {/* Space for sticky button */}
        </ScrollView>

        {/* Sticky Confirm Button */}
        <View style={styles.confirmButtonContainer}>
          <TouchableOpacity style={styles.confirmButton} onPress={confirmLocation}>
            <ThemedText style={styles.confirmButtonText}>Confirm & Continue</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#0E7A3D',
  },
  backButton: { padding: 8 },
  backIcon: { fontSize: 28, color: '#FFFFFF', fontWeight: '600' },
  headerText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  placeholder: { width: 40 },
  mapContainer: { height: height * 0.50, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  locationBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  locationBadgeContent: { flexDirection: 'row', alignItems: 'center' },
  locationIcon: { fontSize: 22, marginRight: 10 },
  locationText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  bottomSection: { flex: 1, backgroundColor: '#F9FAFB' },
  detectButton: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#0E7A3D',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  detectButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  detectIcon: { fontSize: 22 },
  detectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0E7A3D',
  },
  instructionsContainer: { marginHorizontal: 20, marginTop: 24 },
  instructionsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  instructionsInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  confirmButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmButton: {
    backgroundColor: '#0E7A3D',
    borderRadius: 14,
    paddingVertical: 18,
    shadowColor: '#0E7A3D',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});