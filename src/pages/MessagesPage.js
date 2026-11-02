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
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useFocusEffect } from '@react-navigation/native';
import apiService from '../services/api';
import socketService from '../services/socketService';
import { Colors } from '../styles/theme';
import { useResponsive, wp, hp, rf, scale } from '../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnlineBadge from '../components/OnlineBadge';
import OnlineStatusText from '../components/OnlineStatusText';
import ChatView from '../components/chat/ChatView';
import ConversationList from '../components/chat/ConversationList';

const QUICK_REPLIES = ['Bonjour !', 'Quand pouvez-vous venir ?', "Je vous envoie l'adresse exacte", 'Merci beaucoup !'];

const createStyles = (width, height, isTablet, isSmallPhone, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  sidebar: {
    flex: 1,
    backgroundColor: '#ffffff',
    width: '100%',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: insets.top + hp(4),
    paddingHorizontal: wp(5),
    paddingBottom: hp(2),
  },
  headerTitle: {
    fontSize: rf(24),
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: hp(0.5),
  },
  headerSubtitle: {
    fontSize: rf(13),
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: wp(4),
    marginBottom: hp(2.5),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: scale(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: wp(3),
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: rf(14),
  },
  clearButton: {
    marginLeft: wp(3),
    padding: wp(1),
  },
  conversationsList: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  threadCard: {
    backgroundColor: '#ffffff',
    borderRadius: scale(16),
    padding: wp(4),
    marginBottom: hp(1.25),
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
    marginRight: wp(3),
    position: 'relative',
  },
  avatar: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
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
    fontSize: rf(16),
    fontWeight: '700',
    color: Colors.primary,
  },
  threadContent: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  threadName: {
    fontSize: rf(14),
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  threadNameUnread: {
    fontWeight: '800',
    color: Colors.text,
  },
  threadTime: {
    fontSize: rf(11),
    color: Colors.textSecondary,
  },
  threadTimeUnread: {
    color: Colors.primary,
    fontWeight: '600',
  },
  threadPreview: {
    fontSize: rf(13),
    color: Colors.textSecondary,
    marginBottom: hp(0.5),
  },
  threadPreviewUnread: {
    color: '#374151',
    fontWeight: '600',
  },
  serviceTag: {
    fontSize: rf(11),
    color: Colors.textSecondary,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: scale(12),
    minWidth: scale(24),
    height: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(2),
    marginLeft: wp(2),
  },
  unreadCount: {
    color: '#ffffff',
    fontSize: rf(11),
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(10),
  },
  emptyIcon: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  emptyTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: Colors.text,
    marginBottom: hp(1),
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: rf(13),
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(18),
  },
  chatPanel: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  chatHeader: {
    backgroundColor: Colors.headerBackground,
    paddingTop: insets.top + hp(4),
    paddingHorizontal: wp(4),
    paddingBottom: hp(2),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  chatBackButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  chatAvatarImage: {
    width: '100%',
    height: '100%',
  },
  chatAvatarText: {
    fontSize: rf(16),
    fontWeight: '700',
    color: '#ffffff',
  },
  chatHeaderText: {
    flex: 1,
  },
  chatTitle: {
    fontSize: rf(14),
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: hp(0.25),
  },
  chatSubtitle: {
    fontSize: rf(12),
    color: 'rgba(255, 255, 255, 0.85)',
  },
  completedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.6),
    borderRadius: scale(12),
  },
  completedText: {
    fontSize: rf(11),
    color: '#ffffff',
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  messagesContent: {
    padding: wp(4),
  },
  systemMessageContainer: {
    alignItems: 'center',
    paddingVertical: hp(1.5),
    marginBottom: hp(1),
    flexDirection: 'row',
    justifyContent: 'center',
  },
  systemIcon: {
    marginRight: wp(1.5),
  },
  systemMessageText: {
    fontSize: rf(12),
    color: '#6b7280',
    fontStyle: 'italic',
  },
  messageRow: {
    marginBottom: hp(2),
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageUserRow: {
    justifyContent: 'flex-end',
  },
  messageOtherRow: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(2),
    overflow: 'hidden',
  },
  messageAvatarImage: {
    width: '100%',
    height: '100%',
  },
  messageAvatarText: {
    fontSize: rf(11),
    fontWeight: '700',
    color: Colors.primary,
  },
  bubble: {
    maxWidth: '70%',
    borderRadius: scale(16),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    marginHorizontal: wp(1),
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: scale(4),
  },
  otherBubble: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderBottomLeftRadius: scale(4),
  },
  messageText: {
    color: Colors.text,
    fontSize: rf(13),
    lineHeight: rf(16),
  },
  userMessageText: {
    color: Colors.textLight,
  },
  messageTime: {
    fontSize: rf(10),
    color: Colors.textSecondary,
    marginTop: hp(0.5),
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
    padding: wp(4),
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: insets.bottom + wp(4),
  },
  composerInput: {
    flex: 1,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: scale(22),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.25),
    marginRight: wp(3),
    color: Colors.text,
    backgroundColor: '#f3f4f6',
    fontSize: rf(14),
  },
  sendButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
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
    padding: wp(4),
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: insets.bottom + wp(4),
  },
  completedBarText: {
    marginLeft: wp(2),
    fontSize: rf(13),
    color: Colors.textSecondary,
  },
});

const MessagesPage = ({ route, navigation }) => {
  const { conversationId, reservationId } = route.params || {};
  const { width, height, isTablet, isSmallPhone } = useResponsive();
  const insets = useSafeAreaInsets();
  const styles = createStyles(width, height, isTablet, isSmallPhone, insets);
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
  const isSendingRef = useRef(false);

  const userId = user?.id || user?.userId || user?.email || 'guest';

  // Helper functions for time formatting
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

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

  // Opened from a notification or a "Contacter" button: the list on screen may
  // predate the conversation, so reload it before opening the chat.
  useEffect(() => {
    const targetId = Number(conversationId || reservationId);
    if (!targetId) return;
    loadConversations({ silent: true }).then(() => onOpenConversation(targetId));
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
      // Refresh in the background so new conversations show up
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
      // For regular users, search by worker name
      const workerName = (conversation.worker?.user?.name || conversation.worker?.name || '').toLowerCase();
      // For workers, search by user name
      const userName = (conversation.user?.name || '').toLowerCase();
      const serviceName = (conversation.service?.name || '').toLowerCase();
      return workerName.includes(term) || userName.includes(term) || serviceName.includes(term);
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

  const onOpenConversation = async (id) => {
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

  const loadMessages = async (conversationId) => {
    try {
      const messagesResponse = await apiService.getMessages(conversationId);
      const messages = messagesResponse.data?.messages || messagesResponse.messages || messagesResponse.data || messagesResponse || [];
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
    if (isSendingRef.current) return; // Prevent duplicate sends

    setDraft('');
    setSending(true);
    isSendingRef.current = true;
    
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
          name: user?.name || 'You',
          role: user?.role || 'USER',
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
      isSendingRef.current = false;
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

  const participantOf = (c) => ({
    name: c.worker?.user?.name || c.workerName || c.worker?.name || c.participantName || 'Technicien',
    avatar: c.worker?.user?.avatar || c.workerAvatar || c.worker?.avatar || c.participantAvatar,
    userId: c.worker?.userId || c.worker?.id,
  });

  if (activeConversation) {
    return (
      <ChatView
        participant={participantOf(activeConversation)}
        subtitle={activeConversation.service?.name || activeConversation.serviceName}
        status={activeConversation.status}
        messages={messages}
        isMine={(m) => !!m._localId || (user?.id ? m.senderId === user.id : m.sender?.role === 'USER')}
        draft={draft}
        onChangeDraft={setDraft}
        onSend={onSend}
        sending={sending}
        onBack={handleBack}
        quickReplies={QUICK_REPLIES}
      />
    );
  }

  return (
    <ConversationList
      conversations={filteredConversations}
      search={search}
      onSearch={setSearch}
      onOpen={onOpenConversation}
      getParticipant={participantOf}
      emptyText="Vos échanges avec les techniciens apparaîtront ici dès qu'une réservation est acceptée."
      refreshing={refreshing}
      onRefresh={async () => { setRefreshing(true); await loadConversations({ silent: true }); setRefreshing(false); }}
    />
  );
};

export default MessagesPage;
