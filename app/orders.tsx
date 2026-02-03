import { ThemedText } from '@/components/themed-text';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function OrdersScreen() {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>My Orders</ThemedText>
      <ThemedText style={styles.subtitle}>You have no orders yet. Start shopping!</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280' },
});