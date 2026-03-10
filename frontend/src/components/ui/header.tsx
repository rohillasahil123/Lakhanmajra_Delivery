import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';

export function Header({ title }: { title?: string }) {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <MaterialIcons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>
      <ThemedText type="title" style={styles.title}>{title}</ThemedText>
      <View style={{ width: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    backgroundColor: '#2e8b57',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  back: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
});
