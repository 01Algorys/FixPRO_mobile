import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, ActivityIndicator, Share, StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../services/api';
import { useScreenChrome } from '../context/ChromeContext';
import { categoryMeta, professionTitle, titleCase } from '../utils/categoryMeta';
import PressableScale from '../components/ui/PressableScale';
import FadeIn from '../components/ui/FadeIn';
import { Stars } from '../components/reservations/ReservationParts';
import {
  THEME, INK, MUTED, SURFACE, ProfileHeader, SectionHead, StatsRow, styles,
} from '../components/profile/ProfileParts';

const REVIEWS_PREVIEW = 3;

const timeAgo = (date) => {
  if (!date) return '';
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 30) return `Il y a ${days} jours`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Il y a ${months} mois`;
  const years = Math.floor(months / 12);
  return `Il y a ${years} an${years > 1 ? 's' : ''}`;
};

// The technician's public profile, as a client sees it
const WorkerProfile = ({ route, navigation }) => {
  useScreenChrome('#1a56db', '#ffffff');
  const { workerId } = route.params || {};
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const handleReservePress = () => {
    navigation.navigate('ReservationDetails', { workerId });
  };

  // "Maintenant": the booking form opens with today, "as soon as possible" and
  // urgent preselected; the address comes from the client's position.
  const handleImmediateReserve = () => {
    navigation.navigate('ReservationDetails', { workerId, immediate: true });
  };

  const handleShare = () => {
    Share.share({
      message: `Découvrez ${worker?.user?.name || 'ce technicien'} sur FixPro, ${worker?.profession?.toLowerCase()}.`,
    }).catch(() => {});
  };

  useEffect(() => {
    loadWorkerProfile();
  }, [workerId]);

  const loadWorkerProfile = async () => {
    let workerData = null;
    let combinedWorkerData = null;

    try {
      setLoading(true);
      setError(null);

      const workerResponse = await apiService.getWorkerById(workerId);
      const payload = workerResponse.data || workerResponse;
      workerData = payload.worker || payload;
      const actualWorkerId = workerData.id || workerId;

      // This endpoint returns service ids only; resolve them for the trades
      let services = Array.isArray(workerData.services) ? workerData.services : [];
      if (services.length && typeof services[0] !== 'object') {
        const found = await Promise.all(services.map((id) => apiService.getService(id).catch(() => null)));
        services = found.map((res) => res?.data?.service || res?.data || res).filter((s) => s?.category);
      }

      const categoriesResponse = await apiService.getPublicCategories().catch(() => null);
      const categoryList = categoriesResponse?.data || categoriesResponse;
      const categoryNames = Array.isArray(categoryList)
        ? Object.fromEntries(categoryList.map((c) => [c.key, c.name]))
        : {};

      let reviews = [];
      try {
        const reviewsResponse = await apiService.getWorkerReviewsPublic(actualWorkerId);
        reviews =
          reviewsResponse.data?.reviews ||
          reviewsResponse.reviews ||
          reviewsResponse.data ||
          [];
      } catch (reviewError) {
        console.log('No reviews found or error fetching reviews:', reviewError);
      }

      let dashboardData = {};
      try {
        const dashboardResponse = await apiService.getWorkerDashboard(actualWorkerId);
        dashboardData = dashboardResponse.data?.stats || dashboardResponse.data || {};
      } catch (dashboardError) {
        console.log('Error fetching dashboard:', dashboardError);
      }

      const reviewList = Array.isArray(reviews) ? reviews : [];
      const happy = reviewList.filter((r) => (r.rating || 0) >= 4).length;

      combinedWorkerData = {
        ...workerData,
        services,
        categoryNames,
        profession: professionTitle(services[0]?.category, services[0]?.name),
        interventions: dashboardData.totalJobs || workerData.jobsCompleted || 0,
        rating: Number(workerData.averageRating || dashboardData.averageRating || 0),
        satisfactionRate: reviewList.length ? Math.round((happy / reviewList.length) * 100) : null,
        experience: workerData.experience || 0,
        totalReviews: workerData.totalReviews || reviewList.length || 0,
        reviews: reviewList.map((review) => ({
          id: review.id,
          name: review.user?.name || review.reviewerName || review.name || 'Client',
          avatar: review.user?.avatar || review.avatar || null,
          rating: review.rating || 0,
          comment: review.comment || review.text || '',
          createdAt: review.createdAt,
        })),
      };

      setWorker(combinedWorkerData);
    } catch (error) {
      console.error('Failed to load worker profile:', error);
      if (!workerData) {
        setError('Impossible de charger le profil du technicien. Veuillez réessayer.');
      } else {
        setWorker(combinedWorkerData || workerData);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={THEME} />
      </View>
    );
  }

  if (error && !worker) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={52} color="#cbd5e1" />
        <Text style={styles.errorText}>{error}</Text>
        <PressableScale style={styles.retryBtn} onPress={loadWorkerProfile}>
          <Text style={styles.retryText}>Réessayer</Text>
        </PressableScale>
      </View>
    );
  }

  if (!worker) {
    return (
      <View style={styles.centered}>
        <Ionicons name="person-remove-outline" size={52} color="#cbd5e1" />
        <Text style={styles.errorText}>Technicien non trouvé</Text>
      </View>
    );
  }

  const avatar = worker.user?.avatar || worker.avatar;
  const name = titleCase(worker.user?.name || worker.name || 'Technicien');
  const rating = Number(worker.rating || 0);
  const years = worker.experience;
  const reviews = worker.reviews || [];
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, REVIEWS_PREVIEW);
  const trades = [...new Set((worker.services || []).map((s) => s?.category).filter(Boolean))];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <ProfileHeader title="Profil du technicien" onBack={() => navigation.goBack()} onShare={handleShare} />

        <View style={styles.body}>
          {/* Identity */}
          <FadeIn style={styles.identity}>
            <View style={styles.avatarRing}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={local.avatar} />
              ) : (
                <View style={[local.avatar, local.avatarEmpty]}>
                  <Text style={local.avatarLetter}>{name[0]}</Text>
                </View>
              )}
              <View style={[local.statusDot, !worker.isActive && local.statusDotOff]} />
            </View>
            <View style={styles.identityInfo}>
              <View style={styles.identityTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.profileName} numberOfLines={1}>{name}</Text>
                    {!!worker.isVerified && <MaterialCommunityIcons name="check-decagram" size={19} color={THEME} />}
                  </View>
                  <View style={styles.rolePill}>
                    <MaterialCommunityIcons name="hard-hat" size={14} color={THEME} />
                    <Text style={styles.roleText}>Technicien</Text>
                  </View>
                </View>
                {worker.hourlyRate > 0 && (
                  <View style={local.priceBox}>
                    <Text style={local.priceValue}>{worker.hourlyRate} TND</Text>
                    <Text style={local.priceUnit}>de l'heure</Text>
                  </View>
                )}
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="star" size={15} color="#fbbf24" />
                <Text style={styles.metaStrong}>{worker.totalReviews > 0 ? rating.toFixed(1) : 'Nouveau'}</Text>
                {worker.totalReviews > 0 && <Text style={styles.metaText}>({worker.totalReviews} avis)</Text>}
                {years > 0 && (
                  <>
                    <View style={styles.metaDivider} />
                    <Ionicons name="briefcase-outline" size={15} color={INK} />
                    <Text style={styles.metaStrong}>{years}</Text>
                    <Text style={styles.metaText} numberOfLines={1}>ans d'expérience</Text>
                  </>
                )}
              </View>
              <Text style={[local.availability, !worker.isActive && local.unavailable]}>
                {worker.isActive ? 'Disponible' : 'Indisponible'}
              </Text>
            </View>
          </FadeIn>

          <StatsRow
            delay={40}
            items={[
              { icon: 'briefcase-outline', value: worker.interventions ?? 0, label: 'Interventions' },
              { icon: 'star-outline', color: '#f59e0b', value: rating.toFixed(1), label: 'Note moyenne' },
              { icon: 'people-outline', value: worker.satisfactionRate == null ? '—' : `${worker.satisfactionRate}%`, label: 'Clients satisfaits' },
            ]}
          />

          {/* About */}
          <FadeIn delay={80}>
            <SectionHead icon="information-circle-outline" title="À propos" />
            <View style={[styles.card, styles.cardPad]}>
              <Text style={[styles.bioText, !worker.bio?.trim() && { color: '#94a3b8' }]}>
                {worker.bio?.trim() || "Ce technicien n'a pas encore ajouté de description."}
              </Text>
            </View>
          </FadeIn>

          {/* Services */}
          {trades.length > 0 && (
            <FadeIn delay={120}>
              <SectionHead icon="layers-outline" title="Ses services" />
              <View style={styles.servicesGrid}>
                {trades.map((key) => {
                  const meta = categoryMeta(key, { name: worker.categoryNames?.[key] });
                  const Icon = meta.lib === 'mci' ? MaterialCommunityIcons : Ionicons;
                  return (
                    <View key={key} style={[styles.serviceTile, { backgroundColor: meta.bg }]}>
                      <Icon name={meta.icon} size={27} color={meta.color} />
                      <Text style={[styles.serviceName, { color: meta.color }]} numberOfLines={1} adjustsFontSizeToFit>
                        {worker.categoryNames?.[key] || meta.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </FadeIn>
          )}

          {/* Reviews */}
          <FadeIn delay={160}>
            <SectionHead
              icon="star-outline"
              title="Avis clients"
              right={reviews.length > REVIEWS_PREVIEW && (
                <PressableScale onPress={() => setShowAllReviews(!showAllReviews)}>
                  <Text style={styles.linkText}>{showAllReviews ? 'Voir moins' : 'Voir tout'}</Text>
                </PressableScale>
              )}
            />
            {visibleReviews.length > 0 ? (
              visibleReviews.map((review) => {
                const reviewer = titleCase(review.name);
                return (
                  <View key={review.id} style={[styles.card, styles.cardPad, local.review]}>
                    <View style={local.reviewTop}>
                      {review.avatar ? (
                        <Image source={{ uri: review.avatar }} style={local.reviewAvatar} />
                      ) : (
                        <View style={[local.reviewAvatar, local.avatarEmpty]}>
                          <Text style={local.reviewLetter}>{reviewer[0]}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={local.reviewName} numberOfLines={1}>{reviewer}</Text>
                        <Stars rating={review.rating} />
                      </View>
                      <Text style={local.reviewDate}>{timeAgo(review.createdAt)}</Text>
                    </View>
                    {!!review.comment && <Text style={local.reviewComment}>{review.comment}</Text>}
                  </View>
                );
              })
            ) : (
              <View style={[styles.card, styles.cardPad]}>
                <Text style={[styles.bioText, { color: '#94a3b8' }]}>Aucun avis pour le moment.</Text>
              </View>
            )}
          </FadeIn>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={local.actions}>
        <PressableScale style={local.action} onPress={handleReservePress}>
          <Ionicons name="calendar-outline" size={19} color="#fff" />
          <Text style={local.actionText}>Réserver</Text>
        </PressableScale>
        <PressableScale style={[local.action, local.nowAction]} onPress={handleImmediateReserve}>
          <Ionicons name="flash" size={19} color="#fff" />
          <Text style={local.actionText}>Maintenant</Text>
        </PressableScale>
      </View>
    </View>
  );
};

const local = StyleSheet.create({
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e8effd' },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 30, fontWeight: '800', color: THEME },
  statusDot: {
    position: 'absolute', right: 5, bottom: 5, width: 17, height: 17, borderRadius: 9,
    backgroundColor: '#22c55e', borderWidth: 3, borderColor: '#fff',
  },
  statusDotOff: { backgroundColor: '#94a3b8' },

  priceBox: {
    alignItems: 'center', paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1, borderColor: '#cfdcf2', backgroundColor: '#fff',
  },
  priceValue: { fontSize: 15, fontWeight: '800', color: THEME },
  priceUnit: { fontSize: 11, color: MUTED, marginTop: 1 },
  availability: { fontSize: 13, fontWeight: '700', color: '#16a34a', marginTop: 5 },
  unavailable: { color: MUTED },

  review: { marginBottom: 8 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e8effd' },
  reviewLetter: { fontSize: 16, fontWeight: '800', color: THEME },
  reviewName: { fontSize: 15, fontWeight: '700', color: INK, marginBottom: 2 },
  reviewDate: { fontSize: 12.5, color: MUTED },
  reviewComment: { fontSize: 14, lineHeight: 20, color: '#334155', marginTop: 9 },

  actions: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eef2f7',
  },
  action: {
    flex: 1, height: 52, borderRadius: 26, backgroundColor: THEME,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  nowAction: { backgroundColor: '#16a34a' },
  actionText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default WorkerProfile;
