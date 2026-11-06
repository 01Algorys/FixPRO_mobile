import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { categoryMeta, formatDistance, titleCase } from '../../utils/categoryMeta';
import PressableScale from '../ui/PressableScale';
import FadeIn from '../ui/FadeIn';

// What the technician list pages share, so they keep looking alike
export const BLUE = '#1a56db';
export const NAVY = '#0b3fb3';
export const PRIMARY = '#1d5ff0';
export const INK = '#0f172a';
export const MUTED = '#64748b';
export const PAGE = '#f4f7fd';

export const SORTS = [
  { key: 'distance', label: 'Les plus proches', needsLocation: true },
  { key: 'rating', label: 'Mieux notés' },
  { key: 'experience', label: 'Expérience' },
  { key: 'jobs', label: 'Missions' },
  { key: 'price', label: 'Prix' },
];

// Verified technicians come first, whatever the sort
const verifiedFirst = (compare) => (a, b) => (Number(!!b.isVerified) - Number(!!a.isVerified)) || compare(a, b);

export const SORTERS = {
  distance: verifiedFirst((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)),
  rating: verifiedFirst((a, b) => (b.averageRating || 0) - (a.averageRating || 0)),
  experience: verifiedFirst((a, b) => (b.experience || 0) - (a.experience || 0)),
  jobs: verifiedFirst((a, b) => (b.jobsCompleted || 0) - (a.jobsCompleted || 0)),
  // Cheapest first; technicians without a rate go last
  price: verifiedFirst((a, b) => (a.hourlyRate || Infinity) - (b.hourlyRate || Infinity)),
};

export const nameOf = (worker) => titleCase(worker.user?.name || worker.name || 'Technicien');

export const prosLabel = (count) => `${count} professionnel${count > 1 ? 's' : ''}`;

export const CategoryIcon = ({ meta, size, color }) => {
  const Icon = meta.lib === 'mci' ? MaterialCommunityIcons : Ionicons;
  return <Icon name={meta.icon} size={size} color={color} />;
};

export const Chip = ({ label, icon, leading, active, onPress }) => (
  <PressableScale style={[styles.chip, active && styles.chipActive]} scaleTo={0.95} onPress={onPress}>
    {!!icon && <Ionicons name={icon} size={11} color={active ? '#fff' : '#22a35a'} />}
    {leading}
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </PressableScale>
);

// `categoryNames` (category key -> name) shows the technician's trades on the card
export const WorkerCard = ({ worker, categoryNames, onOpen, onBook }) => {
  const avatar = worker.user?.avatar || worker.avatar;
  const name = nameOf(worker);
  const rated = worker.totalReviews > 0;
  const tags = [
    worker.experience > 0 && `${worker.experience} an${worker.experience > 1 ? 's' : ''} d'exp.`,
    worker.jobsCompleted > 0 && `${worker.jobsCompleted} mission${worker.jobsCompleted > 1 ? 's' : ''}`,
  ].filter(Boolean);
  const trades = categoryNames ? [...new Set((worker.services || []).map((s) => s.category))] : [];

  return (
    <PressableScale style={styles.card} scaleTo={0.985} onPress={onOpen}>
      <View style={styles.cardTop}>
        <View>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Text style={styles.avatarLetter}>{name[0]}</Text>
            </View>
          )}
          <View style={[styles.statusDot, { backgroundColor: worker.isActive ? '#22c55e' : '#94a3b8' }]} />
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {!!worker.isVerified && <Ionicons name="checkmark-circle" size={17} color={PRIMARY} />}
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={14} color="#f5b400" />
            <Text style={styles.metaStrong}>{rated ? Number(worker.averageRating).toFixed(1) : 'Nouveau'}</Text>
            {rated && <Text style={styles.metaText}>({worker.totalReviews} avis)</Text>}
            {typeof worker.distanceKm === 'number' && (
              <>
                <Text style={styles.metaText}>·</Text>
                <Ionicons name="location-outline" size={14} color={MUTED} />
                <Text style={styles.metaText}>{formatDistance(worker.distanceKm)}</Text>
              </>
            )}
          </View>
          <Text style={[styles.availability, !worker.isActive && styles.unavailable]}>
            {worker.isActive ? 'Disponible' : 'Indisponible'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#b6c2d6" />
      </View>

      {!!worker.bio && <Text style={styles.bio} numberOfLines={2}>{worker.bio}</Text>}

      {tags.length + trades.length > 0 && (
        <View style={styles.tags}>
          {trades.map((key) => {
            const meta = categoryMeta(key, { name: categoryNames[key] });
            return (
              <View key={key} style={[styles.tag, styles.tradeTag, { backgroundColor: meta.bg }]}>
                <CategoryIcon meta={meta} size={14} color={meta.color} />
                <Text style={[styles.tagText, { color: meta.color }]}>{categoryNames[key] || meta.label}</Text>
              </View>
            );
          })}
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardBottom}>
        {worker.hourlyRate > 0 ? (
          <Text style={styles.price}>
            {worker.hourlyRate} TND<Text style={styles.priceUnit}> /h</Text>
          </Text>
        ) : <View />}
        <PressableScale
          style={[styles.bookBtn, !worker.isActive && styles.bookBtnOff]}
          disabled={!worker.isActive}
          onPress={onBook}
        >
          <Text style={styles.bookText}>Réserver</Text>
        </PressableScale>
      </View>
    </PressableScale>
  );
};

export const SkeletonCard = () => (
  <View style={styles.card}>
    <View style={styles.cardTop}>
      <View style={[styles.avatar, styles.skeleton]} />
      <View style={styles.cardInfo}>
        <View style={[styles.skeletonLine, { width: '60%' }]} />
        <View style={[styles.skeletonLine, { width: '40%', marginTop: 8 }]} />
      </View>
    </View>
    <View style={[styles.skeletonLine, { width: '90%', marginTop: 16 }]} />
  </View>
);

export const EmptyState = ({ icon, title, text, action, onAction }) => (
  <FadeIn style={styles.empty}>
    <View style={styles.emptyIcon}>
      <Ionicons name={icon} size={30} color={PRIMARY} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyText}>{text}</Text>
    <TouchableOpacity style={styles.emptyBtn} onPress={onAction}>
      <Text style={styles.emptyBtnText}>{action}</Text>
    </TouchableOpacity>
  </FadeIn>
);

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE },

  header: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  headerIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 21, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  subtitle: { fontSize: 13.5, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, marginTop: 14, paddingHorizontal: 14,
    backgroundColor: '#fff', borderRadius: 15,
  },
  searchInput: { flex: 1, fontSize: 15.5, color: INK, paddingVertical: 0 },

  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14,
    borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 13.5, fontWeight: '600', color: '#334155' },
  chipTextActive: { color: '#fff' },

  list: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 12,
    shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#e8f0ff' },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 23, fontWeight: '800', color: PRIMARY },
  statusDot: { position: 'absolute', right: 1, bottom: 1, width: 15, height: 15, borderRadius: 8, borderWidth: 2.5, borderColor: '#fff' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontSize: 16.5, fontWeight: '800', color: INK, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaStrong: { fontSize: 13.5, fontWeight: '700', color: INK },
  metaText: { fontSize: 13, color: MUTED },
  availability: { fontSize: 13, fontWeight: '600', color: '#16a34a', marginTop: 3 },
  unavailable: { color: MUTED },
  bio: { fontSize: 14, color: '#475569', lineHeight: 20, marginTop: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, backgroundColor: '#eef4ff' },
  tradeTag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tagText: { fontSize: 12.5, fontWeight: '600', color: '#1e40af' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  price: { fontSize: 18, fontWeight: '800', color: INK },
  priceUnit: { fontSize: 13, fontWeight: '500', color: MUTED },
  bookBtn: { height: 42, paddingHorizontal: 26, borderRadius: 14, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  bookBtnOff: { backgroundColor: '#cbd5e1' },
  bookText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  skeleton: { backgroundColor: '#edf1f8' },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: '#edf1f8' },

  empty: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 44 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#e8f0ff', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18.5, fontWeight: '800', color: INK, marginTop: 14 },
  emptyText: { fontSize: 14.5, color: MUTED, textAlign: 'center', lineHeight: 21, marginTop: 6 },
  emptyBtn: { marginTop: 16, height: 44, paddingHorizontal: 22, borderRadius: 14, backgroundColor: '#e8f0ff', alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { fontSize: 14.5, fontWeight: '700', color: PRIMARY },
});
