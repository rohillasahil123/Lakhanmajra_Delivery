import { ThemedText } from '@/components/themed-text';
import React from 'react';
import { Platform, StyleSheet, TextInput, TextInputProps, View } from 'react-native';

type Props = TextInputProps & {
  label?: string;
};

export function TextField({ label, style, ...rest }: Props) {
  return (
    <View style={styles.container}>
      {label ? <ThemedText type="defaultSemiBold" style={styles.label}>{label}</ThemedText> : null}
      <TextInput
        placeholderTextColor="#9CA3AF"
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 14,
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
  },
  input: {
    height: 56,
    borderRadius: 12,
    borderWidth: 0,
    paddingHorizontal: 16,
    backgroundColor: '#F6F7F9',
    fontSize: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
});
