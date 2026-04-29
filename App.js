import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ActivityIndicator, View, Alert } from 'react-native';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';
import socketService from './src/services/socketService';
import {
  requestNotificationPermissions,
  addNotificationReceivedListener,
  addNotificationTapListener,
  removeNotificationSubscription,
} from './src/services/notificationService';
import { Colors } from './src/styles/theme';
import MessageToast from './src/components/MessageToast';

// Inner component that uses auth context
function AppContent() {
  const { user } = useAuth();
  const [socketReady, setSocketReady] = useState(false);
  const [pendingReview, setPendingReview] = useState(null);
  const [toast, setToast] = useState({ visible: false, senderName: '', message: '', reservationId: null });
  const appStateRef = useRef(AppState.currentState);
  const navigationRef = useRef(null);

  // Request notification permissions after login
  useEffect(() => {
    if (user) requestNotificationPermissions();
  }, [user]);

  // Track app state (foreground vs background)
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (user && !socketService.isConnected()) {
      socketService.connect();
      setSocketReady(true);
    }
  }, [user]);

  useEffect(() => {
    if (!socketReady || !user) return;

    // Listen to socket connect event to know when it's actually connected
    const handleConnect = () => {
      console.log('Socket connected successfully');
    };

    socketService.on('connect', handleConnect);

    // Listen for new messages globally for toast notifications (foreground only)
    const handleNewMessageToast = (data) => {
      if (appStateRef.current === 'active' && data.message && data.message.senderId !== user?.id) {
        setToast({
          visible: true,
          senderName: data.message.sender?.name || 'Someone',
          message: data.message.content || 'Sent you a message',
          reservationId: data.reservationId
        });
      }
    };

    socketService.on('new_message', handleNewMessageToast);

    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('new_message', handleNewMessageToast);
    };
  }, [socketReady, user]);

  // Global socket listeners for all events
  useEffect(() => {
    if (!user) return;

    // NEW MESSAGE
    const handleNewMessage = (data) => {
      if (data.senderId === user.id) return; // don't notify yourself
      if (appStateRef.current === 'active') return; // toast handles foreground
      showLocalNotification(
        `💬 ${data.senderName || 'Nouveau message'}`,
        data.content || 'Vous avez reçu un nouveau message',
        { reservationId: data.reservationId, type: 'NEW_MESSAGE' }
      );
    };

    // NEW RESERVATION (worker receives this)
    const handleNewReservation = (data) => {
      const clientName = data.reservation?.user?.name || 'Un client';
      const serviceName = data.reservation?.service?.name || 'un service';
      showLocalNotification(
        '🔔 Nouvelle demande',
        `${clientName} a demandé ${serviceName}`,
        { reservationId: data.reservation?.id, type: 'NEW_RESERVATION' }
      );
    };

    // RESERVATION STATUS CHANGED
    const handleStatusChanged = (data) => {
      const labels = {
        ACCEPTED: { title: '✅ Réservation acceptée', body: 'Votre réservation a été acceptée par le prestataire' },
        COMPLETED: { title: '🏁 Réservation terminée', body: 'Votre réservation est maintenant terminée' },
        CANCELLED: { title: '❌ Réservation annulée', body: 'Une réservation a été annulée' },
        PENDING: null,
      };
      const notif = labels[data.status];
      if (!notif) return;
      showLocalNotification(notif.title, notif.body, {
        reservationId: data.reservationId,
        type: 'RESERVATION_STATUS',
      });
    };

    // RESERVATION CANCELLED
    const handleCancelled = (data) => {
      showLocalNotification(
        '❌ Réservation annulée',
        'Une réservation a été annulée',
        { reservationId: data.reservationId, type: 'RESERVATION_CANCELLED' }
      );
    };

    socketService.on('new_message', handleNewMessage);
    socketService.on('new_reservation', handleNewReservation);
    socketService.on('reservation_status_changed', handleStatusChanged);
    socketService.on('reservation_cancelled', handleCancelled);

    return () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('new_reservation', handleNewReservation);
      socketService.off('reservation_status_changed', handleStatusChanged);
      socketService.off('reservation_cancelled', handleCancelled);
    };
  }, [user]);

  // Handle notification tap to navigate
  useEffect(() => {
    const subscription = addNotificationTapListener((data) => {
      if (!data?.type) return;
      if (data.type === 'NEW_MESSAGE' && data.reservationId) {
        navigationRef.current?.navigate('Messages', { reservationId: data.reservationId });
      }
      if (data.type === 'NEW_RESERVATION' && data.reservationId) {
        navigationRef.current?.navigate(user?.role === 'WORKER' ? 'Demandes' : 'Reservations');
      }
      if (data.type === 'RESERVATION_STATUS' && data.reservationId) {
        navigationRef.current?.navigate(user?.role === 'WORKER' ? 'Demandes' : 'Reservations');
      }
    });
    return () => subscription.remove();
  }, [user]);


  // Check for pending review on app launch
  useEffect(() => {
    if (socketReady) {
      const checkPendingReview = async () => {
        try {
          const pendingReviewData = await AsyncStorage.getItem('pendingReview');
          if (pendingReviewData) {
            const review = JSON.parse(pendingReviewData);
            setPendingReview(review);
            
            Alert.alert(
              'Job Completed!',
              `${review.workerName} has completed your ${review.serviceType} job. Would you like to leave a review?`,
              [
                {
                  text: 'Later',
                  onPress: () => {
                    // Keep it in AsyncStorage for later
                  },
                  style: 'cancel'
                },
                {
                  text: 'Review Now',
                  onPress: () => {
                    // Navigate to review page - this will be handled by navigation
                    // Update the flag to trigger navigation
                    AsyncStorage.setItem('pendingReview', JSON.stringify({
                      ...review,
                      navigateNow: true
                    }));
                    setPendingReview({ ...review, navigateNow: true });
                  }
                }
              ]
            );
          }
        } catch (error) {
          console.error('Failed to check pending review:', error);
        }
      };

      checkPendingReview();
    }
  }, [socketReady]);

  const handleToastPress = () => {
    setToast(t => ({ ...t, visible: false }));
    // Navigate to messages with the specific conversation
    // This will be handled by the navigation system
    if (toast.reservationId) {
      // Store navigation request for AppNavigator to handle
      AsyncStorage.setItem('navigateToConversation', JSON.stringify({
        conversationId: toast.reservationId
      }));
    }
  };

  const handleToastDismiss = () => {
    setToast(t => ({ ...t, visible: false }));
  };

  if (!socketReady && user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }} edges={['top']}>
      <StatusBar style="auto" />
      <AppNavigator ref={navigationRef} />
      {toast.visible && (
        <MessageToast
          visible={toast.visible}
          senderName={toast.senderName}
          message={toast.message}
          onPress={handleToastPress}
          onDismiss={handleToastDismiss}
        />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}
