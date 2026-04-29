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

const { width } = Dimensions.get('window');
const THEME = '#1a2f5e';

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
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  
  // Avatar state
  const [avatarBase64, setAvatarBase64] = useState(null);
  const [hasAvatarChanged, setHasAvatarChanged] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchProfile = async () => {
    try {
      setError(null);
      const response = await api.getWorkerProfile();
      const profileData = response?.data || response;
      console.log(profileData)
      setProfile(profileData);
      
      // Calculate stats from profile data
      const statsData = {
        totalMissions: profileData?.jobsCompleted || profileData?.interventions || 0,
        totalReviews: profileData?.totalReviews || 0,
        satisfactionRate: profileData?.satisfactionRate || 100,
      };
      setStats(statsData);
      
      // Populate editable fields
      setPhone(profileData?.user?.phone ?? '');
      setBio(profileData?.bio ?? '');
      setExperience(String(profileData?.experience ?? ''));
      setPriceMin(String(profileData?.hourlyRate ?? ''));
      setPriceMax(String(profileData?.hourlyRate ?? ''));
      
      // Set current avatar
      setAvatarBase64(profileData?.user?.avatar ?? null);
      setHasAvatarChanged(false);
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
    setPhone(profile?.user?.phone ?? '');
    setBio(profile?.bio ?? '');
    setExperience(String(profile?.experience ?? ''));
    setPriceMin(String(profile?.hourlyRate ?? ''));
    setPriceMax(String(profile?.hourlyRate ?? ''));
    setAvatarBase64(profile?.user?.avatar ?? null);
    setHasAvatarChanged(false);
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
        phone: phone.trim(),
        bio: bio.trim(),
        experience: parseInt(experience) || 0,
        hourlyRate: parseFloat(priceMin) || 0,
      };
      
      // Include avatar if changed
      if (hasAvatarChanged && avatarBase64) {
        updateData.avatar = avatarBase64;
      }
      
      await api.updateWorkerProfile(updateData);
      
      // Update avatar in auth context if changed
      if (hasAvatarChanged && avatarBase64) {
        await updateAvatar(avatarBase64);
      }
      
      await fetchProfile();
      setIsEditing(false);
      setHasAvatarChanged(false);
      
      const successMessage = hasAvatarChanged 
        ? 'Profil et photo de profil mis à jour avec succès ✓'
        : 'Profil mis à jour avec succès ✓';
      Alert.alert('Succès', successMessage);
    } catch (err) {
      console.error('[Profile] handleSaveProfile error:', err);
      
      // Handle specific error messages
      if (err?.message?.includes('Image trop grande')) {
        Alert.alert('Erreur', 'Image trop grande. Veuillez choisir une image plus petite.');
      } else if (err?.message?.includes('Invalid image format')) {
        Alert.alert('Erreur', 'Format d\'image invalide. Seulement JPEG et PNG sont autorisés.');
      } else {
        Alert.alert('Erreur', 'Échec de la mise à jour. Réessayez.');
      }
    } finally {
      setSaving(false);
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
      Alert.alert('Succès', 'Mot de passe mis à jour avec succès ✓');
    } catch (err) {
      console.error('[Profile] handleChangePassword error:', err);
      Alert.alert('Erreur', err?.message ?? 'Mot de passe actuel incorrect');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleImageSelected = (base64String) => {
    setAvatarBase64(base64String);
    setHasAvatarChanged(true);
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={THEME} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={60} color="#ccc" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchProfile}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={THEME} />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── HEADER ── */}
        <LinearGradient colors={[THEME, '#2a4a8e']} style={styles.header}>
          <Text style={styles.headerTitle}>Profil du technicien</Text>

          {/* Avatar with ProfileImagePicker */}
          <View style={styles.avatarWrapper}>
            <ProfileImagePicker 
              imageUri={avatarBase64}
              onImageSelected={handleImageSelected}
            />
          </View>

          {/* Certified badge */}
          {profile?.isVerified && (
            <View style={styles.certifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.certifiedText}>Certifié</Text>
            </View>
          )}

          <Text style={styles.profileName}>
            {profile?.user?.name ?? 'Technicien'}
          </Text>
          <Text style={styles.profileSpecialty}>{profile?.skills?.[0] ?? 'Professionnel'}</Text>
          <Text style={styles.profileMeta}>
            {profile?.averageRating?.toFixed(1) ?? '—'} ({stats?.totalReviews ?? 0} avis) · {profile?.experience ?? 0} ans d'expérience
          </Text>
        </LinearGradient>

        <View style={styles.body}>

          {/* ── STATS ROW ── */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.totalMissions ?? 0}</Text>
              <Text style={styles.statLabel}>Interventions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {profile?.averageRating?.toFixed(1) ?? '—'}
              </Text>
              <Text style={styles.statLabel}>Note moyenne</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {stats?.satisfactionRate ?? 0}%
              </Text>
              <Text style={styles.statLabel}>Clients{'\n'}satisfaits</Text>
            </View>
          </View>

          {/* ── À PROPOS ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>À propos</Text>
            <Text style={styles.bioText}>{profile?.bio ?? '—'}</Text>
          </View>

          {/* ── MODIFIER MES INFORMATIONS ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Modifier mes informations</Text>
              {!isEditing ? (
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setIsEditing(true)}
                >
                  <Ionicons name="pencil-outline" size={16} color={THEME} />
                  <Text style={styles.editBtnText}>Modifier</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCancelEdit}
                >
                  <Ionicons name="close-outline" size={16} color="#ef4444" />
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Phone */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Téléphone</Text>
              <View style={[styles.inputWrapper, !isEditing && styles.inputDisabled]}>
                <Ionicons name="call-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  editable={isEditing}
                  placeholder="Téléphone"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Bio */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Bio</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper, !isEditing && styles.inputDisabled]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={bio}
                  onChangeText={setBio}
                  editable={isEditing}
                  placeholder="Décrivez votre expérience..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {/* Experience */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Années d'expérience</Text>
              <View style={[styles.inputWrapper, !isEditing && styles.inputDisabled]}>
                <MaterialCommunityIcons name="briefcase-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={experience}
                  onChangeText={setExperience}
                  editable={isEditing}
                  placeholder="Années d'expérience"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Hourly rate */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Tarif horaire (TND)</Text>
              <View style={[styles.inputWrapper, !isEditing && styles.inputDisabled]}>
                <MaterialCommunityIcons name="cash-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={priceMin}
                  onChangeText={setPriceMin}
                  editable={isEditing}
                  placeholder="Tarif horaire"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Save button — only visible in edit mode */}
            {isEditing && (
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-outline" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Enregistrer</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* ── CHANGER MOT DE PASSE ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Changer mot de passe</Text>

            {/* Current password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mot de passe actuel</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Mot de passe actuel"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showCurrentPw}
                />
                <TouchableOpacity onPress={() => setShowCurrentPw(!showCurrentPw)}>
                  <Ionicons name={showCurrentPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View>

            {/* New password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nouveau mot de passe</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-open-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Nouveau mot de passe"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showNewPw}
                />
                <TouchableOpacity onPress={() => setShowNewPw(!showNewPw)}>
                  <Ionicons name={showNewPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Confirmer le mot de passe</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-open-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirmer le mot de passe"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showConfirmPw}
                />
                <TouchableOpacity onPress={() => setShowConfirmPw(!showConfirmPw)}>
                  <Ionicons name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.passwordBtn, savingPassword && styles.saveBtnDisabled]}
              onPress={handleChangePassword}
              disabled={savingPassword}
            >
              {savingPassword ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Mettre à jour le mot de passe</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── LOGOUT ── */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── STYLES ───
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  errorText: { fontSize: 16, color: '#6b7280', textAlign: 'center' },
  retryBtn: { backgroundColor: THEME, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  retryText: { color: '#fff', fontWeight: '700' },

  // Header
  header: {
    paddingTop: 52, paddingBottom: 32,
    paddingHorizontal: 20, alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 20 },
  avatarWrapper: { marginBottom: 12 },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
  avatarInitial: { fontSize: 36, fontWeight: '800', color: '#fff' },
  certifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#10b981', paddingHorizontal: 14,
    paddingVertical: 5, borderRadius: 20, marginBottom: 10,
  },
  certifiedText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  profileName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  profileSpecialty: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  profileMeta: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  // Body
  body: { padding: 16, gap: 16 },

  // Stats row
  statsRow: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 22, fontWeight: '800', color: THEME },
  statLabel: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: '#e5e7eb' },

  // Cards
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, gap: 14,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: THEME },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bioText: { fontSize: 14, color: '#4b5563', lineHeight: 22 },

  // Edit / Cancel buttons
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#eff6ff', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: THEME },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fef2f2', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20,
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },

  // Fields
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 12, paddingHorizontal: 12,
    paddingVertical: 10, backgroundColor: '#fff',
  },
  inputDisabled: { backgroundColor: '#f9fafb', borderColor: '#f3f4f6' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#1f2937' },
  textAreaWrapper: { alignItems: 'flex-start', paddingVertical: 12 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  priceRow: { flexDirection: 'row' },

  // Save button
  saveBtn: {
    backgroundColor: THEME, borderRadius: 14,
    paddingVertical: 14, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Password button
  passwordBtn: {
    backgroundColor: '#2563eb', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1.5, borderColor: '#fecaca',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
});
