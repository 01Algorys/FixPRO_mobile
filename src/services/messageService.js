import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from '../i18n';

const STORAGE_PREFIX = 'fixpro_messages';

const buildStorageKey = (userId) => `${STORAGE_PREFIX}:${userId || 'guest'}`;

const safeArray = (value) => (Array.isArray(value) ? value : []);

const uniqueId = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeDate = (dateValue) => {
  const parsed = new Date(dateValue || Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const formatReservationConversation = (reservation) => {
  const reservationId = String(reservation.id ?? reservation.reservationId ?? '');
  if (!reservationId) return null;

  return {
    id: `reservation_${reservationId}`,
    reservationId,
    workerId: reservation.workerId || reservation.worker?.id || null,
    participantName:
      reservation.workerName ||
      reservation.worker?.name ||
      reservation.providerName ||
      t('common.professional'),
    participantRole: 'WORKER',
    serviceName: reservation.service?.name || reservation.service || t('common.service'),
    lastMessage: t('chat.created'),
    lastMessageAt: normalizeDate(reservation.createdAt || reservation.date).toISOString(),
    unreadCount: 0,
  };
};

class MessageService {
  async getStore(userId) {
    try {
      const key = buildStorageKey(userId);
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return { conversations: [], messagesByConversation: {} };
      const parsed = JSON.parse(raw);
      return {
        conversations: safeArray(parsed.conversations),
        messagesByConversation: parsed.messagesByConversation || {},
      };
    } catch (error) {
      console.error('Failed to read messages store:', error);
      return { conversations: [], messagesByConversation: {} };
    }
  }

  async saveStore(userId, store) {
    const key = buildStorageKey(userId);
    await AsyncStorage.setItem(key, JSON.stringify(store));
  }

  async syncConversationsFromReservations(userId, reservations) {
    const store = await this.getStore(userId);
    const list = safeArray(reservations);
    const existingMap = new Map(store.conversations.map((c) => [c.id, c]));

    list.forEach((reservation) => {
      const seeded = formatReservationConversation(reservation);
      if (!seeded || existingMap.has(seeded.id)) return;
      store.conversations.push(seeded);
      store.messagesByConversation[seeded.id] = [
        {
          id: uniqueId('msg'),
          conversationId: seeded.id,
          text: t('chat.booked', { service: seeded.serviceName }),
          senderRole: 'SYSTEM',
          senderName: 'FixPro',
          createdAt: seeded.lastMessageAt,
        },
      ];
    });

    store.conversations.sort(
      (a, b) => normalizeDate(b.lastMessageAt).getTime() - normalizeDate(a.lastMessageAt).getTime()
    );

    await this.saveStore(userId, store);
    return store.conversations;
  }

  async upsertConversations(userId, incomingConversations) {
    const store = await this.getStore(userId);
    const existingMap = new Map(store.conversations.map((c) => [c.id, c]));

    safeArray(incomingConversations).forEach((conversation) => {
      if (!conversation?.id) return;
      if (!existingMap.has(conversation.id)) {
        store.conversations.push({
          ...conversation,
          unreadCount: conversation.unreadCount || 0,
          lastMessage:
            conversation.lastMessage || t('chat.created'),
          lastMessageAt: conversation.lastMessageAt || new Date().toISOString(),
        });
        store.messagesByConversation[conversation.id] = safeArray(
          store.messagesByConversation[conversation.id]
        );
      } else {
        const existing = existingMap.get(conversation.id);
        Object.assign(existing, { ...existing, ...conversation });
      }
    });

    store.conversations.sort(
      (a, b) => normalizeDate(b.lastMessageAt).getTime() - normalizeDate(a.lastMessageAt).getTime()
    );
    await this.saveStore(userId, store);
    return store.conversations;
  }

  async getConversations(userId) {
    const store = await this.getStore(userId);
    return store.conversations.sort(
      (a, b) => normalizeDate(b.lastMessageAt).getTime() - normalizeDate(a.lastMessageAt).getTime()
    );
  }

  async getMessages(userId, conversationId) {
    const store = await this.getStore(userId);
    return safeArray(store.messagesByConversation[conversationId]).sort(
      (a, b) => normalizeDate(a.createdAt).getTime() - normalizeDate(b.createdAt).getTime()
    );
  }

  async sendMessage(userId, conversationId, text, senderRole = 'USER', senderName = t('chat.you')) {
    const trimmed = (text || '').trim();
    if (!trimmed) return null;

    const store = await this.getStore(userId);
    const now = new Date().toISOString();
    const nextMessage = {
      id: uniqueId('msg'),
      conversationId,
      text: trimmed,
      senderRole,
      senderName,
      createdAt: now,
    };

    const current = safeArray(store.messagesByConversation[conversationId]);
    store.messagesByConversation[conversationId] = [...current, nextMessage];

    store.conversations = store.conversations.map((conversation) => {
      if (conversation.id !== conversationId) return conversation;
      return {
        ...conversation,
        lastMessage: trimmed,
        lastMessageAt: now,
      };
    });

    store.conversations.sort(
      (a, b) => normalizeDate(b.lastMessageAt).getTime() - normalizeDate(a.lastMessageAt).getTime()
    );
    await this.saveStore(userId, store);
    return nextMessage;
  }
}

const messageService = new MessageService();
export default messageService;
