import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/text-field';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  function onSubmit() {
    if (!name.trim() || !phone.trim() || !password) {
      Alert.alert('Validation', 'Please fill all required fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Validation', 'Passwords do not match.');
      return;
    }
    // Navigate to OTP screen and pass phone as a param
    router.push({ pathname: '/otp', params: { phone } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.card}>
          <ThemedText type="title" style={styles.welcome}>Welcome to</ThemedText>
          <View style={styles.brandContainer}>
            <ThemedText type="title" style={styles.brandOrange}>Lakhanmajra </ThemedText>
            <ThemedText type="title" style={styles.brandGreen}>Delivery</ThemedText>
          </View>
          <ThemedText style={styles.subtitle}>Quick & Easy Delivery to Your Doorstep</ThemedText>

          <View style={styles.form}>
            <TextField 
              placeholder="Name" 
              value={name} 
              onChangeText={setName}
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />
            <TextField 
              placeholder="Phone Number" 
              keyboardType="phone-pad" 
              value={phone} 
              onChangeText={setPhone}
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />
            <TextField 
              placeholder="Password" 
              secureTextEntry 
              value={password} 
              onChangeText={setPassword}
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />
            <TextField 
              placeholder="Confirm Password" 
              secureTextEntry 
              value={confirm} 
              onChangeText={setConfirm}
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity style={styles.signupButton} onPress={onSubmit}>
              <ThemedText style={styles.signupButtonText}>Sign Up</ThemedText>
            </TouchableOpacity>

            <View style={styles.row}>
              <ThemedText style={styles.rowText}>Already have ans account?</ThemedText>
              <TouchableOpacity onPress={() => router.push('/login')} style={styles.loginButton}>
                <ThemedText style={styles.loginText}> Login</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: '#F5F5F5' 
  },
  container: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 24 
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    alignItems: 'stretch',
  },
  welcome: {
    fontSize: 18,
    marginBottom: 4,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  brandContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandOrange: {
    fontSize: 26,
    fontWeight: '700',
    color: '#CC5500',
  },
  brandGreen: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0E7A3D',
  },
  subtitle: {
    color: '#1F2937',
    marginBottom: 24,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '400',
  },
  form: {
    marginTop: 8,
    gap: 14,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#111827',
  },
  signupButton: {
    marginTop: 8,
    backgroundColor: '#FF6A00',
    borderRadius: 10,
    paddingVertical: 16,
    shadowColor: '#FF6A00',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  signupButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  row: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '400',
  },
  loginButton: {
    marginLeft: 4,
  },
  loginText: {
    color: '#FF6A00',
    fontWeight: '700',
    fontSize: 14,
  },
});