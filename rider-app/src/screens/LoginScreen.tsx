import React, {useState} from 'react';
import {KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View} from 'react-native';
import {AppButton} from '../components/AppButton';
import {useRiderAuth} from '../context/RiderAuthContext';
import {extractErrorMessage} from '../utils/errors';
import {palette} from '../constants/theme';

export const LoginScreen: React.FC = () => {
  const {login} = useRiderAuth();
  const [riderId, setRiderId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!riderId.trim() || !password.trim()) {
      setError('Rider ID and password are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(riderId.trim(), password);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.title}>Rider Login</Text>
        <Text style={styles.subtitle}>Welcome back, sign in to continue deliveries</Text>
        <TextInput
          placeholder="Rider ID"
          autoCapitalize="none"
          value={riderId}
          onChangeText={setRiderId}
          placeholderTextColor={palette.textSecondary}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholderTextColor={palette.textSecondary}
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton title="Login" onPress={handleLogin} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 16,
    borderColor: palette.border,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    shadowColor: palette.textPrimary,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  subtitle: {
    color: palette.textSecondary,
    fontSize: 13,
    marginTop: -4,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    backgroundColor: palette.background,
    color: palette.textPrimary,
  },
  error: {
    color: palette.danger,
  },
});
