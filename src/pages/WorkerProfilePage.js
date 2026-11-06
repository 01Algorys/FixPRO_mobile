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
import { categoryMeta, titleCase } from '../utils/categoryMeta';
import CountryCodePicker from '../components/CountryCodePicker';
import { DEFAULT_COUNTRY, fullPhone, splitPhone } from '../utils/countries';
import {
  THEME, INK, ProfileHeader, SectionHead, StatsRow, InfoRow, AccountTile, VerificationCard, DangerButtons, BottomSheet, PasswordField, styles,
} from '../components/profile/ProfileParts';
import PortfolioGrid from '../components/profile/PortfolioGrid';
import { pickImage } from '../utils/pickImage';

const MAX_PORTFOLIO_IMAGES = 12;

export default function WorkerProfile({ navigation }) {
  const { logout, updateAvatar } = useAuth();
  const [profile, setProfile] = useState(null);
  const [categoryNames, setCategoryNames] = useState({});
  const [addingPhoto, setAddingPhoto] = useState(false);
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
        setCategoryNames(Object.fromEntries(categoryList.map((c) => [c.key, c.name])));
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
      setError('Impossible de charger le profil');
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
      Alert.alert('Erreur', 'Le numéro de téléphone est requis');
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
      
      Alert.alert('Succès', 'Profil mis à jour avec succès ✓');
    } catch (err) {
      console.error('[Profile] handleSaveProfile error:', err);
      Alert.alert('Erreur', 'Échec de la mise à jour. Réessayez.');
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
          'Position indisponible',
          "Impossible d'accéder à votre position. Vérifiez que la localisation est activée pour FixPro dans les réglages."
        );
        return;
      }

      await api.updateWorkerProfile({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      setHasLocation(true);
      reverseGeocodeCity(coords.latitude, coords.longitude).then(setPlaceName);
      Alert.alert('Succès', 'Votre position a été enregistrée. Les clients à proximité pourront désormais vous voir en priorité.');
    } catch (err) {
      console.error('[Profile] handleSetLocation error:', err);
      Alert.alert('Erreur', "Échec de l'enregistrement de la position. Réessayez.");
    } finally {
      setSettingLocation(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    try {
      setSavingPassword(true);
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOpen(false);
      Alert.alert('Succès', 'Mot de passe mis à jour avec succès ✓');
    } catch (err) {
      console.error('[Profile] handleChangePassword error:', err);
      Alert.alert('Erreur', err?.message ?? 'Mot de passe actuel incorrect');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAddPhoto = async () => {
    const asset = await pickImage({ title: 'Ajouter une réalisation' });
    if (!asset) return;
    try {
      setAddingPhoto(true);
      const res = await api.addPortfolioImage(asset);
      setProfile((prev) => ({ ...prev, portfolio: res.data.portfolio }));
    } catch (err) {
      Alert.alert('Envoi impossible', err.message || 'Réessayez.');
    } finally {
      setAddingPhoto(false);
    }
  };

  const handleRemovePhoto = (image) => {
    Alert.alert('Supprimer cette photo ?', 'Elle ne sera plus visible sur votre profil.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await api.removePortfolioImage(image.id);
            setProfile((prev) => ({ ...prev, portfolio: res.data.portfolio }));
          } catch (err) {
            Alert.alert('Suppression impossible', err.message || 'Réessayez.');
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
        Alert.alert('Succès', 'Photo de profil mise à jour avec succès');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la photo de profil');
    } finally {
      setUploadingAvatar(false);
    }
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
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible et toutes vos données seront perdues.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAccount();
              await logout();
            } catch (err) {
              Alert.alert('Erreur', 'La suppression du compte a échoué. Veuillez réessayer.');
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
          <Text style={styles.retryText}>Réessayer</Text>
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
        <ProfileHeader title="Profil Technicien" onBell={() => navigation.navigate('Notifications')} />

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
                    <Text style={styles.profileName} numberOfLines={1}>{titleCase(profile?.user?.name) || 'Technicien'}</Text>
                    {profile?.isVerified && <MaterialCommunityIcons name="check-decagram" size={19} color={THEME} />}
                  </View>
                  <View style={styles.rolePill}>
                    <MaterialCommunityIcons name="hard-hat" size={14} color={THEME} />
                    <Text style={styles.roleText}>Technicien</Text>
                  </View>
                </View>
                <PressableScale style={styles.editBtn} onPress={openEdit}>
                  <Ionicons name="pencil" size={15} color={INK} />
                  <Text style={styles.editBtnText}>Modifier{'\n'}le profil</Text>
                </PressableScale>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="star" size={15} color="#fbbf24" />
                <Text style={styles.metaStrong}>{rating.toFixed(1)}</Text>
                <Text style={styles.metaText}>({stats?.totalReviews ?? 0} avis)</Text>
                {!!years && (
                  <>
                    <View style={styles.metaDivider} />
                    <Ionicons name="briefcase-outline" size={15} color={INK} />
                    <Text style={styles.metaStrong}>{years}</Text>
                    <Text style={styles.metaText} numberOfLines={1}>ans d'expérience</Text>
                  </>
                )}
              </View>
            </View>
          </FadeIn>

          <StatsRow
            delay={40}
            items={[
              { icon: 'briefcase-outline', value: stats?.totalMissions ?? 0, label: 'Interventions' },
              { icon: 'star-outline', color: '#f59e0b', value: rating.toFixed(1), label: 'Note moyenne' },
              { icon: 'people-outline', value: stats?.satisfactionRate == null ? '—' : `${stats.satisfactionRate}%`, label: 'Clients satisfaits' },
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
              title="Ma position"
              right={(
              <View style={[styles.statusPill, !hasLocation && styles.statusPillOff]}>
                <View style={[styles.statusDot, !hasLocation && styles.statusDotOff]} />
                <Text style={[styles.statusText, !hasLocation && styles.statusTextOff]}>
                  {hasLocation ? 'Actif' : 'Inactif'}
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
                  {hasLocation ? placeName || 'Position enregistrée' : 'Aucune position'}
                </Text>
                <Text style={styles.locationText}>
                  {hasLocation
                    ? 'Vous êtes visible pour les clients dans cette zone.'
                    : 'Ajoutez-la pour apparaître dans les recherches.'}
                </Text>
              </View>
              <PressableScale onPress={handleSetLocation} disabled={settingLocation} style={styles.locationBtn}>
                {settingLocation ? (
                  <ActivityIndicator size="small" color={THEME} />
                ) : (
                  <Text style={styles.linkText}>{hasLocation ? 'Mettre à jour' : 'Définir'}</Text>
                )}
              </PressableScale>
            </View>
          </FadeIn>

          {/* About */}
          <FadeIn delay={120}>
            <SectionHead icon="information-circle-outline" title="À propos" />
            <PressableScale scaleTo={0.99} style={[styles.card, styles.cardPad]} onPress={openEdit}>
              <Text style={[styles.bioText, !profile?.bio?.trim() && { color: '#94a3b8' }]}>
                {profile?.bio?.trim() || 'Présentez-vous en quelques mots pour rassurer vos clients.'}
              </Text>
            </PressableScale>
          </FadeIn>

          {/* Past work */}
          <FadeIn delay={140}>
            <SectionHead icon="images-outline" title="Mes réalisations" />
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
              <SectionHead icon="layers-outline" title="Mes services" />
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
            <SectionHead icon="person-outline" title="Mes informations" />
            <View style={styles.card}>
              <InfoRow icon="call-outline" value={profile?.user?.phone || '—'} onPress={openEdit} />
              <InfoRow icon="mail-outline" value={profile?.user?.email || '—'} />
              <InfoRow icon="pricetag-outline" label="Tarif horaire" value={rate ? `${rate} TND` : '—'} onPress={openEdit} />
              <InfoRow icon="calendar-outline" label="Années d'expérience" value={years ? `${years} ans` : '—'} onPress={openEdit} last />
            </View>
          </FadeIn>

          {/* Account */}
          <FadeIn delay={240}>
            <SectionHead icon="shield-checkmark-outline" title="Sécurité & Compte" />
            <View style={styles.accountRow}>
              <AccountTile icon="lock-closed-outline" label={'Changer le\nmot de passe'} onPress={() => setPasswordOpen(true)} />
              <AccountTile icon="notifications-outline" label={'Mes\nnotifications'} onPress={() => navigation.navigate('Notifications')} />
            </View>
            <DangerButtons onLogout={handleLogout} onDelete={handleDeleteAccount} />
          </FadeIn>
        </View>
      </ScrollView>

      <BottomSheet visible={isEditing} title="Modifier le profil" onClose={handleCancelEdit}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Téléphone</Text>
            <View style={styles.inputWrapper}>
              <CountryCodePicker country={country} onChange={setCountry} />
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Téléphone" placeholderTextColor="#94a3b8" keyboardType="phone-pad" />
            </View>
          </View>
          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Expérience (ans)</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} value={experience} onChangeText={setExperience} placeholder="0" placeholderTextColor="#94a3b8" keyboardType="numeric" />
              </View>
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Tarif horaire (TND)</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} value={priceMin} onChangeText={setPriceMin} placeholder="0" placeholderTextColor="#94a3b8" keyboardType="numeric" />
              </View>
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>À propos</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Décrivez votre expérience..."
                placeholderTextColor="#94a3b8"
                multiline
              />
            </View>
          </View>
          <PressableScale style={[styles.primaryBtn, saving && styles.btnDisabled]} onPress={handleSaveProfile} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Enregistrer</Text>}
          </PressableScale>
      </BottomSheet>

      <BottomSheet visible={passwordOpen} title="Changer le mot de passe" onClose={() => setPasswordOpen(false)}>
        <PasswordField label="Mot de passe actuel" value={currentPassword} onChangeText={setCurrentPassword} shown={showCurrentPw} onToggle={() => setShowCurrentPw(!showCurrentPw)} icon="lock-closed-outline" />
        <PasswordField label="Nouveau mot de passe" value={newPassword} onChangeText={setNewPassword} shown={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} icon="key-outline" />
        <PasswordField label="Confirmer le mot de passe" value={confirmPassword} onChangeText={setConfirmPassword} shown={showConfirmPw} onToggle={() => setShowConfirmPw(!showConfirmPw)} icon="key-outline" />
          <PressableScale style={[styles.primaryBtn, savingPassword && styles.btnDisabled]} onPress={handleChangePassword} disabled={savingPassword}>
            {savingPassword ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Mettre à jour</Text>}
          </PressableScale>
      </BottomSheet>
    </>
  );
}
