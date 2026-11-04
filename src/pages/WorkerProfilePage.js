import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, TextInput, Alert,
  KeyboardAvoidingView, Modal, Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ProfileImagePicker from '../components/ProfileImagePicker';
import PressableScale from '../components/ui/PressableScale';
import FadeIn from '../components/ui/FadeIn';
import { getCurrentCoords, reverseGeocodeCity } from '../utils/location';
import { categoryMeta, titleCase } from '../utils/categoryMeta';
import CountryCodePicker from '../components/CountryCodePicker';
import { DEFAULT_COUNTRY, fullPhone, splitPhone } from '../utils/countries';

const THEME = '#1d5ff0';
const NAVY = '#0b3fb3';
const NAVY_INK = '#0b2a6b';
const INK = '#0f172a';
const MUTED = '#64748b';
const SURFACE = '#f4f7fc';

export default function WorkerProfile({ navigation }) {
  const { logout, updateAvatar } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
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
  const services = profile?.services || [];
  const rate = profile?.hourlyRate;
  const years = profile?.experience;
  const openEdit = () => setIsEditing(true);

  const sectionHead = (icon, title, right) => (
    <View style={styles.sectionHead}>
      <Ionicons name={icon} size={21} color={THEME} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );

  const passwordField = (label, value, setValue, shown, setShown, icon) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name={icon} size={18} color="#94a3b8" />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder={label}
          placeholderTextColor="#94a3b8"
          secureTextEntry={!shown}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setShown(!shown)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // `value` sits on the right when the row also has a `label`
  const infoRow = ({ icon, label, value, onPress, last }) => {
    const Row = onPress ? PressableScale : View;
    return (
      <Row
        {...(onPress ? { onPress, scaleTo: 0.99 } : {})}
        style={[styles.infoRow, last && { borderBottomWidth: 0 }]}
      >
        <Ionicons name={icon} size={20} color={THEME} />
        <Text style={styles.infoText} numberOfLines={1}>{label || value}</Text>
        {!!label && <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>}
        {!!onPress && <Ionicons name="chevron-forward" size={17} color="#94a3b8" />}
      </Row>
    );
  };

  const bottomSheet = (visible, title, onClose, children) => (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.sheetOverlay} behavior="padding">
        <View style={[styles.sheetCard, { paddingBottom: 20 + insets.bottom }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={MUTED} />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#1a56db', NAVY]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={styles.header}>
          <View style={styles.headerGlow} />
          <View style={styles.headerTop}>
            <View style={styles.headerSide} />
            <View style={styles.brand}>
              <Image source={require('../assets/tool.png')} style={styles.brandLogo} />
              <View>
                <Text style={styles.brandName}>FixPro</Text>
                <Text style={styles.brandTagline}>Simple • Rapide • Fiable</Text>
              </View>
            </View>
            <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
              <PressableScale scaleTo={0.9} onPress={() => navigation.navigate('Notifications')}>
                <Ionicons name="notifications-outline" size={25} color="#fff" />
              </PressableScale>
            </View>
          </View>
          <Text style={styles.headerTitle}>Profil Technicien</Text>
        </LinearGradient>

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

          {/* Stats */}
          <FadeIn delay={40} style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statTop}>
                <Ionicons name="briefcase-outline" size={22} color={THEME} />
                <Text style={styles.statNumber}>{stats?.totalMissions ?? 0}</Text>
              </View>
              <Text style={styles.statLabel}>Interventions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statTop}>
                <Ionicons name="star-outline" size={22} color="#f59e0b" />
                <Text style={styles.statNumber}>{rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.statLabel}>Note moyenne</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statTop}>
                <Ionicons name="people-outline" size={22} color={THEME} />
                <Text style={styles.statNumber}>
                  {stats?.satisfactionRate == null ? '—' : `${stats.satisfactionRate}%`}
                </Text>
              </View>
              <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>Clients satisfaits</Text>
            </View>
          </FadeIn>

          {/* Location */}
          <FadeIn delay={80}>
            {sectionHead('location-outline', 'Ma position', (
              <View style={[styles.statusPill, !hasLocation && styles.statusPillOff]}>
                <View style={[styles.statusDot, !hasLocation && styles.statusDotOff]} />
                <Text style={[styles.statusText, !hasLocation && styles.statusTextOff]}>
                  {hasLocation ? 'Actif' : 'Inactif'}
                </Text>
              </View>
            ))}
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
            {sectionHead('information-circle-outline', 'À propos')}
            <PressableScale scaleTo={0.99} style={[styles.card, styles.cardPad]} onPress={openEdit}>
              <Text style={[styles.bioText, !profile?.bio?.trim() && { color: '#94a3b8' }]}>
                {profile?.bio?.trim() || 'Présentez-vous en quelques mots pour rassurer vos clients.'}
              </Text>
            </PressableScale>
          </FadeIn>

          {/* Services */}
          {services.length > 0 && (
            <FadeIn delay={160}>
              {sectionHead('layers-outline', 'Mes services')}
              <View style={styles.servicesGrid}>
                {services.map((s) => {
                  const meta = categoryMeta(s.category, { name: s.name });
                  const Icon = meta.lib === 'mci' ? MaterialCommunityIcons : Ionicons;
                  return (
                    <View key={s.id} style={[styles.serviceTile, { backgroundColor: meta.bg }]}>
                      <Icon name={meta.icon} size={27} color={meta.color} />
                      <Text style={[styles.serviceName, { color: meta.color }]} numberOfLines={1} adjustsFontSizeToFit>
                        {s.name}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </FadeIn>
          )}

          {/* Information */}
          <FadeIn delay={200}>
            {sectionHead('person-outline', 'Mes informations')}
            <View style={styles.card}>
              {infoRow({ icon: 'call-outline', value: profile?.user?.phone || '—', onPress: openEdit })}
              {infoRow({ icon: 'mail-outline', value: profile?.user?.email || '—' })}
              {infoRow({ icon: 'pricetag-outline', label: 'Tarif horaire', value: rate ? `${rate} TND` : '—', onPress: openEdit })}
              {infoRow({ icon: 'calendar-outline', label: "Années d'expérience", value: years ? `${years} ans` : '—', onPress: openEdit, last: true })}
            </View>
          </FadeIn>

          {/* Account */}
          <FadeIn delay={240}>
            {sectionHead('shield-checkmark-outline', 'Sécurité & Compte')}
            <View style={styles.accountRow}>
              <PressableScale style={[styles.card, styles.accountTile]} onPress={() => setPasswordOpen(true)}>
                <Ionicons name="lock-closed-outline" size={25} color={THEME} />
                <Text style={styles.accountText}>Changer le{'\n'}mot de passe</Text>
              </PressableScale>
              <PressableScale style={[styles.card, styles.accountTile]} onPress={() => navigation.navigate('Notifications')}>
                <Ionicons name="notifications-outline" size={25} color={THEME} />
                <Text style={styles.accountText}>Mes{'\n'}notifications</Text>
              </PressableScale>
            </View>

            <View style={styles.dangerRow}>
              <PressableScale style={styles.dangerBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                <Text style={styles.dangerText} numberOfLines={1} adjustsFontSizeToFit>Déconnexion</Text>
              </PressableScale>
              <PressableScale style={styles.dangerBtn} onPress={handleDeleteAccount}>
                <Ionicons name="trash-outline" size={20} color="#dc2626" />
                <Text style={styles.dangerText} numberOfLines={1} adjustsFontSizeToFit>Supprimer le compte</Text>
              </PressableScale>
            </View>
          </FadeIn>
        </View>
      </ScrollView>

      {bottomSheet(isEditing, 'Modifier le profil', handleCancelEdit, (
        <>
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
        </>
      ))}

      {bottomSheet(passwordOpen, 'Changer le mot de passe', () => setPasswordOpen(false), (
        <>
          {passwordField('Mot de passe actuel', currentPassword, setCurrentPassword, showCurrentPw, setShowCurrentPw, 'lock-closed-outline')}
          {passwordField('Nouveau mot de passe', newPassword, setNewPassword, showNewPw, setShowNewPw, 'key-outline')}
          {passwordField('Confirmer le mot de passe', confirmPassword, setConfirmPassword, showConfirmPw, setShowConfirmPw, 'key-outline')}
          <PressableScale style={[styles.primaryBtn, savingPassword && styles.btnDisabled]} onPress={handleChangePassword} disabled={savingPassword}>
            {savingPassword ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Mettre à jour</Text>}
          </PressableScale>
        </>
      ))}
    </>
  );
}

const cardShadow = {
  shadowColor: '#1e3a8a',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 1,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24, backgroundColor: SURFACE },
  errorText: { fontSize: 15, color: MUTED, textAlign: 'center' },
  retryBtn: { backgroundColor: THEME, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  retryText: { color: '#fff', fontWeight: '700' },

  // Header
  header: { paddingTop: 8, paddingBottom: 44, paddingHorizontal: 18, overflow: 'hidden' },
  headerGlow: {
    position: 'absolute', right: -80, top: -70, width: 260, height: 260,
    borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  headerSide: { width: 44 },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  brandLogo: { width: 44, height: 44 },
  brandName: { color: '#fff', fontSize: 23, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.4 },
  brandTagline: { color: 'rgba(255,255,255,0.88)', fontSize: 11.5, marginTop: -1 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 8 },

  // Body
  body: {
    backgroundColor: SURFACE, marginTop: -26, paddingHorizontal: 16, paddingTop: 16,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e6edf8', ...cardShadow },
  cardPad: { paddingHorizontal: 16, paddingVertical: 12 },

  // Identity
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarRing: { padding: 3, borderRadius: 46, backgroundColor: '#fff', ...cardShadow },
  avatarLoading: {
    width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#eef4ff',
  },
  identityInfo: { flex: 1 },
  identityTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  profileName: { color: NAVY_INK, fontSize: 19, fontWeight: '800', letterSpacing: -0.3, flexShrink: 1 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#e3edff',
  },
  roleText: { fontSize: 13, fontWeight: '700', color: THEME },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 12, borderWidth: 1, borderColor: '#cfdcf2', backgroundColor: '#fff',
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: INK, lineHeight: 15 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 9 },
  metaStrong: { fontSize: 13.5, fontWeight: '800', color: INK },
  metaText: { fontSize: 13, color: '#334155', flexShrink: 1 },
  metaDivider: { width: 1, height: 15, backgroundColor: '#cbd5e1', marginHorizontal: 6 },

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingVertical: 12, paddingHorizontal: 6,
    borderRadius: 16, backgroundColor: '#eaf1fd', borderWidth: 1, borderColor: '#dce7f9',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statNumber: { fontSize: 20, fontWeight: '800', color: NAVY_INK, letterSpacing: -0.3 },
  statLabel: { fontSize: 12.5, color: '#1e293b', marginTop: 4, fontWeight: '500' },
  statDivider: { width: 1, height: 38, backgroundColor: '#c9d8f2' },

  // Sections
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 8 },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: NAVY_INK, letterSpacing: -0.2 },
  linkText: { fontSize: 13, fontWeight: '700', color: THEME },

  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 4,
    borderRadius: 12, backgroundColor: '#22c55e',
  },
  statusPillOff: { backgroundColor: '#e2e8f0' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  statusDotOff: { backgroundColor: '#94a3b8' },
  statusText: { fontSize: 12.5, fontWeight: '700', color: '#fff' },
  statusTextOff: { color: '#475569' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11 },
  locationIcon: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: '#e8effb',
    alignItems: 'center', justifyContent: 'center',
  },
  locationTitle: { fontSize: 15, fontWeight: '700', color: INK },
  locationText: { fontSize: 12.5, lineHeight: 17, color: MUTED, marginTop: 1 },
  locationBtn: { paddingVertical: 6, paddingLeft: 4, minWidth: 40, alignItems: 'flex-end' },

  bioText: { fontSize: 14.5, lineHeight: 21, color: '#1e293b' },

  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceTile: { width: '31.8%', alignItems: 'center', gap: 5, paddingVertical: 11, paddingHorizontal: 6, borderRadius: 14 },
  serviceName: { fontSize: 13.5, fontWeight: '700' },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#eef2f8',
  },
  infoText: { flex: 1, fontSize: 14.5, fontWeight: '600', color: INK },
  infoValue: { fontSize: 14.5, color: THEME, fontWeight: '800', maxWidth: '50%' },

  accountRow: { flexDirection: 'row', gap: 10 },
  accountTile: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 13 },
  accountText: { fontSize: 13.5, fontWeight: '600', color: INK, textAlign: 'center', lineHeight: 17 },

  dangerRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  dangerBtn: {
    flex: 1, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingHorizontal: 8, borderRadius: 14, borderWidth: 1, borderColor: '#fca5a5', backgroundColor: '#fff5f5',
  },
  dangerText: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: '#dc2626' },

  // Bottom sheets
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.5)' },
  sheetCard: {
    maxHeight: '85%', padding: 20, backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: INK },

  fieldRow: { flexDirection: 'row', gap: 10 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 12.5, fontWeight: '600', color: MUTED, marginBottom: 6, marginLeft: 2 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14,
    paddingHorizontal: 14, height: 50,
  },
  input: { flex: 1, fontSize: 15, color: INK, paddingVertical: 0 },
  textAreaWrapper: { height: 104, alignItems: 'flex-start', paddingVertical: 12 },
  textArea: { height: '100%', textAlignVertical: 'top' },

  primaryBtn: {
    height: 50, borderRadius: 25, backgroundColor: THEME,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
