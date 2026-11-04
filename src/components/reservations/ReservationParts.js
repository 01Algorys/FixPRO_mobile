import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from '../ui/PressableScale';

// What the client and technician reservation pages share, so they keep looking alike
export const BLUE = '#1a56db';
export const NAVY = '#0b3fb3';
export const PRIMARY = '#1d5ff0';
export const INK = '#0f172a';
export const MUTED = '#64748b';
export const PAGE = '#f4f7fd';

export const STATUS = {
  PENDING: { label: 'En attente', color: '#b45309', bg: '#fef3c7', icon: 'time' },
  ACCEPTED: { label: 'Acceptée', color: PRIMARY, bg: '#e8f0ff', icon: 'checkmark-circle' },
  IN_PROGRESS: { label: 'En cours', color: '#7c3aed', bg: '#ede9fe', icon: 'construct' },
  COMPLETED: { label: 'Terminée', color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-done-circle' },
  CANCELLED: { label: 'Annulée', color: '#dc2626', bg: '#fee2e2', icon: 'close-circle' },
  REJECTED: { label: 'Refusée', color: '#dc2626', bg: '#fee2e2', icon: 'close-circle' },
  EXPIRED: { label: 'Expirée', color: '#475569', bg: '#eef1f6', icon: 'hourglass' },
};

export const TRACK_STEP = { PENDING: 0, ACCEPTED: 1, IN_PROGRESS: 2 };

export const statusOf = (reservation) => String(reservation.status || 'PENDING').toUpperCase();

// Where the booking stands, shown while it is in progress
export const Progress = ({ step, labels }) => (
  <View style={styles.track}>
    {labels.map((label, i) => (
      <View key={label} style={styles.trackStep}>
        <View style={styles.trackLineRow}>
          <View style={[styles.trackLine, i === 0 && styles.trackLineHidden, i <= step && styles.trackLineOn]} />
          <View style={[styles.trackDot, i <= step && styles.trackDotOn]}>
            {i <= step && <Ionicons name="checkmark" size={11} color="#fff" />}
          </View>
          <View style={[styles.trackLine, i === labels.length - 1 && styles.trackLineHidden, i < step && styles.trackLineOn]} />
        </View>
        <Text style={[styles.trackLabel, i === step && styles.trackLabelOn]} numberOfLines={1}>{label}</Text>
      </View>
    ))}
  </View>
);

export const Stars = ({ rating }) => (
  <View style={{ flexDirection: 'row', gap: 1 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Ionicons key={n} name={n <= rating ? 'star' : 'star-outline'} size={14} color="#f5b400" />
    ))}
  </View>
);

export const SkeletonCard = () => (
  <View style={styles.card}>
    <View style={styles.cardTop}>
      <View style={[styles.serviceIcon, styles.skeleton]} />
      <View style={{ flex: 1 }}>
        <View style={[styles.skeletonLine, { width: '65%' }]} />
        <View style={[styles.skeletonLine, { width: '40%', marginTop: 8 }]} />
      </View>
    </View>
  </View>
);

export const FilterChips = ({ filters, selected, onSelect, countFor }) => (
  <View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {filters.map((f) => {
        const active = f.key === selected;
        return (
          <PressableScale key={f.key} style={[styles.chip, active && styles.chipActive]} scaleTo={0.95} onPress={() => onSelect(f.key)}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            <View style={[styles.chipCount, active && styles.chipCountActive]}>
              <Text style={[styles.chipCountText, active && styles.chipTextActive]}>{countFor(f)}</Text>
            </View>
          </PressableScale>
        );
      })}
    </ScrollView>
  </View>
);

export const EmptyList = ({ icon, title, text }) => (
  <View style={styles.empty}>
    <View style={styles.emptyIcon}>
      <Ionicons name={icon} size={30} color={PRIMARY} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  title: { fontSize: 25, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7, height: 36, paddingLeft: 14, paddingRight: 8,
    borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 13.5, fontWeight: '600', color: '#334155' },
  chipTextActive: { color: '#fff' },
  chipCount: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: '#eef1f6', alignItems: 'center', justifyContent: 'center' },
  chipCountActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  chipCountText: { fontSize: 12, fontWeight: '700', color: '#475569' },

  list: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 12,
    shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  serviceIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  service: { fontSize: 16, fontWeight: '800', color: INK },
  when: { fontSize: 13.5, color: MUTED, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  track: { flexDirection: 'row', marginTop: 14 },
  trackStep: { flex: 1, alignItems: 'center' },
  trackLineRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  trackLine: { flex: 1, height: 3, backgroundColor: '#e2e8f0' },
  trackLineOn: { backgroundColor: PRIMARY },
  trackLineHidden: { backgroundColor: 'transparent' },
  trackDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  trackDotOn: { backgroundColor: PRIMARY },
  trackLabel: { fontSize: 11.5, color: MUTED, marginTop: 5 },
  trackLabelOn: { color: PRIMARY, fontWeight: '700' },

  workerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e8f0ff' },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 15, fontWeight: '800', color: PRIMARY },
  workerName: { flex: 1, fontSize: 14.5, fontWeight: '600', color: INK },
  price: { fontSize: 15.5, fontWeight: '800', color: INK },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  address: { flex: 1, fontSize: 13.5, color: MUTED },
  review: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  reviewLabel: { fontSize: 13, color: MUTED },

  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  action: {
    flex: 1, height: 44, borderRadius: 14, backgroundColor: PRIMARY,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  rateAction: { backgroundColor: '#f59e0b' },
  actionText: { fontSize: 14.5, fontWeight: '700', color: '#fff' },

  skeleton: { backgroundColor: '#edf1f8' },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: '#edf1f8' },

  empty: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 50 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#e8f0ff', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18.5, fontWeight: '800', color: INK, marginTop: 14 },
  emptyText: { fontSize: 14.5, color: MUTED, textAlign: 'center', lineHeight: 21, marginTop: 6 },
});
