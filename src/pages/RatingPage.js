import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import apiService from '../services/api';
import { useScreenChrome } from '../context/ChromeContext';
import { titleCase } from '../utils/categoryMeta';
import PressableScale from '../components/ui/PressableScale';
import FadeIn from '../components/ui/FadeIn';
import { t } from '../i18n';
import { directional } from '../i18n/format';

const BLUE = '#1a56db';
const NAVY = '#0b3fb3';
const PRIMARY = '#1d5ff0';
const INK = '#0f172a';
const MUTED = '#64748b';
const PAGE = '#f4f7fd';
const STAR = '#f5b400';

const MAX_COMMENT = 1000;

const RATING_LABELS = {
  1: { text: t('rating.veryBad'), color: '#dc2626' },
  2: { text: t('rating.bad'), color: '#ea580c' },
  3: { text: t('rating.ok'), color: '#b45309' },
  4: { text: t('rating.good'), color: '#16a34a' },
  5: { text: t('rating.excellent'), color: '#16a34a' },
};

const RatingPage = ({ route, navigation }) => {
  useScreenChrome(BLUE, '#ffffff');
  const { reservationId, workerId, workerName } = route.params || {};
  const scrollRef = useRef(null);
  const [rating, setRating] = useState(0);
  const [wouldHireAgain, setWouldHireAgain] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const name = titleCase(workerName || t('common.technician'));
  const label = RATING_LABELS[rating];

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await apiService.createReview({
        reservationId,
        workerId,
        rating,
        comment: comment.trim(),
        wouldHireAgain,
      });
      Alert.alert(t('rating.thanks'), t('rating.sent'), [
        {
          text: 'OK',
          onPress: () => {
            // Refresh the reservations page when going back
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to submit review:', error);
      const alreadySent = /already exists/i.test(error?.serverMessage || '');
      Alert.alert(
        alreadySent ? t('rating.alreadySent') : t('common.error'),
        alreadySent ? t('rating.alreadyRated') : t('rating.sendFailed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const choice = (value, text, icon) => {
    const active = wouldHireAgain === value;
    return (
      <PressableScale
        style={[styles.choice, active && styles.choiceActive]}
        scaleTo={0.96}
        onPress={() => setWouldHireAgain(value)}
      >
        <Ionicons name={icon} size={18} color={active ? '#fff' : MUTED} />
        <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{text}</Text>
      </PressableScale>
    );
  };

  return (
    // The root view already pads the status bar, so this view starts that far down.
    // useSafeAreaInsets reads 0 inside that padding: only the device's value is right.
    <KeyboardAvoidingView style={styles.container} behavior="padding" keyboardVerticalOffset={initialWindowMetrics?.insets.top ?? 0}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[BLUE, NAVY]} style={styles.header}>
        <PressableScale style={styles.backBtn} scaleTo={0.9} onPress={() => navigation.goBack()}>
          <Ionicons name={directional('arrow-back')} size={23} color="#fff" />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('rating.title')}</Text>
          <Text style={styles.subtitle}>{t('rating.subtitle')}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FadeIn style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{name[0]}</Text>
          </View>
          <Text style={styles.question}>{t('rating.question')}</Text>
          <Text style={styles.workerName}>{t('rating.with', { name })}</Text>

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <PressableScale key={n} scaleTo={0.85} onPress={() => setRating(n)} style={styles.star}>
                <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={42} color={n <= rating ? STAR : '#cbd5e1'} />
              </PressableScale>
            ))}
          </View>
          <Text style={[styles.ratingLabel, label && { color: label.color }]}>
            {label ? label.text : t('rating.tapStar')}
          </Text>
        </FadeIn>

        <FadeIn delay={60} style={[styles.card, styles.cardLeft]}>
          <Text style={styles.sectionTitle}>{t('rating.again', { name })}</Text>
          <View style={styles.choices}>
            {choice(true, t('common.yes'), 'thumbs-up-outline')}
            {choice(false, t('common.no'), 'thumbs-down-outline')}
          </View>
        </FadeIn>

        <FadeIn delay={120} style={[styles.card, styles.cardLeft]}>
          <View style={styles.commentHead}>
            <Text style={styles.sectionTitle}>{t('rating.comment')}</Text>
            <Text style={styles.optional}>{t('rating.optional')}</Text>
          </View>
          <TextInput
            style={styles.commentInput}
            placeholder={t('rating.commentPlaceholder')}
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={MAX_COMMENT}
            value={comment}
            onChangeText={setComment}
            onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
          />
          <Text style={styles.counter}>{comment.length}/{MAX_COMMENT}</Text>
        </FadeIn>
      </ScrollView>

      <View style={styles.footer}>
        <PressableScale
          style={[styles.submit, (!rating || submitting) && styles.submitOff]}
          onPress={handleSubmit}
          disabled={!rating || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>{t('rating.send')}</Text>
          )}
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 18,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 21, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  subtitle: { fontSize: 13.5, color: 'rgba(255,255,255,0.85)', marginTop: 1 },

  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18, alignItems: 'center',
    shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
  },
  cardLeft: { alignItems: 'stretch' },

  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#e8f0ff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarLetter: { fontSize: 26, fontWeight: '800', color: PRIMARY },
  question: { fontSize: 17.5, fontWeight: '800', color: INK, textAlign: 'center' },
  workerName: { fontSize: 14.5, color: MUTED, marginTop: 3 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 },
  star: { padding: 2 },
  ratingLabel: { fontSize: 15, fontWeight: '700', color: MUTED, marginTop: 10 },

  sectionTitle: { fontSize: 15.5, fontWeight: '700', color: INK, flexShrink: 1 },
  choices: { flexDirection: 'row', gap: 10, marginTop: 12 },
  choice: {
    flex: 1, height: 46, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  choiceActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  choiceText: { fontSize: 14.5, fontWeight: '700', color: '#334155' },
  choiceTextActive: { color: '#fff' },

  commentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  optional: { fontSize: 12.5, color: MUTED },
  commentInput: {
    minHeight: 104, marginTop: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc', fontSize: 15, lineHeight: 21, color: INK, textAlignVertical: 'top',
  },
  counter: { fontSize: 12, color: '#94a3b8', textAlign: 'right', marginTop: 6 },

  footer: {
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#eef2f7',
  },
  submit: { height: 54, borderRadius: 27, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  submitOff: { backgroundColor: '#b6c8ee' },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default RatingPage;
