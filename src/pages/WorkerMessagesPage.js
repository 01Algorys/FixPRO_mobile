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

const WorkerMessagesPage = ({ route }) => {
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
  const activeConversationRef = useRef(null);
  const messagesScrollViewRef = useRef(null);

  const userId = user?.id || user?.userId || user?.email || 'worker';

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
      // Handle reservationId param from Contacter button
      console.log('WorkerMessagesPage - reservationId param received:', reservationId);

      // Handle reservationId param - load conversations first if needed
      if (conversations.length === 0) {
        loadConversations().then(() => {
          const conv = conversations.find(c => c.id === reservationId);
          if (conv) {
            console.log('WorkerMessagesPage - opening conversation for reservation:', reservationId);
            openConversation(reservationId);
          } else {
            console.log('WorkerMessagesPage - conversation not found for reservation:', reservationId);
          }
        });
      } else {
        const conv = conversations.find(c => c.id === reservationId);
        if (conv) {
          console.log('WorkerMessagesPage - opening conversation for reservation:', reservationId);
          openConversation(reservationId);
        } else {
          console.log('WorkerMessagesPage - conversation not found for reservation:', reservationId);
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
  console.log('activeConversation', activeConversation)
  const handleBack = () => {
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

  const onSend = async () => {
    if (!activeConversationId || !draft.trim() || sending) return;
    const messageContent = draft.trim();
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
          name: user?.name || 'You',
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.card} />
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
                <Text style={styles.emptySubtitle}>Commencez une conversation avec un client</Text>
              </View>
            ) : (
              filteredConversations.map((conversation) => {
                // For workers, show user's name
                const participantName = conversation.user?.name || conversation.participantName || 'Client';
                console.log(participantName.charAt(0).toUpperCase())
                const participantAvatar = conversation.user?.avatar || conversation.participantAvatar;
                const isUnread = conversation.unreadCount > 0;

                return (
                  <TouchableOpacity
                    key={conversation.id}
                    style={[styles.threadCard, isUnread && styles.threadCardUnread]}
                    onPress={() => openConversation(conversation.id)}
                  >
                    <View style={styles.avatarContainer}>
                      <View style={styles.avatar}>
                        {participantAvatar ? (
                          <Image source={{ uri: participantAvatar }} style={styles.avatarImage} />
                        ) : (
                          <Text style={styles.avatarText}>{participantName.charAt(0).toUpperCase()}</Text>
                        )}
                      </View>
                      <OnlineBadge userId={conversation.user?.id} size={10} borderColor="#fff" />
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
              <Ionicons name="arrow-back" size={20} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.chatHeaderInfo}>
              <View style={styles.chatAvatar}>
                {activeConversation.user?.avatar || activeConversation.participantAvatar ? (
                  <Image
                    source={{ uri: activeConversation.user?.avatar || activeConversation.participantAvatar }}
                    style={styles.chatAvatarImage}
                  />
                ) : (
                  <Text style={styles.chatAvatarText}>
                    {activeConversation.user?.name?.charAt(0).toUpperCase() || 'C'}
                  </Text>
                )}
              </View>
              <View style={styles.chatHeaderText}>
                <Text style={styles.chatTitle}>{activeConversation.user?.name || activeConversation.participantName || 'Client'}</Text>
                <Text style={styles.chatSubtitle}>{activeConversation.serviceName}</Text>
                <OnlineStatusText userId={activeConversation.user?.id} />
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
              const isWorker = message.sender?.role === 'WORKER';
              const isLocal = !!message._localId;
              return (
                <View
                  key={message.id}
                  style={[styles.messageRow, isWorker ? styles.messageWorkerRow : styles.messageUserRow]}
                >
                  {!isWorker && (
                    <View style={styles.messageAvatar}>
                      {message.sender?.avatar ? (
                        <Image source={{ uri: message.sender.avatar }} style={styles.messageAvatarImage} />
                      ) : (
                        <Text style={styles.messageAvatarText}>
                          {message.sender?.name?.charAt(0).toUpperCase() || 'C'}
                        </Text>
                      )}
                    </View>
                  )}
                  <View style={[styles.bubble, isWorker ? styles.workerBubble : styles.userBubble]}>
                    <Text style={[styles.messageText, isWorker && styles.workerMessageText]}>
                      {message.content}
                    </Text>
                  </View>
                  <Text style={[styles.messageTime, isWorker ? styles.messageTimeRight : styles.messageTimeLeft]}>
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
    borderBottomRightRadius: 4,
  },
  userBubble: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderBottomLeftRadius: 4,
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
