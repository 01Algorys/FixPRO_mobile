import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  StyleSheet, ActivityIndicator, StatusBar, Image, Alert, Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import socketService from '../services/socketService';
import AcceptedModal from '../components/worker/AcceptedModal';
import { useNotifications } from '../context/NotificationContext';
import { categoryMeta } from '../utils/categoryMeta';
import { reverseGeocodeCity } from '../utils/location';
import PressableScale from '../components/ui/PressableScale';
import FadeIn from '../components/ui/FadeIn';

const PRIMARY = '#1d5ff0';
const NAVY = '#0b3fb3';
const ACCENT = '#38d6f5';
const INK = '#0f172a';
const MUTED = '#64748b';
const SURFACE = '#f4f7fc';
const SHORTCUT_WIDTH = (Dimensions.get('window').width - 32 - 30) / 4;

// A technician owes the platform this much per mission taken (see the backend feeService)
const MISSION_FEE = 2;
const BILLABLE = ['accepted', 'in_progress', 'completed'];

const lower = (s) => String(s || '').toLowerCase();

const distanceKm = (a, b) => {
  if (!a || !b) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

const coordsOf = (loc) => {
  const lat = loc?.latitude ?? loc?.lat;
  const lng = loc?.longitude ?? loc?.lng;
  return typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null;
};

const timeAgo = (date) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `Il y a ${days} j`;
};

const whenLabel = (date, time) => {
  if (!date) return '';
  const d = new Date(date);
  const today = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(d) - startOf(today)) / 86400000);
  const day = diff === 0 ? "Aujourd'hui"
    : diff === 1 ? 'Demain'
    : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  return time ? `${day}, ${time}` : day;
};

const priceOf = (r) => r.actualPrice ?? r.estimatedPrice ?? r.service?.basePrice ?? null;

const CategoryTile = ({ category, size = 54 }) => {
  const meta = categoryMeta(category);
  const Icon = meta.lib === 'mci' ? MaterialCommunityIcons : Ionicons;
  return (
    <View style={[styles.categoryTile, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <Icon name={meta.icon} size={size * 0.5} color="#fff" />
    </View>
  );
};

const Stars = ({ rating }) => (
  <View style={styles.stars}>
    {[0, 1, 2, 3, 4].map((i) => (
      <Ionicons
        key={i}
        name={rating >= i + 0.75 ? 'star' : rating >= i + 0.25 ? 'star-half' : 'star-outline'}
        size={13}
        color="#fbbf24"
      />
    ))}
  </View>
);

const TABS = [
  { key: 'upcoming', label: 'À venir', icon: 'time', statuses: ['accepted'] },
  { key: 'progress', label: 'En cours', icon: 'construct', statuses: ['in_progress'] },
  { key: 'done', label: 'Terminées', icon: 'checkmark-circle', statuses: ['completed'] },
];

export default function WorkerHomePage({ navigation }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [city, setCity] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [busyId, setBusyId] = useState(null);
  const [acceptedId, setAcceptedId] = useState(null);
  const { unreadNotifications } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = async () => {
    try {
      setError(null);
      const [profileData, reservationsData] = await Promise.all([
        apiService.getWorkerProfile(),
        apiService.getWorkerReservations(user.id, { limit: 100 }),
      ]);

      const profileResponse = profileData.data || profileData;
      setProfile(profileResponse);

      const list = reservationsData.data?.reservations || reservationsData.reservations || reservationsData.data || [];
      setReservations(Array.isArray(list) ? list : []);

      const here = coordsOf(profileResponse);
      if (here) reverseGeocodeCity(here.lat, here.lng).then((c) => c && setCity(c)).catch(() => {});
    } catch (err) {
      console.error('[Dashboard] fetchAll error:', err);
      setError('Impossible de charger les données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Reload every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [])
  );

  // Real-time: a client just sent a request, or cancelled or changed one
  useEffect(() => socketService.onNewReservation(() => fetchAll()), []);
  useEffect(() => socketService.onReservationUpdate(() => fetchAll()), []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const respond = async (reservation, status) => {
    try {
      setBusyId(reservation.id);
      await apiService.updateReservationStatus(reservation.id, status);
      if (status === 'accepted') setAcceptedId(reservation.id);
      await fetchAll();
    } catch (err) {
      console.error('Failed to update reservation status:', err);
      Alert.alert('Erreur', 'Impossible de mettre à jour la demande.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = (reservation) => {
    Alert.alert('Refuser la demande', 'Le client sera informé que vous ne pouvez pas intervenir.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Refuser', style: 'destructive', onPress: () => respond(reservation, 'rejected') },
    ]);
  };

  const openReservation = (reservation) =>
    navigation.navigate('WorkerReservationDetails', { reservation });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={52} color="#cbd5e1" />
        <Text style={styles.errorText}>{error}</Text>
        <PressableScale style={styles.retryBtn} onPress={() => { setLoading(true); fetchAll(); }}>
          <Text style={styles.retryText}>Réessayer</Text>
        </PressableScale>
      </View>
    );
  }

  const name = profile?.user?.name || user?.name || 'Technicien';
  const rawFirst = name.split(' ')[0];
  const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1);
  const avatar = profile?.user?.avatar || user?.avatar;
  const rating = Number(profile?.averageRating || 0);
  const reviews = profile?.totalReviews || 0;
  const online = profile?.isActive !== false;
  const here = coordsOf(profile);

  const billable = reservations.filter((r) => BILLABLE.includes(lower(r.status)));
  const amountDue = billable.length * MISSION_FEE + (profile?.feeAdjustment || 0);
  const now = new Date();
  const missionsThisMonth = billable.filter((r) => {
    const d = new Date(r.date || r.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const pending = reservations
    .filter((r) => lower(r.status) === 'pending')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const counts = Object.fromEntries(
    TABS.map((t) => [t.key, reservations.filter((r) => t.statuses.includes(lower(r.status))).length])
  );
  const activeTab = TABS.find((t) => t.key === tab);
  const interventions = reservations
    .filter((r) => activeTab.statuses.includes(lower(r.status)))
    .sort((a, b) => (tab === 'done' ? -1 : 1) * (new Date(a.date) - new Date(b.date)))
    .slice(0, 4);

  const placeLine = (r) => {
    const place = r.location?.city || r.location?.address || 'Adresse non précisée';
    const km = distanceKm(here, coordsOf(r.location));
    return { place, km: km === null ? null : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km` };
  };

  const shortcuts = [
    { label: 'Disponibilité', icon: 'calendar-clock', color: PRIMARY, bg: '#e8effd', onPress: () => navigation.navigate('Profil') },
    { label: 'Mes services', icon: 'briefcase-variant', color: '#f97316', bg: '#fff1e6', onPress: () => navigation.navigate('Profil') },
    { label: 'Statistiques', icon: 'chart-bar', color: '#16a34a', bg: '#e7f7ec', onPress: () => navigation.navigate('Demandes') },
    { label: 'Paramètres', icon: 'cog', color: '#7c3aed', bg: '#f1eafe', onPress: () => navigation.navigate('Profil') },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        {/* Header */}
        <LinearGradient colors={['#1a56db', NAVY]} style={styles.header}>
          <View style={styles.headerGlow} />
          <View style={styles.brandRow}>
            <Image source={require('../assets/tool.png')} style={styles.brandLogo} />
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.brandName}>Fix<Text style={{ color: ACCENT }}>Pro</Text></Text>
              <Text style={styles.brandTagline}>Simple • rapide • fiable</Text>
            </View>
            <View style={styles.brandDivider} />
            <PressableScale style={styles.locationPill} onPress={() => navigation.navigate('Profil')}>
              <Ionicons name="location" size={15} color="#fff" />
              <Text style={styles.locationText} numberOfLines={1}>{city || 'Ma position'}</Text>
              <Ionicons name="chevron-down" size={14} color="#fff" />
            </PressableScale>
            <PressableScale style={styles.bell} scaleTo={0.9} onPress={() => navigation.navigate('Notifications')}>
              <Ionicons name="notifications" size={23} color="#fff" />
              {unreadNotifications > 0 && <View style={styles.bellDot} />}
            </PressableScale>
          </View>

          <View style={styles.identity}>
            <View>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{firstName[0]?.toUpperCase()}</Text>
                </View>
              )}
              <View style={[styles.presenceDot, { backgroundColor: online ? '#22c55e' : '#94a3b8' }]} />
            </View>
            <View style={styles.identityText}>
              <Text style={styles.hello} numberOfLines={1}>Bonjour, {firstName} 👋</Text>
              <View style={styles.roleRow}>
                <Text style={styles.role}>Technicien</Text>
                <Stars rating={rating} />
                <Text style={styles.role}>{rating.toFixed(1)} ({reviews})</Text>
              </View>
              <View style={[styles.presencePill, !online && styles.presencePillOff]}>
                <Text style={[styles.presenceText, !online && { color: '#e2e8f0' }]}>
                  {online ? 'En ligne · Disponible' : 'Hors ligne'}
                </Text>
              </View>
            </View>
            <PressableScale style={styles.editProfile} onPress={() => navigation.navigate('Profil')}>
              <Text style={styles.editProfileText}>Modifier{'\n'}mon profil</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </PressableScale>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Balance + missions */}
          <FadeIn style={styles.row}>
            <PressableScale style={[styles.card, styles.kpiCard]} onPress={() => navigation.navigate('Profil')}>
              <LinearGradient colors={['#3b82f6', PRIMARY]} style={styles.kpiIcon}>
                <Ionicons name="wallet-outline" size={22} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.kpiLabel} numberOfLines={1} adjustsFontSizeToFit>Solde / Crédits</Text>
                <Text style={styles.kpiValue}>{amountDue} TND</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </PressableScale>
            <PressableScale style={[styles.card, styles.kpiCard]} onPress={() => navigation.navigate('Demandes')}>
              <LinearGradient colors={['#3b82f6', PRIMARY]} style={styles.kpiIcon}>
                <Ionicons name="calendar-outline" size={22} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.kpiLabel} numberOfLines={1} adjustsFontSizeToFit>Missions ce mois</Text>
                <Text style={styles.kpiValue}>{missionsThisMonth}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </PressableScale>
          </FadeIn>

          {/* Shortcuts */}
          <FadeIn delay={60} style={styles.row}>
            {shortcuts.map((s) => (
              <PressableScale key={s.label} style={[styles.card, styles.shortcut]} onPress={s.onPress}>
                <View style={[styles.shortcutIcon, { backgroundColor: s.bg }]}>
                  <MaterialCommunityIcons name={s.icon} size={24} color={s.color} />
                </View>
                <View style={styles.shortcutLabelRow}>
                  <Text style={styles.shortcutLabel} numberOfLines={1} adjustsFontSizeToFit>{s.label}</Text>
                  <Ionicons name="chevron-forward" size={12} color={INK} />
                </View>
              </PressableScale>
            ))}
          </FadeIn>

          {/* Rating + price */}
          <FadeIn delay={120} style={styles.row}>
            <PressableScale style={[styles.card, styles.kpiCard]} onPress={() => navigation.navigate('Profil')}>
              <View style={[styles.kpiIconSoft, { backgroundColor: '#fff7e0' }]}>
                <Ionicons name="star" size={20} color="#f5a524" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.kpiLabel} numberOfLines={1} adjustsFontSizeToFit>Note moyenne</Text>
                <Text style={styles.kpiValue}>
                  {rating.toFixed(1)} <Text style={styles.kpiSub}>({reviews} avis)</Text>
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </PressableScale>
            <PressableScale style={[styles.card, styles.kpiCard]} onPress={() => navigation.navigate('Profil')}>
              <View style={[styles.kpiIconSoft, { backgroundColor: '#fff1e6' }]}>
                <Ionicons name="pricetag-outline" size={20} color="#f97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.kpiLabel} numberOfLines={1} adjustsFontSizeToFit>Prix moyen</Text>
                <Text style={[styles.kpiValue, { color: NAVY }]}>
                  {profile?.hourlyRate ? `${profile.hourlyRate} TND` : '-- TND'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </PressableScale>
          </FadeIn>

          {/* New requests */}
          <FadeIn delay={180}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Nouvelles demandes</Text>
                {pending.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{pending.length}</Text>
                  </View>
                )}
              </View>
              <PressableScale style={styles.seeAll} onPress={() => navigation.navigate('Demandes')}>
                <Text style={styles.seeAllText}>Voir tout</Text>
                <Ionicons name="chevron-forward" size={16} color={PRIMARY} />
              </PressableScale>
            </View>

            {pending.length === 0 ? (
              <View style={[styles.card, styles.empty]}>
                <Ionicons name="notifications-off-outline" size={28} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>Aucune nouvelle demande</Text>
                <Text style={styles.emptyText}>Les demandes des clients apparaîtront ici.</Text>
              </View>
            ) : (
              pending.slice(0, 2).map((r) => {
                const { place, km } = placeLine(r);
                const price = priceOf(r);
                const busy = busyId === r.id;
                return (
                  <PressableScale key={r.id} scaleTo={0.985} style={[styles.card, styles.requestCard]} onPress={() => openReservation(r)}>
                    <View style={styles.requestTop}>
                      <View style={styles.newPill}>
                        <Text style={styles.newPillText}>{r.emergency ? 'Urgent' : 'Nouvelle demande'}</Text>
                      </View>
                      <Text style={styles.ago}>{timeAgo(r.createdAt)}</Text>
                    </View>
                    <View style={styles.requestBody}>
                      <CategoryTile category={r.service?.category} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.jobTitle} numberOfLines={1}>{categoryMeta(r.service?.category, { name: r.service?.name }).label}</Text>
                        <Text style={styles.jobDesc} numberOfLines={1}>{r.description || r.service?.name || 'Service'}</Text>
                        <View style={styles.metaRow}>
                          <Ionicons name="location" size={14} color={PRIMARY} />
                          <Text style={styles.metaText} numberOfLines={1}>{place}</Text>
                        </View>
                        {km && (
                          <View style={styles.metaRow}>
                            <Ionicons name="navigate" size={12} color={PRIMARY} />
                            <Text style={styles.metaSub}>À {km} de votre position</Text>
                          </View>
                        )}
                      </View>
                      {price !== null && (
                        <View style={styles.pricePill}>
                          <Text style={styles.priceText}>{price} TND</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={18} color={INK} />
                    </View>
                    <View style={styles.actionsRow}>
                      <PressableScale style={[styles.actionBtn, styles.rejectBtn]} disabled={busy} onPress={() => confirmReject(r)}>
                        <Ionicons name="close" size={20} color="#dc2626" />
                        <Text style={styles.rejectText}>Refuser</Text>
                      </PressableScale>
                      <PressableScale style={[styles.actionBtn, styles.acceptBtn]} disabled={busy} onPress={() => respond(r, 'accepted')}>
                        {busy ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={20} color="#fff" />
                            <Text style={styles.acceptText}>Accepter</Text>
                          </>
                        )}
                      </PressableScale>
                    </View>
                  </PressableScale>
                );
              })
            )}
          </FadeIn>

          {/* Interventions */}
          <FadeIn delay={240}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mes interventions</Text>
              <PressableScale style={styles.seeAll} onPress={() => navigation.navigate('Demandes')}>
                <Text style={styles.seeAllText}>Voir tout</Text>
                <Ionicons name="chevron-forward" size={16} color={PRIMARY} />
              </PressableScale>
            </View>

            <View style={styles.segment}>
              {TABS.map((t) => {
                const active = t.key === tab;
                return (
                  <PressableScale
                    key={t.key}
                    style={[styles.segmentItem, active && styles.segmentActive]}
                    onPress={() => setTab(t.key)}
                  >
                    <Ionicons name={t.icon} size={15} color={active ? '#fff' : '#475569'} />
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
                      {t.label} ({counts[t.key]})
                    </Text>
                  </PressableScale>
                );
              })}
            </View>

            {interventions.length === 0 ? (
              <View style={[styles.card, styles.empty]}>
                <Ionicons name="briefcase-outline" size={28} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>Rien pour le moment</Text>
                <Text style={styles.emptyText}>
                  {tab === 'upcoming' ? 'Vos prochaines interventions apparaîtront ici.'
                    : tab === 'progress' ? 'Aucune intervention en cours.'
                    : 'Vos interventions terminées apparaîtront ici.'}
                </Text>
              </View>
            ) : (
              interventions.map((r) => {
                const { place, km } = placeLine(r);
                const price = priceOf(r);
                return (
                  <PressableScale key={r.id} scaleTo={0.985} style={[styles.card, styles.jobCard]} onPress={() => openReservation(r)}>
                    <CategoryTile category={r.service?.category} size={50} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.jobTitle} numberOfLines={1}>{categoryMeta(r.service?.category, { name: r.service?.name }).label}</Text>
                      <Text style={styles.jobDesc} numberOfLines={1}>{r.description || r.service?.name || 'Service'}</Text>
                      <View style={styles.metaRow}>
                        <Ionicons name="calendar-outline" size={13} color={MUTED} />
                        <Text style={styles.metaText}>{whenLabel(r.date, r.time)}</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={13} color={MUTED} />
                        <Text style={styles.metaText} numberOfLines={1}>{km ? `${place} – ${km}` : place}</Text>
                      </View>
                    </View>
                    {price !== null && (
                      <View style={styles.pricePill}>
                        <Text style={styles.priceText}>{price} TND</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={18} color={INK} />
                  </PressableScale>
                );
              })
            )}
          </FadeIn>
        </View>
      </ScrollView>
      <AcceptedModal
        visible={!!acceptedId}
        onClose={() => setAcceptedId(null)}
        onContact={() => {
          navigation.navigate('Messages', { conversationId: acceptedId });
          setAcceptedId(null);
        }}
        onViewJobs={() => {
          setTab('upcoming');
          setAcceptedId(null);
        }}
      />
    </View>
  );
}

const cardShadow = {
  shadowColor: '#1e3a8a',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 3,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SURFACE, padding: 24 },
  errorText: { marginTop: 12, fontSize: 15, color: MUTED, textAlign: 'center' },
  retryBtn: { marginTop: 18, backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Header
  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 64,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute', right: -90, top: 0, width: 280, height: 280,
    borderRadius: 140, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandLogo: { width: 44, height: 44, marginLeft: -8 },
  brandName: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5, lineHeight: 28 },
  brandTagline: { fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  brandDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  locationPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 9, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  locationText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  bell: { padding: 4 },
  bellDot: {
    position: 'absolute', top: 3, right: 4, width: 9, height: 9, borderRadius: 5,
    backgroundColor: '#ef4444', borderWidth: 1.5, borderColor: NAVY,
  },

  identity: { flexDirection: 'row', alignItems: 'center', marginTop: 18, gap: 12 },
  avatar: {
    width: 66, height: 66, borderRadius: 33, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: '#3b7bf6',
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 28, fontWeight: '700' },
  presenceDot: {
    position: 'absolute', right: 1, bottom: 3, width: 16, height: 16, borderRadius: 8,
    borderWidth: 3, borderColor: '#fff',
  },
  identityText: { flex: 1, gap: 4 },
  hello: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  roleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 5, rowGap: 2 },
  role: { color: 'rgba(255,255,255,0.88)', fontSize: 12.5, fontWeight: '500' },
  stars: { flexDirection: 'row', gap: 1 },
  presencePill: {
    alignSelf: 'flex-start', backgroundColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, marginTop: 2,
  },
  presencePillOff: { backgroundColor: 'rgba(255,255,255,0.2)' },
  presenceText: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
  editProfile: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 10, paddingVertical: 9, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  editProfileText: { color: '#fff', fontSize: 12, fontWeight: '600', lineHeight: 15 },

  // Body
  body: { paddingHorizontal: 16, marginTop: -46, gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
  card: { backgroundColor: '#fff', borderRadius: 18, ...cardShadow },
  kpiCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12 },
  kpiIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  kpiIconSoft: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { fontSize: 12, color: MUTED, fontWeight: '500' },
  kpiValue: { fontSize: 19, color: INK, fontWeight: '800', letterSpacing: -0.3, marginTop: 1 },
  kpiSub: { fontSize: 13, color: MUTED, fontWeight: '500' },

  shortcut: { width: SHORTCUT_WIDTH, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, gap: 8 },
  shortcutIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  shortcutLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 2, maxWidth: '100%' },
  shortcutLabel: { fontSize: 11, color: INK, fontWeight: '600', flexShrink: 1 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10, marginBottom: 10,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: INK, letterSpacing: -0.3 },
  countBadge: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
    backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
  },
  countBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 14.5, color: PRIMARY, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 22, paddingHorizontal: 20, gap: 4 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: INK, marginTop: 6 },
  emptyText: { fontSize: 13, color: MUTED, textAlign: 'center' },

  requestCard: { padding: 14, borderWidth: 1.5, borderColor: '#cfe0ff', marginBottom: 10 },
  requestTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  newPill: { backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  newPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  ago: { fontSize: 12.5, color: MUTED },
  requestBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryTile: { backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  jobTitle: { fontSize: 16, fontWeight: '800', color: INK },
  jobDesc: { fontSize: 13.5, color: '#334155', marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  metaText: { fontSize: 12.5, color: '#334155', flexShrink: 1 },
  metaSub: { fontSize: 12, color: MUTED },
  pricePill: { backgroundColor: '#e3edff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 },
  priceText: { fontSize: 15, fontWeight: '800', color: INK },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 24,
  },
  rejectBtn: { borderWidth: 1.5, borderColor: '#fca5a5', backgroundColor: '#fff' },
  rejectText: { color: '#dc2626', fontSize: 15.5, fontWeight: '700' },
  acceptBtn: { backgroundColor: PRIMARY },
  acceptText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },

  segment: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  segmentItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 10, borderRadius: 12, backgroundColor: '#e9eef6',
  },
  segmentActive: { backgroundColor: PRIMARY },
  segmentText: { fontSize: 12.5, color: '#475569', fontWeight: '600' },
  segmentTextActive: { color: '#fff' },

  jobCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10 },
});
