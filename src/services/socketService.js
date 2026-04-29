import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.onlineUsers = new Set();
    this.presenceListeners = new Set();
  }

  async connect() {
    try {
      // Guard: if already connected, return early
      if (this.socket && this.connected) {
        if (__DEV__) console.log('Socket already connected, skipping');
        return;
      }

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        console.log('No token found, skipping socket connection');
        return;
      }

      // Clean token: remove Bearer prefix if present
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

      if (!cleanToken || cleanToken.trim() === '') {
        console.error('Token is empty after cleaning');
        return;
      }

      const apiUrl = process.env.EXPO_API_URL || 'http://192.168.1.15:3001/api';
      const socketUrl = apiUrl.replace('/api', '').replace(/\/$/, '');

      console.log('Connecting to socket at:', socketUrl);

      this.socket = io(socketUrl, {
        auth: {
          token: cleanToken
        },
        transports: ['websocket', 'polling'],
        timeout: 60000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000
      });

      this.socket.on('connect', () => {
        console.log('Socket connected successfully');
        this.connected = true;
      });

      // Listen for presence events
      this.socket.on('online_users_list', ({ onlineUsers }) => {
        this.onlineUsers = new Set(onlineUsers);
      });

      this.socket.on('user_online', ({ userId }) => {
        this.onlineUsers.add(userId);
        this.presenceListeners.forEach(cb => cb(userId, true));
      });

      this.socket.on('user_offline', ({ userId }) => {
        this.onlineUsers.delete(userId);
        this.presenceListeners.forEach(cb => cb(userId, false));
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.connected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        console.error('Description:', error.description);
        console.error('Context:', error.context);
        this.connected = false;
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('Socket reconnect error:', error.message);
        console.error('Full error:', error);
      });

      this.socket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed after all attempts');
        this.connected = false;
      });

      // Listen for reservation updates
      this.socket.on('reservation_update', (data) => {
        console.log('Reservation update received:', data);
      });

      // Listen for job completion notifications
      this.socket.on('job_completed_for_review', (data) => {
        console.log('Job completed for review:', data);
        Alert.alert(
          'Travail terminé',
          data.message || 'Le travail est terminé. Veuillez évaluer le technicien.',
          [
            {
              text: 'Évaluer maintenant',
              onPress: () => {
                this.emit('navigate_to_review', {
                  reservationId: data.reservationId,
                  workerId: data.workerId
                });
              }
            },
            {
              text: 'Plus tard',
              style: 'cancel'
            }
          ]
        );
      });

      // Listen for new messages
      this.socket.on('new_message', async (data) => {
        console.log('New message received:', data);
        // Persist unread count for background state
        try {
          const stored = await AsyncStorage.getItem('unreadCount');
          const current = stored ? parseInt(stored) : 0;
          await AsyncStorage.setItem('unreadCount', String(current + 1));
        } catch (error) {
          console.error('Failed to persist unread count:', error);
        }
      });

      // Listen for worker location updates
      this.socket.on('worker_location_update', (data) => {
        console.log('Worker location update:', data);
      });

      // Listen for typing indicators
      this.socket.on('user_typing', (data) => {
        console.log('User typing indicator:', data);
      });

      // Listen for errors
      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
        Alert.alert('Erreur', error.message || 'Une erreur est survenue');
      });

    } catch (error) {
      console.error('Failed to connect socket:', error);
      console.error('Error details:', error.message, error.description, error.context);
    }
  }

  disconnect() {
    if (this.socket) {
      // Remove all listeners before disconnecting
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      console.log('Socket disconnected and cleaned up');
    }
  }

  // Join a reservation room for real-time updates
  joinReservation(reservationId) {
    if (this.socket && this.connected) {
      this.socket.emit('join_reservation', reservationId);
    }
  }

  // Leave a reservation room
  leaveReservation(reservationId) {
    if (this.socket && this.connected) {
      this.socket.emit('leave_reservation', reservationId);
    }
  }

  // Send a message
  sendMessage(reservationId, message, type = 'text') {
    if (this.socket && this.connected) {
      this.socket.emit('send_message', {
        reservationId,
        message,
        type
      });
    }
  }

  // Update reservation status
  updateStatus(reservationId, status, note) {
    if (this.socket && this.connected) {
      this.socket.emit('update_status', {
        reservationId,
        status,
        note
      });
    }
  }

  // Update worker location
  updateLocation(reservationId, location, status) {
    if (this.socket && this.connected) {
      this.socket.emit('update_location', {
        reservationId,
        location,
        status
      });
    }
  }

  // Start typing indicator
  startTyping(reservationId) {
    if (this.socket && this.connected) {
      this.socket.emit('typing_start', { reservationId });
    }
  }

  // Stop typing indicator
  stopTyping(reservationId) {
    if (this.socket && this.connected) {
      this.socket.emit('typing_stop', { reservationId });
    }
  }

  // Check if socket is connected
  isConnected() {
    return this.connected;
  }

  // Emit custom events
  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    }
  }

  // Listen to custom events
  on(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback); // remove first to prevent duplicates
      this.socket.on(event, callback);
    }
  }

  // Remove event listener
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Register listener when socket is ready, with retry logic
  onWhenReady(event, callback, maxRetries = 10) {
    if (this.socket && this.connected) {
      this.socket.off(event, callback);
      this.socket.on(event, callback);
      return;
    }

    let retries = 0;
    const retryInterval = setInterval(() => {
      retries++;
      if (this.socket && this.connected) {
        clearInterval(retryInterval);
        this.socket.off(event, callback);
        this.socket.on(event, callback);
      } else if (retries >= maxRetries) {
        clearInterval(retryInterval);
        console.log(`Failed to register listener for ${event} after ${maxRetries} retries`);
      }
    }, 1000);
  }

  // Presence methods
  onPresenceChange(callback) {
    this.presenceListeners.add(callback);
    return () => this.presenceListeners.delete(callback); // returns unsubscribe fn
  }

  isOnline(userId) {
    return this.onlineUsers.has(userId);
  }
}

export default new SocketService();
