import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Ionicons} from '@expo/vector-icons';
import {RootStackParamList} from '../navigation/types';
import {riderService} from '../services/riderService';
import {EarningsSummary} from '../types/rider';
import {extractErrorMessage} from '../utils/errors';
import {createResponsiveStyles, iconSize} from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Earnings'>;

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const formatAmount = (amount: number): string => {
  return amount.toLocaleString('en-IN');
};

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
        <ActivityIndicator size="large" color="#1b5a3d" />
      </SafeAreaView>
    );
  }

  const weekly = earnings?.weekly ?? 0;
  const today = earnings?.today ?? 0;
  const pending = earnings?.pendingPayouts ?? 0;
  const totalDeliveries = Math.max(1, Math.round(weekly / 80));
  const coveredDistance = Math.max(1, Math.round(totalDeliveries * 4.4));
  const avgRating = 4.9;
  const activeHours = Math.max(1, Math.round(weekly / 290));

  const breakdown = [0.15, 0.14, 0.16, 0.18, 0.14, 0.23, 0]
    .map((ratio, index) => ({
      day: weekdayLabels[index],
      amount: Math.round(weekly * ratio),
      highlight: index === 3,
    }));

  const maxBar = Math.max(...breakdown.map((item) => item.amount), 1);

  const payouts = [
    {title: 'Weekly Payout', date: 'Thu 27 Feb', amount: weekly || 3480},
    {title: 'Weekly Payout', date: 'Thu 20 Feb', amount: Math.max(0, weekly - 520) || 2960},
    {title: 'Weekly Payout', date: 'Thu 13 Feb', amount: Math.max(0, weekly - 360) || 3120},
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Earnings</Text>
        </View>
        <Text style={styles.weekLabel}>This Week</Text>

        <Text style={styles.mainAmount}>Rs. {formatAmount(weekly)}</Text>
        <Text style={styles.mainSub}>Total This Week   +18% vs last week</Text>

        <View style={styles.rangeTabs}>
          <Pressable style={styles.rangeTab}>
            <Text style={styles.rangeTabText}>Today</Text>
          </Pressable>
          <Pressable style={[styles.rangeTab, styles.rangeTabActive]}>
            <Text style={styles.rangeTabActiveText}>This Week</Text>
          </Pressable>
          <Pressable style={styles.rangeTab}>
            <Text style={styles.rangeTabText}>This Month</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.curveBand} />

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Text style={styles.metricIcon}>▫</Text>
            </View>
            <View>
              <Text style={styles.metricValue}>{totalDeliveries}</Text>
              <Text style={styles.metricLabel}>Total Deliveries</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Text style={styles.metricIcon}>▫</Text>
            </View>
            <View>
              <Text style={styles.metricValue}>{avgRating.toFixed(1)}▫</Text>
              <Text style={styles.metricLabel}>Avg. Rating</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Text style={styles.metricIcon}>▫</Text>
            </View>
            <View>
              <Text style={styles.metricValue}>{coveredDistance}km</Text>
              <Text style={styles.metricLabel}>Covered Distance</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Text style={styles.metricIcon}>▫</Text>
            </View>
            <View>
              <Text style={styles.metricValue}>{activeHours}</Text>
              <Text style={styles.metricLabel}>Active Hours</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Daily Breakdown</Text>
        <View style={styles.chartWrap}>
          <View style={styles.chartBars}>
            {breakdown.map((entry) => (
              <View key={entry.day} style={styles.barItem}>
                {entry.amount > 0 ? <Text style={styles.barAmount}>Rs.{entry.amount}</Text> : <View style={styles.amountSpacer} />}
                <View
                  style={[
                    styles.bar,
                    entry.highlight ? styles.barHighlight : styles.barDefault,
                    {height: 32 + (entry.amount / maxBar) * 52},
                  ]}
                />
                <Text style={styles.barLabel}>{entry.day}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chartLine} />
        </View>

        <Text style={styles.sectionTitle}>Recent Payouts</Text>
        <View style={styles.payoutList}>
          {payouts.map((payout) => (
            <View style={styles.payoutCard} key={`${payout.date}-${payout.amount}`}>
              <View style={styles.payoutIconWrap}>
                <Text style={styles.metricIcon}>▫</Text>
              </View>

              <View style={styles.payoutMain}>
                <Text style={styles.payoutTitle}>{payout.title}</Text>
                <Text style={styles.payoutDate}>{payout.date}</Text>
              </View>

              <View style={styles.payoutRight}>
                <Text style={styles.payoutAmount}>+ Rs.{formatAmount(payout.amount)}</Text>
                <View style={styles.creditedPill}>
                  <Text style={styles.creditedText}>Credited</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.contentSpacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={styles.tabItem} onPress={() => navigation.navigate('Dashboard')}>
          <Ionicons name="home-outline" size={iconSize(20)} color="#7a7a7a" />
          <Text style={styles.tabLabel}>Home</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => navigation.navigate('DeliveredOrders')}>
          <Ionicons name="receipt-outline" size={iconSize(20)} color="#7a7a7a" />
          <Text style={styles.tabLabel}>Orders</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => navigation.navigate('Dashboard')}>
          <Ionicons name="map-outline" size={iconSize(20)} color="#7a7a7a" />
          <Text style={styles.tabLabel}>Map</Text>
        </Pressable>

        <View style={styles.tabItem}>
          <Ionicons name="wallet-outline" size={iconSize(20)} color="#1f5a3e" />
          <Text style={[styles.tabLabel, styles.tabLabelActive]}>Earnings</Text>
          <View style={styles.activeDot} />
        </View>

        <Pressable style={styles.tabItem} onPress={() => navigation.navigate('RiderProfile')}>
          <Ionicons name="person-outline" size={iconSize(20)} color="#7a7a7a" />
          <Text style={styles.tabLabel}>Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = createResponsiveStyles({
  container: {
    flex: 1,
    backgroundColor: '#ece9e4',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1b5a3d',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  title: {
    fontSize: 39,
    fontWeight: '700',
    color: '#e8f6ee',
  },
  weekLabel: {
    position: 'absolute',
    right: 20,
    top: 20,
    color: '#b7d2c3',
    fontSize: 14,
  },
  mainAmount: {
    marginTop: 10,
    textAlign: 'center',
    color: '#e8f6ee',
    fontSize: 58,
    fontWeight: '700',
  },
  mainSub: {
    marginTop: -2,
    textAlign: 'center',
    color: '#b7d2c3',
    fontSize: 22,
  },
  rangeTabs: {
    marginTop: 12,
    backgroundColor: '#2f7b57',
    borderRadius: 999,
    padding: 4,
    flexDirection: 'row',
  },
  rangeTab: {
    flex: 1,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeTabActive: {
    backgroundColor: '#f1f1f1',
  },
  rangeTabText: {
    color: '#e6f0ea',
    fontSize: 13,
  },
  rangeTabActiveText: {
    color: '#1f4f38',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  curveBand: {
    height: 28,
    borderTopLeftRadius: 220,
    borderTopRightRadius: 220,
    backgroundColor: '#ece9e4',
    marginTop: -1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: '#f1f1f1',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c8c6c2',
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#c5e8ce',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  metricIcon: {
    color: '#1f5a3e',
    fontSize: 18,
    fontWeight: '700',
  },
  metricValue: {
    color: '#1f1f1f',
    fontSize: 32,
    fontWeight: '700',
  },
  metricLabel: {
    color: '#6a6a6a',
    fontSize: 13,
    marginTop: -2,
  },
  sectionTitle: {
    color: '#212121',
    fontSize: 33,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  chartWrap: {
    backgroundColor: '#ece9e4',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 120,
  },
  barItem: {
    width: '13.4%',
    alignItems: 'center',
  },
  barAmount: {
    color: '#4d4d4d',
    fontSize: 10,
    marginBottom: 2,
  },
  amountSpacer: {
    height: 14,
  },
  bar: {
    width: '80%',
    borderRadius: 10,
  },
  barDefault: {
    backgroundColor: '#1b5a3d',
  },
  barHighlight: {
    backgroundColor: '#f0c814',
  },
  barLabel: {
    marginTop: 4,
    color: '#767676',
    fontSize: 10,
  },
  chartLine: {
    height: 1,
    backgroundColor: '#d7d4cf',
    marginTop: 2,
  },
  payoutList: {
    gap: 10,
  },
  payoutCard: {
    backgroundColor: '#f1f1f1',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c8c6c2',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  payoutIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#c5e8ce',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  payoutMain: {
    flex: 1,
  },
  payoutTitle: {
    color: '#222222',
    fontWeight: '700',
    fontSize: 17,
  },
  payoutDate: {
    marginTop: 2,
    color: '#6f6f6f',
    fontSize: 13,
  },
  payoutRight: {
    alignItems: 'flex-end',
  },
  payoutAmount: {
    color: '#1f4f38',
    fontSize: 16,
    fontWeight: '700',
  },
  creditedPill: {
    marginTop: 4,
    backgroundColor: '#d8eadf',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  creditedText: {
    color: '#4f8d6a',
    fontSize: 11,
  },
  contentSpacer: {
    height: 76,
  },
  error: {
    color: '#b42318',
    marginBottom: 8,
    fontSize: 13,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#dcdcdc',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 2,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    color: '#777777',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#1f5a3e',
    fontWeight: '700',
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#1f5a3e',
    marginTop: 3,
  },
});
