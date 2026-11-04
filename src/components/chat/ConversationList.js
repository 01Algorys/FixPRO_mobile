import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Image, TouchableOpacity, StatusBar, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from '../ui/PressableScale';
import OnlineBadge from '../OnlineBadge';
import FadeIn from '../ui/FadeIn';
import { localizeMessage } from './ChatView';

const PRIMARY = '#1d5ff0';
const INK = '#0f172a';
const MUTED = '#64748b';
const SURFACE = '#f4f7fc';

const when = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  if (date.toDateString() === yesterday.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const STATUS = {
  ACCEPTED: { label: 'Confirmée', color: '#16a34a', bg: '#e7f7ec' },
  IN_PROGRESS: { label: 'En cours', color: PRIMARY, bg: '#e3edff' },
  COMPLETED: { label: 'Terminée', color: '#7c3aed', bg: '#f1eafe' },
  CANCELLED: { label: 'Annulée', color: '#dc2626', bg: '#fef2f2' },
  REJECTED: { label: 'Refusée', color: '#dc2626', bg: '#fef2f2' },
};

// Inbox shared by the client and technician message pages.
// `getParticipant(conversation)` returns { name, avatar, userId } for the other person.
const ConversationList = ({
  conversations, search, onSearch, onOpen, getParticipant, emptyText, refreshing, onRefresh,
}) => (
  <View style={styles.container}>
    <StatusBar barStyle="light-content" />
    <View style={styles.header}>
      <Text style={styles.title}>Messages</Text>
      <Text style={styles.subtitle}>
        {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
      </Text>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un nom ou un service"
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={onSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => onSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>
    </View>

    <ScrollView
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
    >
      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="chatbubbles-outline" size={30} color={PRIMARY} />
          </View>
          <Text style={styles.emptyTitle}>{search ? 'Aucun résultat' : 'Aucune conversation'}</Text>
          <Text style={styles.emptyText}>{search ? 'Essayez un autre nom.' : emptyText}</Text>
        </View>
      ) : (
        conversations.map((c, i) => {
          const p = getParticipant(c);
          const unread = c.unreadCount > 0;
          const status = STATUS[String(c.status || '').toUpperCase()];
          return (
            <FadeIn key={c.id} delay={Math.min(i, 6) * 30}>
              <PressableScale scaleTo={0.985} style={styles.row} onPress={() => onOpen(c.id)}>
                <View>
                  <View style={styles.avatar}>
                    {p.avatar ? (
                      <Image source={{ uri: p.avatar }} style={styles.avatarImg} />
                    ) : (
                      <Text style={styles.avatarText}>{(p.name || '?').charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  <OnlineBadge userId={p.userId} size={12} borderColor="#fff" />
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[styles.time, unread && styles.timeUnread]}>
                      {when(c.lastMessage?.createdAt || c.updatedAt)}
                    </Text>
                  </View>
                  <View style={styles.rowBottom}>
                    <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
                      {localizeMessage(c.lastMessage?.content) || 'Aucun message pour le moment'}
                    </Text>
                    {unread && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{c.unreadCount > 99 ? '99+' : c.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.tags}>
                    {!!(c.service?.name || c.serviceName) && (
                      <Text style={styles.service} numberOfLines={1}>{c.service?.name || c.serviceName}</Text>
                    )}
                    {status && (
                      <View style={[styles.status, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </PressableScale>
            </FadeIn>
          );
        })
      )}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  header: {
    backgroundColor: '#1a56db', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18,
    borderBottomLeftRadius: 26, borderBottomRightRadius: 26,
  },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13.5, marginTop: 2 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14,
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, height: 48,
  },
  searchInput: { flex: 1, fontSize: 15, color: INK, paddingVertical: 0 },

  list: { padding: 14, gap: 10, paddingBottom: 30 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#fff', borderRadius: 18,
    shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#e3edff',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 52, height: 52 },
  avatarText: { color: PRIMARY, fontSize: 20, fontWeight: '700' },
  rowBody: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: INK },
  nameUnread: { fontWeight: '800' },
  time: { fontSize: 12, color: '#94a3b8' },
  timeUnread: { color: PRIMARY, fontWeight: '700' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { flex: 1, fontSize: 14, color: MUTED },
  previewUnread: { color: INK, fontWeight: '600' },
  badge: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  service: { fontSize: 12, color: '#475569', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden', maxWidth: '60%' },
  status: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11.5, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 6 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#e3edff', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: INK },
  emptyText: { fontSize: 14, color: MUTED, textAlign: 'center', paddingHorizontal: 30 },
});

export default ConversationList;
