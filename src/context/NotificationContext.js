import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socketService';
import apiService from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [reservationUnread, setReservationUnread] = useState(0);
  const [newConversation, setNewConversation] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const activeConversationRef = useRef(null);

  // Keep ref in sync with state
  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    // Load unread counts from AsyncStorage on mount
    const loadUnreadCounts = async () => {
      try {
        // Only load from API if user is authenticated
        if (isAuthenticated) {
          const response = await apiService.getUnreadMessageCount();
          setUnreadMessages(response.data?.unreadCount || 0);
          await AsyncStorage.setItem('unreadCount', String(response.data?.unreadCount || 0));
        } else {
          // Fall back to AsyncStorage for non-authenticated users
          const stored = await AsyncStorage.getItem('unreadCount');
          if (stored) setUnreadMessages(parseInt(stored));
        }

        // Load reservation unread count from AsyncStorage
        const storedReservation = await AsyncStorage.getItem('reservationUnreadCount');
        if (storedReservation) setReservationUnread(parseInt(storedReservation));
      } catch (error) {
        console.error('Failed to load unread counts:', error);
        // Fall back to AsyncStorage
        const stored = await AsyncStorage.getItem('unreadCount');
        if (stored) setUnreadMessages(parseInt(stored));
        const storedReservation = await AsyncStorage.getItem('reservationUnreadCount');
        if (storedReservation) setReservationUnread(parseInt(storedReservation));
      }
    };

    loadUnreadCounts();

    // Global new_message listener for tab badge updates
    const handleNewMessage = async (data) => {
      // Only increment if user is NOT currently viewing that conversation
      if (data.reservationId !== activeConversationRef.current) {
        setUnreadMessages(prev => {
          const newCount = prev + 1;
          AsyncStorage.setItem('unreadCount', String(newCount));
          return newCount;
        });
      }
    };

    // new_message_badge listener for badge increments
    const handleNewMessageBadge = async (data) => {
      // Only increment if user is NOT currently viewing that conversation
      if (data.reservationId !== activeConversationRef.current) {
        setUnreadMessages(prev => {
          const newCount = prev + 1;
          AsyncStorage.setItem('unreadCount', String(newCount));
          return newCount;
        });
      }
    };

    // new_reservation listener for workers
    const handleNewReservation = async (data) => {
      setReservationUnread(prev => {
        const newCount = prev + 1;
        AsyncStorage.setItem('reservationUnreadCount', String(newCount));
        return newCount;
      });
    };

    // Status changes and finished jobs bump the reservations badge (not a
    // cancellation: that request just disappears); the banners and the
    // review screen are handled in App.js
    const handleReservationUpdate = (data) => {
      if (data.eventType === 'cancelled') return;
      setReservationUnread(prev => {
        const newCount = prev + 1;
        AsyncStorage.setItem('reservationUnreadCount', String(newCount));
        return newCount;
      });
    };

    // conversation_started listener for real-time conversation updates
    const handleConversationStarted = async (data) => {
      console.log('New conversation started:', data);
      setNewConversation(data);
    };

    // Register all listeners on socket connect
    const registerListeners = () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('new_message_badge', handleNewMessageBadge);
      socketService.off('conversation_started', handleConversationStarted);
      
      socketService.on('new_message', handleNewMessage);
      socketService.on('new_message_badge', handleNewMessageBadge);
      socketService.on('conversation_started', handleConversationStarted);
      
      console.log('All notification listeners registered');
    };

    const unsubscribeNewReservation = socketService.onNewReservation(handleNewReservation);
    const unsubscribeReservationUpdate = socketService.onReservationUpdate(handleReservationUpdate);

    // Listen to connect event to register listeners
    socketService.on('connect', registerListeners);

    // If socket is already connected, register immediately
    if (socketService.isConnected()) {
      registerListeners();
    }

    return () => {
      unsubscribeNewReservation();
      unsubscribeReservationUpdate();
      socketService.off('connect', registerListeners);
      socketService.off('new_message', handleNewMessage);
      socketService.off('new_message_badge', handleNewMessageBadge);
      socketService.off('conversation_started', handleConversationStarted);
    };
  }, []);

  const resetUnreadMessages = async () => {
    setUnreadMessages(0);
    await AsyncStorage.setItem('unreadCount', '0');
  };

  const resetReservationUnread = async () => {
    setReservationUnread(0);
    await AsyncStorage.setItem('reservationUnreadCount', '0');
  };

  const setCurrentConversation = (conversationId) => {
    setActiveConversationId(conversationId);
  };

  const decrementUnreadByCount = async (count) => {
    setUnreadMessages(prev => {
      const newCount = Math.max(0, prev - count);
      AsyncStorage.setItem('unreadCount', String(newCount));
      return newCount;
    });
  };

  return (
    <NotificationContext.Provider value={{ 
      unreadMessages, 
      setUnreadMessages, 
      resetUnreadMessages,
      reservationUnread,
      setReservationUnread,
      resetReservationUnread,
      newConversation,
      setNewConversation,
      activeConversationId,
      setCurrentConversation,
      decrementUnreadByCount
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
