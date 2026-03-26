import { ThemedText } from "@/components/themed-text";
import { API_BASE_URL } from "@/config/api";
import { tokenManager } from "@/utils/tokenManager";
import {
  sanitizeFormInput,
  sanitizeEmail,
  sanitizePhone,
} from "@/utils/sanitize";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useEffect } from "react";
import {
  Alert,
  TouchableOpacity,
  View,
  Image,
  TextInput,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";

const AUTH_API_URL = `${API_BASE_URL}/api/auth`;
const OTP_LENGTH = 4;
const PHONE_LENGTH = 10;
const VILLAGE_OPTIONS = ["LakhanMajra"];
const AUTH_TIMEOUT_MS = 15000;
const BRAND_NAME = "Gramin Delivery";

type VerifyOtpResponse = {
  verified: boolean;
  isExistingUser?: boolean;
  token?: string;
  verificationToken?: string;
  user?: any;
  message?: string;
};

async function postAuth<T>(
  endpoint: string,
  payload: Record<string, string>,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

  try {
    const response = await fetch(`${AUTH_API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "Request failed");
    }

    return data as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function SignupScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Tablet check — 600px se bada = tablet
  const isTablet = width >= 600;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [village, setVillage] = useState("");
  const [showVillageOptions, setShowVillageOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  function normalizePhone(value: string): string {
    return value.replaceAll(/\D/g, "").slice(0, PHONE_LENGTH);
  }

  async function sendOtp() {
    try {
      const cleanPhone = normalizePhone(phone);
      if (cleanPhone.length !== PHONE_LENGTH) {
        Alert.alert("Error", "Please enter a valid 10-digit phone number");
        return;
      }
      const sanitized = sanitizePhone(cleanPhone);
      if (!sanitized) {
        Alert.alert("Error", "Invalid phone number format");
        return;
      }
      setLoading(true);
      await postAuth("/send-otp", { phone: sanitized });
      setTimer(30);
      setStep(2);
      setPhone(sanitized);
      setVerifiedPhone("");
      Alert.alert("Success", `OTP sent successfully to ${sanitized}`);
    } catch (error: any) {
      const errorMsg =
        error?.name === "AbortError"
          ? "Request timeout. Please check your backend and network connection."
          : error.message || "Failed to send OTP";
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtpStep() {
    try {
      const cleanPhone = normalizePhone(phone);
      const cleanOtp = otp.replaceAll(/\D/g, "").slice(0, OTP_LENGTH);

      if (cleanPhone.length !== PHONE_LENGTH) {
        Alert.alert("Error", "Phone number is invalid. Please go back and retry.");
        return;
      }
      if (cleanOtp.length !== OTP_LENGTH) {
        Alert.alert("Error", "Please enter a valid 4-digit OTP");
        return;
      }

      setLoading(true);

      const data = await postAuth<VerifyOtpResponse>("/verify-otp", {
        phone: cleanPhone,
        otp: cleanOtp,
      });

      if (!data.verificationToken) {
        Alert.alert("Error", "OTP verification token missing.");
        return;
      }

      setVerificationToken(data.verificationToken);

      if (data.isExistingUser && data.user) {
        if (data.token) await tokenManager.storeToken(data.token);
        await tokenManager.storeUser(data.user);
        setOtp(cleanOtp);
        setVerifiedPhone(cleanPhone);
        Alert.alert("Success", "Welcome back!", [
          { text: "OK", onPress: () => router.replace("/home") },
        ]);
        return;
      }

      setStep(3);
      setOtp(cleanOtp);
      setVerifiedPhone(cleanPhone);
      Alert.alert("Success", "OTP verified! Now enter your details.");
    } catch (error: any) {
      const errorMsg =
        error?.name === "AbortError"
          ? "Request timeout"
          : error.message || "OTP verification failed";
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function registerUser() {
    try {
      if (!name.trim() || !email.trim() || !village.trim()) {
        Alert.alert("Error", "Please fill all fields");
        return;
      }
      if (otp.length !== OTP_LENGTH) {
        Alert.alert("Error", "OTP session expired. Please verify OTP again.");
        setStep(2);
        return;
      }

      const sanitizedName = sanitizeFormInput(name.trim(), 100);
      const sanitizedEmail = sanitizeEmail(email.trim());
      const sanitizedPhone = sanitizePhone(phone);
      const sanitizedVillage = sanitizeFormInput(village.trim(), 100);

      if (!sanitizedName || !sanitizedEmail || !sanitizedPhone || !sanitizedVillage) {
        Alert.alert("Error", "Please enter valid information");
        return;
      }

      setLoading(true);

      if (!verificationToken) {
        Alert.alert("Error", "Please verify OTP before creating account.");
        setStep(2);
        return;
      }

      const phoneToUse = verifiedPhone || sanitizedPhone;

      const data = await postAuth<{
        token?: string;
        user?: any;
        message?: string;
        isExistingUser?: boolean;
      }>("/register-with-otp", {
        phone: phoneToUse,
        otp: otp.trim(),
        name: sanitizedName,
        email: sanitizedEmail,
        village: sanitizedVillage,
        verificationToken,
      });

      if (data.token) await tokenManager.storeToken(data.token);
      if (data.user) await tokenManager.storeUser(data.user);

      if (data.isExistingUser) {
        Alert.alert("Success", "Existing user logged in.", [
          { text: "OK", onPress: () => router.replace("/home") },
        ]);
        return;
      }

      Alert.alert("Success", "Account created successfully!", [
        { text: "OK", onPress: () => router.replace("/location") },
      ]);
    } catch (error: any) {
      const errorMsg =
        error?.name === "AbortError"
          ? "Request timeout"
          : error.message || "Registration failed";
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <LinearGradient
        colors={["#F0FDF4", "#F7FEFC", "#EDFCF9"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundLayer}
      >
        {/* 
          KeyboardAvoidingView — keyboard aane par content upar uthta hai
          iOS     → "padding"  (niche se padding add karta hai)
          Android → "height"   (content ki height compress hoti hai)
        */}
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingBottom: Math.max(verticalScale(24), insets.bottom + 8) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.card,
              // Tablet pe thoda zyada padding aur wider card
              isTablet && { maxWidth: 480, padding: moderateScale(36) },
            ]}
          >
            {/* ───── HEADER ───── */}
            <View style={styles.headerSection}>
              <View style={styles.logoWrap}>
                <Image
                  source={require("../assets/images/Logo.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>Secure Signup</ThemedText>
              </View>
              <ThemedText style={styles.brandName}>{BRAND_NAME}</ThemedText>
              <ThemedText style={styles.subtitle}>
                Fast onboarding for your trusted local delivery network
              </ThemedText>
            </View>

            {/* ───── PROGRESS BAR ───── */}
            <View style={styles.progressBar}>
              <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
              <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
              <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
              <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
              <View style={[styles.progressDot, step >= 3 && styles.progressDotActive]} />
            </View>

            {/* ───── FORM ───── */}
            <View style={styles.form}>
              {step === 1 && (
                <>
                  <ThemedText style={styles.stepTitle}>Enter your mobile number</ThemedText>
                  <ThemedText style={styles.stepSubtitle}>
                    We will send a secure OTP for verification.
                  </ThemedText>
                  <TextInput
                    placeholder="10-digit phone number"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={(value) => setPhone(normalizePhone(value))}
                    editable={!loading}
                    maxLength={PHONE_LENGTH}
                    style={styles.input}
                    placeholderTextColor="#8FA0B3"
                  />
                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={sendOtp}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={["#10B981", "#059669"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.buttonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <ThemedText style={styles.buttonText}>Send OTP</ThemedText>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

              {step === 2 && (
                <>
                  <ThemedText style={styles.stepTitle}>Verify OTP</ThemedText>
                  <ThemedText style={styles.stepSubtitle}>
                    Enter the 4-digit OTP sent to {phone}
                  </ThemedText>
                  <TextInput
                    placeholder="0000"
                    keyboardType="number-pad"
                    value={otp}
                    onChangeText={(value) =>
                      setOtp(value.replaceAll(/\D/g, "").slice(0, OTP_LENGTH))
                    }
                    editable={!loading}
                    maxLength={OTP_LENGTH}
                    style={[styles.input, styles.otpInput]}
                    placeholderTextColor="#8FA0B3"
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
                    <LinearGradient
                      colors={["#10B981", "#059669"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.buttonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <ThemedText style={styles.buttonText}>Verify OTP</ThemedText>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

              {step === 3 && (
                <>
                  <ThemedText style={styles.stepTitle}>Complete your profile</ThemedText>
                  <TextInput
                    placeholder="Full Name"
                    value={name}
                    onChangeText={setName}
                    editable={!loading}
                    style={styles.input}
                    placeholderTextColor="#8FA0B3"
                  />
                  <TextInput
                    placeholder="Email Address"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    editable={!loading}
                    style={styles.input}
                    placeholderTextColor="#8FA0B3"
                  />
                  <View>
                    <TouchableOpacity
                      style={styles.selectInput}
                      onPress={() => setShowVillageOptions((c) => !c)}
                      disabled={loading}
                    >
                      <ThemedText
                        style={[styles.selectText, !village && styles.placeholderText]}
                      >
                        {village || "Select Village"}
                      </ThemedText>
                      <ThemedText style={styles.selectArrow}>
                        {showVillageOptions ? "▲" : "▼"}
                      </ThemedText>
                    </TouchableOpacity>

                    {showVillageOptions && (
                      <View style={styles.dropdownMenu}>
                        {VILLAGE_OPTIONS.map((option) => (
                          <TouchableOpacity
                            key={option}
                            style={styles.dropdownOption}
                            onPress={() => {
                              setVillage(option);
                              setShowVillageOptions(false);
                            }}
                          >
                            <ThemedText style={styles.dropdownOptionText}>
                              {option}
                            </ThemedText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={registerUser}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={["#10B981", "#059669"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.buttonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <ThemedText style={styles.buttonText}>Create Account</ThemedText>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

              {step > 1 && (
                <TouchableOpacity
                  onPress={() => setStep((c) => (c === 3 ? 2 : 1))}
                  disabled={loading}
                >
                  <ThemedText style={styles.backText}>Back</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
//  RESPONSIVE STYLES
//  scale()         → horizontal (width, icon)
//  verticalScale() → vertical (height, padding)
//  moderateScale() → fonts (naam ke saath balanced scaling)
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F0FDF4",
  },
  backgroundLayer: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(24),
  },
  card: {
    width: "100%",
    maxWidth: scale(380),
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: moderateScale(24),
    padding: moderateScale(24),
    borderWidth: 1,
    borderColor: "#D1FAE5",
    shadowColor: "#059669",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: verticalScale(20),
  },
  logoWrap: {
    width: scale(90),
    height: scale(90),
    borderRadius: scale(45),
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginBottom: verticalScale(10),
  },
  logo: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
  },
  badge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    marginBottom: verticalScale(10),
  },
  badgeText: {
    fontSize: moderateScale(11),
    fontWeight: "700",
    color: "#10B981",
  },
  brandName: {
    fontSize: moderateScale(26),
    fontWeight: "800",
    color: "#10B981",
    marginBottom: verticalScale(4),
  },
  subtitle: {
    fontSize: moderateScale(11),
    color: "#587167",
    fontWeight: "500",
    textAlign: "center",
    lineHeight: moderateScale(17),
  },
  progressBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(20),
    gap: scale(8),
  },
  progressDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: "#E5E7EB",
  },
  progressDotActive: {
    backgroundColor: "#10B981",
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E5E7EB",
    maxWidth: scale(30),
  },
  progressLineActive: {
    backgroundColor: "#10B981",
  },
  form: {
    gap: verticalScale(12),
  },
  stepTitle: {
    fontSize: moderateScale(17),
    fontWeight: "700",
    color: "#111827",
    marginBottom: verticalScale(2),
  },
  stepSubtitle: {
    fontSize: moderateScale(11),
    color: "#60707E",
    marginBottom: verticalScale(8),
  },
  input: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#DCFCE7",
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(13),
    fontSize: moderateScale(14),
    color: "#111827",
    fontWeight: "500",
  },
  selectInput: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#DCFCE7",
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(13),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: {
    color: "#111827",
    fontSize: moderateScale(14),
    fontWeight: "500",
  },
  placeholderText: {
    color: "#94A3B8",
    fontWeight: "500",
  },
  selectArrow: {
    color: "#64748B",
    fontSize: moderateScale(10),
    fontWeight: "700",
  },
  dropdownMenu: {
    marginTop: verticalScale(6),
    borderWidth: 1.2,
    borderColor: "#DCFCE7",
    borderRadius: moderateScale(12),
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  dropdownOption: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  dropdownOptionText: {
    color: "#111827",
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  otpInput: {
    fontSize: moderateScale(26),
    fontWeight: "700",
    letterSpacing: scale(6),
  },
  button: {
    borderRadius: moderateScale(12),
    overflow: "hidden",
    marginTop: verticalScale(6),
    shadowColor: "#10B981",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  buttonGradient: {
    paddingVertical: verticalScale(14),
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    shadowOpacity: 0.1,
    opacity: 0.8,
  },
  buttonText: {
    fontSize: moderateScale(15),
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  timerText: {
    fontSize: moderateScale(11),
    color: "#9A6A1F",
    fontWeight: "600",
    textAlign: "center",
    marginTop: verticalScale(4),
  },
  resendText: {
    fontSize: moderateScale(12),
    color: "#10B981",
    fontWeight: "700",
    textAlign: "center",
    marginTop: verticalScale(6),
  },
  backText: {
    fontSize: moderateScale(12),
    color: "#10B981",
    fontWeight: "700",
    textAlign: "center",
    marginTop: verticalScale(6),
  },
});