import React, {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AppButton} from '../components/AppButton';
import {FunctionBar} from '../components/FunctionBar';
import {useRiderAuth} from '../context/RiderAuthContext';
import {RootStackParamList} from '../navigation/types';
import {riderService} from '../services/riderService';
import {RiderDocumentField, RiderProfileKycForm} from '../types/rider';
import {palette} from '../constants/theme';
import {extractErrorMessage} from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'RiderProfile'>;

type FieldKey = keyof RiderProfileKycForm;

type FieldConfig = {
  key: FieldKey;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
};

type SectionConfig = {
  title: string;
  description: string;
  fields: FieldConfig[];
};

const createInitialForm = (name = '', phone = ''): RiderProfileKycForm => ({
  fullName: name,
  dateOfBirth: '',
  phoneNumber: phone,
  otpCode: '',
  aadhaarNumber: '',
  aadhaarFrontImage: '',
  aadhaarBackImage: '',
  liveSelfieImage: '',
  dlNumber: '',
  dlExpiryDate: '',
  dlFrontImage: '',
  vehicleNumber: '',
  vehicleType: '',
  rcFrontImage: '',
  insuranceImage: '',
  accountHolderName: '',
  bankAccountNumber: '',
  ifscCode: '',
  cancelledChequeImage: '',
  policeVerificationDocument: '',
  emergencyContactName: '',
  emergencyContactNumber: '',
});

const formSections: SectionConfig[] = [
  {
    title: 'Basic Information',
    description: 'Identity verification details for rider profile.',
    fields: [
      {key: 'fullName', label: 'Full Name', placeholder: 'Enter full name'},
      {key: 'dateOfBirth', label: 'Date of Birth', placeholder: 'YYYY-MM-DD'},
      {key: 'phoneNumber', label: 'Phone Number', placeholder: 'Enter rider phone', keyboardType: 'phone-pad'},
      {key: 'otpCode', label: 'OTP Code', placeholder: 'Enter verification OTP', keyboardType: 'number-pad'},
    ],
  },
  {
    title: 'Aadhaar & Selfie',
    description: 'Government identity proof and rider selfie image URL.',
    fields: [
      {key: 'aadhaarNumber', label: 'Aadhaar Number', placeholder: 'Enter Aadhaar number', keyboardType: 'number-pad'},
      {key: 'aadhaarFrontImage', label: 'Aadhaar Front Image URL', placeholder: 'https://...'},
      {key: 'aadhaarBackImage', label: 'Aadhaar Back Image URL', placeholder: 'https://...'},
      {key: 'liveSelfieImage', label: 'Live Selfie Image URL', placeholder: 'https://...'},
    ],
  },
  {
    title: 'Driving & Vehicle',
    description: 'License and vehicle verification documents.',
    fields: [
      {key: 'dlNumber', label: 'Driving License Number', placeholder: 'Enter DL number'},
      {key: 'dlExpiryDate', label: 'DL Expiry Date', placeholder: 'YYYY-MM-DD'},
      {key: 'dlFrontImage', label: 'DL Front Image URL', placeholder: 'https://...'},
      {key: 'vehicleNumber', label: 'Vehicle Number', placeholder: 'Enter vehicle number'},
      {key: 'vehicleType', label: 'Vehicle Type', placeholder: 'Bike / Scooty / EV'},
      {key: 'rcFrontImage', label: 'RC Front Image URL', placeholder: 'https://...'},
      {key: 'insuranceImage', label: 'Insurance Image URL', placeholder: 'https://...'},
    ],
  },
  {
    title: 'Bank & Emergency',
    description: 'Payout setup and emergency contact details.',
    fields: [
      {key: 'accountHolderName', label: 'Account Holder Name', placeholder: 'Enter account holder name'},
      {
        key: 'bankAccountNumber',
        label: 'Bank Account Number',
        placeholder: 'Enter bank account number',
        keyboardType: 'number-pad',
      },
      {key: 'ifscCode', label: 'IFSC Code', placeholder: 'Enter IFSC code'},
      {key: 'cancelledChequeImage', label: 'Cancelled Cheque Image URL', placeholder: 'https://...'},
      {
        key: 'policeVerificationDocument',
        label: 'Police Verification Document URL',
        placeholder: 'https://...',
      },
      {key: 'emergencyContactName', label: 'Emergency Contact Name', placeholder: 'Enter emergency contact name'},
      {
        key: 'emergencyContactNumber',
        label: 'Emergency Contact Number',
        placeholder: 'Enter emergency contact number',
        keyboardType: 'phone-pad',
      },
    ],
  },
];

const profileFieldKeys: FieldKey[] = [
  'fullName',
  'dateOfBirth',
  'phoneNumber',
  'otpCode',
  'aadhaarNumber',
  'aadhaarFrontImage',
  'aadhaarBackImage',
  'liveSelfieImage',
  'dlNumber',
  'dlExpiryDate',
  'dlFrontImage',
  'vehicleNumber',
  'vehicleType',
  'rcFrontImage',
  'insuranceImage',
  'accountHolderName',
  'bankAccountNumber',
  'ifscCode',
  'cancelledChequeImage',
  'policeVerificationDocument',
  'emergencyContactName',
  'emergencyContactNumber',
];

const uploadFieldKeys: RiderDocumentField[] = [
  'aadhaarFrontImage',
  'aadhaarBackImage',
  'liveSelfieImage',
  'dlFrontImage',
  'rcFrontImage',
  'insuranceImage',
  'cancelledChequeImage',
  'policeVerificationDocument',
];

const uploadFieldSet = new Set<FieldKey>(uploadFieldKeys);

type UploadSource = 'camera' | 'gallery';

export const RiderProfileScreen: React.FC<Props> = () => {
  const {session} = useRiderAuth();
  const [form, setForm] = useState<RiderProfileKycForm>(() =>
    createInitialForm(session?.rider.name ?? '', session?.rider.phone ?? '')
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<FieldKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        setLoading(true);
        setError(null);
        const profile = await riderService.getProfile();
        if (!mounted) {
          return;
        }

        setForm((prev) => ({
          ...prev,
          ...profileFieldKeys.reduce((accumulator, key) => {
            accumulator[key] = typeof profile[key] === 'string' ? profile[key] : '';
            return accumulator;
          }, {} as RiderProfileKycForm),
        }));
      } catch (err) {
        if (mounted) {
          setError(extractErrorMessage(err));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    bootstrap().catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const completion = useMemo(() => {
    const filledCount = profileFieldKeys.filter((key) => form[key].trim().length > 0).length;
    return Math.round((filledCount / profileFieldKeys.length) * 100);
  }, [form]);

  const updateField = (key: FieldKey, value: string) => {
    const normalizedValue = key === 'ifscCode' ? value.toUpperCase() : value;
    setForm((prev) => ({
      ...prev,
      [key]: normalizedValue,
    }));
  };

  const requestPermission = async (source: UploadSource): Promise<boolean> => {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      return permission.granted;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return permission.granted;
  };

  const pickAndUploadDocument = async (field: RiderDocumentField, source: UploadSource) => {
    try {
      const granted = await requestPermission(source);
      if (!granted) {
        Alert.alert('Permission Required', `Please allow ${source} permission to upload KYC documents.`);
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 0.8,
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              quality: 0.8,
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
            });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      setUploadingField(field);
      setError(null);
      setSuccess(null);

      const uploadedUrl = await riderService.uploadDocument(field, {
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      });

      setForm((prev) => ({
        ...prev,
        [field]: uploadedUrl,
      }));
      setSuccess(`${field} uploaded successfully.`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async () => {
    const missingFields = profileFieldKeys.filter((key) => !form[key].trim());

    if (missingFields.length > 0) {
      setError(`Please complete all required fields. Missing: ${missingFields.join(', ')}`);
      setSuccess(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await riderService.updateProfile(form);
      setSuccess('Profile submitted successfully. Rider account is onboarding-ready.');
    } catch (err) {
      setError(extractErrorMessage(err));
      setSuccess(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardWrap}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.headerCard}>
            <View style={styles.brandRow}>
              <Text style={styles.brandOrange}>Gramin</Text>
              <Text style={styles.brandGreen}> Delivery Rider</Text>
            </View>
            <Text style={styles.title}>Rider Production Profile</Text>
            <Text style={styles.subtitle}>Complete all mandatory KYC and payout details for production readiness.</Text>
            <View style={styles.completionRow}>
              <Text style={styles.completionLabel}>Profile Completion</Text>
              <Text style={styles.completionValue}>{completion}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {width: `${completion}%`}]} />
            </View>
          </View>

          {formSections.map((section) => (
            <View key={section.title} style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionDescription}>{section.description}</Text>
              {section.fields.map((field) => (
                <View key={field.key} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{field.label}</Text>
                  {uploadFieldSet.has(field.key) ? (
                    <View style={styles.uploadBlock}>
                      <View style={styles.uploadPreviewRow}>
                        <Text style={styles.uploadPreviewText} numberOfLines={1}>
                          {form[field.key] ? 'Uploaded' : 'Not uploaded'}
                        </Text>
                        {uploadingField === field.key ? (
                          <ActivityIndicator size="small" color={palette.primary} />
                        ) : null}
                      </View>
                      <View style={styles.uploadActionsRow}>
                        <Pressable
                          style={({pressed}) => [styles.uploadActionButton, pressed && styles.uploadActionPressed]}
                          onPress={() => pickAndUploadDocument(field.key as RiderDocumentField, 'camera')}>
                          <Text style={styles.uploadActionText}>Camera</Text>
                        </Pressable>
                        <Pressable
                          style={({pressed}) => [styles.uploadActionButton, pressed && styles.uploadActionPressed]}
                          onPress={() => pickAndUploadDocument(field.key as RiderDocumentField, 'gallery')}>
                          <Text style={styles.uploadActionText}>Gallery</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <TextInput
                      value={form[field.key]}
                      onChangeText={(value) => updateField(field.key, value)}
                      placeholder={field.placeholder}
                      keyboardType={field.keyboardType ?? 'default'}
                      autoCapitalize="none"
                      placeholderTextColor={palette.textSecondary}
                      style={styles.input}
                    />
                  )}
                </View>
              ))}
            </View>
          ))}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>{success}</Text> : null}

          <View style={styles.actionRow}>
            <AppButton title={loading ? 'Loading...' : 'Submit Profile'} onPress={handleSubmit} loading={saving} disabled={loading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <FunctionBar active="profile" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  keyboardWrap: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 40,
    gap: 10,
  },
  headerCard: {
    backgroundColor: palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    shadowColor: palette.textPrimary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    color: palette.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  brandOrange: {
    color: palette.accent,
    fontWeight: '800',
  },
  brandGreen: {
    color: palette.primary,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  completionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    alignItems: 'center',
  },
  completionLabel: {
    color: palette.textSecondary,
    fontWeight: '600',
  },
  completionValue: {
    color: palette.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  progressTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: palette.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.primary,
  },
  sectionCard: {
    backgroundColor: palette.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    gap: 9,
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionDescription: {
    color: palette.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: palette.textPrimary,
    fontWeight: '600',
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
  uploadBlock: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    backgroundColor: palette.background,
    padding: 10,
    gap: 8,
  },
  uploadPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  uploadPreviewText: {
    color: palette.textSecondary,
    fontWeight: '600',
    maxWidth: '85%',
  },
  uploadActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadActionButton: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.card,
  },
  uploadActionPressed: {
    opacity: 0.8,
  },
  uploadActionText: {
    color: palette.primary,
    fontWeight: '700',
  },
  actionRow: {
    gap: 8,
    marginTop: 6,
  },
  errorText: {
    color: palette.danger,
    fontWeight: '600',
  },
  successText: {
    color: palette.success,
    fontWeight: '600',
  },
});
