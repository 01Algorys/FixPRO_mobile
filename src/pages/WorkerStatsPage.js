import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, StatusBar, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import apiService from '../services/api';
import { useScreenChrome } from '../context/ChromeContext';
import { titleCase } from '../utils/categoryMeta';
import PressableScale from '../components/ui/PressableScale';
import FadeIn from '../components/ui/FadeIn';
import { SectionHead } from '../components/profile/ProfileParts';
import {
  BLUE, NAVY, PRIMARY, INK, MUTED, PAGE, STATUS, statusOf, FilterChips, EmptyList,
} from '../components/reservations/ReservationParts';
import { t } from '../i18n';
import { formatDate, formatRating, formatPrice, directional } from '../i18n/format';

const CHART_HEIGHT = 130;
const CHART_MONTHS = 6;

const PERIODS = [
  { key: 'month', label: t('stats.thisMonth') },
  { key: 'quarter', label: t('stats.threeMonths') },
  { key: 'all', label: t('stats.all') },
];

const BREAKDOWN = [
  { label: t('status.completedPlural'), look: 'COMPLETED', statuses: ['COMPLETED'] },
  { label: t('status.inProgress'), look: 'IN_PROGRESS', statuses: ['ACCEPTED', 'IN_PROGRESS'] },
  { label: t('status.pending'), look: 'PENDING', statuses: ['PENDING'] },
  { label: t('status.rejectedPlural'), look: 'REJECTED', statuses: ['REJECTED'] },
  { label: t('status.expiredPlural'), look: 'EXPIRED', statuses: ['EXPIRED'] },
  { label: t('status.cancelledPlural'), look: 'CANCELLED', statuses: ['CANCELLED'] },
];

// The agreed price, else the technician's starting price at booking (never the admin's)
const priceOf = (r) => r.actualPrice ?? r.estimatedPrice ?? 0;
const isDone = (r) => statusOf(r) === 'COMPLETED';
const sumRevenue = (list) => list.filter(isDone).reduce((total, r) => total + (Number(priceOf(r)) || 0), 0);

const periodStart = (key) => {
  const now = new Date();
  if (key === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (key === 'quarter') return new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return null;
};

const Tile = ({ icon, color = PRIMARY, label, value }) => (
  <View style={[styles.card, styles.tile]}>
    <Ionicons name={icon} size={20} color={color} />
    <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    <Text style={styles.tileLabel} numberOfLines={1}>{label}</Text>
  </View>
);

const WorkerStatsPage = ({ navigation }) => {
  useScreenChrome(BLUE, PAGE);
  const [reservations, setReservations] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(CHART_MONTHS - 1);

  const load = useCallback(async () => {
    try {
      const profileResponse = await apiService.getWorkerProfile();
      const data = profileResponse?.data || profileResponse;
      const [reservationsResponse, reviewsResponse] = await Promise.all([
        apiService.getWorkerReservations(data.userId, { limit: 100 }),
        apiService.getWorkerReviewsPublic(data.id).catch(() => null),
      ]);
      const list = reservationsResponse.data?.reservations || reservationsResponse.reservations || [];
      setProfile(data);
      setReservations(Array.isArray(list) ? list : []);
      setReviews(reviewsResponse?.data?.reviews || []);
      setFailed(false);
    } catch (error) {
      console.error('Failed to load statistics:', error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const inPeriod = useMemo(() => {
    const start = periodStart(period);
    return start ? reservations.filter((r) => new Date(r.date) >= start) : reservations;
  }, [reservations, period]);

  const countOf = (statuses) => inPeriod.filter((r) => statuses.includes(statusOf(r))).length;
  const doneCount = countOf(['COMPLETED']);
  const revenue = sumRevenue(inPeriod);
  const accepted = countOf(['ACCEPTED', 'IN_PROGRESS', 'COMPLETED']);
  const answered = accepted + countOf(['REJECTED', 'EXPIRED']);
  const acceptance = answered ? `${Math.round((accepted / answered) * 100)}%` : '—';

  // Revenue of the last months, oldest first; months without a job stay at 0
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: CHART_MONTHS }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (CHART_MONTHS - 1 - i), 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const jobs = reservations.filter((r) => {
        const date = new Date(r.date);
        return date >= start && date < end;
      });
      return {
        key: start.toISOString(),
        short: formatDate(start, { month: 'short' }).replace('.', ''),
        long: titleCase(formatDate(start, { month: 'long', year: 'numeric' })),
        revenue: sumRevenue(jobs),
        jobs: jobs.filter(isDone).length,
      };
    });
  }, [reservations]);
  const highest = Math.max(...months.map((m) => m.revenue), 1);
  const chosen = months[selectedMonth];

  const ratingCounts = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[BLUE, NAVY]} style={styles.header}>
        <PressableScale style={styles.backBtn} scaleTo={0.9} onPress={() => navigation.goBack()}>
          <Ionicons name={directional('arrow-back')} size={23} color="#fff" />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('stats.title')}</Text>
          <Text style={styles.subtitle}>{t('stats.subtitle')}</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        >
          {failed ? (
            <EmptyList icon="cloud-offline-outline" title={t('common.connectionFailed')} text={t('common.pullToRetry')} />
          ) : (
            <>
              <View style={styles.periods}>
                <FilterChips
                  filters={PERIODS}
                  selected={period}
                  onSelect={setPeriod}
                  countFor={(p) => {
                    const start = periodStart(p.key);
                    return start ? reservations.filter((r) => new Date(r.date) >= start).length : reservations.length;
                  }}
                />
              </View>

              <FadeIn style={styles.tiles}>
                <Tile icon="cash-outline" color="#16a34a" label={t('stats.revenue')} value={formatPrice(revenue)} />
                <Tile icon="checkmark-done-outline" label={t('status.completedPlural')} value={doneCount} />
                <Tile icon="thumbs-up-outline" label={t('stats.acceptance')} value={acceptance} />
                <Tile icon="pricetag-outline" color="#f59e0b" label={t('stats.averagePrice')} value={doneCount ? formatPrice(Math.round(revenue / doneCount)) : '—'} />
              </FadeIn>

              <FadeIn delay={60}>
                <SectionHead icon="bar-chart-outline" title={t('stats.revenueByMonth')} />
                <View style={[styles.card, styles.pad]}>
                  <Text style={styles.chartValue}>{formatPrice(chosen.revenue)}</Text>
                  <Text style={styles.chartCaption}>
                    {chosen.long} · {t('common.interventions', { count: chosen.jobs })}
                  </Text>
                  <View style={styles.chart}>
                    {months.map((month, i) => (
                      <Pressable key={month.key} style={styles.column} onPress={() => setSelectedMonth(i)}>
                        <View
                          style={[
                            styles.bar,
                            { height: Math.max((month.revenue / highest) * CHART_HEIGHT, 3) },
                            i === selectedMonth && styles.barActive,
                          ]}
                        />
                        <Text style={[styles.month, i === selectedMonth && styles.monthActive]}>{month.short}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </FadeIn>

              <FadeIn delay={120}>
                <SectionHead icon="pie-chart-outline" title={t('stats.myRequests')} />
                <View style={styles.card}>
                  {BREAKDOWN.map((row, i) => {
                    const look = STATUS[row.look];
                    return (
                      <View key={row.label} style={[styles.row, i === BREAKDOWN.length - 1 && { borderBottomWidth: 0 }]}>
                        <Ionicons name={look.icon} size={19} color={look.color} />
                        <Text style={styles.rowLabel}>{row.label}</Text>
                        <Text style={styles.rowValue}>{countOf(row.statuses)}</Text>
                      </View>
                    );
                  })}
                </View>
              </FadeIn>

              <FadeIn delay={180}>
                <SectionHead icon="star-outline" title={t('stats.myReviews')} />
                <View style={[styles.card, styles.pad]}>
                  <View style={styles.ratingTop}>
                    <Text style={styles.ratingValue}>{formatRating(profile?.averageRating)}</Text>
                    <Text style={styles.ratingCaption}>
                      {t('stats.ratingOver', { count: profile?.totalReviews || 0 })}
                    </Text>
                  </View>
                  {reviews.length > 0 && ratingCounts.map(({ stars, count }) => (
                    <View key={stars} style={styles.ratingRow}>
                      <Text style={styles.ratingStars}>{stars}</Text>
                      <Ionicons name="star" size={13} color="#f5b400" />
                      <View style={styles.track}>
                        <View style={[styles.fill, { width: `${(count / reviews.length) * 100}%` }]} />
                      </View>
                      <Text style={styles.ratingCount}>{count}</Text>
                    </View>
                  ))}
                </View>
              </FadeIn>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 18,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 21, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  subtitle: { fontSize: 13.5, color: 'rgba(255,255,255,0.85)', marginTop: 1 },

  content: { paddingHorizontal: 16, paddingBottom: 28, flexGrow: 1 },
  periods: { marginHorizontal: -16 },
  card: {
    backgroundColor: '#fff', borderRadius: 18,
    shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 1,
  },
  pad: { padding: 16 },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48.5%', padding: 14, gap: 3 },
  tileValue: { fontSize: 22, fontWeight: '800', color: INK, letterSpacing: -0.4, marginTop: 4 },
  tileLabel: { fontSize: 13, color: MUTED, fontWeight: '500' },

  chartValue: { fontSize: 24, fontWeight: '800', color: INK, letterSpacing: -0.4 },
  chartCaption: { fontSize: 13, color: MUTED, marginTop: 1 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT + 30, marginTop: 14 },
  column: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 22, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: '#bcd0f7' },
  barActive: { backgroundColor: PRIMARY },
  month: { fontSize: 12, color: MUTED, marginTop: 7, textTransform: 'capitalize' },
  monthActive: { color: INK, fontWeight: '700' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#eef2f8',
  },
  rowLabel: { flex: 1, fontSize: 14.5, fontWeight: '600', color: INK },
  rowValue: { fontSize: 15.5, fontWeight: '800', color: INK },

  ratingTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratingValue: { fontSize: 30, fontWeight: '800', color: INK, letterSpacing: -0.5 },
  ratingCaption: { flex: 1, fontSize: 13.5, color: MUTED },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 },
  ratingStars: { width: 12, fontSize: 13, fontWeight: '700', color: INK, textAlign: 'center' },
  track: { flex: 1, height: 7, borderRadius: 4, backgroundColor: '#eef2f8', overflow: 'hidden', marginHorizontal: 4 },
  fill: { height: '100%', borderRadius: 4, backgroundColor: PRIMARY },
  ratingCount: { width: 18, fontSize: 13, color: MUTED, textAlign: 'right' },
});

export default WorkerStatsPage;
