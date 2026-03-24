import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  type?: 'error' | 'warning' | 'info';
}

/**
 * Error Message Component
 * Displays error messages with optional retry and dismiss buttons
 * Replaces silent failures with user-visible feedback
 *
 * @example
 * {error && (
 *   <ErrorMessage
 *     message={error.message}
 *     onRetry={() => retryFetch()}
 *     onDismiss={() => setError(null)}
 *   />
 * )}
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onRetry,
  onDismiss,
  type = 'error',
}) => {
  const iconName = type === 'error' ? 'alert-circle' : type === 'warning' ? 'alert' : 'information';
  const colors = {
    error: { bg: '#fee', border: '#fca5a5', text: '#991b1b', icon: '#dc2626' },
    warning: { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', icon: '#f59e0b' },
    info: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', icon: '#3b82f6' },
  };

  const color = colors[type];

  return (
    <View style={[styles.container, { backgroundColor: color.bg, borderLeftColor: color.border }]}>
      <View style={styles.content}>
        <MaterialCommunityIcons
          name={iconName as any}
          size={20}
          color={color.icon}
          style={styles.icon}
        />
        <Text style={[styles.message, { color: color.text }]}>{message}</Text>
      </View>

      <View style={styles.actions}>
        {onRetry && (
          <TouchableOpacity
            onPress={onRetry}
            style={[styles.button, { backgroundColor: color.icon }]}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            style={[styles.button, styles.dismissButton, { backgroundColor: color.icon }]}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 4,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  dismissButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
