import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ChromeProvider, useChromeColors } from './context/ChromeContext';
import AppNavigator from './navigation/AppNavigator';
import { navigationRef, navigate } from './navigation/RootNavigation';
import socketService from './services/socketService';
import {
  requestNotificationPermissions,
  addNotificationReceivedListener,
  addNotificationTapListener,
  removeNotificationSubscription,
  showLocalNotification,
  hasPushToken,
  getLaunchNotificationData,
} from './services/notificationService';
import { Colors } from './styles/theme';
import MessageToast from './components/MessageToast';
import { localizeNotification, serviceName } from './i18n/serverText';
import { t } from './i18n';

// Opens the review screen for a finished job (once, even if the push and the
// live event both arrive)
const openReview = ({ reservationId, workerId, workerName }) => {
  const current = navigationRef.current?.getCurrentRoute();
  if (current?.name === 'Rating' && current.params?.reservationId === reservationId) return;
  navigationRef.current?.navigate('Rating', { reservationId, workerId, workerName });
};

// Inner component that uses auth context
function AppContent() {
  const { user } = useAuth();
  const chrome = useChromeColors();
  const [socketReady, setSocketReady] = useState(false);
  const [pendingReview, setPendingReview] = useState(null);
  const [toast, setToast] = useState({ visible: false, senderName: '', message: '', reservationId: null });
  const appStateRef = useRef(AppState.currentState);

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
          senderName: data.message.sender?.name || t('chat.someone'),
          message: data.message.content || t('chat.sentYouMessage'),
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
        `💬 ${data.senderName || t('chat.newMessage')}`,
        data.content || t('chat.newMessageBody'),
        { reservationId: data.reservationId, type: 'NEW_MESSAGE' }
      );
    };

    // NEW RESERVATION (worker receives this). The server also sends a push,
    // which shows even in the foreground; only fall back to a local
    // notification when this device gets no pushes (simulator, permission off).
    const handleNewReservation = (data) => {
      if (hasPushToken()) return;
      const clientName = data.userName || data.reservation?.user?.name || t('notif.aClient');
      const service = serviceName(data.serviceType || data.reservation?.service?.name) || t('notif.aService');
      const text = localizeNotification(data);
      showLocalNotification(
        text.title || `🔔 ${t('notif.newRequest')}`,
        text.message || t('notif.requestedService', { client: clientName, service }),
        { reservationId: data.reservationId, type: 'NEW_RESERVATION' }
      );
    };

    // RESERVATION UPDATES. The client hears about the technician's actions;
    // the server pushes them, so a local notification is only a fallback for
    // devices without a push token. A finished job opens the review screen.
    const handleReservationUpdate = (data) => {
      const isClient = user.role !== 'WORKER';
      if (data.eventType === 'job_completed') {
        if (isClient) openReview(data);
        return;
      }
      if (hasPushToken()) return;
      const who = data.workerName || t('notif.defaultClient');
      const clientLabels = {
        ACCEPTED: [`✅ ${t('notif.accepted')}`, t('notif.acceptedShort', { name: who })],
        REJECTED: [`❌ ${t('notif.rejected')}`, t('notif.rejectedShort', { name: who })],
        IN_PROGRESS: [`🔧 ${t('notif.started')}`, t('notif.startedBody', { name: who })],
      };
      const notif = data.eventType === 'cancelled'
        ? [`❌ ${t('notif.cancelled')}`, t('notif.cancelledAny')]
        : isClient && clientLabels[data.newStatus];
      if (!notif) return;
      showLocalNotification(notif[0], notif[1], {
        reservationId: data.reservationId,
        type: 'RESERVATION_STATUS',
      });
    };

    socketService.on('new_message', handleNewMessage);
    const unsubscribeNewReservation = socketService.onNewReservation(handleNewReservation);
    const unsubscribeReservationUpdate = socketService.onReservationUpdate(handleReservationUpdate);

    return () => {
      socketService.off('new_message', handleNewMessage);
      unsubscribeNewReservation();
      unsubscribeReservationUpdate();
    };
  }, [user]);

  // A finished-job push received while the app is open opens the review
  // (covers a socket that missed job_completed)
  useEffect(() => {
    if (!user || user.role === 'WORKER') return;
    const subscription = addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data?.type === 'JOB_COMPLETED' && data.reservationId) openReview(data);
    });
    return () => subscription.remove();
  }, [user]);

  // Handle notification tap to navigate
  useEffect(() => {
    if (!user) return;
    const openFromNotification = (data) => {
      if (!data?.type) return;
      if (data.type === 'NEW_MESSAGE' && data.reservationId) {
        navigationRef.current?.navigate(t('common.messages'), { reservationId: data.reservationId });
      }
      if (data.type === 'NEW_RESERVATION' && data.reservationId) {
        navigationRef.current?.navigate(user?.role === 'WORKER' ? 'Demandes' : 'Reservations');
      }
      if (data.type === 'RESERVATION_STATUS' && data.reservationId) {
        navigationRef.current?.navigate(user?.role === 'WORKER' ? 'Demandes' : 'Reservations');
      }
      if (data.type === 'VERIFICATION_REJECTED') navigationRef.current?.navigate('VerificationDocuments');
      if (data.type === 'JOB_COMPLETED' && data.reservationId) openReview(data);
    };
    const subscription = addNotificationTapListener(openFromNotification);

    // A tap that opened the app from closed fires before this listener exists;
    // handle it once the signed-in screens are mounted
    let timer;
    getLaunchNotificationData().then((data) => {
      if (!data) return;
      const openWhenReady = (attempt = 0) => {
        if (navigationRef.current?.isReady()) openFromNotification(data);
        else if (attempt < 20) timer = setTimeout(() => openWhenReady(attempt + 1), 250);
      };
      openWhenReady();
    });
    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
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
              t('notif.jobCompletedTitle'),
              t('notif.jobCompletedBody', { name: review.workerName, service: serviceName(review.serviceType) }),
              [
                {
                  text: t('notif.later'),
                  onPress: () => {
                    // Keep it in AsyncStorage for later
                  },
                  style: 'cancel'
                },
                {
                  text: t('notif.reviewNow'),
                  onPress: async () => {
                    await AsyncStorage.removeItem('pendingReview');
                    setPendingReview(null);
                    navigate('Rating', {
                      reservationId: review.reservationId,
                      workerId: review.workerId,
                      workerName: review.workerName,
                    });
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
    // Signed-in screens end with a white tab bar, so the home-indicator strip
    // below them is white; the welcome screen keeps the brand blue. Screens
    // can override both strips (see ChromeContext).
    <SafeAreaView style={{ flex: 1, backgroundColor: chrome?.bottom || (user ? '#ffffff' : '#1a56db') }} edges={['bottom']}>
    <SafeAreaView style={{ flex: 1, backgroundColor: chrome?.top || '#1a56db' }} edges={['top']}>
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
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ChromeProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
      </ChromeProvider>
    </AuthProvider>
  );
}
