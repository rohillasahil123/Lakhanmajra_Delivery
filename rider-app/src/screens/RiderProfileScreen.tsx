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
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import {createResponsiveStyles} from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'RiderProfile'>;

type FieldKey = keyof RiderProfileKycForm;

type FieldConfig = {
  key: FieldKey;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
  maxLength?: number;
  autoCapitalize?: 'none' | 'words' | 'characters';
};

type SectionConfig = {
  title: string;
  description: string;
  fields: FieldConfig[];
};

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const normalizeDigits = (value: string, maxLength: number): string =>
  value.replace(/\D/g, '').slice(0, maxLength);

const normalizeName = (value: string): string =>
  value
    .replace(/[^a-zA-Z\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 60);

const normalizeDlNumber = (value: string): string =>
  value.replace(/[^a-zA-Z0-9/-]/g, '').toUpperCase().slice(0, 20);

const normalizeVehicleNumber = (value: string): string =>
  value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);

const normalizeVehicleType = (value: string): string =>
  value
    .replace(/[^a-zA-Z\s-]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 25);

const formatDobDisplay = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}-${month}-${year}`;
};

const parseDobDisplay = (dob: string): Date | null => {
  const trimmed = dob.trim();
  const ddMmYyyyMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  const yyyyMmDdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!ddMmYyyyMatch && !yyyyMmDdMatch) {
    return null;
  }

  const day = Number(ddMmYyyyMatch ? ddMmYyyyMatch[1] : yyyyMmDdMatch?.[3]);
  const month = Number(ddMmYyyyMatch ? ddMmYyyyMatch[2] : yyyyMmDdMatch?.[2]);
  const year = Number(ddMmYyyyMatch ? ddMmYyyyMatch[3] : yyyyMmDdMatch?.[1]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const normalizeDisplayDate = (value: string): string => {
  const parsed = parseDobDisplay(value);
  return parsed ? formatDobDisplay(parsed) : value.trim();
};

const mergeDraftWithProfile = (
  base: RiderProfileKycForm,
  draft: Partial<RiderProfileKycForm> | null
): RiderProfileKycForm => {
  if (!draft) {
    return base;
  }

  const merged = {...base};
  (Object.keys(draft) as Array<keyof RiderProfileKycForm>).forEach((key) => {
    const draftValue = draft[key];
    if (typeof draftValue === 'string' && draftValue.trim().length > 0) {
      merged[key] = draftValue;
    }
  });

  return {
    ...merged,
    dateOfBirth: normalizeDisplayDate(merged.dateOfBirth),
    dlExpiryDate: normalizeDisplayDate(merged.dlExpiryDate),
  };
};

const isValidDobFormat = (dob: string): boolean => {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dob);
  if (!match) {
    return false;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || year < 1900) {
    return false;
  }

  const date = new Date(year, month - 1, day);
  const sameDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!sameDate) {
    return false;
  }

  return true;
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
});

const formSections: SectionConfig[] = [
  {
    title: 'Basic Information',
    description: 'Identity verification details for rider profile.',
    fields: [
      {key: 'fullName', label: 'Full Name', placeholder: 'Enter full name'},
      {key: 'dateOfBirth', label: 'Date of Birth', placeholder: 'DD-MM-YYYY'},
      {
        key: 'phoneNumber',
        label: 'Phone Number',
        placeholder: 'Enter 10-digit phone number',
        keyboardType: 'phone-pad',
        maxLength: 10,
      },
    ],
  },
  {
    title: 'Aadhaar & Selfie',
    description: 'Government identity proof and rider selfie image URL.',
    fields: [
      {
        key: 'aadhaarNumber',
        label: 'Aadhaar Number',
        placeholder: 'Enter 12-digit Aadhaar number',
        keyboardType: 'number-pad',
        maxLength: 12,
      },
      {key: 'aadhaarFrontImage', label: 'Aadhaar Front Image URL', placeholder: 'https://...'},
      {key: 'aadhaarBackImage', label: 'Aadhaar Back Image URL', placeholder: 'https://...'},
      {key: 'liveSelfieImage', label: 'Live Selfie Image URL', placeholder: 'https://...'},
    ],
  },
  {
    title: 'Driving & Vehicle',
    description: 'License and vehicle verification documents.',
    fields: [
      {key: 'dlNumber', label: 'Driving License Number', placeholder: 'Enter DL number', maxLength: 20, autoCapitalize: 'characters'},
      {key: 'dlExpiryDate', label: 'DL Expiry Date', placeholder: 'DD-MM-YYYY'},
      {key: 'dlFrontImage', label: 'DL Front Image URL', placeholder: 'https://...'},
      {key: 'vehicleNumber', label: 'Vehicle Number', placeholder: 'e.g. HR12AB1234', maxLength: 12, autoCapitalize: 'characters'},
      {key: 'vehicleType', label: 'Vehicle Type', placeholder: 'Bike / Scooty / EV', maxLength: 25},
      {key: 'rcFrontImage', label: 'RC Front Image URL', placeholder: 'https://...'},
      {key: 'insuranceImage', label: 'Insurance Image URL', placeholder: 'https://...'},
    ],
  },
];

const profileFieldKeys: FieldKey[] = [
  'fullName',
  'dateOfBirth',
  'phoneNumber',
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
];

const uploadFieldKeys: RiderDocumentField[] = [
  'aadhaarFrontImage',
  'aadhaarBackImage',
  'liveSelfieImage',
  'dlFrontImage',
  'rcFrontImage',
  'insuranceImage',
];

const uploadFieldSet = new Set<FieldKey>(uploadFieldKeys);
const KYC_DRAFT_KEY = 'rider_kyc_draft_v1';
const KYC_PENDING_OTP_KEY = 'rider_kyc_pending_otp_v1';
const KYC_STEP_TITLES = ['Basic', 'Aadhaar', 'DL/Vehicle', 'Review'];

const reviewLabelByKey: Record<FieldKey, string> = {
  fullName: 'Full Name',
  dateOfBirth: 'Date of Birth',
  phoneNumber: 'Phone Number',
  otpCode: 'OTP Code',
  aadhaarNumber: 'Aadhaar Number',
  aadhaarFrontImage: 'Aadhaar Front',
  aadhaarBackImage: 'Aadhaar Back',
  liveSelfieImage: 'Live Selfie',
  dlNumber: 'DL Number',
  dlExpiryDate: 'DL Expiry Date',
  dlFrontImage: 'DL Front',
  vehicleNumber: 'Vehicle Number',
  vehicleType: 'Vehicle Type',
  rcFrontImage: 'RC Front',
  insuranceImage: 'Insurance',
};

type UploadSource = 'camera' | 'gallery';

export const RiderProfileScreen: React.FC<Props> = ({navigation}) => {
  const {session, logout} = useRiderAuth();
  const [form, setForm] = useState<RiderProfileKycForm>(() =>
    createInitialForm(session?.rider.name ?? '', session?.rider.phone ?? '')
  );
  const [loading, setLoading] = useState(true);
  const [uploadingField, setUploadingField] = useState<FieldKey | null>(null);
  const [activeDateField, setActiveDateField] = useState<'dateOfBirth' | 'dlExpiryDate' | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [hasQueuedDraft, setHasQueuedDraft] = useState(false);
  const [canAutoSaveDraft, setCanAutoSaveDraft] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        setLoading(true);
        setError(null);
        const profile = await riderService.getProfile();
        const draftRaw = await AsyncStorage.getItem(KYC_DRAFT_KEY);
        const draft = draftRaw ? (JSON.parse(draftRaw) as Partial<RiderProfileKycForm>) : null;
        if (!mounted) {
          return;
        }

        const profileForm = profileFieldKeys.reduce((accumulator, key) => {
          const rawValue = typeof profile[key] === 'string' ? profile[key] : '';
          accumulator[key] =
            key === 'dateOfBirth' || key === 'dlExpiryDate' ? normalizeDisplayDate(rawValue) : rawValue;
          return accumulator;
        }, {} as RiderProfileKycForm);

        setForm((prev) =>
          mergeDraftWithProfile(
            {
              ...prev,
              ...profileForm,
            },
            draft
          )
        );

        const pendingQueue = await AsyncStorage.getItem(KYC_PENDING_OTP_KEY);
        if (pendingQueue) {
          setHasQueuedDraft(true);
          setSuccess('Pending submit draft detected. Submit karein to OTP request retry hoga.');
        }
      } catch (err) {
        if (mounted) {
          setError(extractErrorMessage(err));
        }
      } finally {
        if (mounted) {
          setCanAutoSaveDraft(true);
          setLoading(false);
        }
      }
    };

    bootstrap().catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const retryQueuedDraft = async () => {
    try {
      const queuedRaw = await AsyncStorage.getItem(KYC_PENDING_OTP_KEY);
      if (!queuedRaw) {
        setHasQueuedDraft(false);
        setSuccess(null);
        return;
      }

      const queued = JSON.parse(queuedRaw) as {profileDraft?: RiderProfileKycForm};
      if (queued.profileDraft) {
        setForm(queued.profileDraft);
      }

      setHasQueuedDraft(false);
      await AsyncStorage.removeItem(KYC_PENDING_OTP_KEY);
      setSuccess('Queued draft restored. Final submit ke liye Submit Profile dabayen.');
    } catch {
      setError('Unable to restore queued draft.');
    }
  };

  useEffect(() => {
    if (!canAutoSaveDraft) {
      return;
    }
    AsyncStorage.setItem(KYC_DRAFT_KEY, JSON.stringify(form)).catch(() => {});
  }, [canAutoSaveDraft, form]);

  const completion = useMemo(() => {
    const filledCount = profileFieldKeys.filter((key) => form[key].trim().length > 0).length;
    return Math.round((filledCount / profileFieldKeys.length) * 100);
  }, [form]);

  const updateField = (key: FieldKey, value: string) => {
    let normalizedValue = value;

    if (key === 'phoneNumber') {
      normalizedValue = normalizeDigits(value, 10);
    } else if (key === 'aadhaarNumber') {
      normalizedValue = normalizeDigits(value, 12);
    } else if (key === 'fullName') {
      normalizedValue = normalizeName(value);
    } else if (key === 'dlNumber') {
      normalizedValue = normalizeDlNumber(value);
    } else if (key === 'vehicleNumber') {
      normalizedValue = normalizeVehicleNumber(value);
    } else if (key === 'vehicleType') {
      normalizedValue = normalizeVehicleType(value);
    }

    setForm((prev) => ({
      ...prev,
      [key]: normalizedValue,
    }));

    setFieldErrors((prev) => {
      if (!prev[key]) {
        return prev;
      }
      const next = {...prev};
      delete next[key];
      return next;
    });
  };

  const handleDobChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDobPicker(false);
    }

    if (!selectedDate) {
      return;
    }

    if (!activeDateField) {
      return;
    }

    updateField(activeDateField, formatDobDisplay(selectedDate));
    setFieldErrors((prev) => {
      if (!prev[activeDateField]) {
        return prev;
      }
      const next = {...prev};
      delete next[activeDateField];
      return next;
    });
  };

  const openDatePicker = (field: 'dateOfBirth' | 'dlExpiryDate') => {
    setActiveDateField(field);
    setShowDobPicker(true);
  };

  const currentPickerDate =
    (activeDateField ? parseDobDisplay(form[activeDateField]) : null) ||
    (activeDateField === 'dlExpiryDate' ? new Date() : new Date(2000, 0, 1));

  const validateProfileFields = (): Partial<Record<FieldKey, string>> => {
    const nextErrors: Partial<Record<FieldKey, string>> = {};

    profileFieldKeys.forEach((key) => {
      if (!form[key].trim()) {
        nextErrors[key] = 'This field is required / यह फ़ील्ड जरूरी है';
      }
    });

    if (!nextErrors.dateOfBirth) {
      if (!isValidDobFormat(form.dateOfBirth.trim())) {
        nextErrors.dateOfBirth = 'Use DD-MM-YYYY format.';
      } else {
        const dobDate = parseDobDisplay(form.dateOfBirth.trim());
        const minAdultDate = new Date();
        minAdultDate.setFullYear(minAdultDate.getFullYear() - 18);
        if (!dobDate || dobDate.getTime() > minAdultDate.getTime()) {
          nextErrors.dateOfBirth = 'Rider must be at least 18 years old.';
        }
      }
    }

    if (!nextErrors.phoneNumber && !/^\d{10}$/.test(form.phoneNumber.trim())) {
      nextErrors.phoneNumber = 'Phone must be exactly 10 digits / फोन 10 अंकों का होना चाहिए';
    }

    if (!nextErrors.aadhaarNumber && !/^\d{12}$/.test(form.aadhaarNumber.trim())) {
      nextErrors.aadhaarNumber = 'Aadhaar must be exactly 12 digits / आधार 12 अंकों का होना चाहिए';
    }

    if (!nextErrors.dlNumber && !/^[A-Z0-9/-]{6,20}$/.test(form.dlNumber.trim())) {
      nextErrors.dlNumber = 'DL Number must be 6-20 valid chars.';
    }

    if (!nextErrors.dlExpiryDate) {
      if (!isValidDobFormat(form.dlExpiryDate.trim())) {
        nextErrors.dlExpiryDate = 'Use DD-MM-YYYY format.';
      } else {
        const dlExpiryDate = parseDobDisplay(form.dlExpiryDate.trim());
        if (!dlExpiryDate || dlExpiryDate.getTime() < new Date(new Date().setHours(0, 0, 0, 0)).getTime()) {
          nextErrors.dlExpiryDate = 'DL expiry must be today or future.';
        }
      }
    }

    if (!nextErrors.vehicleNumber && !/^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/.test(form.vehicleNumber.trim())) {
      nextErrors.vehicleNumber = 'Format example: HR12AB1234';
    }

    if (!nextErrors.vehicleType && !/^[a-zA-Z\s-]{2,25}$/.test(form.vehicleType.trim())) {
      nextErrors.vehicleType = '2-25 letters only.';
    }

    const urlFields: FieldKey[] = [
      'aadhaarFrontImage',
      'aadhaarBackImage',
      'liveSelfieImage',
      'dlFrontImage',
      'rcFrontImage',
      'insuranceImage',
    ];

    urlFields.forEach((field) => {
      if (!nextErrors[field] && !isValidHttpUrl(form[field].trim())) {
        nextErrors[field] = 'Enter valid http/https URL';
      }
    });

    return nextErrors;
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
      setFieldErrors((prev) => {
        if (!prev[field]) {
          return prev;
        }
        const next = {...prev};
        delete next[field];
        return next;
      });
      let ocrNotice = '';
      if (field === 'aadhaarFrontImage' || field === 'aadhaarBackImage') {
        const ocr = await riderService.ocrProfilePrefill('aadhaarNumber', uploadedUrl);
        if (ocr.detectedValue && /^\d{12}$/.test(ocr.detectedValue) && !form.aadhaarNumber.trim()) {
          setForm((prev) => ({...prev, aadhaarNumber: ocr.detectedValue}));
          ocrNotice = ' Aadhaar auto-detected by OCR.';
        }
      }

      if (field === 'dlFrontImage') {
        const ocr = await riderService.ocrProfilePrefill('dlNumber', uploadedUrl);
        if (ocr.detectedValue && !form.dlNumber.trim()) {
          setForm((prev) => ({...prev, dlNumber: ocr.detectedValue}));
          ocrNotice = ' DL number auto-detected by OCR.';
        }
      }

      setSuccess(`${field} uploaded successfully.${ocrNotice}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setUploadingField(null);
    }
  };

  const handleNextStep = () => {
    if (activeStep >= KYC_STEP_TITLES.length - 1) {
      return;
    }

    const allErrors = validateProfileFields();
    const sectionKeys = formSections[Math.min(activeStep, formSections.length - 1)].fields.map((field) => field.key);
    const stepErrors = Object.entries(allErrors).reduce((acc, [key, value]) => {
      if (sectionKeys.includes(key as FieldKey)) {
        acc[key as FieldKey] = value as string;
      }
      return acc;
    }, {} as Partial<Record<FieldKey, string>>);

    if (Object.keys(stepErrors).length > 0) {
      setFieldErrors((prev) => ({...prev, ...stepErrors}));
      setError('Please fix highlighted fields before next step.');
      return;
    }

    setError(null);
    setActiveStep((prev) => Math.min(prev + 1, KYC_STEP_TITLES.length - 1));
  };

  const handleSubmit = async () => {
    const nextFieldErrors = validateProfileFields();
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError('Please fix highlighted fields.');
      setSuccess(null);
      return;
    }

    setFieldErrors({});

    try {
      setRequestingOtp(true);
      setError(null);
      setSuccess(null);

      const otpResponse = await riderService.requestProfileOtp();
      await AsyncStorage.removeItem(KYC_PENDING_OTP_KEY);
      setHasQueuedDraft(false);
      await AsyncStorage.removeItem(KYC_DRAFT_KEY);

      navigation.navigate('RiderProfileOtp', {
        profileDraft: {
          ...form,
          otpCode: '',
        },
        otpMessage: otpResponse.message,
      });
    } catch (err) {
      const message = extractErrorMessage(err);
      if (/unable to reach|network/i.test(message)) {
        await AsyncStorage.setItem(
          KYC_PENDING_OTP_KEY,
          JSON.stringify({profileDraft: form, queuedAt: new Date().toISOString()})
        );
        setError('Network issue. Draft queued for retry / नेटवर्क समस्या: ड्राफ्ट सेव हो गया.');
      } else {
        setError(message);
      }
      setSuccess(null);
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Kya aap logout karna chahte hain?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout().catch(() => {
            setError('Unable to logout. Please try again.');
          });
        },
      },
    ]);
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
            <Text style={styles.subtitle}>Complete all mandatory KYC details, then verify on OTP screen.</Text>
            <Text style={styles.stepText}>{`Step ${activeStep + 1} of ${KYC_STEP_TITLES.length}: ${KYC_STEP_TITLES[activeStep]}`}</Text>
            <View style={styles.completionRow}>
              <Text style={styles.completionLabel}>Profile Completion</Text>
              <Text style={styles.completionValue}>{completion}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {width: `${completion}%`}]} />
            </View>
          </View>

          {activeStep < 3 ? (
            <View key={formSections[activeStep].title} style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{formSections[activeStep].title}</Text>
              <Text style={styles.sectionDescription}>{formSections[activeStep].description}</Text>
              {formSections[activeStep].fields.map((field) => (
                <View key={field.key} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{field.label}</Text>
                  {field.key === 'dateOfBirth' ? (
                    <Pressable
                      accessibilityLabel="Select Date of Birth"
                      onPress={() => openDatePicker('dateOfBirth')}
                      style={({pressed}) => [
                        styles.input,
                        styles.datePickerInput,
                        fieldErrors[field.key] ? styles.inputErrorBorder : null,
                        pressed && styles.uploadActionPressed,
                      ]}>
                      <Text style={form.dateOfBirth ? styles.datePickerValue : styles.datePickerPlaceholder}>
                        {form.dateOfBirth || field.placeholder}
                      </Text>
                    </Pressable>
                  ) : field.key === 'dlExpiryDate' ? (
                    <Pressable
                      accessibilityLabel="Select DL Expiry Date"
                      onPress={() => openDatePicker('dlExpiryDate')}
                      style={({pressed}) => [
                        styles.input,
                        styles.datePickerInput,
                        fieldErrors[field.key] ? styles.inputErrorBorder : null,
                        pressed && styles.uploadActionPressed,
                      ]}>
                      <Text style={form.dlExpiryDate ? styles.datePickerValue : styles.datePickerPlaceholder}>
                        {form.dlExpiryDate || field.placeholder}
                      </Text>
                    </Pressable>
                  ) : uploadFieldSet.has(field.key) ? (
                    <View style={[styles.uploadBlock, fieldErrors[field.key] ? styles.inputErrorBorder : null]}>
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
                          accessibilityLabel={`Upload ${field.label} from camera`}
                          style={({pressed}) => [styles.uploadActionButton, pressed && styles.uploadActionPressed]}
                          onPress={() => pickAndUploadDocument(field.key as RiderDocumentField, 'camera')}>
                          <Text style={styles.uploadActionText}>Camera</Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel={`Upload ${field.label} from gallery`}
                          style={({pressed}) => [styles.uploadActionButton, pressed && styles.uploadActionPressed]}
                          onPress={() => pickAndUploadDocument(field.key as RiderDocumentField, 'gallery')}>
                          <Text style={styles.uploadActionText}>Gallery</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <TextInput
                      accessibilityLabel={field.label}
                      value={form[field.key]}
                      onChangeText={(value) => updateField(field.key, value)}
                      placeholder={field.placeholder}
                      keyboardType={field.keyboardType ?? 'default'}
                      autoCapitalize={field.autoCapitalize ?? 'none'}
                      maxLength={field.maxLength}
                      placeholderTextColor={palette.textSecondary}
                      style={[styles.input, fieldErrors[field.key] ? styles.inputErrorBorder : null]}
                    />
                  )}

                  {fieldErrors[field.key] ? <Text style={styles.fieldErrorText}>{fieldErrors[field.key]}</Text> : null}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Review & Confirm</Text>
              <Text style={styles.sectionDescription}>Please review all details before OTP verification.</Text>
              {profileFieldKeys.map((key) => (
                <View key={key} style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>{reviewLabelByKey[key]}</Text>
                  <Text style={styles.reviewValue} numberOfLines={1}>
                    {form[key] || '--'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>{success}</Text> : null}

          <View style={styles.actionRow}>
            {activeStep > 0 ? (
              <AppButton title="Previous" onPress={() => setActiveStep((prev) => Math.max(0, prev - 1))} variant="secondary" />
            ) : null}
            {activeStep < KYC_STEP_TITLES.length - 1 ? (
              <AppButton title="Next" onPress={handleNextStep} disabled={loading} />
            ) : (
              <AppButton
                title={loading ? 'Loading...' : requestingOtp ? 'Requesting OTP...' : 'Submit Profile'}
                onPress={handleSubmit}
                loading={requestingOtp}
                disabled={loading || requestingOtp}
              />
            )}
            <AppButton title="Logout" onPress={handleLogout} variant="danger" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showDobPicker ? (
        <DateTimePicker
          value={currentPickerDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={activeDateField === 'dateOfBirth' ? new Date() : undefined}
          minimumDate={activeDateField === 'dlExpiryDate' ? new Date(new Date().setHours(0, 0, 0, 0)) : undefined}
          onChange={handleDobChange}
        />
      ) : null}

      {hasQueuedDraft ? (
        <View style={styles.retryQueuedBanner}>
          <Text style={styles.retryQueuedText}>Offline queued draft available</Text>
          <AppButton title="Restore Queued Draft" onPress={retryQueuedDraft} variant="secondary" />
        </View>
      ) : null}

      <FunctionBar active="profile" />
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
  stepText: {
    marginTop: 8,
    color: palette.primary,
    fontSize: 12,
    fontWeight: '700',
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
  inputErrorBorder: {
    borderColor: palette.danger,
  },
  fieldErrorText: {
    color: palette.danger,
    fontSize: 11,
    fontWeight: '600',
  },
  reviewRow: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    backgroundColor: palette.background,
  },
  reviewLabel: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  reviewValue: {
    color: palette.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  retryQueuedBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 72,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  retryQueuedText: {
    color: palette.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  datePickerInput: {
    justifyContent: 'center',
  },
  datePickerValue: {
    color: palette.textPrimary,
    fontSize: 14,
  },
  datePickerPlaceholder: {
    color: palette.textSecondary,
    fontSize: 14,
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
