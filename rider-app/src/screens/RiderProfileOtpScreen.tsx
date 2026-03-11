import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AppButton} from '../components/AppButton';
import {RootStackParamList} from '../navigation/types';
import {riderService} from '../services/riderService';
import {palette} from '../constants/theme';
import {extractErrorMessage} from '../utils/errors';
import {createResponsiveStyles} from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'RiderProfileOtp'>;

export const RiderProfileOtpScreen: React.FC<Props> = ({navigation, route}) => {
  const [otpCode, setOtpCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(30);
  const [notice, setNotice] = useState<string | null>(route.params.otpMessage ?? null);
  const [resending, setResending] = useState(false);

  const maskedPhone = useMemo(() => {
    const rawPhone = String(route.params.profileDraft.phoneNumber || '');
    const digits = rawPhone.replace(/\D/g, '');

    if (digits.length < 4) {
      return 'your registered number';
    }

    const lastFour = digits.slice(-4);
    return `******${lastFour}`;
  }, [route.params.profileDraft.phoneNumber]);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timerId = setTimeout(() => {
      setResendSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearTimeout(timerId);
    };
  }, [resendSeconds]);

  const handleResendOtp = async () => {
    if (resendSeconds > 0) {
      return;
    }

    try {
      setResending(true);
      setError(null);

      const response = await riderService.requestProfileOtp();
      setResendSeconds(response.expiresInSeconds && response.expiresInSeconds < 60 ? response.expiresInSeconds : 30);
      setNotice(response.message || `Your verification OTP sent on ${maskedPhone}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  const handleVerifyAndSubmit = async () => {
    const normalizedOtp = otpCode.trim();

    if (!normalizedOtp) {
      setError('Please enter OTP to verify profile submission.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setNotice(null);

      await riderService.updateProfile({
        ...route.params.profileDraft,
        otpCode: normalizedOtp,
      });

      Alert.alert('Success', 'Profile submitted and OTP verified successfully.', [
        {
          text: 'OK',
          onPress: () => {
            navigation.popToTop();
            navigation.navigate('RiderProfile');
          },
        },
      ]);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardWrap}>
        <View style={styles.card}>
          <Text style={styles.title}>OTP Verification</Text>
          <Text style={styles.subtitle}>Profile details submit ho chuke hain. OTP verify karke final submit karein.</Text>
          <Text style={styles.phoneText}>Code sent to {maskedPhone}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>OTP Code</Text>
            <TextInput
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              placeholder="Enter OTP"
              placeholderTextColor={palette.textSecondary}
              style={styles.input}
              autoFocus
              maxLength={8}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}

          <View style={styles.resendRow}>
            <Text style={styles.resendHint}>
              {resendSeconds > 0
                ? `Resend OTP in 00:${String(resendSeconds).padStart(2, '0')}`
                : 'Didn\'t get OTP?'}
            </Text>
            <AppButton
              title="Resend OTP"
              onPress={handleResendOtp}
              variant="secondary"
              loading={resending}
              disabled={saving || resending || resendSeconds > 0}
            />
          </View>

          <View style={styles.actionRow}>
            <AppButton title="Back" onPress={() => navigation.goBack()} variant="secondary" disabled={saving} />
            <AppButton
              title={saving ? 'Verifying...' : 'Verify & Submit'}
              onPress={handleVerifyAndSubmit}
              disabled={saving}
            />
          </View>

          {saving ? <ActivityIndicator size="small" color={palette.primary} style={styles.loader} /> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = createResponsiveStyles({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  keyboardWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 10,
  },
  title: {
    color: palette.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  phoneText: {
    color: palette.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 6,
    marginTop: 2,
  },
  label: {
    color: palette.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    minHeight: 46,
    backgroundColor: palette.background,
    color: palette.textPrimary,
    paddingHorizontal: 12,
  },
  errorText: {
    color: palette.danger,
    fontWeight: '600',
  },
  noticeText: {
    color: palette.success,
    fontWeight: '600',
  },
  resendRow: {
    gap: 8,
    marginTop: 2,
  },
  resendHint: {
    color: palette.textSecondary,
    fontSize: 12,
  },
  actionRow: {
    gap: 8,
    marginTop: 4,
  },
  loader: {
    marginTop: 2,
  },
});
