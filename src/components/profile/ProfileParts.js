import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Image, Modal, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import PressableScale from '../ui/PressableScale';
import FadeIn from '../ui/FadeIn';

// What the client and technician profiles share, so they keep looking alike
export const THEME = '#1d5ff0';
export const NAVY = '#0b3fb3';
export const NAVY_INK = '#0b2a6b';
export const INK = '#0f172a';
export const MUTED = '#64748b';
export const SURFACE = '#f4f7fc';

// Shows a back button with `onBack`, and share instead of the bell with `onShare`
export const ProfileHeader = ({ title, onBell, onBack, onShare }) => (
  <LinearGradient colors={['#1a56db', NAVY]} style={styles.header}>
    <View style={styles.headerGlow} />
    <View style={styles.headerTop}>
      <View style={styles.headerSide}>
        {!!onBack && (
          <PressableScale scaleTo={0.9} onPress={onBack}>
            <Ionicons name="arrow-back" size={25} color="#fff" />
          </PressableScale>
        )}
      </View>
      <View style={styles.brand}>
        <Image source={require('../../assets/tool.png')} style={styles.brandLogo} />
        <View>
          <Text style={styles.brandName}>FixPro</Text>
          <Text style={styles.brandTagline}>Simple • Rapide • Fiable</Text>
        </View>
      </View>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
        <PressableScale scaleTo={0.9} onPress={onShare || onBell}>
          <Ionicons name={onShare ? 'share-outline' : 'notifications-outline'} size={25} color="#fff" />
        </PressableScale>
      </View>
    </View>
    <Text style={styles.headerTitle}>{title}</Text>
  </LinearGradient>
);

export const SectionHead = ({ icon, title, right }) => (
  <View style={styles.sectionHead}>
    <Ionicons name={icon} size={21} color={THEME} />
    <Text style={styles.sectionTitle}>{title}</Text>
    {right}
  </View>
);

// `items`: three of { icon, color, value, label }
export const StatsRow = ({ items, delay }) => (
  <FadeIn delay={delay} style={styles.statsRow}>
    {items.map((item, i) => (
      <React.Fragment key={item.label}>
        {i > 0 && <View style={styles.statDivider} />}
        <View style={styles.statItem}>
          <View style={styles.statTop}>
            <Ionicons name={item.icon} size={22} color={item.color || THEME} />
            <Text style={styles.statNumber}>{item.value}</Text>
          </View>
          <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>{item.label}</Text>
        </View>
      </React.Fragment>
    ))}
  </FadeIn>
);

// `value` sits on the right when the row also has a `label`
export const InfoRow = ({ icon, label, value, onPress, last }) => {
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

const verificationLook = (verified, { rejected, complete }) => {
  if (verified) return { icon: 'shield-checkmark', color: '#16a34a', title: 'Technicien vérifié', text: 'Vous passez en priorité dans les recherches.' };
  if (rejected) return { icon: 'alert-circle', color: '#dc2626', title: 'Document refusé', text: 'Renvoyez-le pour obtenir le badge vérifié.' };
  if (complete) return { icon: 'time', color: '#d97706', title: 'Vérification en cours', text: 'Notre équipe examine vos documents.' };
  return { icon: 'shield-outline', color: THEME, title: 'Devenez technicien vérifié', text: 'Envoyez vos documents : badge vérifié et priorité dans les recherches.' };
};

// `verification`: { complete, missing, rejected } from the technician's profile
export const VerificationCard = ({ verified, verification, onPress }) => {
  const look = verificationLook(verified, verification);
  const Card = verified ? View : PressableScale;
  return (
    <Card {...(verified ? {} : { onPress, scaleTo: 0.985 })} style={[styles.card, styles.locationRow]}>
      <View style={styles.locationIcon}>
        <Ionicons name={look.icon} size={22} color={look.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.locationTitle}>{look.title}</Text>
        <Text style={styles.locationText}>{look.text}</Text>
      </View>
      {!verified && <Ionicons name="chevron-forward" size={17} color="#94a3b8" />}
    </Card>
  );
};

export const AccountTile = ({ icon, label, onPress }) => (
  <PressableScale style={[styles.card, styles.accountTile]} onPress={onPress}>
    <Ionicons name={icon} size={25} color={THEME} />
    <Text style={styles.accountText}>{label}</Text>
  </PressableScale>
);

export const DangerButtons = ({ onLogout, onDelete }) => (
  <View style={styles.dangerRow}>
    <PressableScale style={styles.dangerBtn} onPress={onLogout}>
      <Ionicons name="log-out-outline" size={20} color="#dc2626" />
      <Text style={styles.dangerText} numberOfLines={1} adjustsFontSizeToFit>Déconnexion</Text>
    </PressableScale>
    <PressableScale style={styles.dangerBtn} onPress={onDelete}>
      <Ionicons name="trash-outline" size={20} color="#dc2626" />
      <Text style={styles.dangerText} numberOfLines={1} adjustsFontSizeToFit>Supprimer le compte</Text>
    </PressableScale>
  </View>
);

// A modal covers the whole screen, outside the root view's padding, and
// useSafeAreaInsets reads 0 inside that padding: only the device's value is right
export const BottomSheet = ({ visible, title, onClose, children }) => {
  const bottomInset = initialWindowMetrics?.insets.bottom ?? 0;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.sheetOverlay} behavior="padding">
        <View style={[styles.sheetCard, { paddingBottom: 20 + bottomInset }]}>
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
};

export const PasswordField = ({ label, value, onChangeText, shown, onToggle, icon }) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.inputWrapper}>
      <Ionicons name={icon} size={18} color="#94a3b8" />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor="#94a3b8"
        secureTextEntry={!shown}
        autoCapitalize="none"
      />
      <TouchableOpacity onPress={onToggle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94a3b8" />
      </TouchableOpacity>
    </View>
  </View>
);

const cardShadow = {
  shadowColor: '#1e3a8a',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 1,
};

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24, backgroundColor: SURFACE },
  errorText: { fontSize: 15, color: MUTED, textAlign: 'center' },
  retryBtn: { backgroundColor: THEME, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  retryText: { color: '#fff', fontWeight: '700' },

  // Header
  header: { paddingTop: 8, paddingBottom: 44, paddingHorizontal: 18, overflow: 'hidden' },
  headerGlow: {
    position: 'absolute', right: -80, top: 30, width: 260, height: 260,
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
