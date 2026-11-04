import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, TextInput, Alert,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ProfileImagePicker from '../components/ProfileImagePicker';
import PressableScale from '../components/ui/PressableScale';
import FadeIn from '../components/ui/FadeIn';
import { getCurrentCoords } from '../utils/location';
import { professionTitle, titleCase } from '../utils/categoryMeta';
import CountryCodePicker from '../components/CountryCodePicker';
import { DEFAULT_COUNTRY, fullPhone, splitPhone } from '../utils/countries';

const { width } = Dimensions.get('window');
const THEME = '#1d5ff0';
const NAVY = '#0b3fb3';
const INK = '#0f172a';
const MUTED = '#64748b';
const SURFACE = '#f4f7fc';

export default function WorkerProfile({ navigation }) {
  const { logout, updateAvatar } = useAuth();
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
      setHasLocation(
        typeof profileData?.latitude === 'number' && typeof profileData?.longitude === 'number'
      );
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
  const specialty = professionTitle(profile?.services?.[0]?.category, profile?.services?.[0]?.name);
  const serviceNames = (profile?.services || []).map((s) => s?.name).filter(Boolean);

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

  const infoRow = (icon, label, value, last) => (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={17} color={THEME} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <LinearGradient colors={['#1a56db', NAVY]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={styles.header}>
          <View style={styles.headerGlow} />
          <Text style={styles.headerTitle}>Mon profil</Text>

          <View style={styles.avatarRing}>
            {uploadingAvatar ? (
              <View style={styles.avatarLoading}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            ) : (
              <ProfileImagePicker imageUri={avatarUrl} onImageSelected={handleImageSelected} />
            )}
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.profileName} numberOfLines={1}>{titleCase(profile?.user?.name) || 'Technicien'}</Text>
            {profile?.isVerified && <MaterialCommunityIcons name="check-decagram" size={20} color={ACCENT_GREEN} />}
          </View>
          <Text style={styles.profileSpecialty}>{specialty}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={14} color="#fbbf24" />
            <Text style={styles.profileMeta}>
              {rating.toFixed(1)} ({stats?.totalReviews ?? 0} avis)
              {profile?.experience ? `  •  ${profile.experience} ans d'expérience` : ''}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Stats */}
          <FadeIn style={[styles.card, styles.statsRow]}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.totalMissions ?? 0}</Text>
              <Text style={styles.statLabel}>Interventions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Note moyenne</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {stats?.satisfactionRate == null ? '—' : `${stats.satisfactionRate}%`}
              </Text>
              <Text style={styles.statLabel}>Satisfaits</Text>
            </View>
          </FadeIn>

          {/* Services */}
          {serviceNames.length > 0 && (
            <FadeIn delay={40}>
              <Text style={styles.sectionLabel}>Mes services</Text>
              <View style={[styles.card, styles.chipsCard]}>
                {serviceNames.map((n) => (
                  <View key={n} style={styles.chip}>
                    <Ionicons name="checkmark-circle" size={15} color={THEME} />
                    <Text style={styles.chipText}>{n}</Text>
                  </View>
                ))}
              </View>
            </FadeIn>
          )}

          {/* Location */}
          <FadeIn delay={80}>
            <Text style={styles.sectionLabel}>Ma position</Text>
            <View style={[styles.card, styles.cardPad]}>
              <View style={styles.locationRow}>
                <View style={[styles.locationIcon, hasLocation && styles.locationIconOn]}>
                  <Ionicons name={hasLocation ? 'location' : 'location-outline'} size={20} color={hasLocation ? '#16a34a' : '#94a3b8'} />
                </View>
                <Text style={styles.locationText}>
                  {hasLocation
                    ? 'Position enregistrée. Vous êtes proposé aux clients à proximité.'
                    : 'Aucune position enregistrée. Ajoutez-la pour apparaître dans les recherches près de chez vous.'}
                </Text>
              </View>
              <PressableScale
                style={[styles.secondaryBtn, settingLocation && styles.btnDisabled]}
                onPress={handleSetLocation}
                disabled={settingLocation}
              >
                {settingLocation ? (
                  <ActivityIndicator size="small" color={THEME} />
                ) : (
                  <>
                    <Ionicons name="locate" size={17} color={THEME} />
                    <Text style={styles.secondaryBtnText}>
                      {hasLocation ? 'Mettre à jour ma position' : 'Définir ma position'}
                    </Text>
                  </>
                )}
              </PressableScale>
            </View>
          </FadeIn>

          {/* Information */}
          <FadeIn delay={120}>
            <View style={styles.sectionLabelRow}>
              <Text style={styles.sectionLabel}>Mes informations</Text>
              <PressableScale onPress={isEditing ? handleCancelEdit : () => setIsEditing(true)} style={styles.linkBtn}>
                <Text style={[styles.linkText, isEditing && { color: '#dc2626' }]}>
                  {isEditing ? 'Annuler' : 'Modifier'}
                </Text>
              </PressableScale>
            </View>

            {!isEditing ? (
              <View style={styles.card}>
                {infoRow('call-outline', 'Téléphone', profile?.user?.phone || '—')}
                {infoRow('briefcase-outline', 'Expérience', profile?.experience ? `${profile.experience} ans` : '—')}
                {infoRow('pricetag-outline', 'Tarif horaire', profile?.hourlyRate ? `${profile.hourlyRate} TND` : '—')}
                <View style={styles.bioBlock}>
                  <Text style={styles.bioLabel}>À propos</Text>
                  <Text style={[styles.bioText, !profile?.bio && { color: '#94a3b8' }]}>
                    {profile?.bio?.trim() || 'Présentez-vous en quelques mots pour rassurer vos clients.'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.card, styles.cardPad]}>
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
              </View>
            )}
          </FadeIn>

          {/* Account */}
          <FadeIn delay={160}>
            <Text style={styles.sectionLabel}>Compte</Text>
            <View style={styles.card}>
              <PressableScale scaleTo={0.99} onPress={() => setPasswordOpen((v) => !v)} style={[styles.menuRow, passwordOpen && styles.menuRowOpen]}>
                <View style={styles.infoIcon}>
                  <Ionicons name="lock-closed-outline" size={17} color={THEME} />
                </View>
                <Text style={styles.menuText}>Changer le mot de passe</Text>
                <Ionicons name={passwordOpen ? 'chevron-up' : 'chevron-forward'} size={18} color="#94a3b8" />
              </PressableScale>

              {passwordOpen && (
                <View style={styles.passwordPanel}>
                  {passwordField('Mot de passe actuel', currentPassword, setCurrentPassword, showCurrentPw, setShowCurrentPw, 'lock-closed-outline')}
                  {passwordField('Nouveau mot de passe', newPassword, setNewPassword, showNewPw, setShowNewPw, 'key-outline')}
                  {passwordField('Confirmer le mot de passe', confirmPassword, setConfirmPassword, showConfirmPw, setShowConfirmPw, 'key-outline')}
                  <PressableScale style={[styles.primaryBtn, savingPassword && styles.btnDisabled]} onPress={handleChangePassword} disabled={savingPassword}>
                    {savingPassword ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Mettre à jour</Text>}
                  </PressableScale>
                </View>
              )}

              <PressableScale scaleTo={0.99} onPress={handleLogout} style={[styles.menuRow, { borderBottomWidth: 0 }]}>
                <View style={[styles.infoIcon, { backgroundColor: '#fef2f2' }]}>
                  <Ionicons name="log-out-outline" size={17} color="#dc2626" />
                </View>
                <Text style={[styles.menuText, { color: '#dc2626' }]}>Déconnexion</Text>
              </PressableScale>
            </View>

            <PressableScale onPress={handleDeleteAccount} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>Supprimer mon compte</Text>
            </PressableScale>
          </FadeIn>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ACCENT_GREEN = '#4ade80';

const cardShadow = {
  shadowColor: '#1e3a8a',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 2,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24, backgroundColor: SURFACE },
  errorText: { fontSize: 15, color: MUTED, textAlign: 'center' },
  retryBtn: { backgroundColor: THEME, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  retryText: { color: '#fff', fontWeight: '700' },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 62,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute', right: -80, top: -70, width: 260, height: 260,
    borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 18 },
  avatarRing: {
    padding: 4, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.18)',
  },
  avatarLoading: {
    width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  profileName: { color: '#fff', fontSize: 23, fontWeight: '800', letterSpacing: -0.4, flexShrink: 1 },
  profileSpecialty: { color: '#bfdbfe', fontSize: 14.5, fontWeight: '600', marginTop: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  profileMeta: { color: 'rgba(255,255,255,0.88)', fontSize: 13 },

  // Body
  body: { paddingHorizontal: 16, marginTop: -40 },
  card: { backgroundColor: '#fff', borderRadius: 20, ...cardShadow },
  cardPad: { padding: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 21, fontWeight: '800', color: INK, letterSpacing: -0.3 },
  statLabel: { fontSize: 12, color: MUTED, marginTop: 3, fontWeight: '500' },
  statDivider: { width: 1, height: 32, backgroundColor: '#e2e8f0' },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: 24, marginBottom: 10, marginLeft: 4,
  },
  linkBtn: { marginTop: 24, marginBottom: 10, paddingHorizontal: 4 },
  linkText: { fontSize: 14.5, fontWeight: '700', color: THEME },

  chipsCard: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#eef4ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
  },
  chipText: { fontSize: 13.5, color: INK, fontWeight: '600' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  locationIcon: {
    width: 42, height: 42, borderRadius: 13, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  locationIconOn: { backgroundColor: '#e7f7ec' },
  locationText: { flex: 1, fontSize: 13.5, lineHeight: 19, color: '#334155' },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  infoIcon: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#eef4ff',
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { flex: 1, fontSize: 14.5, color: '#334155' },
  infoValue: { fontSize: 14.5, color: INK, fontWeight: '700', maxWidth: '50%' },
  bioBlock: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  bioLabel: { fontSize: 12.5, color: MUTED, fontWeight: '600', marginBottom: 6 },
  bioText: { fontSize: 14.5, lineHeight: 21, color: '#334155' },

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
  secondaryBtn: {
    flexDirection: 'row', gap: 8, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef4ff',
  },
  secondaryBtnText: { color: THEME, fontSize: 14.5, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff', borderRadius: 20,
  },
  menuRowOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  menuText: { flex: 1, fontSize: 15, fontWeight: '600', color: INK },
  passwordPanel: { padding: 16, paddingTop: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },

  deleteBtn: { alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 20, marginTop: 10 },
  deleteText: { fontSize: 13.5, color: '#94a3b8', fontWeight: '600', textDecorationLine: 'underline' },
});
