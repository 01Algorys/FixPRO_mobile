import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socketService';
import { Alert } from 'react-native';
import apiService from '../services/api';
import { useAuth } from './AuthContext';

const API_BASE_URL = process.env.EXPO_API_URL || 'http://192.168.1.15:3001/api';

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

    // reservation_status_changed listener for users and workers
    const handleStatusChanged = async (data) => {
      setReservationUnread(prev => {
        const newCount = prev + 1;
        AsyncStorage.setItem('reservationUnreadCount', String(newCount));
        return newCount;
      });

      // Show alert based on status
      const { newStatus, workerName, userName, serviceType } = data;
      let message = '';
      
      switch (newStatus) {
        case 'ACCEPTED':
          message = `Your reservation has been accepted by ${workerName}`;
          break;
        case 'REJECTED':
          message = `Your reservation was declined by ${workerName}`;
          break;
        case 'COMPLETED':
          message = `Your job has been marked as completed`;
          break;
        case 'CANCELLED':
          message = `Your reservation was cancelled`;
          break;
        default:
          message = `Reservation status changed to ${newStatus}`;
      }

      Alert.alert('Reservation Update', message);
    };

    // job_completed listener with review prompt
    const handleJobCompleted = async (data) => {
      const { reservationId, workerId, workerName, serviceType } = data;
      
      Alert.alert(
        'Job Completed!',
        `${workerName} has completed your ${serviceType} job. Would you like to leave a review?`,
        [
          {
            text: 'Later',
            onPress: async () => {
              // Store pending review for later
              await AsyncStorage.setItem('pendingReview', JSON.stringify({
                reservationId,
                workerId,
                workerName,
                serviceType
              }));
            },
            style: 'cancel'
          },
          {
            text: 'Review Now',
            onPress: () => {
              // Navigate to review page - this will be handled by navigation
              // Store in AsyncStorage for App.js to pick up
              AsyncStorage.setItem('pendingReview', JSON.stringify({
                reservationId,
                workerId,
                workerName,
                serviceType,
                navigateNow: true
              }));
            }
          }
        ]
      );
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
      socketService.off('new_reservation', handleNewReservation);
      socketService.off('reservation_status_changed', handleStatusChanged);
      socketService.off('job_completed', handleJobCompleted);
      socketService.off('conversation_started', handleConversationStarted);
      
      socketService.on('new_message', handleNewMessage);
      socketService.on('new_message_badge', handleNewMessageBadge);
      socketService.on('new_reservation', handleNewReservation);
      socketService.on('reservation_status_changed', handleStatusChanged);
      socketService.on('job_completed', handleJobCompleted);
      socketService.on('conversation_started', handleConversationStarted);
      
      console.log('All notification listeners registered');
    };

    // Listen to connect event to register listeners
    socketService.on('connect', registerListeners);

    // If socket is already connected, register immediately
    if (socketService.isConnected()) {
      registerListeners();
    }

    return () => {
      socketService.off('connect', registerListeners);
      socketService.off('new_message', handleNewMessage);
      socketService.off('new_message_badge', handleNewMessageBadge);
      socketService.off('new_reservation', handleNewReservation);
      socketService.off('reservation_status_changed', handleStatusChanged);
      socketService.off('job_completed', handleJobCompleted);
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
