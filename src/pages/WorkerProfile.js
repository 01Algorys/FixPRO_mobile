import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Share,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../styles/theme';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import { professionTitle } from '../utils/categoryMeta';

const PRIMARY = '#1d5ff0';
const NAVY = '#0b2f86';
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

const WorkerProfile = ({ route, navigation }) => {
  const { workerId } = route.params || {};
  const { user } = useAuth();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const handleReservePress = () => {
    navigation.navigate('ReservationDetails', { workerId });
  };

  const handleImmediateReserve = async () => {
    Alert.alert(
      'Réservation immédiate',
      `Voulez-vous réserver immédiatement avec ${worker?.user?.name || 'ce technicien'}?`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Confirmer',
          onPress: () => {
            // Navigate to reservation details with pre-filled data
            const now = new Date();
            const preFilledData = {
              workerId: workerId,
              service: worker?.services?.[0]?.id, // Use worker's actual service with fallback
              date: `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`,
              time: now.toTimeString().slice(0, 5),
              duration: 60,
              address: user?.location?.address || 'awoirjawad',
              city: user?.location?.city || 'awpoijdaw',
              postalCode: user?.location?.zipCode || '7080',
              description: 'Réservation immédiate - ' + (worker?.skills?.[0] || 'Service'),
              urgency: 'emergency',
              immediate: true
            };
            navigation.navigate('ReservationDetails', preFilledData);
          },
        },
      ]
    );
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

      // Some endpoints return service ids only; resolve the first one so the
      // profession title can be derived from its category.
      let services = Array.isArray(workerData.services) ? workerData.services : [];
      if (services.length && typeof services[0] !== 'object') {
        const first = await apiService.getService(services[0]).catch(() => null);
        const service = first?.data?.service || first?.data || first;
        services = service?.category ? [service] : [];
      }

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
        profession: professionTitle(services[0]?.category),
        interventions: dashboardData.totalJobs || workerData.jobsCompleted || 0,
        rating: Number(workerData.averageRating || dashboardData.averageRating || 0),
        satisfactionRate: reviewList.length ? Math.round((happy / reviewList.length) * 100) : null,
        experience: workerData.experience || 0,
        totalReviews: workerData.totalReviews || reviewList.length || 0,
        reviews: reviewList.map((review) => ({
          id: review.id,
          name: review.user?.name || review.reviewerName || review.name || 'Client',
          avatar: review.user?.avatar || review.avatar || null,
          rating: review.rating || 5,
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (error && !worker) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadWorkerProfile}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!worker) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="person-remove-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorText}>Technicien non trouvé</Text>
      </View>
    );
  }

  const avatar = worker.user?.avatar || worker.avatar;
  const name = worker.user?.name || worker.name || 'Technicien';
  const reviews = worker.reviews || [];
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, REVIEWS_PREVIEW);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#1a56db', NAVY]} style={styles.header}>
          <View style={styles.headerBar}>
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profil du technicien</Text>
            <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.avatarArea}>
            <View style={styles.avatarRing}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{name[0]?.toUpperCase()}</Text>
                </View>
              )}
              {worker.isVerified && (
                <View style={styles.verifiedCheck}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
              )}
            </View>
            {worker.isVerified && (
              <View style={styles.certifiedPill}>
                <MaterialCommunityIcons name="check-decagram" size={15} color="#fff" />
                <Text style={styles.certifiedText}>Certifié</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Main card */}
        <View style={styles.card}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.profession}>{worker.profession}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={17} color={Colors.star} />
            <Text style={styles.ratingText}>
              {worker.rating.toFixed(1)} ({worker.totalReviews} avis)
              {worker.experience > 0 && ` • ${worker.experience} ans d'expérience`}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{worker.interventions}</Text>
              <Text style={styles.statLabel}>Interventions</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{worker.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Note moyenne</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>
                {worker.satisfactionRate === null ? '—' : `${worker.satisfactionRate}%`}
              </Text>
              <Text style={styles.statLabel}>Clients satisfaits</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>À propos</Text>
          <Text style={styles.aboutText}>
            {worker.bio?.trim() || "Ce technicien n'a pas encore ajouté de description."}
          </Text>

          <View style={styles.divider} />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Avis clients</Text>
            {reviews.length > REVIEWS_PREVIEW && (
              <TouchableOpacity onPress={() => setShowAllReviews((v) => !v)}>
                <Text style={styles.seeAllText}>{showAllReviews ? 'Réduire' : 'Voir tout'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {visibleReviews.length > 0 ? (
            visibleReviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  {review.avatar ? (
                    <Image source={{ uri: review.avatar }} style={styles.reviewAvatar} />
                  ) : (
                    <View style={[styles.reviewAvatar, styles.avatarFallback]}>
                      <Text style={styles.reviewInitial}>{review.name[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewName}>{review.name}</Text>
                    <Text style={styles.reviewDate}>{timeAgo(review.createdAt)}</Text>
                  </View>
                  <View style={styles.reviewRating}>
                    <Ionicons name="star" size={14} color={Colors.star} />
                    <Text style={styles.reviewRatingText}>{Number(review.rating).toFixed(1)}</Text>
                  </View>
                </View>
                {!!review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
              </View>
            ))
          ) : (
            <View style={styles.noReviews}>
              <Ionicons name="chatbubble-ellipses-outline" size={36} color="#cbd5e1" />
              <Text style={styles.noReviewsText}>Aucun avis pour le moment</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.reserveButton} onPress={handleReservePress} activeOpacity={0.85}>
          <Ionicons name="calendar-outline" size={19} color="#fff" />
          <Text style={styles.actionText}>Réserver</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nowButton} onPress={handleImmediateReserve} activeOpacity={0.85}>
          <Ionicons name="flash" size={19} color="#fff" />
          <Text style={styles.actionText}>Maintenant</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const AVATAR = 124;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fc',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f7fc',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f7fc',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  header: {
    paddingBottom: 70,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  avatarArea: {
    alignItems: 'center',
    marginTop: 14,
  },
  avatarRing: {
    width: AVATAR + 10,
    height: AVATAR + 10,
    borderRadius: (AVATAR + 10) / 2,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: '#e8effd',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 46,
    fontWeight: '700',
    color: PRIMARY,
  },
  verifiedCheck: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certifiedPill: {
    position: 'absolute',
    bottom: 18,
    left: '50%',
    marginLeft: AVATAR / 2 + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#14b8a6',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  certifiedText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Card
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -50,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  name: {
    fontSize: 25,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  profession: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY,
    textAlign: 'center',
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
  },
  ratingText: {
    fontSize: 14.5,
    color: '#374151',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 22,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  statValue: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 4,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  seeAllText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: PRIMARY,
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },
  divider: {
    height: 1,
    backgroundColor: '#eef2f7',
    marginVertical: 18,
  },
  reviewCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8effd',
    marginRight: 12,
  },
  reviewInitial: {
    fontSize: 17,
    fontWeight: '700',
    color: PRIMARY,
  },
  reviewMeta: {
    flex: 1,
  },
  reviewName: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#111827',
  },
  reviewDate: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewRatingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
    marginTop: 10,
  },
  noReviews: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  noReviewsText: {
    fontSize: 14.5,
    color: '#94a3b8',
    marginTop: 8,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  reserveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    paddingVertical: 15,
    borderRadius: 28,
  },
  nowButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    paddingVertical: 15,
    borderRadius: 28,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default WorkerProfile;
