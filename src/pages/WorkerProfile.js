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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../styles/theme';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';

const WorkerProfile = ({ route, navigation }) => {
  const { workerId } = route.params || {};
  const { user } = useAuth();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleReservePress = () => {
    console.log(workerId);
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
      workerData = workerResponse.data || workerResponse;
      console.log("workerData:  ",workerData)
      const actualWorkerId = workerData.id || workerId;

      let reviews = [];
      try {
        if (typeof apiService.getWorkerReviewsPublic === 'function') {
          const reviewsResponse =
            await apiService.getWorkerReviewsPublic(actualWorkerId);
          reviews = reviewsResponse.data || reviewsResponse || [];
        } else {
          console.log(
            'getWorkerReviewsPublic is not available in apiService'
          );
        }
      } catch (reviewError) {
        console.log(
          'No reviews found or error fetching reviews:',
          reviewError
        );
      }

      let dashboardData = {};
      try {
        const dashboardResponse =
          await apiService.getWorkerDashboard(actualWorkerId);
        dashboardData = dashboardResponse.data || dashboardResponse || {};
      } catch (dashboardError) {
        console.log('Error fetching dashboard:', dashboardError);
      }

      combinedWorkerData = {
        ...workerData,
        interventions:
          dashboardData.interventions ||
          dashboardData.totalJobs ||
          workerData.jobsCompleted ||
          0,
        rating:
          dashboardData.rating ||
          workerData.averageRating ||
          workerData.rating ||
          0,
        satisfactionRate:
          dashboardData.satisfactionRate ||
          workerData.satisfactionRate ||
          0,
        experience:
          dashboardData.experience || workerData.experience || 0,
        totalReviews: reviews.length || workerData.totalReviews || 0,
        reviews: Array.isArray(reviews)
          ? reviews.map((review) => ({
            id: review.id,
            name: review.reviewerName || review.name || 'Client',
            rating: review.rating || 5,
            comment:
              review.comment || review.text || 'Excellent service!',
          }))
          : [],
      };

      setWorker(combinedWorkerData);
    } catch (error) {
      console.error('Failed to load worker profile:', error);
      if (!workerData) {
        setError(
          'Impossible de charger le profil du technicien. Veuillez réessayer.'
        );
      } else {
        setWorker(combinedWorkerData || workerData);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i < fullStars ? 'star' : 'star-outline'}
          size={16}
          color={Colors.star}
        />
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error && !worker) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadWorkerProfile}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!worker) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons
          name="person-off"
          size={48}
          color={Colors.textTertiary}
        />
        <Text style={styles.errorText}>Technicien non trouvé</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={Colors.textLight}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil du technicien</Text>
        </View>

        {/* Profile Picture Section */}
        <View style={styles.profileSection}>
          <View style={styles.profilePictureContainer}>
            {worker.user?.avatar || worker.avatar ? (
              <Image
                source={{ uri: worker.user?.avatar || worker.avatar }}
                style={styles.profilePictureImage}
              />
            ) : (
              <Text style={styles.profilePictureInitial}>
                {(worker.user?.name || worker.name || 'W')?.[0]?.toUpperCase()}
              </Text>
            )}
            {worker.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>Certifié</Text>
              </View>
            )}
          </View>
        </View>

        {/* Worker Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.workerName}>{worker.user?.name}</Text>
          <Text style={styles.workerProfession}>
            {worker.skills?.[0] || 'Technicien'}
          </Text>

          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {renderStars(worker.rating || 0)}
            </View>
            <Text style={styles.ratingText}>
              {worker.rating} ({worker.totalReviews} avis) ·{' '}
              {worker.experience} ans d'expérience
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {worker.interventions}
              </Text>
              <Text style={styles.statLabel}>Interventions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{worker.rating}</Text>
              <Text style={styles.statLabel}>Note moyenne</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {worker.satisfactionRate}%
              </Text>
              <Text style={styles.statLabel}>Clients satisfaits</Text>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>À propos</Text>
          <Text style={styles.aboutText}>{worker.bio}</Text>
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Avis clients</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {worker.reviews?.length > 0 ? (
            worker.reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerAvatar}>
                    {review.avatar ? (
                      <Image source={{ uri: review.avatar }} style={styles.reviewerAvatarImage} />
                    ) : (
                      <Text style={styles.reviewerAvatarInitial}>
                        {(review.name || 'C')?.[0]?.toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.reviewerInfo}>
                    <Text style={styles.reviewerName}>
                      {review.name}
                    </Text>
                    <View style={styles.reviewStars}>
                      {renderStars(review.rating || 0)}
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewComment}>
                  {review.comment}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.noReviewsContainer}>
              <Ionicons
                name="star-outline"
                size={48}
                color={Colors.textTertiary}
              />
              <Text style={styles.noReviewsText}>
                Aucun avis pour le moment
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.reservationButton}
          onPress={handleReservePress}
        >
          <Text style={styles.reservationButtonText}>Réserver</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nowButton}
          onPress={handleImmediateReserve}
        >
          <Text style={styles.nowButtonText}>Maintenant</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: Colors.headerBackground,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  profileSection: {
    backgroundColor: Colors.headerBackground,
    alignItems: 'center',
    paddingBottom: 40,
  },
  profilePictureContainer: {
    position: 'relative',
    alignItems: 'center',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profilePictureImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  profilePictureInitial: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: Colors.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    color: Colors.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: Colors.card,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginTop: -20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  workerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  workerProfession: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  aboutText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  reviewCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  reviewerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewerAvatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noReviewsText: {
    fontSize: 16,
    color: Colors.textTertiary,
    marginTop: 12,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border || Colors.card,
  },
  reservationButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reservationButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  nowButton: {
    flex: 1,
    backgroundColor: Colors.success,
    paddingVertical: 16,
    borderRadius: 12,
    marginLeft: 8,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nowButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WorkerProfile;