import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text} from 'react-native';
import {palette} from '../constants/theme';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'secondary';
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}) => {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({pressed}) => [
        styles.button,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={isDisabled}>
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? palette.primary : palette.card} />
      ) : (
        <Text style={[styles.text, variant === 'secondary' ? styles.secondaryText : styles.primaryText]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: palette.textPrimary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  primary: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  danger: {
    backgroundColor: palette.danger,
    borderColor: palette.danger,
  },
  secondary: {
    backgroundColor: palette.card,
    borderColor: palette.border,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{scale: 0.99}],
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  primaryText: {
    color: palette.card,
  },
  secondaryText: {
    color: palette.primary,
  },
});
