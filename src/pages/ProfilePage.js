import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, RefreshControl, TextInput, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import socketService from '../services/socketService';
import { Ionicons } from '@expo/vector-icons';
import CountryCodePicker from '../components/CountryCodePicker';
import ProfileImagePicker from '../components/ProfileImagePicker';
import PressableScale from '../components/ui/PressableScale';
import FadeIn from '../components/ui/FadeIn';
import { Stars } from '../components/reservations/ReservationParts';
import { titleCase } from '../utils/categoryMeta';
import { DEFAULT_COUNTRY, fullPhone, splitPhone } from '../utils/countries';
import {
  THEME, INK, MUTED, ProfileHeader, SectionHead, StatsRow, InfoRow, AccountTile, DangerButtons, BottomSheet, PasswordField, styles,
} from '../components/profile/ProfileParts';
import { LanguageSheet } from '../components/LanguagePicker';
import { languageLabel, t } from '../i18n';
import { formatDate, ltr } from '../i18n/format';

const REVIEWS_PREVIEW = 3;

// Reviews only store ids, so the name comes from the booking they belong to
const workerNameOf = (review, reservations) => {
  const booking = Array.isArray(reservations) && reservations.find((r) => r.id === review.reservationId);
  return (booking && booking.workerName) || t('common.professional');
};

const ProfilePage = ({ navigation }) => {
  const { user, logout, updateProfile } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [languageVisible, setLanguageVisible] = useState(false);

  // Edit profile modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCountry, setEditCountry] = useState(DEFAULT_COUNTRY);
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security (change password) modal
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

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
      let reviewsTotal = 0;
      try {
        const reviewsResponse = await apiService.getUserReviews();
        reviews = reviewsResponse.data?.reviews || [];
        reviewsTotal = reviewsResponse.data?.pagination?.total ?? reviews.length;
      } catch (reviewError) {
        console.log('No reviews found:', reviewError);
      }

      const totalReservations = Array.isArray(reservations) ? reservations.length : 0;
      const completedReservations = Array.isArray(reservations)
        ? reservations.filter((r) => String(r.status).toUpperCase() === 'COMPLETED').length
        : 0;
      const pendingReservations = Array.isArray(reservations)
        ? reservations.filter((r) => String(r.status).toUpperCase() === 'PENDING').length
        : 0;

      // Get avatar URL from user data
      const avatar = userData?.user?.avatar || userData?.avatar || null;
      setAvatarUrl(avatar);

      const combinedProfileData = {
        ...userData,
        memberSince: userData.user?.createdAt || userData.createdAt || null,
        totalReservations,
        completedReservations,
        pendingReservations,
        totalReviewsGiven: reviewsTotal,
        location: userData.user?.location || null,
        phone: userData.user?.phone || '',
        reviews: reviews.map((review) => ({
          id: review.id,
          workerName: workerNameOf(review, reservations),
          rating: review.rating || 0,
          comment: review.comment || '',
          date: review.createdAt,
        })),
      };

      setProfileData(combinedProfileData);
    } catch (error) {
      console.error('Failed to load profile:', error);
      setError(t('profile.loadFailed'));

      if (user) {
        setProfileData({
          name: user.name || t('common.user'),
          email: user.email || '',
          memberSince: null,
          totalReservations: 0,
          completedReservations: 0,
          pendingReservations: 0,
          totalReviewsGiven: 0,
          location: null,
          phone: '',
          reviews: [],
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Refresh stats whenever this tab regains focus (e.g. after completing a
  // reservation or submitting a review) so "Terminé"/"Avis donnés" stay current.
  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [])
  );

  // Also refresh live when a reservation status changes while this screen is open.
  useEffect(() => {
    const unsubscribe = socketService.onReservationUpdate(() => {
      loadProfile();
    });
    return unsubscribe;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      t('common.logout'),
      t('profile.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.logout'),
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.replace('Auth');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccount'),
      t('profile.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteAccount();
              await logout();
            } catch (err) {
              Alert.alert(t('common.error'), t('profile.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  const handleOpenEditProfile = () => {
    setEditName(profileData?.user?.name || '');
    const { country, number } = splitPhone(profileData?.user?.phone);
    setEditCountry(country);
    setEditPhone(number);
    setEditCity(profileData?.location?.city || '');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert(t('common.error'), t('profile.nameRequired'));
      return;
    }
    try {
      setSavingProfile(true);
      const updateData = {
        name: editName.trim(),
        phone: fullPhone(editCountry, editPhone),
      };
      if (editCity.trim()) {
        updateData.location = { city: editCity.trim() };
      }
      const result = await updateProfile(updateData);
      if (!result.success) {
        throw new Error(result.error);
      }
      await loadProfile();
      setEditModalVisible(false);
      Alert.alert(t('common.success'), t('profile.updated'));
    } catch (err) {
      console.error('Update profile error:', err);
      Alert.alert(t('common.error'), t('profile.updateFailed'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleOpenSecurity = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSecurityModalVisible(true);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), t('profile.fillAll'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordsMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('auth.passwordShort'));
      return;
    }
    try {
      setSavingPassword(true);
      await apiService.changePassword({ currentPassword, newPassword });
      setSecurityModalVisible(false);
      Alert.alert(t('common.success'), t('profile.passwordUpdated'));
    } catch (err) {
      console.error('Change password error:', err);
      Alert.alert(t('common.error'), err?.message || t('profile.wrongPassword'));
    } finally {
      setSavingPassword(false);
    }
  };

  const uploadAvatar = async (asset) => {
    try {
      setUploadingAvatar(true);

      // Create FormData with direct URI - NO blob/buffer conversion
      const formData = new FormData();
      
      formData.append('avatar', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: `avatar_${Date.now()}.jpg`,
      });

      // Upload to backend
      const response = await apiService.uploadAvatar(formData);

      if (response.success && response.avatarUrl) {
        setAvatarUrl(response.avatarUrl);
        Alert.alert(t('common.success'), t('profile.photoUpdated'));
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      Alert.alert(t('common.error'), t('profile.photoFailed'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={THEME} />
      </View>
    );
  }

  if (error && !profileData) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={52} color="#cbd5e1" />
        <Text style={styles.errorText}>{error}</Text>
        <PressableScale style={styles.retryBtn} onPress={loadProfile}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </PressableScale>
      </View>
    );
  }

  const name = profileData?.user?.name || profileData?.name || user?.name;
  const email = profileData?.user?.email || profileData?.email;
  const phone = profileData?.user?.phone;
  const city = profileData?.location?.city || profileData?.location?.address;
  const memberSince = profileData?.memberSince
    ? formatDate(profileData.memberSince, { month: 'long', year: 'numeric' })
    : null;
  const reviews = profileData?.reviews || [];
  const shownReviews = showAllReviews ? reviews : reviews.slice(0, REVIEWS_PREVIEW);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME} />}
      >
        <ProfileHeader title={t('profile.myProfile')} onBell={() => navigation.navigate('Notifications')} />

        <View style={styles.body}>
          {/* Identity */}
          <FadeIn style={styles.identity}>
            <View style={styles.avatarRing}>
              {uploadingAvatar ? (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator size="small" color={THEME} />
                </View>
              ) : (
                <ProfileImagePicker imageUri={avatarUrl} name={name} onImageSelected={uploadAvatar} />
              )}
            </View>
            <View style={styles.identityInfo}>
              <View style={styles.identityTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName} numberOfLines={1}>{titleCase(name) || t('common.user')}</Text>
                  <View style={styles.rolePill}>
                    <Ionicons name="person" size={13} color={THEME} />
                    <Text style={styles.roleText}>{t('common.client')}</Text>
                  </View>
                </View>
                <PressableScale style={styles.editBtn} onPress={handleOpenEditProfile}>
                  <Ionicons name="pencil" size={15} color={INK} />
                  <Text style={styles.editBtnText}>{t('profile.edit')}</Text>
                </PressableScale>
              </View>
              {!!memberSince && (
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={15} color={INK} />
                  <Text style={styles.metaText} numberOfLines={1}>{t('profile.memberSince', { date: memberSince })}</Text>
                </View>
              )}
            </View>
          </FadeIn>

          <StatsRow
            delay={40}
            items={[
              { icon: 'calendar-outline', value: profileData?.totalReservations ?? 0, label: t('profile.reservations') },
              { icon: 'checkmark-done-outline', color: '#16a34a', value: profileData?.completedReservations ?? 0, label: t('profile.completed') },
              { icon: 'star-outline', color: '#f59e0b', value: profileData?.totalReviewsGiven ?? 0, label: t('profile.reviewsGiven') },
            ]}
          />

          {/* Information */}
          <FadeIn delay={80}>
            <SectionHead icon="person-outline" title={t('profile.myInfo')} />
            <View style={styles.card}>
              <InfoRow icon="call-outline" value={ltr(phone) || t('profile.addPhone')} onPress={handleOpenEditProfile} />
              <InfoRow icon="mail-outline" value={email || '—'} />
              <InfoRow icon="location-outline" label={t('common.city')} value={city || '—'} onPress={handleOpenEditProfile} last />
            </View>
          </FadeIn>

          {/* Reviews */}
          <FadeIn delay={120}>
            <SectionHead
              icon="star-outline"
              title={t('profile.myReviews')}
              right={reviews.length > REVIEWS_PREVIEW && (
                <PressableScale onPress={() => setShowAllReviews(!showAllReviews)}>
                  <Text style={styles.linkText}>{showAllReviews ? t('common.seeLess') : t('common.seeAll')}</Text>
                </PressableScale>
              )}
            />
            {shownReviews.length > 0 ? (
              shownReviews.map((review) => (
                <View key={review.id} style={[styles.card, styles.cardPad, local.review]}>
                  <View style={local.reviewTop}>
                    <Text style={local.reviewName} numberOfLines={1}>{titleCase(review.workerName)}</Text>
                    <Text style={local.reviewDate}>{formatDate(review.date)}</Text>
                  </View>
                  <Stars rating={review.rating} />
                  {!!review.comment && <Text style={local.reviewComment}>{review.comment}</Text>}
                </View>
              ))
            ) : (
              <View style={[styles.card, styles.cardPad]}>
                <Text style={[styles.bioText, { color: '#94a3b8' }]}>
                  {t('profile.noReviews')}
                </Text>
              </View>
            )}
          </FadeIn>

          {/* Account */}
          <FadeIn delay={160}>
            <SectionHead icon="shield-checkmark-outline" title={t('profile.security')} />
            <View style={styles.accountRow}>
              <AccountTile icon="calendar-outline" label={t('profile.tileReservations')} onPress={() => navigation.navigate('Reservations')} />
              <AccountTile icon="lock-closed-outline" label={t('profile.tilePassword')} onPress={handleOpenSecurity} />
              <AccountTile icon="notifications-outline" label={t('profile.tileNotifications')} onPress={() => navigation.navigate('Notifications')} />
            </View>
            <View style={[styles.card, { marginTop: 10 }]}>
              <InfoRow icon="language-outline" label={t('common.language')} value={languageLabel()} onPress={() => setLanguageVisible(true)} last />
            </View>
            <DangerButtons onLogout={handleLogout} onDelete={handleDeleteAccount} />
          </FadeIn>
        </View>
      </ScrollView>

      <LanguageSheet visible={languageVisible} onClose={() => setLanguageVisible(false)} />

      <BottomSheet visible={editModalVisible} title={t('profile.editTitle')} onClose={() => setEditModalVisible(false)}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('common.name')}</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color="#94a3b8" />
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder={t('auth.yourName')} placeholderTextColor="#94a3b8" />
          </View>
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('common.phone')}</Text>
          <View style={styles.inputWrapper}>
            <CountryCodePicker country={editCountry} onChange={setEditCountry} />
            <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder={t('profile.yourPhone')} placeholderTextColor="#94a3b8" keyboardType="phone-pad" />
          </View>
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('common.city')}</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="location-outline" size={18} color="#94a3b8" />
            <TextInput style={styles.input} value={editCity} onChangeText={setEditCity} placeholder={t('profile.yourCity')} placeholderTextColor="#94a3b8" />
          </View>
        </View>
        <PressableScale style={[styles.primaryBtn, savingProfile && styles.btnDisabled]} onPress={handleSaveProfile} disabled={savingProfile}>
          {savingProfile ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>{t('common.save')}</Text>}
        </PressableScale>
      </BottomSheet>

      <BottomSheet visible={securityModalVisible} title={t('profile.changePassword')} onClose={() => setSecurityModalVisible(false)}>
        <PasswordField label={t('profile.currentPassword')} value={currentPassword} onChangeText={setCurrentPassword} shown={showCurrentPw} onToggle={() => setShowCurrentPw(!showCurrentPw)} icon="lock-closed-outline" />
        <PasswordField label={t('profile.newPassword')} value={newPassword} onChangeText={setNewPassword} shown={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} icon="key-outline" />
        <PasswordField label={t('profile.confirmPassword')} value={confirmPassword} onChangeText={setConfirmPassword} shown={showConfirmPw} onToggle={() => setShowConfirmPw(!showConfirmPw)} icon="key-outline" />
        <PressableScale style={[styles.primaryBtn, savingPassword && styles.btnDisabled]} onPress={handleChangePassword} disabled={savingPassword}>
          {savingPassword ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>{t('common.update')}</Text>}
        </PressableScale>
      </BottomSheet>
    </>
  );
};

const local = StyleSheet.create({
  review: { marginBottom: 8, gap: 4 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  reviewName: { flex: 1, fontSize: 15, fontWeight: '700', color: INK },
  reviewDate: { fontSize: 12.5, color: MUTED },
  reviewComment: { fontSize: 14, lineHeight: 20, color: '#334155', marginTop: 2 },
});

export default ProfilePage;
