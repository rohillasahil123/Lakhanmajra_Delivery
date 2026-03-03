import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {FunctionBar} from '../components/FunctionBar';
import {RootStackParamList} from '../navigation/types';
import {riderService} from '../services/riderService';
import {EarningsSummary} from '../types/rider';
import {extractErrorMessage} from '../utils/errors';
import {palette} from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Earnings'>;

export const EarningsScreen: React.FC<Props> = () => {
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
      <View style={styles.brandRow}>
        <Text style={styles.brandOrange}>Gramin</Text>
        <Text style={styles.brandGreen}> Delivery Rider</Text>
      </View>
      <Text style={styles.title}>Rider Earnings</Text>
      <Text style={styles.subtitle}>Track payouts and pending settlements in one place.</Text>
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

      <FunctionBar active="earnings" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.textPrimary,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: -2,
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
    marginTop: -6,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 16,
    borderColor: palette.border,
    borderWidth: 1,
    padding: 16,
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
