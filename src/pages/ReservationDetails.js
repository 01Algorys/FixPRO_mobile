import React, { useState, useEffect, useRef } from 'react';
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
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import apiService from '../services/api';
import { useScreenChrome } from '../context/ChromeContext';
import { getCurrentCoords, reverseGeocodeAddress } from '../utils/location';
import { professionTitle, titleCase } from '../utils/categoryMeta';
import LocationPickerModal from '../components/LocationPickerModal';
import PressableScale from '../components/ui/PressableScale';
import FadeIn from '../components/ui/FadeIn';
import { SectionHead, BottomSheet } from '../components/profile/ProfileParts';
import { t } from '../i18n';
import { formatDate, formatRating, formatPrice, locale, directional } from '../i18n/format';

const PRIMARY = '#1d5ff0';
const INK = '#0f172a';
const MUTED = '#64748b';
const SURFACE = '#f4f7fc';

const MIN_DESCRIPTION = 10;
const DEFAULT_MESSAGE = t('form.defaultDescription');

const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
// Where the time wheel starts: the next full hour
const nextHour = () => {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
};

const ReservationDetails = ({ route, navigation }) => {
  useScreenChrome('#1a56db', '#ffffff');
  const { workerId, immediate, workerDetails, service } = route.params || {};
  const scrollRef = useRef(null);

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(startOfToday);
  const [time, setTime] = useState(null);
  const [asap, setAsap] = useState(!!immediate);
  const [picker, setPicker] = useState(null);
  const [pickerValue, setPickerValue] = useState(new Date());
  const [urgent, setUrgent] = useState(!!immediate);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [coords, setCoords] = useState(null);
  const [description, setDescription] = useState(DEFAULT_MESSAGE);
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
      setWorker({ ...data, name: data.user?.name || data.name || t('common.technician') });
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

  // The point on the map decides the whole address, so a pin moved to another
  // town never keeps the old city
  const handleLocationPicked = async ({ address: picked, latitude, longitude }) => {
    setCoords({ latitude, longitude });
    setMapVisible(false);
    setLocating(true);
    const resolved = await reverseGeocodeAddress(latitude, longitude);
    setAddress(resolved?.address || picked || '');
    setCity(resolved?.city || '');
    setPostalCode(resolved?.postalCode || '');
    setLocating(false);
  };

  const applyPicked = (mode, value) => {
    if (mode === 'date') setDate(value);
    else setTime(value);
    setAsap(false);
  };

  // Android shows its own dialog; iOS shows the wheel in a sheet
  const openPicker = (mode) => {
    const value = mode === 'date' ? date : time || nextHour();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode,
        is24Hour: true,
        minimumDate: mode === 'date' ? startOfToday() : undefined,
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) applyPicked(mode, picked);
        },
      });
      return;
    }
    setPickerValue(value);
    setPicker(mode);
  };

  const chooseNow = () => {
    setDate(startOfToday());
    setTime(null);
    setAsap(true);
  };

  const scheduled = new Date(date);
  if (time) scheduled.setHours(time.getHours(), time.getMinutes(), 0, 0);
  const whenError = asap ? null
    : !time ? t('form.chooseTime')
    : scheduled <= new Date() ? t('form.chooseFuture')
    : null;

  const errors = {
    time: whenError,
    address: !address.trim() ? t('form.enterAddress') : null,
    city: !city.trim() ? t('form.enterCity') : null,
    description: description.trim().length < MIN_DESCRIPTION
      ? t('form.describe', { min: MIN_DESCRIPTION }) : null,
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
      Alert.alert(t('common.error'), t('form.missingInfo'));
      return;
    }

    try {
      setSubmitting(true);
      await apiService.createReservation({
        workerId: parseInt(workerIdValue, 10),
        service: parseInt(serviceIdValue, 10),
        date: new Date(isoDay(asap ? new Date() : date)).toISOString(),
        time: hhmm(asap ? new Date() : time),
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
      Alert.alert(t('form.sent'), `${firstName} va recevoir votre demande et vous répondra rapidement.`, [
        { text: t('form.seeRequests'), onPress: () => navigation.navigate('Main', { screen: 'Reservations' }) },
      ]);
    } catch (error) {
      console.error('Failed to create reservation:', error);
      Alert.alert(t('common.error'), t('form.sendFailed'));
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
        <Text style={styles.errorText}>{t('form.notFound')}</Text>
        <PressableScale style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>{t('common.back')}</Text>
        </PressableScale>
      </View>
    );
  }

  const name = titleCase(worker.name) || t('common.technician');
  const firstName = name.split(' ')[0];
  const avatar = worker.user?.avatar || worker.avatar;
  const firstService = Array.isArray(worker.services) ? worker.services[0] : null;
  const profession = professionTitle(firstService?.category, firstService?.name);
  const rating = Number(worker.averageRating || worker.rating || 0);
  const price = worker.hourlyRate || firstService?.basePrice;
  const dateLabel = formatDate(date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const whenText = asap
    ? t('form.todayAsap')
    : time
      ? `${formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${hhmm(time)}`
      : t('form.chooseDateTime');

  return (
    // The root view already pads the status bar, so this view starts that far down.
    // useSafeAreaInsets reads 0 inside that padding: only the device's value is right.
    <KeyboardAvoidingView style={styles.container} behavior="padding" keyboardVerticalOffset={initialWindowMetrics?.insets.top ?? 0}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1a56db', '#0b3fb3']} style={styles.header}>
        <PressableScale style={styles.backBtn} scaleTo={0.9} onPress={() => navigation.goBack()}>
          <Ionicons name={directional('arrow-back')} size={23} color="#fff" />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('form.title')}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{t('form.for', { name: firstName })}</Text>
        </View>
      </LinearGradient>

      <View style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
                <Text style={styles.techMetaText}>{formatRating(rating)}</Text>
                {!!worker.experience && <Text style={styles.techMetaText}>· {t('common.yearsExperienceShort', { count: worker.experience })}</Text>}
              </View>
            </View>
            {!!price && (
              <View style={styles.pricePill}>
                <Text style={styles.priceSmall}>{t('form.from')}</Text>
                <Text style={styles.priceText}>{formatPrice(price)}</Text>
              </View>
            )}
          </FadeIn>

          {/* When */}
          <FadeIn delay={50}>
            <SectionHead icon="calendar-outline" title={t('form.when')} />
            <View style={styles.whenRow}>
              <PressableScale style={[styles.whenField, { flex: 1.5 }, !asap && styles.whenFieldSet]} scaleTo={0.98} onPress={() => openPicker('date')}>
                <Ionicons name="calendar-outline" size={20} color={PRIMARY} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.whenLabel}>{t('common.date')}</Text>
                  <Text style={styles.whenValue} numberOfLines={1} adjustsFontSizeToFit>{asap ? t('common.today') : dateLabel}</Text>
                </View>
              </PressableScale>
              <PressableScale style={[styles.whenField, { flex: 1 }, !!time && !asap && styles.whenFieldSet, showError('time') && styles.inputError]} scaleTo={0.98} onPress={() => openPicker('time')}>
                <Ionicons name="time-outline" size={20} color={PRIMARY} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.whenLabel}>{t('common.time')}</Text>
                  <Text style={[styles.whenValue, !time && !asap && styles.whenEmpty]} numberOfLines={1}>
                    {asap ? t('form.asap') : time ? hhmm(time) : t('form.choose')}
                  </Text>
                </View>
              </PressableScale>
            </View>
            <PressableScale style={[styles.nowBtn, asap && styles.nowBtnActive]} scaleTo={0.98} onPress={chooseNow}>
              <Ionicons name="flash" size={16} color={asap ? '#fff' : '#ea580c'} />
              <Text style={[styles.nowText, asap && styles.chipTextActive]}>{t('form.now')}</Text>
            </PressableScale>
            {showError('time') && <Text style={styles.fieldError}>{errors.time}</Text>}
          </FadeIn>

          {/* Where */}
          <FadeIn delay={100}>
            <SectionHead
              icon="location-outline"
              title={t('form.where')}
              right={(
                <PressableScale style={styles.linkBtn} onPress={locate} disabled={locating}>
                  {locating ? <ActivityIndicator size="small" color={PRIMARY} /> : <Ionicons name="locate" size={15} color={PRIMARY} />}
                  <Text style={styles.linkText}>{t('common.myPosition')}</Text>
                </PressableScale>
              )}
            />
            <View style={[styles.card, styles.pad]}>
              <PressableScale style={styles.mapPick} scaleTo={0.98} onPress={() => setMapVisible(true)}>
                <View style={styles.mapIcon}>
                  <Ionicons name="map" size={21} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapTitle}>{coords ? t('form.editOnMap') : t('form.chooseOnMap')}</Text>
                  <Text style={styles.mapSub} numberOfLines={1}>
                    {locating ? t('form.findingAddress') : [address, city].filter(Boolean).join(', ') || t('form.placePin')}
                  </Text>
                </View>
                <Ionicons name={directional('chevron-forward')} size={18} color={PRIMARY} />
              </PressableScale>
              <View style={[styles.inputWrap, { marginTop: 12 }, showError('address') && styles.inputError]}>
                <Ionicons name="location-outline" size={18} color="#94a3b8" />
                <TextInput
                  style={styles.input}
                  placeholder={t('form.street')}
                  placeholderTextColor="#94a3b8"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
              {showError('address') && <Text style={styles.fieldError}>{errors.address}</Text>}
              <View style={styles.inputRow}>
                <View style={[styles.inputWrap, { flex: 1.6 }, showError('city') && styles.inputError]}>
                  <TextInput style={styles.input} placeholder={t('common.city')} placeholderTextColor="#94a3b8" value={city} onChangeText={setCity} />
                </View>
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder={t('form.postalCode')}
                    placeholderTextColor="#94a3b8"
                    value={postalCode}
                    onChangeText={setPostalCode}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              {showError('city') && <Text style={styles.fieldError}>{errors.city}</Text>}
            </View>
          </FadeIn>

          {/* What */}
          <FadeIn delay={150}>
            <SectionHead icon="create-outline" title={t('form.problem')} />
            <View style={[styles.card, styles.pad]}>
              <TextInput
                style={[styles.textArea, showError('description') && styles.inputError]}
                placeholder={t('form.problemPlaceholder')}
                placeholderTextColor="#94a3b8"
                value={description}
                onChangeText={setDescription}
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
                selectTextOnFocus={description === DEFAULT_MESSAGE}
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
                  <Text style={[styles.urgencyText, !urgent && styles.chipTextActive]}>{t('form.normal')}</Text>
                </PressableScale>
                <PressableScale style={[styles.urgency, urgent && styles.urgencyUrgent]} onPress={() => setUrgent(true)}>
                  <Ionicons name="flash" size={16} color={urgent ? '#fff' : '#ea580c'} />
                  <Text style={[styles.urgencyText, { color: '#ea580c' }, urgent && styles.chipTextActive]}>{t('common.urgent')}</Text>
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
                <Text style={styles.confirmText}>{t('form.send')}</Text>
                <Ionicons name={directional('arrow-forward')} size={18} color="#fff" />
              </>
            )}
          </PressableScale>
        </View>
      </View>

      <BottomSheet
        visible={!!picker}
        title={picker === 'time' ? t('form.pickTime') : t('form.pickDate')}
        onClose={() => setPicker(null)}
      >
        {!!picker && (
          <DateTimePicker
            value={pickerValue}
            mode={picker}
            display="spinner"
            locale={locale()}
            themeVariant="light"
            minimumDate={picker === 'date' ? startOfToday() : undefined}
            onChange={(event, picked) => picked && setPickerValue(picked)}
          />
        )}
        <PressableScale
          style={styles.confirmBtn}
          onPress={() => {
            applyPicked(picker, pickerValue);
            setPicker(null);
          }}
        >
          <Text style={styles.confirmText}>{t('form.validate')}</Text>
        </PressableScale>
      </BottomSheet>

      <LocationPickerModal
        visible={mapVisible}
        initialCoords={coords}
        onConfirm={handleLocationPicked}
        onClose={() => setMapVisible(false)}
      />
    </KeyboardAvoidingView>
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
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 16,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 21, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 13.5, color: 'rgba(255,255,255,0.85)', marginTop: 1 },

  content: { padding: 16, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 20, ...shadow },
  pad: { padding: 14 },

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

  whenRow: { flexDirection: 'row', gap: 10 },
  whenField: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 64, paddingHorizontal: 12,
    borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  whenFieldSet: { borderColor: '#bcd0f7' },
  whenLabel: { fontSize: 12, color: MUTED, fontWeight: '600' },
  whenValue: { fontSize: 15, color: INK, fontWeight: '700', marginTop: 1 },
  whenEmpty: { color: '#94a3b8', fontWeight: '600' },
  nowBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, marginTop: 10,
    borderRadius: 14, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa',
  },
  nowBtnActive: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  nowText: { fontSize: 14.5, fontWeight: '700', color: '#ea580c' },
  chipTextActive: { color: '#fff' },
  fieldError: { color: '#dc2626', fontSize: 12.5, marginTop: 6, marginLeft: 4 },

  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  linkText: { color: PRIMARY, fontSize: 14, fontWeight: '700' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 14,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14,
  },
  inputRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  input: { flex: 1, fontSize: 15, color: INK, paddingVertical: 0 },
  inputError: { borderColor: '#fca5a5', backgroundColor: '#fff7f7' },
  mapPick: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    borderRadius: 16, backgroundColor: '#eef4ff', borderWidth: 1, borderColor: '#d6e4ff',
  },
  mapIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  mapTitle: { fontSize: 15, fontWeight: '700', color: INK },
  mapSub: { fontSize: 13, color: MUTED, marginTop: 1 },

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
