import { ThemedText } from '@/components/themed-text';
import { API_BASE_URL } from '@/config/api';
import { tokenManager } from '@/utils/tokenManager';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const AUTH_API_URL = `${API_BASE_URL}/api/auth`;
const OTP_LENGTH = 4;
const PHONE_LENGTH = 10;

export default function SignupScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  function normalizePhone(value: string): string {
    return value.replace(/\D/g, '').slice(0, PHONE_LENGTH);
  }

  async function postAuth<T>(endpoint: string, payload: Record<string, string>): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${AUTH_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Request failed');
      }

      return data as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function sendOtp() {
    try {
      const cleanPhone = normalizePhone(phone);

      if (cleanPhone.length !== PHONE_LENGTH) {
        Alert.alert('Error', 'Please enter a valid 10-digit phone number');
        return;
      }

      setLoading(true);

      await postAuth('/send-otp', { phone: cleanPhone });

      setTimer(120); // 2 minutes timer
      setStep(2);
      setPhone(cleanPhone);
      Alert.alert('Success', `OTP sent successfully to ${cleanPhone}`);
    } catch (error: any) {
      const errorMsg = error?.name === 'AbortError'
        ? 'Request timeout. Please check your backend and network connection.'
        : error.message || 'Failed to send OTP';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtpStep() {
    try {
      const cleanPhone = normalizePhone(phone);
      const cleanOtp = otp.replace(/\D/g, '').slice(0, OTP_LENGTH);

      if (cleanPhone.length !== PHONE_LENGTH) {
        Alert.alert('Error', 'Phone number is invalid. Please go back and retry.');
        return;
      }

      if (cleanOtp.length !== OTP_LENGTH) {
        Alert.alert('Error', 'Please enter a valid 4-digit OTP');
        return;
      }

      setLoading(true);

      await postAuth('/verify-otp', { phone: cleanPhone, otp: cleanOtp });

      setStep(3);
      setOtp(cleanOtp);
      Alert.alert('Success', 'OTP verified! Now enter your details.');
    } catch (error: any) {
      const errorMsg = error?.name === 'AbortError'
        ? 'Request timeout'
        : error.message || 'OTP verification failed';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function registerUser() {
    try {
      if (!name.trim() || !email.trim() || !password) {
        Alert.alert('Error', 'Please fill all fields');
        return;
      }

      if (password !== confirm) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }

      if (otp.length !== OTP_LENGTH) {
        Alert.alert('Error', 'OTP session expired. Please verify OTP again.');
        setStep(2);
        return;
      }

      setLoading(true);

      const data = await postAuth<{ token?: string; user?: any; message?: string }>(
        '/register-with-otp',
        {
          phone: normalizePhone(phone),
          otp: otp.trim(),
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password,
        },
      );

      if (data.token) {
        await tokenManager.storeToken(data.token);
      }

      if (data.user) {
        await tokenManager.storeUser(data.user);
      }

      Alert.alert('Success', 'Account created successfully!', [
        {
          text: 'OK',
          onPress: () => router.replace('/location'),
        },
      ]);
    } catch (error: any) {
      const errorMsg = error?.name === 'AbortError'
        ? 'Request timeout'
        : error.message || 'Registration failed';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.headerSection}>
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>Secure Signup</ThemedText>
            </View>
            <ThemedText style={styles.brandName}>Rural Delivery</ThemedText>
            <ThemedText style={styles.subtitle}>Quick OTP verification and instant onboarding</ThemedText>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
            <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
            <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
            <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
            <View style={[styles.progressDot, step >= 3 && styles.progressDotActive]} />
          </View>

          <View style={styles.form}>
            {step === 1 && (
              <>
                <ThemedText style={styles.stepTitle}>Enter your mobile number</ThemedText>
                <ThemedText style={styles.stepSubtitle}>We’ll send a secure OTP for verification.</ThemedText>
                <TextInput
                  placeholder="10-digit phone number"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(value) => setPhone(normalizePhone(value))}
                  editable={!loading}
                  maxLength={PHONE_LENGTH}
                  style={styles.input}
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={sendOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <ThemedText style={styles.buttonText}>Send OTP</ThemedText>
                  )}
                </TouchableOpacity>
              </>
            )}

            {step === 2 && (
              <>
                <ThemedText style={styles.stepTitle}>🔐 Verify OTP</ThemedText>
                <ThemedText style={styles.stepSubtitle}>
                  Enter the 4-digit OTP sent to {phone}
                </ThemedText>
                <TextInput
                  placeholder="0000"
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                  editable={!loading}
                  maxLength={OTP_LENGTH}
                  style={[styles.input, styles.otpInput]}
                  placeholderTextColor="#94A3B8"
                  textAlign="center"
                />
                {timer > 0 && (
                  <ThemedText style={styles.timerText}>
                    Resend OTP in {timer}s
                  </ThemedText>
                )}
                {timer === 0 && step === 2 && (
                  <TouchableOpacity onPress={sendOtp} disabled={loading}>
                    <ThemedText style={styles.resendText}>Resend OTP</ThemedText>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={verifyOtpStep}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <ThemedText style={styles.buttonText}>Verify OTP</ThemedText>
                  )}
                </TouchableOpacity>
              </>
            )}

            {step === 3 && (
              <>
                <ThemedText style={styles.stepTitle}>📝 Complete Your Profile</ThemedText>
                <TextInput
                  placeholder="Full Name"
                  value={name}
                  onChangeText={setName}
                  editable={!loading}
                  style={styles.input}
                  placeholderTextColor="#94A3B8"
                />
                <TextInput
                  placeholder="Email Address"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                  style={styles.input}
                  placeholderTextColor="#94A3B8"
                />
                <TextInput
                  placeholder="Password"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                  style={styles.input}
                  placeholderTextColor="#94A3B8"
                />
                <TextInput
                  placeholder="Confirm Password"
                  secureTextEntry
                  value={confirm}
                  onChangeText={setConfirm}
                  editable={!loading}
                  style={styles.input}
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={registerUser}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <ThemedText style={styles.buttonText}>Create Account</ThemedText>
                  )}
                </TouchableOpacity>
              </>
            )}

            {step === 1 && (
              <View style={styles.footer}>
                <ThemedText style={styles.footerText}>Already have an account?</ThemedText>
                <TouchableOpacity onPress={() => router.push('/login')} disabled={loading}>
                  <ThemedText style={styles.linkText}> Login</ThemedText>
                </TouchableOpacity>
              </View>
            )}

            {step > 1 && (
              <TouchableOpacity onPress={() => setStep(current => (current === 3 ? 2 : 1))} disabled={loading}>
                <ThemedText style={styles.backText}>← Back</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#EEF4F0',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.09,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 9,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  badge: {
    backgroundColor: '#E8F5EC',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0E7A3D',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0E7A3D',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    gap: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    backgroundColor: '#0E7A3D',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    maxWidth: 30,
  },
  progressLineActive: {
    backgroundColor: '#0E7A3D',
  },
  form: {
    gap: 14,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  stepSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#DCE5EE',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  otpInput: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 6,
  },
  button: {
    backgroundColor: '#0E7A3D',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: '#0E7A3D',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#A3D5A3',
    shadowOpacity: 0.1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  timerText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  resendText: {
    fontSize: 13,
    color: '#0E7A3D',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  footerText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  linkText: {
    fontSize: 13,
    color: '#0E7A3D',
    fontWeight: '700',
  },
  backText: {
    fontSize: 13,
    color: '#0E7A3D',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
});