import React, {useEffect, useState} from 'react';
import {ActivityIndicator, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AppButton} from '../components/AppButton';
import {RootStackParamList} from '../navigation/types';
import {riderService} from '../services/riderService';
import {EarningsSummary} from '../types/rider';
import {extractErrorMessage} from '../utils/errors';
import {palette} from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Earnings'>;

export const EarningsScreen: React.FC<Props> = ({navigation}) => {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const summary = await riderService.getEarnings();
        setEarnings(summary);
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={palette.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Earnings</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.label}>Today</Text>
        <Text style={styles.value}>
          {earnings?.currency} {earnings?.today ?? 0}
        </Text>

        <Text style={styles.label}>Weekly</Text>
        <Text style={styles.value}>
          {earnings?.currency} {earnings?.weekly ?? 0}
        </Text>

        <Text style={styles.label}>Pending Payouts</Text>
        <Text style={styles.value}>
          {earnings?.currency} {earnings?.pendingPayouts ?? 0}
        </Text>
      </View>

      <AppButton title="Back to Dashboard" onPress={() => navigation.goBack()} variant="secondary" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    padding: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 12,
    borderColor: palette.border,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  label: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  value: {
    color: palette.textPrimary,
    fontWeight: '700',
    fontSize: 18,
  },
  error: {
    color: palette.danger,
  },
});
