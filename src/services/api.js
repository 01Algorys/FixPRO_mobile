const API_BASE_URL = process.env.EXPO_API_URL || 'http://192.168.1.15:3001/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const token = await this.getToken();
    
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    if (options.body) {
      config.body = options.body;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getToken() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem('token');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Auth endpoints
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getUserProfile() {
    return this.request('/auth/profile');
  }

  async updateUserProfile(userData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Users endpoints
  async getUserReservations() {
    return this.request('/users/reservations');
  }

  // Workers endpoints
  async getWorkers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/workers?${queryString}` : '/workers';
    return this.request(endpoint);
  }

  async searchWorkers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/workers/search?${queryString}` : '/workers/search';
    return this.request(endpoint);
  }

  async getWorker(id) {
    return this.request(`/workers/${id}`);
  }

  async getWorkerById(id) {
    return this.request(`/worker-profile/${id}`);
  }

  async getWorkerProfile() {
    return this.request('/workers/profile');
  }

  async updateWorkerProfile(workerData) {
    return this.request('/workers/profile', {
      method: 'PUT',
      body: JSON.stringify(workerData),
    });
  }

  async changePassword(passwordData) {
    return this.request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }

  async getWorkerReservations(workerId = null) {
    if (workerId) {
      console.log('Getting worker reservations for worker ID:', workerId);
      return this.request(`/reservations/worker/${workerId}`);
    }
    return this.request('/workers/reservations');
  }

  async updateReservationStatus(id, status, note = '') {
    return this.request(`/reservations/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, note }),
    });
  }

  
  async getWorkerDashboard(id) {
    return this.request(`/workers/${id}/dashboard`);
  }

  async getWorkerReviewsPublic(id) {
    return this.request(`/workers/${id}/reviews`);
  }

  // Services endpoints
  async getServices(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/services?${queryString}` : '/services';
    return this.request(endpoint);
  }

  async getService(id) {
    return this.request(`/services/${id}`);
  }

  async getServicesByCategory(category) {
    return this.request(`/services/category/${category}`);
  }

  async getPopularServices() {
    return this.request('/services/popular');
  }

  async getCategories() {
    return this.request('/services/categories');
  }

  // Reservations endpoints
  async createReservation(reservationData) {
    return this.request('/reservations', {
      method: 'POST',
      body: JSON.stringify(reservationData),
    });
  }

  async getReservation(id) {
    return this.request(`/reservations/${id}`);
  }

  async cancelReservation(id) {
    return this.request(`/reservations/${id}`, {
      method: 'DELETE',
    });
  }

  async addReservationNote(id, note) {
    return this.request(`/reservations/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  // Reviews endpoints
  async getUserReviews() {
    return this.request('/users/reviews');
  }

  async createReview(reviewData) {
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  }

  async deleteReview(id) {
    return this.request(`/reviews/${id}`, {
      method: 'DELETE',
    });
  }

  // Messages endpoints
  async getConversations() {
    return this.request('/messages');
  }

  async getMessages(reservationId) {
    return this.request(`/messages/${reservationId}`);
  }

  async markConversationAsRead(reservationId) {
    return this.request(`/messages/${reservationId}/read`, {
      method: 'PUT',
    });
  }

  async sendMessage(reservationId, content, type = 'text') {
    return this.request(`/messages/${reservationId}`, {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    });
  }

  async getWorkerMessages(workerId) {
    return this.request(`/messages/worker/${workerId}`);
  }

  async savePushToken(token) {
    return this.request('/users/push-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async getUnreadMessageCount() {
    return this.request('/messages/unread-count');
  }
}

export const apiService = new ApiService();
export default apiService;
