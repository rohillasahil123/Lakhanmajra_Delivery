import React, {useEffect, useMemo, useState} from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {WebView} from 'react-native-webview';
import * as Location from 'expo-location';
import {AppButton} from '../components/AppButton';
import {RootStackParamList} from '../navigation/types';
import {palette} from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'InAppMap'>;

const buildMapHtml = (
  destinationLat: number,
  destinationLng: number,
  address: string,
  riderLat?: number,
  riderLng?: number
): string => {
  const escapedAddress = address.replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
      .legend {
        position: fixed;
        bottom: 12px;
        left: 12px;
        z-index: 9999;
        background: rgba(255,255,255,0.95);
        border-radius: 8px;
        padding: 8px 10px;
        font-family: sans-serif;
        font-size: 12px;
        box-shadow: 0 1px 6px rgba(0,0,0,0.15);
      }
      .route-box {
        position: fixed;
        top: 12px;
        left: 12px;
        right: 12px;
        z-index: 9999;
        background: rgba(255,255,255,0.96);
        border-radius: 10px;
        padding: 10px;
        font-family: sans-serif;
        box-shadow: 0 1px 8px rgba(0,0,0,0.12);
        max-height: 40vh;
        overflow: auto;
      }
      .route-title {
        font-weight: 700;
        font-size: 13px;
        margin: 0 0 6px 0;
      }
      .route-meta {
        font-size: 12px;
        color: #374151;
        margin-bottom: 6px;
      }
      .route-step {
        font-size: 12px;
        color: #111827;
        margin: 3px 0;
      }
      .dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 6px;
      }
      .dest { background: #2563EB; }
      .rider { background: #059669; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div id="routeBox" class="route-box" style="display:none"></div>
    <div class="legend">
      <span class="dot dest"></span>Delivery destination<br/>
      ${escapedAddress}
      ${hasRiderCoords ? '<br/><span class="dot rider"></span>Your current location' : ''}
    </div>
    <script>
      const destination = [${destinationLat}, ${destinationLng}];
      const map = L.map('map').setView(destination, 15);
      const routeBox = document.getElementById('routeBox');

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      L.marker(destination).addTo(map).bindPopup('Customer destination').openPopup();

      const decodeManeuver = (step) => {
        const maneuver = step?.maneuver?.type || 'Continue';
        const modifier = step?.maneuver?.modifier ? ' ' + step.maneuver.modifier : '';
        const roadName = step?.name ? ' on ' + step.name : '';
        return maneuver + modifier + roadName;
      };

      const showRouteInfo = (distanceMeters, durationSeconds, steps) => {
        const km = (distanceMeters / 1000).toFixed(1);
        const mins = Math.max(1, Math.round(durationSeconds / 60));
        const topSteps = (steps || []).slice(0, 5).map((step, index) =>
          '<div class="route-step">' + (index + 1) + '. ' + decodeManeuver(step) + '</div>'
        ).join('');

        routeBox.innerHTML =
          '<div class="route-title">Navigation Guidance</div>' +
          '<div class="route-meta">Distance: ' + km + ' km • ETA: ' + mins + ' min</div>' +
          topSteps;
        routeBox.style.display = 'block';
      };

      ${hasRiderCoords ? `
      const rider = [${riderLat}, ${riderLng}];
      L.marker(rider).addTo(map).bindPopup('Your location');

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
          L.polyline(points, {color: '#2563EB', weight: 5, opacity: 0.9}).addTo(map);
          showRouteInfo(route.distance || 0, route.duration || 0, route.legs?.[0]?.steps || []);
        })
        .catch(() => {
          L.polyline([rider, destination], {
            color: '#2563EB',
            weight: 4,
            opacity: 0.6,
            dashArray: '8 6'
          }).addTo(map);

          routeBox.innerHTML =
            '<div class="route-title">Navigation Guidance</div>' +
            '<div class="route-meta">Live route unavailable. Showing direct line to destination.</div>';
          routeBox.style.display = 'block';
        });
      ` : ''}
    </script>
  </body>
  </html>
  `;
};

export const InAppMapScreen: React.FC<Props> = ({route, navigation}) => {
  const {destinationLat, destinationLng, address, orderId} = route.params;
  const [riderCoords, setRiderCoords] = useState<{lat: number; lng: number} | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

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

  const html = useMemo(() => {
    if (!hasCoords) {
      return '';
    }
    return buildMapHtml(
      Number(destinationLat),
      Number(destinationLng),
      address,
      riderCoords?.lat,
      riderCoords?.lng
    );
  }, [hasCoords, destinationLat, destinationLng, address, riderCoords?.lat, riderCoords?.lng]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order Map</Text>
        <Text style={styles.subtitle}>Order #{orderId.slice(-6).toUpperCase()}</Text>
      </View>

      {locationMessage ? <Text style={styles.helper}>{locationMessage}</Text> : null}

      {hasCoords ? (
        <View style={styles.mapWrap}>
          <WebView originWhitelist={['*']} source={{html}} style={styles.map} geolocationEnabled />
        </View>
      ) : (
        <View style={styles.fallbackCard}>
          <Text style={styles.fallbackTitle}>Location coordinates unavailable</Text>
          <Text style={styles.fallbackText}>{address}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <AppButton title="Back" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: palette.textSecondary,
  },
  helper: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 12,
    color: palette.textSecondary,
  },
  mapWrap: {
    flex: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.border,
  },
  map: {
    flex: 1,
  },
  fallbackCard: {
    margin: 16,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 14,
  },
  fallbackTitle: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  fallbackText: {
    color: palette.textSecondary,
    fontSize: 14,
  },
  actions: {
    padding: 12,
  },
});
