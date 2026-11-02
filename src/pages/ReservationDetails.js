import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiService from '../services/api';
import { getCurrentCoords, reverseGeocodeAddress } from '../utils/location';
import { professionTitle, titleCase } from '../utils/categoryMeta';
import LocationPickerModal from '../components/LocationPickerModal';
import PressableScale from '../components/ui/PressableScale';
import FadeIn from '../components/ui/FadeIn';

const PRIMARY = '#1d5ff0';
const INK = '#0f172a';
const MUTED = '#64748b';
const SURFACE = '#f4f7fc';

const DAYS_AHEAD = 14;
const SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
const NOW = 'now';
const MIN_DESCRIPTION = 10;

const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const nowHHMM = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ReservationDetails = ({ route, navigation }) => {
  const { workerId, immediate, workerDetails, service } = route.params || {};
  const insets = useSafeAreaInsets();

  const days = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  }), []);

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [day, setDay] = useState(isoDay(days[0]));
  const [time, setTime] = useState(immediate ? NOW : null);
  const [urgent, setUrgent] = useState(!!immediate);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [coords, setCoords] = useState(null);
  const [description, setDescription] = useState('');
  const [locating, setLocating] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);

  useEffect(() => {
    loadWorker();
    locate();
  }, [workerId]);

  const loadWorker = async () => {
    try {
      setLoading(true);
      if (immediate && workerDetails) {
        setWorker(workerDetails);
        return;
      }
      const response = await apiService.getWorkerById(workerId);
      const payload = response.data || response;
      const data = payload.worker || payload;
      setWorker({ ...data, name: data.user?.name || data.name || 'Technicien' });
    } catch (error) {
      console.error('Failed to load worker:', error);
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill the address from the device position; the client can still edit it
  // or pick a point on the map.
  const locate = async () => {
    try {
      setLocating(true);
      const c = await getCurrentCoords();
      if (!c) return;
      setCoords(c);
      const resolved = await reverseGeocodeAddress(c.latitude, c.longitude);
      if (resolved?.address) setAddress(resolved.address);
      if (resolved?.city) setCity(resolved.city);
      if (resolved?.postalCode) setPostalCode(resolved.postalCode);
    } catch (error) {
      console.error('Auto-detect location failed:', error);
    } finally {
      setLocating(false);
    }
  };

  const handleLocationPicked = ({ address: picked, latitude, longitude }) => {
    if (picked) setAddress(picked);
    setCoords({ latitude, longitude });
    setMapVisible(false);
  };

  const isToday = day === isoDay(days[0]);
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const slotPast = (slot) => {
    const [h, m] = slot.split(':').map(Number);
    return isToday && h * 60 + m <= nowMinutes;
  };

  // Changing day can make the chosen slot invalid (past slot, or "now" on another day)
  const selectDay = (value) => {
    setDay(value);
    if (time === NOW && value !== isoDay(days[0])) setTime(null);
  };

  const errors = {
    time: !time ? 'Choisissez une heure' : null,
    address: !address.trim() ? "Indiquez l'adresse d'intervention" : null,
    city: !city.trim() ? 'Indiquez la ville' : null,
    description: description.trim().length < MIN_DESCRIPTION
      ? `Décrivez le problème (${MIN_DESCRIPTION} caractères minimum)` : null,
  };
  const valid = !Object.values(errors).some(Boolean);
  const showError = (key) => triedSubmit && errors[key];

  const handleSubmit = async () => {
    setTriedSubmit(true);
    if (!valid) return;

    const workerIdValue = worker?.userId || worker?.user?.id || workerId;
    const firstService = Array.isArray(worker?.services) ? worker.services[0] : null;
    const serviceIdValue = service || (typeof firstService === 'object' ? firstService?.id : firstService);
    if (!workerIdValue || !serviceIdValue) {
      Alert.alert('Erreur', 'Informations du technicien ou du service manquantes.');
      return;
    }

    try {
      setSubmitting(true);
      await apiService.createReservation({
        workerId: parseInt(workerIdValue, 10),
        service: parseInt(serviceIdValue, 10),
        date: new Date(day).toISOString(),
        time: time === NOW ? nowHHMM() : time,
        duration: 60,
        location: {
          address: address.trim(),
          city: city.trim(),
          state: '',
          zipCode: postalCode.trim(),
          latitude: coords?.latitude,
          longitude: coords?.longitude,
        },
        description: description.trim(),
        emergency: urgent,
      });
      Alert.alert('Demande envoyée', `${firstName} va recevoir votre demande et vous répondra rapidement.`, [
        { text: 'Voir mes demandes', onPress: () => navigation.navigate('Main', { screen: 'Reservations' }) },
      ]);
    } catch (error) {
      console.error('Failed to create reservation:', error);
      Alert.alert('Erreur', "La demande n'a pas pu être envoyée. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (!worker) {
    return (
      <View style={styles.centered}>
        <Ionicons name="person-outline" size={52} color="#cbd5e1" />
        <Text style={styles.errorText}>Technicien introuvable</Text>
        <PressableScale style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Retour</Text>
        </PressableScale>
      </View>
    );
  }

  const name = titleCase(worker.name) || 'Technicien';
  const firstName = name.split(' ')[0];
  const avatar = worker.user?.avatar || worker.avatar;
  const firstService = Array.isArray(worker.services) ? worker.services[0] : null;
  const profession = professionTitle(firstService?.category, firstService?.name);
  const rating = Number(worker.averageRating || worker.rating || 0);
  const price = worker.hourlyRate || firstService?.basePrice;
  const dayLabel = (d, i) => (i === 0 ? "Auj." : i === 1 ? 'Dem.' : d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''));
  const chosenDate = days.find((d) => isoDay(d) === day);
  const whenText = time
    ? `${chosenDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · ${time === NOW ? 'Dès que possible' : time}`
    : 'Choisissez un créneau';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <PressableScale style={styles.backBtn} scaleTo={0.9} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={INK} />
        </PressableScale>
        <Text style={styles.headerTitle}>Nouvelle demande</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 60}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Technician */}
          <FadeIn style={[styles.card, styles.techCard]}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.techAvatar} />
            ) : (
              <View style={[styles.techAvatar, styles.techAvatarFallback]}>
                <Text style={styles.techInitial}>{name.charAt(0)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.techNameRow}>
                <Text style={styles.techName} numberOfLines={1}>{name}</Text>
                {worker.isVerified && <Ionicons name="checkmark-circle" size={16} color={PRIMARY} />}
              </View>
              <Text style={styles.techSub} numberOfLines={1}>{profession}</Text>
              <View style={styles.techMeta}>
                <Ionicons name="star" size={13} color="#f5a524" />
                <Text style={styles.techMetaText}>{rating.toFixed(1)}</Text>
                {!!worker.experience && <Text style={styles.techMetaText}>· {worker.experience} ans d'exp.</Text>}
              </View>
            </View>
            {!!price && (
              <View style={styles.pricePill}>
                <Text style={styles.priceSmall}>dès</Text>
                <Text style={styles.priceText}>{price} TND</Text>
              </View>
            )}
          </FadeIn>

          {/* When */}
          <FadeIn delay={50}>
            <Text style={styles.sectionTitle}>Quand ?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
              {days.map((d, i) => {
                const active = isoDay(d) === day;
                return (
                  <PressableScale key={isoDay(d)} style={[styles.dayChip, active && styles.dayChipActive]} onPress={() => selectDay(isoDay(d))}>
                    <Text style={[styles.dayName, active && styles.chipTextActive]}>{dayLabel(d, i)}</Text>
                    <Text style={[styles.dayNum, active && styles.chipTextActive]}>{d.getDate()}</Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
            <View style={styles.slots}>
              {isToday && (
                <PressableScale style={[styles.slot, styles.nowSlot, time === NOW && styles.slotActive]} onPress={() => setTime(NOW)}>
                  <Ionicons name="flash" size={14} color={time === NOW ? '#fff' : '#ea580c'} />
                  <Text style={[styles.slotText, { color: '#ea580c' }, time === NOW && styles.chipTextActive]}>Maintenant</Text>
                </PressableScale>
              )}
              {SLOTS.map((slot) => {
                const past = slotPast(slot);
                const active = time === slot;
                return (
                  <PressableScale
                    key={slot}
                    disabled={past}
                    style={[styles.slot, active && styles.slotActive, past && styles.slotPast]}
                    onPress={() => setTime(slot)}
                  >
                    <Text style={[styles.slotText, active && styles.chipTextActive, past && styles.slotPastText]}>{slot}</Text>
                  </PressableScale>
                );
              })}
            </View>
            {showError('time') && <Text style={styles.fieldError}>{errors.time}</Text>}
          </FadeIn>

          {/* Where */}
          <FadeIn delay={100}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Où ?</Text>
              <PressableScale style={styles.linkBtn} onPress={locate} disabled={locating}>
                {locating ? <ActivityIndicator size="small" color={PRIMARY} /> : <Ionicons name="locate" size={15} color={PRIMARY} />}
                <Text style={styles.linkText}>Ma position</Text>
              </PressableScale>
            </View>
            <View style={[styles.card, styles.pad]}>
              <View style={[styles.inputWrap, showError('address') && styles.inputError]}>
                <Ionicons name="location-outline" size={18} color="#94a3b8" />
                <TextInput
                  style={styles.input}
                  placeholder="Rue et numéro"
                  placeholderTextColor="#94a3b8"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
              {showError('address') && <Text style={styles.fieldError}>{errors.address}</Text>}
              <View style={styles.inputRow}>
                <View style={[styles.inputWrap, { flex: 1.6 }, showError('city') && styles.inputError]}>
                  <TextInput style={styles.input} placeholder="Ville" placeholderTextColor="#94a3b8" value={city} onChangeText={setCity} />
                </View>
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Code postal"
                    placeholderTextColor="#94a3b8"
                    value={postalCode}
                    onChangeText={setPostalCode}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              {showError('city') && <Text style={styles.fieldError}>{errors.city}</Text>}
              <PressableScale style={styles.mapBtn} onPress={() => setMapVisible(true)}>
                <Ionicons name="map-outline" size={16} color={PRIMARY} />
                <Text style={styles.mapText}>{coords ? 'Ajuster sur la carte' : 'Choisir sur la carte'}</Text>
              </PressableScale>
            </View>
          </FadeIn>

          {/* What */}
          <FadeIn delay={150}>
            <Text style={styles.sectionTitle}>Quel est le problème ?</Text>
            <View style={[styles.card, styles.pad]}>
              <TextInput
                style={[styles.textArea, showError('description') && styles.inputError]}
                placeholder="Ex : fuite sous l'évier de la cuisine depuis ce matin…"
                placeholderTextColor="#94a3b8"
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />
              <View style={styles.textMeta}>
                {showError('description') ? (
                  <Text style={[styles.fieldError, { marginTop: 0 }]}>{errors.description}</Text>
                ) : <View />}
                <Text style={styles.counter}>{description.length}/1000</Text>
              </View>
              <View style={styles.urgencyRow}>
                <PressableScale style={[styles.urgency, !urgent && styles.urgencyActive]} onPress={() => setUrgent(false)}>
                  <Ionicons name="calendar-outline" size={16} color={!urgent ? '#fff' : MUTED} />
                  <Text style={[styles.urgencyText, !urgent && styles.chipTextActive]}>Normal</Text>
                </PressableScale>
                <PressableScale style={[styles.urgency, urgent && styles.urgencyUrgent]} onPress={() => setUrgent(true)}>
                  <Ionicons name="flash" size={16} color={urgent ? '#fff' : '#ea580c'} />
                  <Text style={[styles.urgencyText, { color: '#ea580c' }, urgent && styles.chipTextActive]}>Urgent</Text>
                </PressableScale>
              </View>
            </View>
          </FadeIn>
        </ScrollView>

        {/* Summary + confirm */}
        <View style={styles.footer}>
          <View style={styles.footerSummary}>
            <Ionicons name="calendar" size={16} color={PRIMARY} />
            <Text style={styles.footerText} numberOfLines={1}>{whenText}</Text>
          </View>
          <PressableScale style={[styles.confirmBtn, submitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.confirmText}>Envoyer la demande</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </PressableScale>
        </View>
      </KeyboardAvoidingView>

      <LocationPickerModal
        visible={mapVisible}
        initialCoords={coords}
        onConfirm={handleLocationPicked}
        onClose={() => setMapVisible(false)}
      />
    </View>
  );
};

const shadow = {
  shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: SURFACE },
  errorText: { fontSize: 15, color: MUTED },
  retryBtn: { backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  retryText: { color: '#fff', fontWeight: '700' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eef2f7',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: INK },

  content: { padding: 16, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 20, ...shadow },
  pad: { padding: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: INK, letterSpacing: -0.3, marginTop: 24, marginBottom: 10 },

  techCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  techAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#e3edff' },
  techAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  techInitial: { fontSize: 22, fontWeight: '700', color: PRIMARY },
  techNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  techName: { fontSize: 16.5, fontWeight: '700', color: INK, flexShrink: 1 },
  techSub: { fontSize: 13.5, color: PRIMARY, fontWeight: '600', marginTop: 1 },
  techMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  techMetaText: { fontSize: 12.5, color: MUTED },
  pricePill: { alignItems: 'center', backgroundColor: '#e3edff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  priceSmall: { fontSize: 10.5, color: MUTED },
  priceText: { fontSize: 14.5, fontWeight: '800', color: INK },

  dayRow: { gap: 8, paddingRight: 16 },
  dayChip: {
    width: 56, paddingVertical: 10, borderRadius: 16, alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  dayChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  dayName: { fontSize: 12, color: MUTED, fontWeight: '600', textTransform: 'capitalize' },
  dayNum: { fontSize: 19, color: INK, fontWeight: '800', marginTop: 2 },
  chipTextActive: { color: '#fff' },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  slot: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, height: 40, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center',
  },
  nowSlot: { borderColor: '#fed7aa', backgroundColor: '#fff7ed' },
  slotActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  slotPast: { backgroundColor: '#f1f5f9', borderColor: '#f1f5f9' },
  slotText: { fontSize: 14, fontWeight: '600', color: INK },
  slotPastText: { color: '#cbd5e1', textDecorationLine: 'line-through' },
  fieldError: { color: '#dc2626', fontSize: 12.5, marginTop: 6, marginLeft: 4 },

  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 24, marginBottom: 10 },
  linkText: { color: PRIMARY, fontSize: 14, fontWeight: '700' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 14,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14,
  },
  inputRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  input: { flex: 1, fontSize: 15, color: INK, paddingVertical: 0 },
  inputError: { borderColor: '#fca5a5', backgroundColor: '#fff7f7' },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, marginTop: 12,
    borderRadius: 22, backgroundColor: '#eef4ff',
  },
  mapText: { color: PRIMARY, fontSize: 14.5, fontWeight: '700' },

  textArea: {
    minHeight: 110, fontSize: 15, lineHeight: 21, color: INK, padding: 14,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14,
  },
  textMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  counter: { fontSize: 12, color: '#94a3b8' },
  urgencyRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  urgency: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44,
    borderRadius: 14, backgroundColor: '#f1f5f9',
  },
  urgencyActive: { backgroundColor: PRIMARY },
  urgencyUrgent: { backgroundColor: '#ea580c' },
  urgencyText: { fontSize: 14.5, fontWeight: '700', color: MUTED },

  footer: {
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#eef2f7', gap: 10,
  },
  footerSummary: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { flex: 1, fontSize: 13.5, color: '#334155', fontWeight: '600', textTransform: 'none' },
  confirmBtn: {
    height: 54, borderRadius: 27, backgroundColor: PRIMARY,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  confirmText: { color: '#fff', fontSize: 16.5, fontWeight: '700' },
});

export default ReservationDetails;
