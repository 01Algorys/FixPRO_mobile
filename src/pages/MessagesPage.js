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

const MessagesPage = ({ route }) => {
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

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await apiService.getConversations();
      const conversations = response.data?.conversations || response.conversations || response.data || response || [];
      const mapped = conversations.map(conv => ({
        ...conv,
        unreadCount: conv.unreadCount || conv.unread_count || 0
      }));
      setConversations(sortConversations(mapped));
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
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

  useEffect(() => {
    if (conversationId) {
      setActiveConversationId(conversationId);
      loadMessages(conversationId);
      socketService.joinReservation(conversationId);
    } else if (reservationId) {
      // Handle reservationId param - load conversations first if needed
      if (conversations.length === 0) {
        loadConversations().then(() => {
          const conv = conversations.find(c => c.id === reservationId);
          if (conv) {
            onOpenConversation(reservationId);
          }
        });
      } else {
        const conv = conversations.find(c => c.id === reservationId);
        if (conv) {
          onOpenConversation(reservationId);
        }
      }
    }
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
      // Only reload conversations if not currently viewing a chat
      if (!activeConversationId) {
        loadConversations();
      }
    }, [resetUnreadMessages, activeConversationId])
  );

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const term = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
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

  const onSend = async () => {
    if (!activeConversationId || !draft.trim() || sending) return;
    if (isSendingRef.current) return; // Prevent duplicate sends
    
    const messageContent = draft.trim();
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.card} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.bottom}
      >
      {!activeConversation ? (
        <View style={styles.sidebar}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSubtitle}>{filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color={Colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher..."
              placeholderTextColor={Colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
                <Ionicons name="close" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.conversationsList}>
            {filteredConversations.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="chatbubbles-outline" size={32} color={Colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Aucune conversation</Text>
                <Text style={styles.emptySubtitle}>Commencez une conversation avec un travailleur</Text>
              </View>
            ) : (
              filteredConversations.map((conversation) => {
                // For regular users, show worker's name
                const participantName = conversation.worker?.user?.name || conversation.workerName || conversation.worker?.name || conversation.participantName || 'Worker';
                const participantAvatar = conversation.worker?.user?.avatar || conversation.workerAvatar || conversation.worker?.avatar || conversation.participantAvatar;
                const isUnread = conversation.unreadCount > 0;
                
                return (
                  <TouchableOpacity
                    key={conversation.id}
                    style={[styles.threadCard, isUnread && styles.threadCardUnread]}
                    onPress={() => onOpenConversation(conversation.id)}
                  >
                    <View style={styles.avatarContainer}>
                      <View style={styles.avatar}>
                        {participantAvatar ? (
                          <Image source={{ uri: participantAvatar }} style={styles.avatarImage} />
                        ) : (
                          <Text style={styles.avatarText}>{participantName.charAt(0).toUpperCase()}</Text>
                        )}
                      </View>
                      <OnlineBadge userId={conversation.worker?.userId || conversation.worker?.id} size={12} borderColor="#fff" />
                    </View>
                    <View style={styles.threadContent}>
                      <View style={styles.threadHeader}>
                        <Text style={[styles.threadName, isUnread && styles.threadNameUnread]} numberOfLines={1}>
                          {participantName}
                        </Text>
                        <Text style={[styles.threadTime, isUnread && styles.threadTimeUnread]}>
                          {formatDate(conversation.lastMessage?.createdAt || conversation.updatedAt)}
                        </Text>
                      </View>
                      <Text style={[styles.threadPreview, isUnread && styles.threadPreviewUnread]} numberOfLines={1}>
                        {conversation.lastMessage?.content || 'No messages yet'}
                      </Text>
                      <Text style={styles.serviceTag}>📋 {conversation.service?.name || 'Service'}</Text>
                    </View>
                    {isUnread && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCount}>{conversation.unreadCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.chatPanel}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={handleBack} style={styles.chatBackButton}>
              <Ionicons name="arrow-back" size={20} color={Colors.textLight} />
            </TouchableOpacity>
            <View style={styles.chatHeaderInfo}>
              <View style={styles.chatAvatar}>
                <Text style={styles.chatAvatarText}>
                  {activeConversation.participantName?.charAt(0).toUpperCase() || 'W'}
                </Text>
              </View>
              <View style={styles.chatHeaderText}>
                <Text style={styles.chatTitle}>{activeConversation.participantName}</Text>
                <Text style={styles.chatSubtitle}>{activeConversation.serviceName}</Text>
                <OnlineStatusText userId={activeConversation.worker?.userId || activeConversation.worker?.id} />
              </View>
            </View>
            {activeConversation.status === 'COMPLETED' && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedText}>Terminé</Text>
              </View>
            )}
          </View>
          <ScrollView 
            ref={messagesScrollViewRef} 
            style={styles.messagesList} 
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => {
              const isSystem = message.type === 'system' || message.isSystem === true;
              if (isSystem) {
                return (
                  <View key={message.id} style={styles.systemMessageContainer}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.textSecondary} style={styles.systemIcon} />
                    <Text style={styles.systemMessageText}>{message.content}</Text>
                  </View>
                );
              }
              const isUser = message.sender?.role === 'USER';
              const isLocal = !!message._localId;
              return (
                <View
                  key={message.id}
                  style={[styles.messageRow, isUser ? styles.messageUserRow : styles.messageOtherRow]}
                >
                  {isUser && (
                    <View style={styles.messageAvatar}>
                      {message.sender?.avatar ? (
                        <Image source={{ uri: message.sender.avatar }} style={styles.messageAvatarImage} />
                      ) : (
                        <Text style={styles.messageAvatarText}>
                          {message.sender?.name?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      )}
                    </View>
                  )}
                  <View style={[styles.bubble, isUser ? styles.userBubble : styles.otherBubble]}>
                    <Text style={[styles.messageText, isUser && styles.userMessageText]}>
                      {message.content}
                    </Text>
                  </View>
                  <Text style={[styles.messageTime, isUser ? styles.messageTimeRight : styles.messageTimeLeft]}>
                    {formatTime(message.createdAt)}{isLocal ? ' (Envoi...)' : ''}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
          {activeConversation.status === 'COMPLETED' ? (
            <View style={styles.completedBar}>
              <Ionicons name="lock-closed" size={16} color={Colors.textSecondary} />
              <Text style={styles.completedBarText}>Cette conversation est terminée</Text>
            </View>
          ) : (
            <View style={styles.composer}>
              <TextInput
                style={styles.composerInput}
                placeholder="Écrire un message..."
                placeholderTextColor={Colors.textSecondary}
                value={draft}
                onChangeText={setDraft}
                multiline
              />
              <TouchableOpacity 
                style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]} 
                onPress={onSend}
                disabled={!draft.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={Colors.textLight} />
                ) : (
                  <Ionicons name="send" size={20} color={Colors.textLight} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default MessagesPage;
