import React from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, TouchableOpacityProps, ViewStyle } from 'react-native';

type Props = TouchableOpacityProps & {
  title?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
};

export function Button({ title, variant = 'primary', containerStyle, textStyle, style, ...rest }: Props) {
  const variantStyle = variant === 'primary' ? styles.primary : variant === 'secondary' ? styles.secondary : styles.ghost;
  return (
    <TouchableOpacity {...rest} style={[styles.button, variantStyle, containerStyle, style]}>
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primary: {
    backgroundColor: '#FF6A00',
  },
  secondary: {
    backgroundColor: '#2e8b57',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
});

