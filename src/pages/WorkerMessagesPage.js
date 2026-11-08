import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useFocusEffect } from '@react-navigation/native';
import apiService from '../services/api';
import socketService from '../services/socketService';
import { Colors } from '../styles/theme';
import OnlineBadge from '../components/OnlineBadge';
import OnlineStatusText from '../components/OnlineStatusText';
import { usePresence } from '../hooks/usePresence';
import ChatView from '../components/chat/ChatView';
import { sendChatImage } from '../utils/chatImages';
import ConversationList from '../components/chat/ConversationList';
import { t } from '../i18n';

const QUICK_REPLIES = [t('chat.quickOnMyWay'), t('chat.quick15'), t('chat.quickPhoto'), t('chat.quickBye')];

const WorkerMessagesPage = ({ route, navigation }) => {
  const { conversationId, reservationId } = route.params || {};
  const { user } = useAuth();
  const { resetUnreadMessages, newConversation, setNewConversation, setCurrentConversation, decrementUnreadByCount } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const activeConversationRef = useRef(null);
  const messagesScrollViewRef = useRef(null);

  const userId = user?.id || user?.userId || user?.email || 'worker';

  // Keep ref in sync with state
  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  const sortConversations = (convs) => {
    return [...convs].sort((a, b) => {
      const dateA = new Date(a.lastMessage?.createdAt || a.updatedAt || 0);
      const dateB = new Date(b.lastMessage?.createdAt || b.updatedAt || 0);
      return dateB - dateA; // newest first
    });
  };

  // Returns the loaded list so callers can look a conversation up right away.
  // `silent` refreshes in the background without the full-screen spinner.
  const loadConversations = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await apiService.getConversations();
      const conversations = response.data?.conversations || response.conversations || response.data || response || [];
      const mapped = sortConversations(conversations.map(conv => ({
        ...conv,
        unreadCount: conv.unreadCount || conv.unread_count || 0
      })));
      setConversations(mapped);
      return mapped;
    } catch (error) {
      console.error('Failed to load conversations:', error);
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Hook 1: listener setup (runs once on mount)
  useEffect(() => {
    const handleNewMessage = (data) => {
      // Don't append if this is our own message (already added locally)
      if (data.message.senderId === userId) {
        // Update the local message with the real ID from server
        setMessages(prev => prev.map(msg => {
          if (msg._localId) {
            // Replace local message with server message
            return { ...data.message, _localId: undefined };
          }
          return msg;
        }));
        return;
      }

      if (data.reservationId === activeConversationRef.current) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === data.message.id);
          return exists ? prev : [...prev, data.message];
        });
      } else {
        setConversations(prev => {
          const updated = prev.map(conv =>
            conv.id === data.reservationId
              ? { ...conv, lastMessage: { content: data.message.content, createdAt: data.message.createdAt }, unreadCount: Math.max(0, (conv.unreadCount || 0) + 1) }
              : conv
          );
          return sortConversations(updated);
        });
      }
    };

    socketService.on('new_message', handleNewMessage);

    return () => {
      socketService.off('new_message', handleNewMessage);
    };
  }, []);

  // Hook 2: room join/leave (runs when active conversation changes)
  useEffect(() => {
    if (activeConversationId) {
      socketService.joinReservation(activeConversationId);
    }
    return () => {
      if (activeConversationId) {
        socketService.leaveReservation(activeConversationId);
      }
    };
  }, [activeConversationId]);

  // Opened from "Accepter" or "Contacter": the conversation list on screen may
  // predate the reservation, so reload it first, and fall back to the
  // reservation itself if the list still doesn't have it.
  const openFromParams = async (id) => {
    const list = (await loadConversations({ silent: true })) || [];
    if (!list.some((c) => c.id === id)) {
      try {
        const res = await apiService.getReservation(id);
        const r = res.data?.reservation || res.data || res;
        if (r?.id) {
          setConversations((prev) => sortConversations([{
            id: r.id,
            reservationId: r.id,
            user: r.user,
            service: r.service,
            serviceName: r.service?.name,
            status: r.status,
            updatedAt: r.updatedAt,
            unreadCount: 0,
          }, ...prev.filter((c) => c.id !== r.id)]));
        }
      } catch (error) {
        console.error('Failed to load reservation for conversation:', error);
      }
    }
    openConversation(id);
  };

  useEffect(() => {
    const targetId = Number(conversationId || reservationId);
    if (!targetId) return;
    openFromParams(targetId);
    // Consume the param so coming back to this tab later doesn't reopen the chat
    navigation.setParams({ conversationId: undefined, reservationId: undefined });
  }, [conversationId, reservationId]);

  // Listen for new conversations from socket
  useEffect(() => {
    if (newConversation) {
      setConversations(prev => {
        // Check if conversation already exists by reservationId
        const exists = prev.some(conv => conv.id === newConversation.reservationId);
        if (!exists) {
          // Prepend new conversation to the top
          const newConv = {
            id: newConversation.reservationId,
            reservationId: newConversation.reservationId,
            user: newConversation.user,
            worker: newConversation.worker,
            service: newConversation.service,
            lastMessage: newConversation.lastMessage,
            updatedAt: newConversation.updatedAt,
            unreadCount: 0,
            status: newConversation.status
          };
          return sortConversations([newConv, ...prev]);
        }
        return prev;
      });
      // Clear the new conversation after processing
      setNewConversation(null);
    }
  }, [newConversation, setNewConversation]);

  useFocusEffect(
    useCallback(() => {
      resetUnreadMessages();
      // Refresh in the background so new or just-accepted reservations show up
      loadConversations({ silent: true });
    }, [resetUnreadMessages])
  );

  const filteredConversations = useMemo(() => {
    // Filter out pending reservations - messaging not available
    const nonPendingConversations = conversations.filter(
      (conv) => conv.status !== 'PENDING' && conv.status !== 'pending'
    );

    if (!search.trim()) return nonPendingConversations;
    const term = search.trim().toLowerCase();
    return nonPendingConversations.filter((conversation) => {
      // For workers, search by user name
      const userName = (conversation.user?.name || '').toLowerCase();
      const serviceName = (conversation.service?.name || '').toLowerCase();
      return userName.includes(term) || serviceName.includes(term);
    });
  }, [conversations, search]);

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);
  const handleBack = () => {
    // Messages that arrived while the chat was open have been seen
    const leavingId = activeConversationId;
    apiService.markConversationAsRead(leavingId).catch(() => {});
    setConversations((prev) => prev.map((c) => (c.id === leavingId ? { ...c, unreadCount: 0 } : c)));
    socketService.leaveReservation(activeConversationId);
    setActiveConversationId(null);
    activeConversationRef.current = null;
    setCurrentConversation(null); // Clear current conversation in NotificationContext
    setMessages([]);
  };

  const openConversation = async (id) => {
    setActiveConversationId(id);
    activeConversationRef.current = id;
    setCurrentConversation(id); // Set current conversation in NotificationContext
    setMessages([]);
    loadMessages(id);
    socketService.joinReservation(id);

    // Mark conversation as read in DB
    try {
      await apiService.markConversationAsRead(id);
    } catch (error) {
      console.error('Failed to mark conversation as read:', error);
    }

    setConversations(prev => {
      const updated = prev.map(conv =>
        conv.id === id
          ? { ...conv, unreadCount: 0 }
          : conv
      );
      // Reset tab badge if all conversations are now read
      const remainingUnread = updated.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      if (remainingUnread === 0) {
        resetUnreadMessages();
      }
      return updated;
    });
  };

  const loadMessages = async (id) => {
    try {
      console.log('WorkerMessagesPage - loading messages for conversation:', id);
      const messagesResponse = await apiService.getMessages(id);
      const messages = messagesResponse.data?.messages || messagesResponse.messages || messagesResponse.data || messagesResponse || [];
      console.log('WorkerMessagesPage - messages loaded:', messages.length);
      setMessages(messages);
      // Scroll to bottom after messages load
      setTimeout(() => {
        messagesScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  };

  // `text` comes from a quick reply; otherwise the draft is sent
  const onSend = async (text) => {
    const messageContent = (typeof text === 'string' ? text : draft).trim();
    if (!activeConversationId || !messageContent || sending) return;
    setDraft('');
    setSending(true);

    try {
      // Create local message with unique ID
      const localId = `local_${Date.now()}_${Math.random()}`;
      const newMessage = {
        _localId: localId,
        id: Date.now(), // temporary ID
        content: messageContent,
        senderId: userId,
        sender: {
          id: userId,
          name: user?.name || t('chat.you'),
          role: user?.role || 'WORKER',
          avatar: user?.avatar
        },
        createdAt: new Date().toISOString(),
        type: 'text'
      };

      // Append message immediately
      setMessages(prev => [...prev, newMessage]);

      // Send to backend
      await apiService.sendMessage(activeConversationId, messageContent);

      // Scroll to bottom after sending
      setTimeout(() => {
        messagesScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    } catch (error) {
      console.error('Failed to send message:', error);
      setDraft(messageContent); // restore draft on error
      // Remove the local message on error
      setMessages(prev => prev.filter(msg => !msg._localId));
    } finally {
      setSending(false);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [messages]);

  // Full-screen chat: hide the tab bar while a conversation is open
  useEffect(() => {
    navigation.setOptions({ tabBarStyle: activeConversation ? { display: 'none' } : undefined });
  }, [!!activeConversation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (activeConversation) {
    return (
      <ChatView
        participant={{
          name: activeConversation.user?.name || activeConversation.participantName || t('common.client'),
          avatar: activeConversation.user?.avatar || activeConversation.participantAvatar,
          userId: activeConversation.user?.id,
        }}
        subtitle={activeConversation.service?.name || activeConversation.serviceName}
        status={activeConversation.status}
        messages={messages}
        onSendImage={(asset) => sendChatImage({
          asset,
          reservationId: activeConversationId,
          sender: { id: userId, name: user?.name, role: user?.role || 'WORKER', avatar: user?.avatar },
          setMessages,
        })}
        isMine={(m) => !!m._localId || (user?.id ? m.senderId === user.id : m.sender?.role === 'WORKER')}
        draft={draft}
        onChangeDraft={setDraft}
        onSend={onSend}
        sending={sending}
        onBack={handleBack}
        onOpenReservation={() => navigation.navigate('WorkerReservationDetails', { reservation: activeConversation })}
        quickReplies={QUICK_REPLIES}
      />
    );
  }

  return (
    <ConversationList
      conversations={filteredConversations}
      search={search}
      onSearch={setSearch}
      onOpen={openConversation}
      getParticipant={(c) => ({
        name: c.user?.name || c.participantName || t('common.client'),
        avatar: c.user?.avatar || c.participantAvatar,
        userId: c.user?.id,
      })}
      emptyText={t('chat.workerEmpty')}
      refreshing={refreshing}
      onRefresh={async () => { setRefreshing(true); await loadConversations({ silent: true }); setRefreshing(false); }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    width: '100%',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  sidebar: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
  },
  clearButton: {
    marginLeft: 12,
    padding: 4,
  },
  conversationsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  threadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  threadCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  chatSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  threadContent: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  threadName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  threadNameUnread: {
    fontWeight: '800',
    color: Colors.text,
  },
  threadTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  threadTimeUnread: {
    color: Colors.primary,
    fontWeight: '600',
  },
  threadPreview: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  threadPreviewUnread: {
    color: '#374151',
    fontWeight: '600',
  },
  serviceTag: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  chatPanel: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  chatHeader: {
    backgroundColor: Colors.headerBackground,
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  chatBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  chatAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  chatAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  chatHeaderText: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    marginTop: 5,
    fontWeight: '600',
    color: '#ffffff',
  },
  chatSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  completedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  messagesContent: {
    padding: 16,
  },
  systemMessageContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  systemIcon: {
    marginRight: 6,
  },
  systemMessageText: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  messageRow: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageWorkerRow: {
    justifyContent: 'flex-end',
  },
  messageUserRow: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  messageAvatarImage: {
    width: '100%',
    height: '100%',
  },
  messageAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  bubble: {
    maxWidth: '70%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  workerBubble: {
    backgroundColor: Colors.primary,
    borderBottomEndRadius: 4,
  },
  userBubble: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderBottomStartRadius: 4,
  },
  messageText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 18,
  },
  workerMessageText: {
    color: Colors.textLight,
  },
  messageTime: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  messageTimeRight: {
    textAlign: 'right',
  },
  messageTimeLeft: {
    textAlign: 'left',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  composerInput: {
    flex: 1,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    color: Colors.text,
    backgroundColor: '#f3f4f6',
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  completedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  completedBarText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

export default WorkerMessagesPage;
