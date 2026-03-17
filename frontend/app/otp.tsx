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
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";

export default function OTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const phone = (params.phone as string) ?? "+91 9876543210";

  const [digits, setDigits] = useState(["", "", "", ""]);
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

  function onChangeText(index: number, val: string) {
    if (val.length > 1) val = val.slice(-1);
    const next = [...digits];
    next[index] = val;
    setDigits(next);

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
      alert("Please enter the full OTP");
      return;
    }
    router.replace("/(tabs)");
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
                  style={[
                    styles.otpBox,
                    d ? styles.otpBoxFilled : null,
                  ]}
                  textAlign="center"
                />
              ))}
            </View>

            <ThemedText style={styles.resend}>
              {secondsLeft > 0
                ? `Resend in 0:${String(secondsLeft).padStart(2, "0")}`
                : "Didn't receive OTP? Resend"}
            </ThemedText>

            <Button title="Verify" onPress={onVerify} />
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
  resend: {
    textAlign: "center",
    marginVertical: verticalScale(12),
    fontSize: moderateScale(13),
    color: "#6B7280",
  },
});