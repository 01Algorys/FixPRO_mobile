import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, StatusBar, TextInput, Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ProfileImagePicker from '../components/ProfileImagePicker';
import PressableScale from '../components/ui/PressableScale';
import FadeIn from '../components/ui/FadeIn';
import { getCurrentCoords, reverseGeocodeCity } from '../utils/location';
import { categoryMeta, titleCase, categoryName } from '../utils/categoryMeta';
import CountryCodePicker from '../components/CountryCodePicker';
import { DEFAULT_COUNTRY, fullPhone, splitPhone } from '../utils/countries';
import {
  THEME, INK, ProfileHeader, SectionHead, StatsRow, InfoRow, AccountTile, VerificationCard, DangerButtons, BottomSheet, PasswordField, styles,
} from '../components/profile/ProfileParts';
import PortfolioGrid from '../components/profile/PortfolioGrid';
import { pickImage } from '../utils/pickImage';
import { LanguageSheet } from '../components/LanguagePicker';
import { languageLabel, t } from '../i18n';
import { formatRating, formatPrice, ltr } from '../i18n/format';

const MAX_PORTFOLIO_IMAGES = 12;

export default function WorkerProfile({ navigation }) {
  const { logout, updateAvatar } = useAuth();
  const [profile, setProfile] = useState(null);
  const [categoryNames, setCategoryNames] = useState({});
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [languageVisible, setLanguageVisible] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState('');
  const applyPhone = (value) => {
    const parts = splitPhone(value);
    setCountry(parts.country);
    setPhone(parts.number);
  };
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  
  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  // Location (used to suggest this worker to nearby clients)
  const [hasLocation, setHasLocation] = useState(false);
  const [settingLocation, setSettingLocation] = useState(false);
  const [placeName, setPlaceName] = useState(null);

  const fetchProfile = async () => {
    try {
      setError(null);
      const response = await api.getWorkerProfile();
      const profileData = response?.data || response;
      setProfile(profileData);

      // Names managed in the dashboard; the service names themselves are not shown
      const categoriesResponse = await api.getPublicCategories().catch(() => null);
      const categoryList = categoriesResponse?.data || categoriesResponse;
      if (Array.isArray(categoryList)) {
        setCategoryNames(Object.fromEntries(categoryList.map((c) => [c.key, categoryName(c.key, c.name)])));
      }
      
      // Calculate stats from profile data
      const statsData = {
        totalMissions: profileData?.jobsCompleted || profileData?.interventions || 0,
        totalReviews: profileData?.totalReviews || 0,
        satisfactionRate: null,
      };
      setStats(statsData);

      // Share of 4★+ reviews; loaded separately so a slow reviews call never blocks the page
      if (profileData?.id) {
        api.getWorkerReviewsPublic(profileData.id)
          .then((res) => {
            const list = res?.data?.reviews || res?.reviews || [];
            if (!list.length) return;
            const happy = list.filter((r) => (r.rating || 0) >= 4).length;
            setStats((prev) => ({ ...prev, satisfactionRate: Math.round((happy / list.length) * 100) }));
          })
          .catch(() => {});
      }
      
      // Populate editable fields
      applyPhone(profileData?.user?.phone);
      setBio(profileData?.bio ?? '');
      setExperience(String(profileData?.experience ?? ''));
      setPriceMin(String(profileData?.hourlyRate ?? ''));
      setPriceMax(String(profileData?.hourlyRate ?? ''));
      
      // Set current avatar URL
      setAvatarUrl(profileData?.user?.avatar ?? null);

      // Location is used to suggest this worker to nearby clients
      const located = typeof profileData?.latitude === 'number' && typeof profileData?.longitude === 'number';
      setHasLocation(located);
      if (located) reverseGeocodeCity(profileData.latitude, profileData.longitude).then(setPlaceName);
    } catch (err) {
      console.error('[Profile] fetchProfile error:', err);
      setError(t('profile.loadFailedShort'));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProfile();
    }, [])
  );

  const handleCancelEdit = () => {
    // Reset fields to original values
    applyPhone(profile?.user?.phone);
    setBio(profile?.bio ?? '');
    setExperience(String(profile?.experience ?? ''));
    setPriceMin(String(profile?.hourlyRate ?? ''));
    setPriceMax(String(profile?.hourlyRate ?? ''));
    setAvatarUrl(profile?.user?.avatar ?? null);
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!phone.trim()) {
      Alert.alert(t('common.error'), t('profile.phoneRequired'));
      return;
    }
    try {
      setSaving(true);
      
      // Prepare update data
      const updateData = {
        phone: fullPhone(country, phone),
        bio: bio.trim(),
        experience: parseInt(experience) || 0,
        hourlyRate: parseFloat(priceMin) || 0,
      };
      
      await api.updateWorkerProfile(updateData);
      
      await fetchProfile();
      setIsEditing(false);
      
      Alert.alert(t('common.success'), t('profile.updatedCheck'));
    } catch (err) {
      console.error('[Profile] handleSaveProfile error:', err);
      Alert.alert(t('common.error'), t('profile.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSetLocation = async () => {
    try {
      setSettingLocation(true);
      const coords = await getCurrentCoords();

      if (!coords) {
        Alert.alert(
          t('wprofile.positionUnavailable'),
          t('wprofile.positionDenied')
        );
        return;
      }

      await api.updateWorkerProfile({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      setHasLocation(true);
      reverseGeocodeCity(coords.latitude, coords.longitude).then(setPlaceName);
      Alert.alert(t('common.success'), t('wprofile.positionSaved'));
    } catch (err) {
      console.error('[Profile] handleSetLocation error:', err);
      Alert.alert(t('common.error'), t('wprofile.positionFailed'));
    } finally {
      setSettingLocation(false);
    }
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
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOpen(false);
      Alert.alert(t('common.success'), t('profile.passwordUpdatedCheck'));
    } catch (err) {
      console.error('[Profile] handleChangePassword error:', err);
      Alert.alert(t('common.error'), err?.message ?? t('profile.wrongPassword'));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAddPhoto = async () => {
    const asset = await pickImage({ title: t('wprofile.addWork') });
    if (!asset) return;
    try {
      setAddingPhoto(true);
      const res = await api.addPortfolioImage(asset);
      setProfile((prev) => ({ ...prev, portfolio: res.data.portfolio }));
    } catch (err) {
      Alert.alert(t('wprofile.uploadFailed'), err.message || t('common.tryAgain'));
    } finally {
      setAddingPhoto(false);
    }
  };

  const handleRemovePhoto = (image) => {
    Alert.alert(t('wprofile.deletePhotoTitle'), t('wprofile.deletePhotoHint'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await api.removePortfolioImage(image.id);
            setProfile((prev) => ({ ...prev, portfolio: res.data.portfolio }));
          } catch (err) {
            Alert.alert(t('wprofile.deleteFailed'), err.message || t('common.tryAgain'));
          }
        },
      },
    ]);
  };

  const handleImageSelected = async (asset) => {
    // Asset object contains: uri, mimeType, width, height, etc.
    await uploadAvatar(asset);
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
      const response = await api.uploadAvatar(formData);

      if (response.success && response.avatarUrl) {
        setAvatarUrl(response.avatarUrl);
        // Update avatar in auth context
        await updateAvatar(response.avatarUrl);
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

  const handleLogout = () => {
    Alert.alert(
      t('common.logout'),
      t('profile.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.logout'),
          style: 'destructive',
          onPress: async () => {
            await logout();
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
              await api.deleteAccount();
              await logout();
            } catch (err) {
              Alert.alert(t('common.error'), t('profile.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={THEME} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={52} color="#cbd5e1" />
        <Text style={styles.errorText}>{error}</Text>
        <PressableScale style={styles.retryBtn} onPress={() => { setLoading(true); fetchProfile(); }}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </PressableScale>
      </View>
    );
  }

  const rating = Number(profile?.averageRating || 0);
  const trades = [...new Set((profile?.services || []).map((s) => s?.category).filter(Boolean))];
  const rate = profile?.hourlyRate;
  const years = profile?.experience;
  const openEdit = () => setIsEditing(true);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <ProfileHeader title={t('wprofile.title')} onBell={() => navigation.navigate('Notifications')} />

        <View style={styles.body}>
          {/* Identity */}
          <FadeIn style={styles.identity}>
            <View style={styles.avatarRing}>
              {uploadingAvatar ? (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator size="small" color={THEME} />
                </View>
              ) : (
                <ProfileImagePicker imageUri={avatarUrl} name={profile?.user?.name} onImageSelected={handleImageSelected} />
              )}
            </View>
            <View style={styles.identityInfo}>
              <View style={styles.identityTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.profileName} numberOfLines={1}>{titleCase(profile?.user?.name) || t('common.technician')}</Text>
                    {profile?.isVerified && <MaterialCommunityIcons name="check-decagram" size={19} color={THEME} />}
                  </View>
                  <View style={styles.rolePill}>
                    <MaterialCommunityIcons name="hard-hat" size={14} color={THEME} />
                    <Text style={styles.roleText}>{t('common.technician')}</Text>
                  </View>
                </View>
                <PressableScale style={styles.editBtn} onPress={openEdit}>
                  <Ionicons name="pencil" size={15} color={INK} />
                  <Text style={styles.editBtnText}>{t('profile.edit')}</Text>
                </PressableScale>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="star" size={15} color="#fbbf24" />
                <Text style={styles.metaStrong}>{formatRating(rating)}</Text>
                <Text style={styles.metaText}>{t('common.reviewCountParen', { count: stats?.totalReviews ?? 0 })}</Text>
                {!!years && (
                  <>
                    <View style={styles.metaDivider} />
                    <Ionicons name="briefcase-outline" size={15} color={INK} />
                    <Text style={styles.metaText} numberOfLines={1}>{t('common.yearsExperience', { count: years })}</Text>
                  </>
                )}
              </View>
            </View>
          </FadeIn>

          <StatsRow
            delay={40}
            items={[
              { icon: 'briefcase-outline', value: stats?.totalMissions ?? 0, label: t('wprofile.interventions') },
              { icon: 'star-outline', color: '#f59e0b', value: formatRating(rating), label: t('wprofile.averageRating') },
              { icon: 'people-outline', value: stats?.satisfactionRate == null ? '—' : `${stats.satisfactionRate}%`, label: t('wprofile.satisfied') },
            ]}
          />

          {/* Verified badge */}
          {!!profile?.verification && (
            <FadeIn delay={60} style={{ marginTop: 14 }}>
              <VerificationCard
                verified={profile.isVerified}
                verification={profile.verification}
                onPress={() => navigation.navigate('VerificationDocuments')}
              />
            </FadeIn>
          )}

          {/* Location */}
          <FadeIn delay={80}>
            <SectionHead
              icon="location-outline"
              title={t('common.myPosition')}
              right={(
              <View style={[styles.statusPill, !hasLocation && styles.statusPillOff]}>
                <View style={[styles.statusDot, !hasLocation && styles.statusDotOff]} />
                <Text style={[styles.statusText, !hasLocation && styles.statusTextOff]}>
                  {hasLocation ? t('wprofile.active') : t('wprofile.inactive')}
                </Text>
              </View>
              )}
            />
            <View style={[styles.card, styles.locationRow]}>
              <View style={styles.locationIcon}>
                <Ionicons name="location-outline" size={21} color={INK} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationTitle} numberOfLines={1}>
                  {hasLocation ? placeName || t('wprofile.positionSavedTitle') : t('wprofile.noPosition')}
                </Text>
                <Text style={styles.locationText}>
                  {hasLocation
                    ? t('wprofile.visible')
                    : t('wprofile.addPositionHint')}
                </Text>
              </View>
              <PressableScale onPress={handleSetLocation} disabled={settingLocation} style={styles.locationBtn}>
                {settingLocation ? (
                  <ActivityIndicator size="small" color={THEME} />
                ) : (
                  <Text style={styles.linkText}>{hasLocation ? t('common.update') : t('wprofile.define')}</Text>
                )}
              </PressableScale>
            </View>
          </FadeIn>

          {/* About */}
          <FadeIn delay={120}>
            <SectionHead icon="information-circle-outline" title={t('wprofile.about')} />
            <PressableScale scaleTo={0.99} style={[styles.card, styles.cardPad]} onPress={openEdit}>
              <Text style={[styles.bioText, !profile?.bio?.trim() && { color: '#94a3b8' }]}>
                {profile?.bio?.trim() || t('wprofile.aboutPlaceholder')}
              </Text>
            </PressableScale>
          </FadeIn>

          {/* Past work */}
          <FadeIn delay={140}>
            <SectionHead icon="images-outline" title={t('wprofile.myWork')} />
            <PortfolioGrid
              images={Array.isArray(profile?.portfolio) ? profile.portfolio : []}
              max={MAX_PORTFOLIO_IMAGES}
              adding={addingPhoto}
              onAdd={handleAddPhoto}
              onRemove={handleRemovePhoto}
            />
          </FadeIn>

          {/* Services */}
          {trades.length > 0 && (
            <FadeIn delay={160}>
              <SectionHead icon="layers-outline" title={t('wprofile.myServices')} />
              <View style={styles.servicesGrid}>
                {trades.map((key) => {
                  const meta = categoryMeta(key, { name: categoryNames[key] });
                  const Icon = meta.lib === 'mci' ? MaterialCommunityIcons : Ionicons;
                  return (
                    <View key={key} style={[styles.serviceTile, { backgroundColor: meta.bg }]}>
                      <Icon name={meta.icon} size={27} color={meta.color} />
                      <Text style={[styles.serviceName, { color: meta.color }]} numberOfLines={1} adjustsFontSizeToFit>
                        {categoryNames[key] || meta.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </FadeIn>
          )}

          {/* Information */}
          <FadeIn delay={200}>
            <SectionHead icon="person-outline" title={t('profile.myInfo')} />
            <View style={styles.card}>
              <InfoRow icon="call-outline" value={ltr(profile?.user?.phone) || '—'} onPress={openEdit} />
              <InfoRow icon="mail-outline" value={profile?.user?.email || '—'} />
              <InfoRow icon="pricetag-outline" label={t('wprofile.hourlyRate')} value={rate ? formatPrice(rate) : '—'} onPress={openEdit} />
              <InfoRow icon="calendar-outline" label={t('wprofile.yearsExperience')} value={years ? t('wprofile.years', { count: years }) : '—'} onPress={openEdit} last />
            </View>
          </FadeIn>

          {/* Account */}
          <FadeIn delay={240}>
            <SectionHead icon="shield-checkmark-outline" title={t('profile.security')} />
            <View style={styles.accountRow}>
              <AccountTile icon="lock-closed-outline" label={t('profile.tilePassword')} onPress={() => setPasswordOpen(true)} />
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

      <BottomSheet visible={isEditing} title={t('profile.editTitle')} onClose={handleCancelEdit}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('common.phone')}</Text>
            <View style={styles.inputWrapper}>
              <CountryCodePicker country={country} onChange={setCountry} />
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder={t('common.phone')} placeholderTextColor="#94a3b8" keyboardType="phone-pad" />
            </View>
          </View>
          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>{t('wprofile.experienceField')}</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} value={experience} onChangeText={setExperience} placeholder="0" placeholderTextColor="#94a3b8" keyboardType="numeric" />
              </View>
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>{t('wprofile.hourlyRateField')}</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} value={priceMin} onChangeText={setPriceMin} placeholder="0" placeholderTextColor="#94a3b8" keyboardType="numeric" />
              </View>
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('wprofile.about')}</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder={t('wprofile.describePlaceholder')}
                placeholderTextColor="#94a3b8"
                multiline
              />
            </View>
          </View>
          <PressableScale style={[styles.primaryBtn, saving && styles.btnDisabled]} onPress={handleSaveProfile} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>{t('common.save')}</Text>}
          </PressableScale>
      </BottomSheet>

      <BottomSheet visible={passwordOpen} title={t('profile.changePassword')} onClose={() => setPasswordOpen(false)}>
        <PasswordField label={t('profile.currentPassword')} value={currentPassword} onChangeText={setCurrentPassword} shown={showCurrentPw} onToggle={() => setShowCurrentPw(!showCurrentPw)} icon="lock-closed-outline" />
        <PasswordField label={t('profile.newPassword')} value={newPassword} onChangeText={setNewPassword} shown={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} icon="key-outline" />
        <PasswordField label={t('profile.confirmPassword')} value={confirmPassword} onChangeText={setConfirmPassword} shown={showConfirmPw} onToggle={() => setShowConfirmPw(!showConfirmPw)} icon="key-outline" />
          <PressableScale style={[styles.primaryBtn, savingPassword && styles.btnDisabled]} onPress={handleChangePassword} disabled={savingPassword}>
            {savingPassword ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>{t('common.update')}</Text>}
          </PressableScale>
      </BottomSheet>
    </>
  );
}
