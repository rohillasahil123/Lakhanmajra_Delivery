import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const phone = (params.phone as string) ?? '+91 9876543210'; // fallback for now

  const [digits, setDigits] = useState(['', '', '', '']);
  const refs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : s)), 1000);
    return () => clearInterval(t);
  }, []);

  function onChangeText(index: number, val: string) {
    if (val.length > 1) val = val.slice(-1);
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    if (val && index < refs.length - 1) refs[index + 1].current?.focus();
  }

  function onVerify() {
    // Basic validation for now
    if (digits.some((d) => !d)) {
      alert('Please enter the full OTP');
      return;
    }
    // Proceed to tabs (home) after OTP verify
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">OTP Verification</ThemedText>
        <ThemedText style={styles.note}>Enter the OTP sent to</ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.phone}>{phone}</ThemedText>

        <View style={styles.otpRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={refs[i]}
              value={d}
              onChangeText={(t) => onChangeText(i, t)}
              keyboardType="number-pad"
              maxLength={1}
              style={styles.otpBox}
              textAlign="center"
            />
          ))}
        </View>

        <ThemedText style={styles.resend}>{secondsLeft > 0 ? `Resend in 0:${String(secondsLeft).padStart(2, '0')}` : 'Didn\'t receive OTP? Resend'}</ThemedText>

        <Button title="Verify" onPress={onVerify} />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  note: { marginTop: 8, color: '#6B7280' },
  phone: { marginTop: 4, marginBottom: 20 },
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 12 },
  otpBox: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E6E6E6',
    fontSize: 22,
    alignSelf: 'center',
  },
  resend: { textAlign: 'center', marginVertical: 12 },
});