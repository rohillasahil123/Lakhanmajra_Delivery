import React, { ReactNode, Component, ErrorInfo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays fallback UI
 * Prevents app from crashing on component errors
 *
 * @example
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Optional: Log to error tracking service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys = [] } = this.props;
    const { resetKeys: prevResetKeys = [] } = prevProps;

    // Reset error boundary if resetKeys changed
    const hasResetKeyChanged = resetKeys.some((key, idx) => key !== prevResetKeys[idx]);
    if (hasResetKeyChanged && this.state.hasError) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <View style={styles.container}>
          <ScrollView style={styles.errorContainer} contentContainerStyle={styles.errorContent}>
            <View style={styles.errorHeader}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
            </View>

            <Text style={styles.errorMessage}>
              {error?.message || 'An unexpected error occurred'}
            </Text>

            {__DEV__ && this.state.errorInfo && (
              <View style={styles.debugSection}>
                <Text style={styles.debugTitle}>Debug Information (Development Only)</Text>
                <Text style={styles.debugText}>{this.state.errorInfo.componentStack}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.resetButton}
              onPress={this.handleReset}
              activeOpacity={0.7}
            >
              <Text style={styles.resetButtonText}>Try Again</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
  },
  errorContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  errorHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  debugSection: {
    backgroundColor: '#fee',
    borderLeftWidth: 4,
    borderLeftColor: '#fca5a5',
    padding: 12,
    marginBottom: 20,
    borderRadius: 4,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 11,
    color: '#7f1d1d',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  resetButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
