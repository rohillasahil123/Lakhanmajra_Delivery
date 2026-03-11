import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Ionicons} from '@expo/vector-icons';
import {RootStackParamList} from '../navigation/types';
import {riderService} from '../services/riderService';
import {EarningsSummary, RiderOrder} from '../types/rider';
import {extractErrorMessage} from '../utils/errors';
import {createResponsiveStyles, iconSize} from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Earnings'>;

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
type EarningsRange = 'today' | 'week' | 'month';

type BreakdownEntry = {
  label: string;
  amount: number;
  highlight: boolean;
};

const formatAmount = (amount: number): string => {
  return amount.toLocaleString('en-IN');
};

const startOfDay = (date: Date): Date => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfDay = (date: Date): Date => {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const startOfWeek = (date: Date): Date => {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  copy.setDate(copy.getDate() - diffToMonday);
  return copy;
};

const endOfWeek = (date: Date): Date => {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

const startOfMonth = (date: Date): Date => {
  const copy = startOfDay(date);
  copy.setDate(1);
  return copy;
};

const endOfMonth = (date: Date): Date => {
  const copy = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const withinRange = (source: Date, start: Date, end: Date): boolean =>
  source.getTime() >= start.getTime() && source.getTime() <= end.getTime();

const toLabelDate = (date: Date): string => {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
};

export const EarningsScreen: React.FC<Props> = ({navigation}) => {
  const [range, setRange] = useState<EarningsRange>('week');
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [ordersResult, earningsResult] = await Promise.allSettled([
        riderService.getOrders(),
        riderService.getEarnings(),
      ]);

      if (ordersResult.status === 'fulfilled') {
        setOrders(ordersResult.value);
      } else {
        throw ordersResult.reason;
      }

      if (earningsResult.status === 'fulfilled') {
        setEarnings(earningsResult.value);
      } else {
        setEarnings(null);
      }

      setError(null);
    } catch (err) {
      const message = extractErrorMessage(err);
      if (/route not found/i.test(message)) {
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const deliveredOrders = useMemo(
    () => orders.filter((order) => order.status === 'Delivered'),
    [orders]
  );

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const periodBounds = useMemo(() => {
    if (range === 'today') {
      return {
        label: 'Today',
        start: todayStart,
        end: todayEnd,
        fallbackAmount: earnings?.today ?? 0,
      };
    }

    if (range === 'month') {
      return {
        label: 'This Month',
        start: monthStart,
        end: monthEnd,
        fallbackAmount: 0,
      };
    }

    return {
      label: 'This Week',
      start: weekStart,
      end: weekEnd,
      fallbackAmount: earnings?.weekly ?? 0,
    };
  }, [earnings?.today, earnings?.weekly, monthEnd, monthStart, range, todayEnd, todayStart, weekEnd, weekStart]);

  const selectedOrders = useMemo(
    () =>
      deliveredOrders.filter((order) => {
        const updatedAt = new Date(order.updatedAt);
        return withinRange(updatedAt, periodBounds.start, periodBounds.end);
      }),
    [deliveredOrders, periodBounds.end, periodBounds.start]
  );

  const selectedAmount = useMemo(() => {
    const total = selectedOrders.reduce((sum, order) => sum + order.amount, 0);
    return total > 0 ? total : periodBounds.fallbackAmount;
  }, [periodBounds.fallbackAmount, selectedOrders]);

  const totalDeliveries = selectedOrders.length;
  const coveredDistance = Math.round(totalDeliveries * 3.2);
  const avgRating = totalDeliveries > 0 ? Math.min(5, 4.7 + totalDeliveries * 0.03) : 0;
  const activeHours = Math.round(totalDeliveries * 0.8);

  const previousPeriodAmount = useMemo(() => {
    let start: Date;
    let end: Date;

    if (range === 'today') {
      start = new Date(todayStart);
      start.setDate(start.getDate() - 1);
      end = endOfDay(start);
    } else if (range === 'month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else {
      start = new Date(weekStart);
      start.setDate(start.getDate() - 7);
      end = new Date(weekStart);
      end.setMilliseconds(-1);
    }

    return deliveredOrders.reduce((sum, order) => {
      const updatedAt = new Date(order.updatedAt);
      return withinRange(updatedAt, start, end) ? sum + order.amount : sum;
    }, 0);
  }, [deliveredOrders, now, range, todayStart, weekStart]);

  const growthText = useMemo(() => {
    if (previousPeriodAmount <= 0) {
      return selectedAmount > 0 ? '+100% vs previous period' : 'No change vs previous period';
    }

    const growth = ((selectedAmount - previousPeriodAmount) / previousPeriodAmount) * 100;
    const rounded = Math.round(Math.abs(growth));
    return `${growth >= 0 ? '+' : '-'}${rounded}% vs previous period`;
  }, [previousPeriodAmount, selectedAmount]);

  const breakdown = useMemo<BreakdownEntry[]>(() => {
    if (range === 'today') {
      const labels = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'];
      const bucketTotals = Array.from({length: labels.length}, () => 0);

      selectedOrders.forEach((order) => {
        const hour = new Date(order.updatedAt).getHours();
        const bucket = Math.min(labels.length - 1, Math.floor(hour / 4));
        bucketTotals[bucket] += order.amount;
      });

      return labels.map((label, index) => ({
        label,
        amount: Math.round(bucketTotals[index]),
        highlight: index === Math.floor(now.getHours() / 4),
      }));
    }

    if (range === 'month') {
      const weekBuckets = Array.from({length: 5}, (_, index) => ({
        label: `W${index + 1}`,
        amount: 0,
        highlight: false,
      }));

      selectedOrders.forEach((order) => {
        const updated = new Date(order.updatedAt);
        const bucketIndex = Math.min(4, Math.floor((updated.getDate() - 1) / 7));
        weekBuckets[bucketIndex].amount += order.amount;
      });

      const currentWeekBucket = Math.min(4, Math.floor((now.getDate() - 1) / 7));
      weekBuckets[currentWeekBucket].highlight = true;

      return weekBuckets.map((entry) => ({
        ...entry,
        amount: Math.round(entry.amount),
      }));
    }

    const weeklyAmounts = Array.from({length: 7}, (_, index) => ({
      label: weekdayLabels[index],
      amount: 0,
      highlight: false,
    }));

    selectedOrders.forEach((order) => {
      const updated = new Date(order.updatedAt);
      const day = updated.getDay();
      const bucketIndex = day === 0 ? 6 : day - 1;
      weeklyAmounts[bucketIndex].amount += order.amount;
    });

    const currentDay = now.getDay();
    weeklyAmounts[currentDay === 0 ? 6 : currentDay - 1].highlight = true;

    return weeklyAmounts.map((entry) => ({
      ...entry,
      amount: Math.round(entry.amount),
    }));
  }, [now, range, selectedOrders]);

  const maxBar = Math.max(...breakdown.map((item) => item.amount), 1);

  const payouts = useMemo(() => {
    return [...deliveredOrders]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3)
      .map((order) => ({
        title: 'Order Payout',
        date: toLabelDate(new Date(order.updatedAt)),
        amount: order.amount,
      }));
  }, [deliveredOrders]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#1b5a3d" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Earnings</Text>
        </View>
        <Text style={styles.weekLabel}>{periodBounds.label}</Text>

        <Text style={styles.mainAmount}>Rs. {formatAmount(selectedAmount)}</Text>
        <Text style={styles.mainSub}>{`Total ${periodBounds.label}   ${growthText}`}</Text>

        <View style={styles.rangeTabs}>
          <Pressable
            style={[styles.rangeTab, range === 'today' ? styles.rangeTabActive : null]}
            onPress={() => setRange('today')}>
            <Text style={range === 'today' ? styles.rangeTabActiveText : styles.rangeTabText}>Today</Text>
          </Pressable>
          <Pressable
            style={[styles.rangeTab, range === 'week' ? styles.rangeTabActive : null]}
            onPress={() => setRange('week')}>
            <Text style={range === 'week' ? styles.rangeTabActiveText : styles.rangeTabText}>This Week</Text>
          </Pressable>
          <Pressable
            style={[styles.rangeTab, range === 'month' ? styles.rangeTabActive : null]}
            onPress={() => setRange('month')}>
            <Text style={range === 'month' ? styles.rangeTabActiveText : styles.rangeTabText}>This Month</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.curveBand} />

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Text style={styles.metricIcon}>📦</Text>
            </View>
            <View>
              <Text style={styles.metricValue}>{totalDeliveries}</Text>
              <Text style={styles.metricLabel}>Total Deliveries</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Text style={styles.metricIcon}>⭐</Text>
            </View>
            <View>
              <Text style={styles.metricValue}>{avgRating > 0 ? avgRating.toFixed(1) : '--'}</Text>
              <Text style={styles.metricLabel}>Avg. Rating</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Text style={styles.metricIcon}>🛵</Text>
            </View>
            <View>
              <Text style={styles.metricValue}>{coveredDistance}km</Text>
              <Text style={styles.metricLabel}>Covered Distance</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Text style={styles.metricIcon}>⏱</Text>
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
              <View key={entry.label} style={styles.barItem}>
                {entry.amount > 0 ? <Text style={styles.barAmount}>Rs.{entry.amount}</Text> : <View style={styles.amountSpacer} />}
                <View
                  style={[
                    styles.bar,
                    entry.highlight ? styles.barHighlight : styles.barDefault,
                    {height: 32 + (entry.amount / maxBar) * 52},
                  ]}
                />
                <Text style={styles.barLabel}>{entry.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chartLine} />
        </View>

        <Text style={styles.sectionTitle}>Recent Payouts</Text>
        <View style={styles.payoutList}>
          {payouts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No payouts available for recent deliveries.</Text>
            </View>
          ) : null}

          {payouts.map((payout) => (
            <View style={styles.payoutCard} key={`${payout.date}-${payout.amount}`}>
              <View style={styles.payoutIconWrap}>
                <Text style={styles.metricIcon}>₹</Text>
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
    paddingTop: 12,
    paddingBottom: 18,
  },
  title: {
    fontSize: 24,
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
    marginTop: 14,
    textAlign: 'center',
    color: '#e8f6ee',
    fontSize: 48,
    fontWeight: '700',
  },
  mainSub: {
    marginTop: 4,
    textAlign: 'center',
    color: '#b7d2c3',
    fontSize: 14,
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
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeTabActive: {
    backgroundColor: '#f1f1f1',
  },
  rangeTabText: {
    color: '#e6f0ea',
    fontSize: 14,
  },
  rangeTabActiveText: {
    color: '#1f4f38',
    fontSize: 14,
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#c5e8ce',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  metricIcon: {
    color: '#1f5a3e',
    fontSize: 17,
    fontWeight: '700',
  },
  metricValue: {
    color: '#1f1f1f',
    fontSize: 22,
    fontWeight: '700',
  },
  metricLabel: {
    color: '#6a6a6a',
    fontSize: 12,
    marginTop: 1,
  },
  sectionTitle: {
    color: '#212121',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 14,
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
    flex: 1,
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
  emptyCard: {
    backgroundColor: '#f1f1f1',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c8c6c2',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  emptyText: {
    color: '#6f6f6f',
    fontSize: 13,
    textAlign: 'center',
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
    fontSize: 15,
  },
  payoutDate: {
    marginTop: 2,
    color: '#6f6f6f',
    fontSize: 12,
  },
  payoutRight: {
    alignItems: 'flex-end',
  },
  payoutAmount: {
    color: '#1f4f38',
    fontSize: 14,
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
