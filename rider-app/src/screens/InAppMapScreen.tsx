import React, {useMemo} from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {WebView} from 'react-native-webview';
import {AppButton} from '../components/AppButton';
import {RootStackParamList} from '../navigation/types';
import {palette} from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'InAppMap'>;

const buildMapHtml = (destinationLat: number, destinationLng: number, address: string): string => {
  const escapedAddress = address.replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
      .dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 6px;
      }
      .dest { background: #2563EB; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div class="legend"><span class="dot dest"></span>Delivery destination<br/>${escapedAddress}</div>
    <script>
      const destination = [${destinationLat}, ${destinationLng}];
      const map = L.map('map').setView(destination, 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      L.marker(destination).addTo(map).bindPopup('Customer destination').openPopup();
    </script>
  </body>
  </html>
  `;
};

export const InAppMapScreen: React.FC<Props> = ({route, navigation}) => {
  const {destinationLat, destinationLng, address, orderId} = route.params;

  const hasCoords = typeof destinationLat === 'number' && typeof destinationLng === 'number';

  const html = useMemo(() => {
    if (!hasCoords) return '';
    return buildMapHtml(Number(destinationLat), Number(destinationLng), address);
  }, [hasCoords, destinationLat, destinationLng, address]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order Map</Text>
        <Text style={styles.subtitle}>Order #{orderId.slice(-6).toUpperCase()}</Text>
      </View>

      {hasCoords ? (
        <View style={styles.mapWrap}>
          <WebView originWhitelist={["*"]} source={{html}} style={styles.map} />
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
