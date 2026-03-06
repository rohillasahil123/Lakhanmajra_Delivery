import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {WebView} from 'react-native-webview';
import * as Location from 'expo-location';
import {Ionicons} from '@expo/vector-icons';
import {RootStackParamList} from '../navigation/types';
import {createResponsiveStyles, iconSize} from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'InAppMap'>;

const buildMapHtml = (
  destinationLat: number,
  destinationLng: number,
  riderLat?: number,
  riderLng?: number
): string => {
  const hasRiderCoords =
    typeof riderLat === 'number' &&
    Number.isFinite(riderLat) &&
    typeof riderLng === 'number' &&
    Number.isFinite(riderLng);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; }
      body { background: #dce5de; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const destination = [${destinationLat}, ${destinationLng}];
      const map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
      }).setView(destination, 14);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      L.marker(destination).addTo(map);

      ${hasRiderCoords ? `
      const rider = [${riderLat}, ${riderLng}];
      L.circleMarker(rider, {
        radius: 6,
        color: '#ffffff',
        fillColor: '#1b5a3d',
        fillOpacity: 1,
        weight: 2,
      }).addTo(map);

      const bounds = L.latLngBounds([rider, destination]);
      map.fitBounds(bounds, {padding: [35, 35]});

      const routeUrl = 'https://router.project-osrm.org/route/v1/driving/' +
        rider[1] + ',' + rider[0] + ';' + destination[1] + ',' + destination[0] +
        '?overview=full&geometries=geojson&steps=true';

      fetch(routeUrl)
        .then((response) => response.json())
        .then((data) => {
          const route = data?.routes?.[0];
          if (!route?.geometry?.coordinates) {
            throw new Error('Route not available');
          }

          const points = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]);
          L.polyline(points, {color: '#1b5a3d', weight: 5, opacity: 0.95}).addTo(map);
          L.polyline(points, {
            color: '#ffffff',
            weight: 2,
            opacity: 0.95,
            dashArray: '6 10'
          }).addTo(map);
        })
        .catch(() => {
          L.polyline([rider, destination], {
            color: '#1b5a3d',
            weight: 5,
            opacity: 0.7,
          }).addTo(map);

          L.polyline([rider, destination], {
            color: '#ffffff',
            weight: 2,
            opacity: 0.95,
            dashArray: '6 10'
          }).addTo(map);
        });
      ` : ''}
    </script>
  </body>
  </html>
  `;
};

type RouteSummary = {
  distanceKm: number;
  etaMin: number;
  nextInstruction: string;
  thenInstruction: string;
};

const formatManeuver = (step: any): string => {
  const maneuver = step?.maneuver?.type;
  const modifier = step?.maneuver?.modifier;

  if (maneuver === 'turn' && modifier) {
    return `Turn ${modifier}`;
  }
  if (maneuver === 'arrive') {
    return 'Arrive at destination';
  }
  if (maneuver === 'depart') {
    return 'Head straight';
  }
  return 'Go Straight';
};

export const InAppMapScreen: React.FC<Props> = ({route, navigation}) => {
  const {destinationLat, destinationLng, address, orderId} = route.params;
  const [riderCoords, setRiderCoords] = useState<{lat: number; lng: number} | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary>({
    distanceKm: 0,
    etaMin: 0,
    nextInstruction: 'Go Straight',
    thenInstruction: 'Turn Right',
  });

  const hasCoords = typeof destinationLat === 'number' && typeof destinationLng === 'number';

  useEffect(() => {
    let mounted = true;

    const loadCurrentLocation = async () => {
      try {
        const {status} = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (mounted) {
            setLocationMessage('Location permission denied. Route guidance is limited.');
          }
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!mounted) {
          return;
        }

        setRiderCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationMessage(null);
      } catch {
        if (mounted) {
          setLocationMessage('Unable to fetch current location. Showing destination only.');
        }
      }
    };

    loadCurrentLocation().catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasCoords || !riderCoords) {
      return;
    }

    let mounted = true;

    const loadRouteSummary = async () => {
      try {
        const routeUrl =
          'https://router.project-osrm.org/route/v1/driving/' +
          `${riderCoords.lng},${riderCoords.lat};${destinationLng},${destinationLat}` +
          '?overview=false&steps=true';

        const response = await fetch(routeUrl);
        const data = await response.json();
        const routeData = data?.routes?.[0];
        const steps = routeData?.legs?.[0]?.steps || [];

        if (!mounted || !routeData) {
          return;
        }

        const distanceKm = Number(((routeData.distance || 0) / 1000).toFixed(1));
        const etaMin = Math.max(1, Math.round((routeData.duration || 0) / 60));

        setRouteSummary({
          distanceKm,
          etaMin,
          nextInstruction: formatManeuver(steps[0]),
          thenInstruction: formatManeuver(steps[1] || steps[0]),
        });
      } catch {
        if (!mounted) {
          return;
        }

        const approxKm = Number(
          Math.max(
            0.2,
            Math.sqrt(
              Math.pow((destinationLat - riderCoords.lat) * 111, 2) +
                Math.pow((destinationLng - riderCoords.lng) * 111, 2)
            )
          ).toFixed(1)
        );
        const approxMin = Math.max(1, Math.round((approxKm / 25) * 60));

        setRouteSummary((prev) => ({
          ...prev,
          distanceKm: approxKm,
          etaMin: approxMin,
        }));
      }
    };

    loadRouteSummary().catch(() => {});

    return () => {
      mounted = false;
    };
  }, [hasCoords, riderCoords, destinationLat, destinationLng]);

  const html = useMemo(() => {
    if (!hasCoords) {
      return '';
    }
    return buildMapHtml(Number(destinationLat), Number(destinationLng), riderCoords?.lat, riderCoords?.lng);
  }, [hasCoords, destinationLat, destinationLng, address, riderCoords?.lat, riderCoords?.lng]);

  const addressParts = address.split(',').map((part) => part.trim()).filter(Boolean);
  const customerName = addressParts[0] || 'Customer';
  const addressLine = addressParts.slice(1).join(', ') || address;
  const codAmount = Number(orderId.replaceAll(/\D/g, '').slice(-3) || 199);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={iconSize(22)} color="#e8f6ee" />
          </Pressable>
          <Text style={styles.title}>Navigate to Customer</Text>
        </View>
        <View style={styles.topMetricPill}>
          <Text style={styles.topMetricText}>{routeSummary.distanceKm.toFixed(1)} km  {routeSummary.etaMin} min</Text>
        </View>
      </View>

      {locationMessage ? <Text style={styles.helper}>{locationMessage}</Text> : null}

      {hasCoords ? (
        <View style={styles.mapWrap}>
          <WebView originWhitelist={['*']} source={{html}} style={styles.map} geolocationEnabled />

          <View style={styles.guidanceCard}>
            <View style={styles.arrowBox}>
              <Ionicons name="arrow-up" size={iconSize(26)} color="#ffffff" />
            </View>
            <View style={styles.guidanceMain}>
              <Text style={styles.guidanceTitle}>{routeSummary.nextInstruction}</Text>
              <Text style={styles.guidanceSub}>on {addressLine || 'Main road'} - {Math.max(100, Math.round(routeSummary.distanceKm * 1000))}m</Text>
            </View>
            <View style={styles.guidanceRight}>
              <Text style={styles.guidanceThen}>Then</Text>
              <Text style={styles.guidanceTurn}>{routeSummary.thenInstruction}</Text>
            </View>
          </View>

          <View style={styles.destinationTag}>
            <Text style={styles.destinationTagText}>{customerName} - {routeSummary.distanceKm.toFixed(1)}km</Text>
          </View>

          <View style={styles.bottomSheet}>
            <Text style={styles.deliveryLabel}>Delivering to:</Text>
            <Text style={styles.customerName}>{customerName}</Text>
            <Text style={styles.customerAddress}>{addressLine}</Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricChip}>
                <Text style={styles.metricChipText}>▫ {routeSummary.distanceKm.toFixed(1)} km</Text>
              </View>
              <View style={styles.metricChip}>
                <Text style={styles.metricChipText}>▫ {routeSummary.etaMin} min</Text>
              </View>
              <View style={styles.codChip}>
                <Text style={styles.codChipText}>▫ COD: Rs.{codAmount}</Text>
              </View>
            </View>

            <View style={styles.bottomActions}>
              <Pressable style={styles.callButton}>
                <Text style={styles.callButtonText}>▫ Call Customer</Text>
              </Pressable>
              <Pressable style={styles.arrivedButton} onPress={() => navigation.goBack()}>
                <Text style={styles.arrivedButtonText}>I've Arrived</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.fallbackCard}>
          <Text style={styles.fallbackTitle}>Location coordinates unavailable</Text>
          <Text style={styles.fallbackText}>{address}</Text>
        </View>
      )}

      <View style={styles.bottomBar}>
        <Pressable style={styles.tabItem} onPress={() => navigation.navigate('Dashboard')}>
          <Ionicons name="home-outline" size={iconSize(20)} color="#7a7a7a" />
          <Text style={styles.tabLabel}>Home</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => navigation.navigate('DeliveredOrders')}>
          <Ionicons name="receipt-outline" size={iconSize(20)} color="#7a7a7a" />
          <Text style={styles.tabLabel}>Orders</Text>
        </Pressable>

        <View style={styles.tabItem}>
          <Ionicons name="map-outline" size={iconSize(20)} color="#1f5a3e" />
          <Text style={[styles.tabLabel, styles.tabLabelActive]}>Map</Text>
          <View style={styles.activeDot} />
        </View>

        <Pressable style={styles.tabItem} onPress={() => navigation.navigate('Earnings')}>
          <Ionicons name="wallet-outline" size={iconSize(20)} color="#7a7a7a" />
          <Text style={styles.tabLabel}>Earnings</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => navigation.navigate('RiderProfile')}>
          <Ionicons name="person-outline" size={iconSize(20)} color="#7a7a7a" />
          <Text style={styles.tabLabel}>Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = createResponsiveStyles({
  container: {
    flex: 1,
    backgroundColor: '#ece9e4',
  },
  header: {
    backgroundColor: '#1b5a3d',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 8,
    paddingVertical: 2,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#e8f6ee',
  },
  topMetricPill: {
    backgroundColor: '#f3cb21',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  topMetricText: {
    color: '#1f4f38',
    fontSize: 16,
    fontWeight: '700',
  },
  helper: {
    marginHorizontal: 12,
    marginVertical: 6,
    fontSize: 12,
    color: '#4e6a5b',
  },
  mapWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  guidanceCard: {
    position: 'absolute',
    top: 8,
    left: 14,
    right: 14,
    backgroundColor: '#f2f2f2',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d8d8d8',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowBox: {
    width: 56,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1b5a3d',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  guidanceMain: {
    flex: 1,
  },
  guidanceTitle: {
    fontSize: 35,
    color: '#1b1b1b',
    fontWeight: '700',
  },
  guidanceSub: {
    marginTop: 1,
    fontSize: 21,
    color: '#666666',
  },
  guidanceRight: {
    marginLeft: 8,
    alignItems: 'flex-end',
  },
  guidanceThen: {
    fontSize: 15,
    color: '#808080',
  },
  guidanceTurn: {
    marginTop: 2,
    fontSize: 21,
    color: '#1f4f38',
    fontWeight: '700',
  },
  destinationTag: {
    position: 'absolute',
    top: 122,
    right: 28,
    backgroundColor: '#f7f6f6',
    borderColor: '#ef7f7f',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  destinationTagText: {
    color: '#e64949',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 70,
    backgroundColor: '#f2f2f2',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: '#d6d4d1',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  deliveryLabel: {
    color: '#6b6b6b',
    fontSize: 12,
  },
  customerName: {
    marginTop: 2,
    color: '#222222',
    fontSize: 34,
    fontWeight: '700',
  },
  customerAddress: {
    marginTop: 2,
    color: '#5f5f5f',
    fontSize: 14,
  },
  metricsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  metricChip: {
    backgroundColor: '#bddfc4',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metricChipText: {
    color: '#245d43',
    fontSize: 13,
    fontWeight: '700',
  },
  codChip: {
    backgroundColor: '#f0e8d4',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#f4a13d',
  },
  codChipText: {
    color: '#e67b1f',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#bddfc4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonText: {
    color: '#245d43',
    fontWeight: '700',
    fontSize: 14,
  },
  arrivedButton: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#1b5a3d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivedButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  fallbackCard: {
    margin: 16,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 12,
    padding: 14,
  },
  fallbackTitle: {
    color: '#212121',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  fallbackText: {
    color: '#666666',
    fontSize: 14,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#dcdcdc',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 2,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    color: '#777777',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#1f5a3e',
    fontWeight: '700',
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#1f5a3e',
    marginTop: 3,
  },
});
