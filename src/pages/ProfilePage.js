import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../styles/theme';

const ProfilePage = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const profileResponse = await apiService.getUserProfile();
      const userData = profileResponse.data || profileResponse;

      let reservations = [];
      try {
        const reservationsResponse = await apiService.getUserReservations();
        reservations = reservationsResponse.data?.reservations || reservationsResponse.data || reservationsResponse || [];
      } catch (reservationError) {
        console.log('No reservations found:', reservationError);
      }

      let reviews = [];
      try {
        if (typeof apiService.getUserReviews === 'function') {
          const reviewsResponse = await apiService.getUserReviews();
          reviews = reviewsResponse.data || reviewsResponse || [];
        }
      } catch (reviewError) {
        console.log('No reviews found:', reviewError);
      }

      const totalReservations = Array.isArray(reservations) ? reservations.length : 0;
      const completedReservations = Array.isArray(reservations)
        ? reservations.filter((r) => r.status === 'completed').length
        : 0;
      const pendingReservations = Array.isArray(reservations)
        ? reservations.filter((r) => r.status === 'pending').length
        : 0;
      const totalReviewsGiven = Array.isArray(reviews) ? reviews.length : 0;

      const combinedProfileData = {
        ...userData,
        memberSince: userData.createdAt || new Date(),
        totalReservations,
        completedReservations,
        pendingReservations,
        totalReviewsGiven,
        bio: userData.bio || 'Membre de la communauté FixNOW',
        preferences: userData.preferences || {},
        location: userData.location || null,
        phone: userData.phone || '',
        reviews: Array.isArray(reviews)
          ? reviews.map((review) => ({
              id: review.id,
              workerName: review.workerName || 'Professionnel',
              rating: review.rating || 5,
              comment: review.comment || review.text || 'Excellent service!',
              date: review.createdAt || new Date(),
            }))
          : [],
      };

      setProfileData(combinedProfileData);
      console.log("afhoiawjfoiajwfoi",combinedProfileData)
    } catch (error) {
      console.error('Failed to load profile:', error);
      setError('Impossible de charger le profil. Veuillez réessayer.');

      if (user) {
        setProfileData({
          name: user.name || 'Utilisateur',
          email: user.email || '',
          memberSince: new Date(),
          totalReservations: 0,
          completedReservations: 0,
          pendingReservations: 0,
          totalReviewsGiven: 0,
          bio: 'Membre de la communauté FixNOW',
          preferences: {},
          location: null,
          phone: '',
          reviews: [],
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.replace('Auth');
          },
        },
      ]
    );
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
  console.log("profile data", profileData)

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error && !profileData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon profil</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={Colors.textLight} />
        </TouchableOpacity>
      </View>

      {/* Profile Picture Section */}
      <View style={styles.profileSection}>
        <View style={styles.profilePictureContainer}>
          <View style={styles.profilePicture}>
            <Ionicons name="person" size={60} color={Colors.primary} />
          </View>
          <View style={styles.memberBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.textLight} />
            <Text style={styles.memberText}>Membre</Text>
          </View>
        </View>
      </View>

      {/* Main Content Card */}
      <View style={styles.mainCard}>
        <Text style={styles.profileName}>{profileData?.user.name}</Text>
        <Text style={styles.userEmail}>{profileData?.user.email}</Text>

        {profileData?.phone ? (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoRowText}>{profileData.user.phone}</Text>
          </View>
        ) : null}

        {profileData?.location ? (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoRowText}>
              {profileData.location.city || profileData.location.address || 'Non spécifié'}
            </Text>
          </View>
        ) : null}

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.infoRowText}>
            Membre depuis{' '}
            {new Date(profileData?.memberSince).toLocaleDateString('fr-FR', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        {/* User Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: Colors.primary + '15' }]}>
              <Ionicons name="calendar" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.statNumber}>{profileData?.totalReservations}</Text>
            <Text style={styles.statLabel}>Réservations</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: '#22c55e15' }]}>
              <Ionicons name="checkmark-done-circle" size={18} color="#22c55e" />
            </View>
            <Text style={styles.statNumber}>{profileData?.completedReservations}</Text>
            <Text style={styles.statLabel}>Terminées</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: '#eab30815' }]}>
              <Ionicons name="star" size={18} color="#eab308" />
            </View>
            <Text style={styles.statNumber}>{profileData?.totalReviewsGiven}</Text>
            <Text style={styles.statLabel}>Avis donnés</Text>
          </View>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>À propos</Text>
        <View style={styles.card}>
          <Text style={styles.aboutText}>{profileData?.bio}</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accès rapide</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('ReservationsPage')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.primary + '15' }]}>
              <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.quickActionText}>Réservations</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#22c55e15' }]}>
              <Ionicons name="heart-outline" size={24} color="#22c55e" />
            </View>
            <Text style={styles.quickActionText}>Favoris</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#eab30815' }]}>
              <Ionicons name="notifications-outline" size={24} color="#eab308" />
            </View>
            <Text style={styles.quickActionText}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#8b5cf615' }]}>
              <Ionicons name="help-circle-outline" size={24} color="#8b5cf6" />
            </View>
            <Text style={styles.quickActionText}>Aide</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reviews Given Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes avis</Text>
          {profileData?.reviews?.length > 0 && (
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          )}
        </View>

        {profileData?.reviews?.length > 0 ? (
          profileData.reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewerAvatar}>
                  <Ionicons name="construct" size={20} color={Colors.primary} />
                </View>
                <View style={styles.reviewerInfo}>
                  <Text style={styles.reviewerName}>{review.workerName}</Text>
                  <View style={styles.reviewMeta}>
                    <View style={styles.reviewStars}>{renderStars(review.rating)}</View>
                    <Text style={styles.reviewDate}>
                      {new Date(review.date).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.reviewCommentBox}>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.noReviewsContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="star-outline" size={48} color={Colors.textTertiary} />
            </View>
            <Text style={styles.noReviewsTitle}>Aucun avis</Text>
            <Text style={styles.noReviewsText}>
              Vous n'avez pas encore donné d'avis
            </Text>
          </View>
        )}
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte</Text>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuItemIcon, { backgroundColor: Colors.primary + '15' }]}>
              <Ionicons name="person-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.menuItemText}>Modifier le profil</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuItemIcon, { backgroundColor: '#3b82f615' }]}>
              <Ionicons name="lock-closed-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={styles.menuItemText}>Sécurité</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuItemIcon, { backgroundColor: '#8b5cf615' }]}>
              <Ionicons name="card-outline" size={20} color="#8b5cf6" />
            </View>
            <Text style={styles.menuItemText}>Paiement</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutItem} onPress={handleLogout}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuItemIcon, { backgroundColor: '#ef444415' }]}>
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            </View>
            <Text style={styles.logoutText}>Déconnexion</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>

      {/* Bottom spacing */}
      <View style={{ height: 40 }} />
    </ScrollView>
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
    borderRadius: 12,
  },
  retryButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  header: {
    backgroundColor: Colors.headerBackground,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  settingsButton: {
    padding: 4,
  },

  // Profile Section
  profileSection: {
    backgroundColor: Colors.headerBackground,
    alignItems: 'center',
    paddingBottom: 40,
  },
  profilePictureContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  profilePicture: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary + '30',
  },
  memberBadge: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  memberText: {
    color: Colors.textLight,
    fontSize: 12,
    fontWeight: '600',
  },

  // Main Card
  mainCard: {
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
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    gap: 6,
  },
  infoRowText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },

  // Sections
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
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Card
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aboutText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },

  // Reviews
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
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  reviewCommentBox: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },

  // Empty state
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noReviewsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  noReviewsText: {
    fontSize: 14,
    color: Colors.textTertiary,
  },

  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ef444420',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.error,
  },
});

export default ProfilePage;