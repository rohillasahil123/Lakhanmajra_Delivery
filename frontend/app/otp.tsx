import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";
import { getEndpoint } from "@/config/api";
import useCart from "@/stores/cartStore";


export default function OTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const phone = (params.phone as string) ?? "+91 9876543210";
  const clearCart = useCart((s) => s.clearCart);

  const [digits, setDigits] = useState(["", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);
  const refs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    const t = setInterval(
      () => setSecondsLeft((s) => (s > 0 ? s - 1 : s)),
      1000,
    );
    return () => clearInterval(t);
  }, []);

  // Auto-verify when all 4 digits are filled
  useEffect(() => {
    const allFilled = digits.every((d) => d !== "");

    if (allFilled && !isVerifying && !hasAttempted) {
      // Auto-verify only once
      verifyOtpAuto();
    }
  }, [digits, isVerifying, hasAttempted]);

  // Auto-verify function
  async function verifyOtpAuto() {
    setHasAttempted(true);
    setError(null);
    setIsVerifying(true);

    try {
      const otp = digits.join("");

      // Call backend to verify OTP
      const endpoint = getEndpoint("/api/auth/verify-otp");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "OTP verification failed");
      }

      const data = await response.json();

      // On success, auto-login and redirect
      if (data.user || data.token) {
        clearCart();
        // Small delay for smooth transition
        setTimeout(() => {
          router.replace("/home");
        }, 300);
      }
    } catch (err: any) {
      setError(err.message || "Verification failed. Please try again.");
      setIsVerifying(false);
      setHasAttempted(false);
      // Reset digits for retry
      setDigits(["", "", "", ""]);
      refs[0].current?.focus();
    }
  }

  function onChangeText(index: number, val: string) {
    if (val.length > 1) val = val.slice(-1);
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    setError(null); // Clear error when user types

    const nextRef = refs[index + 1];
    if (val && nextRef && nextRef.current) {
      nextRef.current.focus();
    }
  }

  // Backspace press pe pichle box mein jao
  function onKeyPress(index: number, key: string) {
    if (key === "Backspace" && !digits[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  }

  function onVerify() {
    if (digits.some((d) => !d)) {
      setError("Please enter the full OTP");
      return;
    }
    // Trigger verification (in case auto-verify was disabled)
    if (!isVerifying) {
      setHasAttempted(false);
      verifyOtpAuto();
    }
  }

  return (
    <SafeAreaView style={styles.safeRoot} edges={["top", "left", "right"]}>
      {/*
        KeyboardAvoidingView — keyboard aane par content upar uthta hai
        iOS     → "padding"
        Android → "height"
      */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(verticalScale(24), insets.bottom + 8) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>
              OTP Verification
            </ThemedText>
            <ThemedText style={styles.note}>Enter the OTP sent to</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.phone}>
              {phone}
            </ThemedText>

            {/* OTP Boxes */}
            <View style={styles.otpRow}>
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={refs[i]}
                  value={d}
                  onChangeText={(t) => onChangeText(i, t)}
                  onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  editable={!isVerifying}
                  style={[
                    styles.otpBox,
                    d ? styles.otpBoxFilled : null,
                    isVerifying && styles.otpBoxDisabled,
                  ]}
                  textAlign="center"
                />
              ))}
            </View>

            {/* Error Message */}
            {error && (
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            )}

            {/* Verifying Indicator */}
            {isVerifying && (
              <View style={styles.verifyingContainer}>
                <ActivityIndicator size="small" color="#0E7A3D" />
                <ThemedText style={styles.verifyingText}>Verifying OTP...</ThemedText>
              </View>
            )}

            <ThemedText style={styles.resend}>
              {secondsLeft > 0
                ? `Resend in 0:${String(secondsLeft).padStart(2, "0")}`
                : "Didn't receive OTP? Resend"}
            </ThemedText>

            <Button 
              title={isVerifying ? "Verifying..." : "Verify"} 
              onPress={onVerify}
              disabled={isVerifying}
            />
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  container: {
    flex: 1,
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(24),
    justifyContent: "center",
  },
  title: {
    fontSize: moderateScale(26),
    fontWeight: "700",
  },
  note: {
    marginTop: verticalScale(8),
    fontSize: moderateScale(14),
    color: "#6B7280",
  },
  phone: {
    marginTop: verticalScale(4),
    marginBottom: verticalScale(28),
    fontSize: moderateScale(15),
  },
  otpRow: {
    flexDirection: "row",
    gap: scale(12),
    justifyContent: "center",
    marginBottom: verticalScale(16),
  },
  otpBox: {
    width: scale(58),
    height: scale(58),
    borderRadius: moderateScale(10),
    borderWidth: 1.5,
    borderColor: "#E6E6E6",
    fontSize: moderateScale(22),
    fontWeight: "700",
    backgroundColor: "#F9FAFB",
    color: "#111827",
  },
  // Jab digit fill ho jaye — border green ho jaye
  otpBoxFilled: {
    borderColor: "#0E7A3D",
    backgroundColor: "#F0FAF4",
  },
  otpBoxDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: "#DC2626",
    fontSize: moderateScale(13),
    textAlign: "center",
    marginTop: verticalScale(8),
    marginBottom: verticalScale(12),
  },
  verifyingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: verticalScale(12),
    gap: scale(8),
  },
  verifyingText: {
    fontSize: moderateScale(13),
    color: "#0E7A3D",
    fontWeight: "600",
  },
  resend: {
    textAlign: "center",
    marginVertical: verticalScale(12),
    fontSize: moderateScale(13),
    color: "#6B7280",
  },
});