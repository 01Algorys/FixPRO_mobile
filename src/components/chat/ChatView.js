import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Image, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PressableScale from '../ui/PressableScale';
import OnlineBadge from '../OnlineBadge';
import OnlineStatusText from '../OnlineStatusText';

const PRIMARY = '#1d5ff0';
const INK = '#0f172a';
const MUTED = '#64748b';
const SURFACE = '#f4f7fc';
// Consecutive messages from one sender closer than this are drawn as one group
const GROUP_GAP_MS = 5 * 60 * 1000;

// The backend writes its automatic messages in English
const SYSTEM_FR = {
  'Reservation accepted. You can now chat with each other.': 'Réservation acceptée. Vous pouvez maintenant discuter.',
};
export const localizeMessage = (text) => SYSTEM_FR[String(text || '').trim()] || text;

const formatTime = (d) =>
  d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

const dayLabel = (d) => {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

const Avatar = ({ name, uri, size }) => (
  <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    {uri ? (
      <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    ) : (
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{(name || '?').charAt(0).toUpperCase()}</Text>
    )}
  </View>
);

// Full-screen conversation shared by the client and technician message pages.
// `isMine(message)` decides which side a bubble sits on.
const ChatView = ({
  participant,          // { name, avatar, userId }
  subtitle,             // service name
  status,               // reservation status
  messages,
  isMine,
  draft,
  onChangeDraft,
  onSend,
  sending,
  onBack,
  onOpenReservation,
  quickReplies = [],
}) => {
  const scrollRef = useRef(null);
  // The app's root view already pads the status bar, so this view starts that
  // far down the screen; KeyboardAvoidingView needs the offset to lift enough.
  const insets = useSafeAreaInsets();
  const closed = String(status || '').toUpperCase() === 'COMPLETED';

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages.length]);

  const sendText = (text) => {
    if (!text.trim() || sending) return;
    onSend(text);
  };

  const rows = [];
  let lastDay = null;
  messages.forEach((message, i) => {
    const day = new Date(message.createdAt).toDateString();
    if (day !== lastDay) {
      rows.push({ type: 'day', key: `day-${day}`, label: dayLabel(message.createdAt) });
      lastDay = day;
    }
    const isSystem = message.type === 'system' || message.isSystem === true;
    if (isSystem) {
      rows.push({ type: 'system', key: `sys-${message.id}`, message });
      return;
    }
    const next = messages[i + 1];
    const mine = isMine(message);
    const nextSameGroup =
      next && !(next.type === 'system' || next.isSystem) && isMine(next) === mine &&
      new Date(next.createdAt) - new Date(message.createdAt) < GROUP_GAP_MS &&
      new Date(next.createdAt).toDateString() === day;
    rows.push({ type: 'msg', key: `msg-${message._localId || message.id}`, message, mine, last: !nextSameGroup });
  });

  const hasRealMessages = messages.some((m) => !(m.type === 'system' || m.isSystem));

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <PressableScale style={styles.backBtn} scaleTo={0.9} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={INK} />
        </PressableScale>
        <View>
          <Avatar name={participant.name} uri={participant.avatar} size={42} />
          <OnlineBadge userId={participant.userId} size={11} borderColor="#fff" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerName} numberOfLines={1}>{participant.name}</Text>
          <OnlineStatusText userId={participant.userId} />
        </View>
        {closed && (
          <View style={styles.closedPill}>
            <Text style={styles.closedPillText}>Terminé</Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.contextBar} onPress={onOpenReservation} activeOpacity={0.7}>
        <Ionicons name="construct-outline" size={14} color={PRIMARY} />
        <Text style={styles.contextText} numberOfLines={1}>{subtitle || 'Réservation'}</Text>
        <Text style={styles.contextLink}>Voir la réservation</Text>
        <Ionicons name="chevron-forward" size={15} color={PRIMARY} />
      </TouchableOpacity>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {rows.map((row) => {
          if (row.type === 'day') {
            return (
              <View key={row.key} style={styles.dayRow}>
                <Text style={styles.dayText}>{row.label}</Text>
              </View>
            );
          }
          if (row.type === 'system') {
            return (
              <View key={row.key} style={styles.systemRow}>
                <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                <Text style={styles.systemText}>{localizeMessage(row.message.content)}</Text>
              </View>
            );
          }
          const { message, mine, last } = row;
          const pending = !!message._localId;
          return (
            <View key={row.key} style={[styles.msgRow, mine ? styles.msgRowMine : styles.msgRowTheirs, last && styles.msgRowLast]}>
              {!mine && (
                <View style={styles.msgAvatarSlot}>
                  {last && <Avatar name={message.sender?.name || participant.name} uri={message.sender?.avatar || participant.avatar} size={28} />}
                </View>
              )}
              <View
                style={[
                  styles.bubble,
                  mine ? styles.bubbleMine : styles.bubbleTheirs,
                  last && (mine ? styles.tailMine : styles.tailTheirs),
                ]}
              >
                <Text style={[styles.msgText, mine && styles.msgTextMine]}>{message.content}</Text>
                <View style={styles.meta}>
                  <Text style={[styles.metaTime, mine && styles.metaTimeMine]}>{formatTime(message.createdAt)}</Text>
                  {mine && (
                    <Ionicons
                      name={pending ? 'time-outline' : 'checkmark-done'}
                      size={13}
                      color="rgba(255,255,255,0.8)"
                    />
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {!hasRealMessages && !closed && (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyTitle}>Dites bonjour 👋</Text>
            <Text style={styles.emptyText}>Envoyez un premier message à {participant.name.split(' ')[0]}.</Text>
          </View>
        )}
      </ScrollView>

      {/* Composer */}
      {closed ? (
        <View style={styles.closedBar}>
          <Ionicons name="lock-closed" size={15} color={MUTED} />
          <Text style={styles.closedBarText}>Intervention terminée, la conversation est fermée.</Text>
        </View>
      ) : (
        <View>
          {!hasRealMessages && quickReplies.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow} keyboardShouldPersistTaps="handled">
              {quickReplies.map((q) => (
                <PressableScale key={q} style={styles.quickChip} onPress={() => sendText(q)}>
                  <Text style={styles.quickText}>{q}</Text>
                </PressableScale>
              ))}
            </ScrollView>
          )}
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder="Écrire un message…"
              placeholderTextColor="#94a3b8"
              value={draft}
              onChangeText={onChangeDraft}
              multiline
            />
            <PressableScale
              style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnOff]}
              scaleTo={0.88}
              onPress={() => sendText(draft)}
              disabled={!draft.trim() || sending}
            >
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="arrow-up" size={22} color="#fff" />}
            </PressableScale>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#fff',
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerName: { fontSize: 16.5, fontWeight: '700', color: INK },
  closedPill: { backgroundColor: '#e7f7ec', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginRight: 6 },
  closedPillText: { color: '#16a34a', fontSize: 12, fontWeight: '700' },
  contextBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#eef4ff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  contextText: { flex: 1, fontSize: 13, color: '#1e3a8a', fontWeight: '600' },
  contextLink: { fontSize: 13, fontWeight: '700', color: PRIMARY },

  avatar: { backgroundColor: '#e3edff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { color: PRIMARY, fontWeight: '700' },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  dayRow: { alignItems: 'center', marginVertical: 12 },
  dayText: {
    fontSize: 12, color: MUTED, fontWeight: '600', backgroundColor: '#e9eef6',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden', textTransform: 'capitalize',
  },
  systemRow: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, maxWidth: '88%',
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, marginVertical: 6,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  systemText: { fontSize: 12.5, color: '#475569', flexShrink: 1 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 },
  msgRowLast: { marginBottom: 10 },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowTheirs: { justifyContent: 'flex-start' },
  msgAvatarSlot: { width: 28, marginRight: 6 },
  bubble: { maxWidth: '78%', paddingHorizontal: 13, paddingTop: 8, paddingBottom: 6, borderRadius: 20 },
  bubbleMine: { backgroundColor: PRIMARY },
  bubbleTheirs: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8edf5' },
  tailMine: { borderBottomRightRadius: 6 },
  tailTheirs: { borderBottomLeftRadius: 6 },
  msgText: { fontSize: 15.5, lineHeight: 21, color: INK },
  msgTextMine: { color: '#fff' },
  meta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 3, marginTop: 2 },
  metaTime: { fontSize: 10.5, color: '#94a3b8' },
  metaTimeMine: { color: 'rgba(255,255,255,0.75)' },

  emptyChat: { alignItems: 'center', marginTop: 40, gap: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: INK },
  emptyText: { fontSize: 14, color: MUTED },

  quickRow: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  quickChip: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#cfe0ff',
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18,
  },
  quickText: { fontSize: 13.5, color: PRIMARY, fontWeight: '600' },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 10, paddingTop: 8, paddingBottom: 8,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eef2f7',
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 120, fontSize: 15.5, color: INK,
    backgroundColor: '#f1f5f9', borderRadius: 21,
    paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: '#cbd5e1' },
  closedBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eef2f7',
  },
  closedBarText: { fontSize: 13.5, color: MUTED },
});

export default ChatView;
