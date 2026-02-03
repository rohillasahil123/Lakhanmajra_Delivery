import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/text-field';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function onSubmit() {
    if (!email.trim() || !password) {
      Alert.alert('Validation', 'Please fill all required fields.');
      return;
    }
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation', 'Please enter a valid email address.');
      return;
    }
    
    // Dummy credentials check
    const DUMMY_EMAIL = 'test@gmail.com';
    const DUMMY_PASSWORD = 'test@123';
    
    if (email.toLowerCase() === DUMMY_EMAIL && password === DUMMY_PASSWORD) {
      // Navigate to location page first (to select delivery location)
      router.replace('/location');
    } else {
      Alert.alert('Login Failed', 'Invalid email or password. \n\nUse:\nEmail: test@gmail.com\nPassword: test@123');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.card}>
          <ThemedText type="title" style={styles.welcome}>Welcome back</ThemedText>
          <View style={styles.brandContainer}>
            <ThemedText type="title" style={styles.brandOrange}>Lakhanmajra </ThemedText>
            <ThemedText type="title" style={styles.brandGreen}>Delivery</ThemedText>
          </View>
          <ThemedText style={styles.subtitle}>Login to continue your orders</ThemedText>

          <View style={styles.form}>
            <TextField 
              placeholder="Email" 
              value={email} 
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              placeholderTextColor="#C7C7CC"
            />
            <TextField 
              placeholder="Password" 
              secureTextEntry 
              value={password} 
              onChangeText={setPassword}
              style={styles.input}
              placeholderTextColor="#C7C7CC"
            />

            {/* Forgot Password Link */}
            <TouchableOpacity 
              onPress={() => Alert.alert('Forgot Password', 'Password recovery feature coming soon!')} 
              style={styles.forgotButton}
            >
              <ThemedText style={styles.forgotText}>Forgot Password?</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginButton} onPress={onSubmit}>
              <ThemedText style={styles.loginButtonText}>Login</ThemedText>
            </TouchableOpacity>

            <View style={styles.row}>
              <ThemedText style={styles.rowText}>Don't have an account?</ThemedText>
              <TouchableOpacity onPress={() => router.push('/signup')} style={styles.signupButton}>
                <ThemedText style={styles.signupText}> Sign Up</ThemedText>
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
    fontSize: 16,
    marginBottom: 4,
    fontWeight: '400',
    color: '#6B7280',
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    color: '#CC5500',
    fontSize: 12,
    fontWeight: '500',
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: '#CC5500',
    borderRadius: 10,
    paddingVertical: 16,
    shadowColor: '#CC5500',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  loginButtonText: {
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
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '400',
  },
  signupButton: {
    marginLeft: 4,
  },
  signupText: {
    color: '#CC5500',
    fontWeight: '600',
    fontSize: 13,
  },
});