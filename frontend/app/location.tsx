import { ThemedText } from "@/components/themed-text";
import {
  createResponsiveStyles,
  responsiveVerticalScale,
} from "@/utils/responsive";
import { TextField } from "@/components/ui/text-field";
import useLocationStore, {
  DEFAULT_LOCATION_ADDRESS,
  DEFAULT_LOCATION_COORDS,
} from "@/stores/locationStore";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import MapView, {
  MapPressEvent,
  Marker,
  MarkerDragEndEvent,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DeliveryZone,
  getActiveDeliveryZones,
} from "@/services/deliveryZoneService";

export default function LocationScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams();
  const getParamText = (value: unknown) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    return "";
  };
  const initialDeliveryInstructions = getParamText(
    params.deliveryInstructions,
  ).trim();
  const rawReturnTo = getParamText(params.returnTo) || "/home";
  const returnTo =
    rawReturnTo === "/profile" ||
    rawReturnTo === "/checkout" ||
    rawReturnTo === "/home"
      ? rawReturnTo
      : "/home";
  const setSelectedLocationInStore = useLocationStore(
    (state) => state.setSelectedLocation,
  );

  const [selectedLocation, setSelectedLocation] = useState({
    latitude: DEFAULT_LOCATION_COORDS.latitude,
    longitude: DEFAULT_LOCATION_COORDS.longitude,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  });
  const [address, setAddress] = useState(DEFAULT_LOCATION_ADDRESS);
  const [deliveryInstructions, setDeliveryInstructions] = useState(
    initialDeliveryInstructions,
  );
  const [isDetecting, setIsDetecting] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isMarkerLocked, setIsMarkerLocked] = useState(true);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const mapRef = useRef<MapView | null>(null);

  const LOCATION_PROMPT = "Tap on map or detect location";
  const getPinnedFallbackAddress = (lat: number, lng: number) =>
    `Pinned location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const haversineMeters = (
    a: { latitude: number; longitude: number },
    b: { latitude: number; longitude: number },
  ): number => {
    const R = 6371000;
    const dLat = toRadians(b.latitude - a.latitude);
    const dLng = toRadians(b.longitude - a.longitude);
    const lat1 = toRadians(a.latitude);
    const lat2 = toRadians(b.latitude);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const h =
      sinDLat * sinDLat +
      Math.cos(lat1) * Math.cos(lat2) * (sinDLng * sinDLng);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  };

  const activeZones = zones.filter((z) => z.active);
  const isInsideAnyActiveZone = useCallback(
    (latitude: number, longitude: number): boolean => {
      if (activeZones.length === 0) {
        // fallback to Lakhanmajra-only legacy behavior if zones cannot be loaded
        const dist = haversineMeters(
          { latitude, longitude },
          DEFAULT_LOCATION_COORDS,
        );
        return dist <= 7000;
      }

      return activeZones.some((z) => {
        const dist = haversineMeters(
          { latitude, longitude },
          { latitude: z.center.latitude, longitude: z.center.longitude },
        );
        return dist <= Number(z.radiusMeters || 0);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zones],
  );

  const getNearestActiveZoneCenter = useCallback(() => {
    if (activeZones.length === 0) return DEFAULT_LOCATION_COORDS;
    return {
      latitude: activeZones[0]!.center.latitude,
      longitude: activeZones[0]!.center.longitude,
    };
  }, [activeZones]);

  const animateToLocation = useCallback(
    (latitude: number, longitude: number) => {
      mapRef.current?.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        550,
      );
    },
    [],
  );

  // Helper: Better address formatting for India (use only known fields, fall back safely)
  const formatAddress = (addr: Location.LocationGeocodedAddress | null) => {
    if (!addr) return "Pinned location";

    // Some geocoders return slightly different field names depending on platform/provider.
    // Use a relaxed accessor via `any` locally so TS is happy but only known fields are used.
    const a: any = addr;

    const parts = [
      a.name || a.street || a.streetNumber || "",
      a.subLocality || a.subRegion || a.subRegionLevel1 || "",
      a.city || a.locality || "",
      a.district || "",
      a.region || "",
      a.postalCode ? ` - ${a.postalCode}` : "",
    ].filter(Boolean);

    return parts.join(", ").trim() || "Selected location";
  };

  // Reverse geocode helper
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      const addressData = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });

      if (addressData.length > 0 && addressData[0]) {
        const firstAddress = addressData[0];
        setAddress(formatAddress(firstAddress));
      } else {
        setAddress("Pinned location");
      }
    } catch (error) {
      console.warn("Reverse geocode error:", error);
      setAddress("Pinned location");
    } finally {
      setIsLoadingAddress(false);
    }
  }, []);

  const loadZones = useCallback(async () => {
    setZonesLoading(true);
    try {
      const data = await getActiveDeliveryZones();
      setZones(data);

      const first = data.find((z) => z.active) || null;
      if (first) {
        const center = {
          latitude: first.center.latitude,
          longitude: first.center.longitude,
        };
        setSelectedLocation((prev) => ({
          ...prev,
          latitude: center.latitude,
          longitude: center.longitude,
        }));
        animateToLocation(center.latitude, center.longitude);
        setAddress(`${first.name}, ${first.city}, ${first.state}`);
        setIsMarkerLocked(true);
      }
    } catch {
      // keep default Lakhanmajra fallback
      setZones([]);
    } finally {
      setZonesLoading(false);
    }
  }, [animateToLocation]);

  // Detect current location
  const detectLocation = useCallback(
    async (silent = false) => {
      setIsDetecting(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!silent) {
            Alert.alert(
              "Permission Denied",
              "Location permission is required.",
            );
          }
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const { latitude, longitude } = location.coords;
        if (!isInsideAnyActiveZone(latitude, longitude)) {
          if (!silent) {
            Alert.alert(
              "Out of Service Area",
              "We currently deliver only in Lakhan Majra / active villages. Please choose a location inside our delivery area.",
            );
          }
          const center = getNearestActiveZoneCenter();
          setSelectedLocation({
            latitude: center.latitude,
            longitude: center.longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          });
          animateToLocation(center.latitude, center.longitude);
          await reverseGeocode(center.latitude, center.longitude);
          setIsMarkerLocked(true);
          return;
        }

        setSelectedLocation({
          latitude,
          longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        });
        animateToLocation(latitude, longitude);
        setIsMarkerLocked(false);

        await reverseGeocode(latitude, longitude);
      } catch (error) {
        console.warn("Detect location error:", error);
        if (!silent) {
          Alert.alert("Error", "Could not detect location. Try manually.");
        }
      } finally {
        setIsDetecting(false);
      }
    },
    [animateToLocation, reverseGeocode, isInsideAnyActiveZone, getNearestActiveZoneCenter],
  );

  // Handle map tap
  const handleMapPress = (event: MapPressEvent) => {
    if (isMarkerLocked) {
      Alert.alert(
        "Location Locked",
        'For now, delivery is limited to active villages (Lakhan Majra by default). Tap "Use Current Location" to unlock.',
      );
      return;
    }

    const { latitude, longitude } = event.nativeEvent.coordinate;
    if (!isInsideAnyActiveZone(latitude, longitude)) {
      Alert.alert(
        "Out of Service Area",
        "Please pick a location inside our delivery area (Lakhan Majra / active villages).",
      );
      return;
    }
    setSelectedLocation((prev) => ({
      ...prev,
      latitude,
      longitude,
    }));
    setAddress(getPinnedFallbackAddress(latitude, longitude));
    reverseGeocode(latitude, longitude);
  };

  // Confirm and navigate
  const confirmLocation = () => {
    const normalizedAddress = address.trim();
    const safeAddress =
      !normalizedAddress || normalizedAddress === LOCATION_PROMPT
        ? getPinnedFallbackAddress(
            selectedLocation.latitude,
            selectedLocation.longitude,
          )
        : normalizedAddress;

    const payload = {
      address: safeAddress,
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
    setSelectedLocation({
      latitude: DEFAULT_LOCATION_COORDS.latitude,
      longitude: DEFAULT_LOCATION_COORDS.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    });
    setAddress(DEFAULT_LOCATION_ADDRESS || LOCATION_PROMPT);
    setIsMarkerLocked(true);
  }, []);

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  useEffect(() => {
    detectLocation(true);
  }, [detectLocation]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ThemedText style={styles.backIcon}>‹</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.headerText}>
            Select Delivery Location
          </ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* Map */}
        <View style={[styles.mapContainer, { height: height * 0.5 }]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={selectedLocation}
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
              draggable={!isMarkerLocked}
              onDragEnd={(e: MarkerDragEndEvent) => {
                if (isMarkerLocked) {
                  return;
                }
                const { latitude, longitude } = e.nativeEvent.coordinate;
                if (!isInsideAnyActiveZone(latitude, longitude)) {
                  Alert.alert(
                    "Out of Service Area",
                    "Please keep the pin inside our delivery area (Lakhan Majra / active villages).",
                  );
                  return;
                }
                setSelectedLocation((prev) => ({
                  ...prev,
                  latitude,
                  longitude,
                }));
                setAddress(getPinnedFallbackAddress(latitude, longitude));
                reverseGeocode(latitude, longitude);
              }}
            />
          </MapView>

          {/* Floating address badge */}
          <View style={styles.locationBadge}>
            <View style={styles.locationBadgeContent}>
              <ThemedText style={styles.locationIcon}>📍</ThemedText>
              {isLoadingAddress || zonesLoading ? (
                <ActivityIndicator size="small" color="#0E7A3D" />
              ) : (
                <ThemedText style={styles.locationText} numberOfLines={2}>
                  {address}
                </ThemedText>
              )}
            </View>
            {isMarkerLocked ? (
              <ThemedText style={styles.lockHint}>
                {activeZones.length > 0
                  ? `Serving: ${activeZones.map((z) => z.name).join(", ")} • Tap Use Current Location to unlock`
                  : "Serving: Lakhan Majra • Tap Use Current Location to unlock"}
              </ThemedText>
            ) : null}
          </View>
        </View>

        {/* Bottom content */}
        <ScrollView
          style={styles.bottomSection}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.detectButton}
            onPress={() => detectLocation(false)}
            disabled={isDetecting}
          >
            <View style={styles.detectButtonContent}>
              {isDetecting ? (
                <ActivityIndicator size="small" color="#0E7A3D" />
              ) : (
                <ThemedText style={styles.detectIcon}>📍</ThemedText>
              )}
              <ThemedText style={styles.detectButtonText}>
                {isDetecting ? "Detecting..." : "Use Current Location"}
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
          <View style={{ height: responsiveVerticalScale(100) }} />
          {/* Space for sticky button */}
        </ScrollView>

        {/* Sticky Confirm Button */}
        <View style={styles.confirmButtonContainer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={confirmLocation}
          >
            <ThemedText style={styles.confirmButtonText}>
              Confirm & Continue
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = createResponsiveStyles({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#0E7A3D",
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backIcon: { fontSize: 28, color: "#FFFFFF", fontWeight: "600" },
  headerText: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  placeholder: { width: 40 },
  mapContainer: { position: "relative" },
  map: { ...StyleSheet.absoluteFillObject },
  locationBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  locationBadgeContent: { flexDirection: "row", alignItems: "center" },
  locationIcon: { fontSize: 22, marginRight: 10 },
  locationText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111827" },
  lockHint: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#0E7A3D",
  },
  bottomSection: { flex: 1, backgroundColor: "#F9FAFB" },
  detectButton: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "#0E7A3D",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  detectButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  detectIcon: { fontSize: 22 },
  detectButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0E7A3D",
  },
  instructionsContainer: { marginHorizontal: 20, marginTop: 24 },
  instructionsLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 8,
  },
  instructionsInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: "#111827",
    minHeight: 90,
    textAlignVertical: "top",
  },
  confirmButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  confirmButton: {
    backgroundColor: "#0E7A3D",
    borderRadius: 14,
    paddingVertical: 18,
    shadowColor: "#0E7A3D",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
});
