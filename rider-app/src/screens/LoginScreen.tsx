import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useRiderAuth} from '../context/RiderAuthContext';
import {extractErrorMessage} from '../utils/errors';

export const LoginScreen: React.FC = () => {
  const {login} = useRiderAuth();
  const [riderId, setRiderId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topSection}>
          <View style={styles.circleOne}>
            <View style={styles.circleTwo}>
              <View style={styles.circleThree}>
                <View style={styles.logoBox}>
                  <View style={styles.logoInnerBox} />
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.brandTitle}>Gramin Delivery</Text>
          <Text style={styles.brandSubTitle}>RIDER PARTNER APP</Text>
          <Text style={styles.brandCaption}>Deliver. Earn. Grow.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome Rider!</Text>
          <Text style={styles.subtitle}>Login to start your delivery shift</Text>

          <Text style={styles.fieldLabel}>Mobile Number</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>◻</Text>
            <TextInput
              placeholder="+91 98765 43210"
              autoCapitalize="none"
              keyboardType="phone-pad"
              value={riderId}
              onChangeText={setRiderId}
              placeholderTextColor="#444444"
              style={styles.input}
            />
          </View>

          <Text style={styles.fieldLabel}>Password</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>◻</Text>
            <TextInput
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              placeholderTextColor="#444444"
              style={styles.input}
            />
            <Pressable onPress={() => setShowPassword((prev) => !prev)}>
              <Text style={styles.showText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={loading}
            onPress={handleLogin}
            style={({pressed}) => [
              styles.loginButton,
              pressed && !loading ? styles.loginButtonPressed : null,
              loading ? styles.loginButtonDisabled : null,
            ]}>
            <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Login to Rider App'}</Text>
          </Pressable>

          <Text style={styles.registerText}>New rider? Register here</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2d7d4b',
  },
  container: {
    flex: 1,
    backgroundColor: '#2d7d4b',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  topSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  circleOne: {
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1,
    borderColor: '#c6f8dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleTwo: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: '#c6f8dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleThree: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
    borderColor: '#c6f8dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: 130,
    height: 88,
    borderRadius: 30,
    backgroundColor: '#f2c615',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInnerBox: {
    width: 38,
    height: 48,
    borderWidth: 3,
    borderColor: '#1f5a49',
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 44,
    fontWeight: '700',
    marginTop: -78,
    lineHeight: 50,
  },
  brandSubTitle: {
    color: '#f5ca1a',
    fontSize: 24,
    letterSpacing: 0.8,
    marginTop: 6,
  },
  brandCaption: {
    color: '#d8ede1',
    fontSize: 20,
    marginTop: 10,
  },
  card: {
    backgroundColor: '#ececec',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1f4d3b',
  },
  subtitle: {
    color: '#5b5b5b',
    fontSize: 20,
    marginTop: 4,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202020',
    marginBottom: 6,
    marginTop: 4,
  },
  inputWrap: {
    height: 50,
    borderWidth: 1,
    borderColor: '#c6c1b8',
    backgroundColor: '#dedbd5',
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 10,
    color: '#2e2e2e',
    fontSize: 12,
  },
  input: {
    flex: 1,
    color: '#1a1a1a',
    fontSize: 24,
    paddingVertical: 0,
  },
  showText: {
    color: '#4c8b59',
    fontSize: 18,
    fontWeight: '500',
  },
  error: {
    color: '#c62828',
    marginBottom: 8,
    fontSize: 14,
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: '#1d5a3f',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  loginButtonPressed: {
    opacity: 0.9,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  registerText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#5ea57a',
    fontSize: 20,
  },
});
