import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../styles/theme';
import { useResponsive, wp, hp, rf, scale } from '../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const createStyles = (width, height, isTablet, isSmallPhone, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: wp(5),
  },
  errorText: {
    fontSize: rf(15),
    color: Colors.text,
    textAlign: 'center',
    marginVertical: hp(2),
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: scale(8),
  },
  retryButtonText: {
    color: Colors.textLight,
    fontSize: rf(15),
    fontWeight: '600',
  },
  header: {
    backgroundColor: Colors.headerBackground,
    paddingTop: insets.top + hp(5),
    paddingHorizontal: wp(5),
    paddingBottom: hp(2.5),
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: wp(4),
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  profileSection: {
    backgroundColor: Colors.headerBackground,
    alignItems: 'center',
    paddingBottom: hp(5),
  },
  profilePictureContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerCard: {
    backgroundColor: Colors.card,
    marginHorizontal: wp(5),
    borderRadius: scale(16),
    padding: wp(5),
    marginTop: -hp(2.5),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  workerName: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: hp(0.5),
  },
  workerProfession: {
    fontSize: rf(13),
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: hp(1.5),
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(1.5),
  },
  starsRow: {
    flexDirection: 'row',
    marginRight: wp(2),
  },
  ratingText: {
    fontSize: rf(12),
    color: Colors.textSecondary,
  },
  workerStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: wp(4),
  },
  workerStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  workerStatText: {
    fontSize: rf(12),
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: wp(5),
    marginTop: hp(3),
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: hp(1.5),
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: scale(12),
    padding: wp(4),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formRow: {
    flexDirection: 'row',
    gap: wp(3),
  },
  formHalf: {
    flex: 1,
  },
  label: {
    fontSize: rf(13),
    fontWeight: '600',
    color: Colors.text,
    marginBottom: hp(1),
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: scale(10),
    padding: wp(3),
    fontSize: rf(14),
    backgroundColor: Colors.background,
    marginBottom: hp(0.25),
    color: Colors.text,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: rf(14),
    color: Colors.text,
  },
  placeholderText: {
    fontSize: rf(14),
    color: Colors.textTertiary,
  },
  fieldError: {
    color: '#ef4444',
    fontSize: rf(11),
    marginBottom: hp(1),
    marginTop: hp(0.25),
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: scale(10),
    padding: wp(3),
    fontSize: rf(14),
    backgroundColor: Colors.background,
    marginBottom: hp(0.25),
    minHeight: scale(100),
    color: Colors.text,
  },
  charCount: {
    fontSize: rf(11),
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: hp(0.5),
  },
  urgencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  urgencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.25),
    borderRadius: scale(12),
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: wp(1.5),
  },
  urgencyText: {
    fontSize: rf(12),
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  urgencyTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.25),
  },
  summaryIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  summaryLabel: {
    fontSize: rf(13),
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: rf(13),
    fontWeight: '600',
    color: Colors.text,
    maxWidth: '50%',
    textAlign: 'right',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: wp(3),
    paddingBottom: insets.bottom + hp(2),
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    paddingVertical: hp(2),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: Colors.border,
    gap: wp(1.5),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: {
    fontSize: rf(15),
    fontWeight: '600',
    color: Colors.text,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: hp(2),
    borderRadius: scale(12),
    gap: wp(1.5),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonText: {
    color: Colors.textLight,
    fontSize: rf(15),
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

const ReservationDetails = ({ route, navigation }) => {
  const {
    workerId,
    immediate,
    workerDetails,
    address,
    city,
    postalCode,
    description,
    service,
    date,
    time,
  } = route.params || {};
  const { user } = useAuth();
  const { width, height, isTablet, isSmallPhone } = useResponsive();
  const insets = useSafeAreaInsets();
  const styles = createStyles(width, height, isTablet, isSmallPhone, insets);

  const [formData, setFormData] = useState({
    date: date || '',
    time: time || '',
    address: address || '',
    postalCode: postalCode || '',
    city: city || '',
    description: description || '',
    urgency: 'normal',
  });

  const [errors, setErrors] = useState({});
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadWorker();
  }, [workerId]);

  const loadWorker = async () => {
    try {
      setLoading(true);

      if (immediate && workerDetails) {
        setWorker(workerDetails);
      } else {
        const response = await apiService.getWorkerById(workerId);
        const data = response.data || response;
        setWorker({
          ...data,
          name: data.user?.name || data.name || 'Professionnel',
        });
      }
    } catch (error) {
      console.error('Failed to load worker:', error);
    } finally {
      setLoading(false);
    }
  };

  const urgencyLevels = [
    { value: 'low', label: 'Non urgent', color: '#22c55e', icon: 'time-outline' },
    { value: 'normal', label: 'Normal', color: '#3b82f6', icon: 'calendar-outline' },
    { value: 'high', label: 'Urgent', color: '#f97316', icon: 'alert-circle-outline' },
    { value: 'emergency', label: 'Urgence', color: '#ef4444', icon: 'warning-outline' },
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) newErrors.date = 'La date est requise';
    if (!formData.time) newErrors.time = "L'heure est requise";
    if (!formData.address) newErrors.address = "L'adresse est requise";
    if (!formData.postalCode) newErrors.postalCode = 'Le code postal est requis';
    if (!formData.city) newErrors.city = 'La ville est requise';
    if (!formData.description) {
      newErrors.description = 'La description est requise';
    } else if (formData.description.length < 10) {
      newErrors.description = 'La description doit contenir au moins 10 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      setFormData((prev) => ({ ...prev, date: formattedDate }));
      if (errors.date) {
        setErrors((prev) => ({ ...prev, date: '' }));
      }
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const workerIdValue = worker?.userId || worker?.user?.id || workerId;
      const serviceIdValue =
        service ||
        (Array.isArray(worker?.services) && worker.services.length > 0
          ? worker.services[0]
          : null);

      if (!workerIdValue || !serviceIdValue) {
        Alert.alert('Erreur', 'Informations du technicien ou du service manquantes.');
        return;
      }

      let isoDate;
      if (formData.date.includes('/')) {
        const parts = formData.date.split('/');
        isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else {
        isoDate = formData.date;
      }

      const parsedDate = new Date(isoDate);
      if (isNaN(parsedDate.getTime())) {
        Alert.alert('Erreur', 'Date invalide. Veuillez sélectionner une date valide.');
        return;
      }

      const formattedTime = formData.time.includes(':')
        ? formData.time.slice(0, 5)
        : `${formData.time}:00`;

      const reservationData = {
        workerId: parseInt(workerIdValue),
        service: parseInt(serviceIdValue),
        date: parsedDate.toISOString(),
        time: formattedTime,
        duration: 60,
        location: {
          address: formData.address,
          city: formData.city,
          state: '',
          zipCode: formData.postalCode,
        },
        description: formData.description,
        emergency: formData.urgency === 'high' || formData.urgency === 'emergency',
      };

      console.log('Sending reservation data:', JSON.stringify(reservationData, null, 2));

      const response = await apiService.createReservation(reservationData);
      const reservation = response.data;

      navigation.navigate('Reservations', { newReservation: reservation });
    } catch (error) {
      console.error('Failed to create reservation:', error);
      if (error.response?.data) {
        console.error('Backend error details:', error.response.data);
      }
      Alert.alert('Erreur', 'Échec de la création de la réservation');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i < fullStars ? 'star' : 'star-outline'}
          size={14}
          color={Colors.star}
        />
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!worker) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="person-outline" size={64} color={Colors.textTertiary} />
        <Text style={styles.errorText}>technicien non trouvé</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.headerBackground} />
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Réserver un service</Text>
        </View>

        {/* Worker Profile Mini Card */}
        <View style={styles.profileSection}>
          <View style={styles.profilePictureContainer}>
            <Ionicons name="person" size={50} color={Colors.primary} />
          </View>
        </View>

        <View style={styles.workerCard}>
          <Text style={styles.workerName}>{worker.name}</Text>
          <Text style={styles.workerProfession}>
            {worker.skills?.[0] || 'Technicien'}
          </Text>

          <View style={styles.ratingRow}>
            <View style={styles.starsRow}>
              {renderStars(worker.averageRating || worker.rating || 0)}
            </View>
            <Text style={styles.ratingText}>
              {worker.averageRating || worker.rating || 0} · {worker.experience || 0} ans d'exp.
            </Text>
          </View>

          <View style={styles.workerStatsRow}>
            <View style={styles.workerStatItem}>
              <Ionicons name="briefcase-outline" size={16} color={Colors.primary} />
              <Text style={styles.workerStatText}>
                {worker.jobsCompleted || 0} jobs
              </Text>
            </View>
            <View style={styles.workerStatItem}>
              <Ionicons name="cash-outline" size={16} color={Colors.primary} />
              <Text style={styles.workerStatText}>
                {worker.hourlyRate ? `${worker.hourlyRate}$/h` : 'Sur demande'}
              </Text>
            </View>
            {worker.isVerified && (
              <View style={styles.workerStatItem}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={[styles.workerStatText, { color: Colors.success }]}>Certifié</Text>
              </View>
            )}
          </View>
        </View>

        {/* Date & Time Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Heure</Text>
          <View style={styles.card}>
            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={styles.label}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.primary} /> Date
                </Text>
                <TouchableOpacity
                  style={[styles.input, styles.datePickerButton, errors.date && styles.inputError]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={formData.date ? styles.dateText : styles.placeholderText}>
                    {formData.date || 'Sélectionner'}
                  </Text>
                  <Ionicons name="calendar" size={18} color={Colors.primary} />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={handleDateChange}
                  />
                )}
                {errors.date && <Text style={styles.fieldError}>{errors.date}</Text>}
              </View>
              <View style={styles.formHalf}>
                <Text style={styles.label}>
                  <Ionicons name="time-outline" size={14} color={Colors.primary} /> Heure
                </Text>
                <TextInput
                  style={[styles.input, errors.time && styles.inputError]}
                  placeholder="HH:MM"
                  placeholderTextColor={Colors.textTertiary}
                  value={formData.time}
                  onChangeText={(value) => handleInputChange('time', value)}
                />
                {errors.time && <Text style={styles.fieldError}>{errors.time}</Text>}
              </View>
            </View>
          </View>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Localisation</Text>
          <View style={styles.card}>
            <Text style={styles.label}>
              <Ionicons name="location-outline" size={14} color={Colors.primary} /> Adresse
            </Text>
            <TextInput
              style={[styles.input, errors.address && styles.inputError]}
              placeholder="Numéro et nom de rue"
              placeholderTextColor={Colors.textTertiary}
              value={formData.address}
              onChangeText={(value) => handleInputChange('address', value)}
            />
            {errors.address && <Text style={styles.fieldError}>{errors.address}</Text>}

            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={styles.label}>Code postal</Text>
                <TextInput
                  style={[styles.input, errors.postalCode && styles.inputError]}
                  placeholder="0000"
                  placeholderTextColor={Colors.textTertiary}
                  value={formData.postalCode}
                  onChangeText={(value) => handleInputChange('postalCode', value)}
                  keyboardType="numeric"
                />
                {errors.postalCode && <Text style={styles.fieldError}>{errors.postalCode}</Text>}
              </View>
              <View style={styles.formHalf}>
                <Text style={styles.label}>Ville</Text>
                <TextInput
                  style={[styles.input, errors.city && styles.inputError]}
                  placeholder="Ville"
                  placeholderTextColor={Colors.textTertiary}
                  value={formData.city}
                  onChangeText={(value) => handleInputChange('city', value)}
                />
                {errors.city && <Text style={styles.fieldError}>{errors.city}</Text>}
              </View>
            </View>
          </View>
        </View>

        {/* Urgency Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Niveau d'urgence</Text>
          <View style={styles.card}>
            <View style={styles.urgencyContainer}>
              {urgencyLevels.map((level) => (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.urgencyChip,
                    formData.urgency === level.value && {
                      backgroundColor: level.color,
                      borderColor: level.color,
                    },
                  ]}
                  onPress={() => handleInputChange('urgency', level.value)}
                >
                  <Ionicons
                    name={level.icon}
                    size={16}
                    color={formData.urgency === level.value ? '#fff' : level.color}
                  />
                  <Text
                    style={[
                      styles.urgencyText,
                      formData.urgency === level.value && styles.urgencyTextActive,
                    ]}
                  >
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.card}>
            <TextInput
              style={[styles.textArea, errors.description && styles.inputError]}
              placeholder="Décrivez en détail le problème..."
              placeholderTextColor={Colors.textTertiary}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {errors.description && (
              <Text style={styles.fieldError}>{errors.description}</Text>
            )}
            <Text style={styles.charCount}>
              {formData.description.length}/500 caractères
            </Text>
          </View>
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Récapitulatif</Text>
          <View style={styles.card}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryIconLabel}>
                <Ionicons name="construct-outline" size={16} color={Colors.primary} />
                <Text style={styles.summaryLabel}>Service</Text>
              </View>
              <Text style={styles.summaryValue}>
                {worker.skills?.[0] || 'Service professionnel'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryIconLabel}>
                <Ionicons name="person-outline" size={16} color={Colors.primary} />
                <Text style={styles.summaryLabel}>Professionnel</Text>
              </View>
              <Text style={styles.summaryValue}>{worker.name}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryIconLabel}>
                <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                <Text style={styles.summaryLabel}>Date</Text>
              </View>
              <Text style={styles.summaryValue}>
                {formData.date || 'Non sélectionnée'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryIconLabel}>
                <Ionicons name="time-outline" size={16} color={Colors.primary} />
                <Text style={styles.summaryLabel}>Heure</Text>
              </View>
              <Text style={styles.summaryValue}>
                {formData.time || 'Non sélectionnée'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryIconLabel}>
                <Ionicons name="cash-outline" size={16} color={Colors.primary} />
                <Text style={styles.summaryLabel}>Tarif estimé</Text>
              </View>
              <Text style={[styles.summaryValue, { color: Colors.primary, fontWeight: 'bold' }]}>
                {worker.hourlyRate ? `À partir de ${worker.hourlyRate}$` : 'Sur demande'}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing for buttons */}
        <View style={{ height: hp(12) }} />
      </ScrollView>

      {/* Action Buttons - Fixed at bottom like WorkerProfile */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close-outline" size={20} color={Colors.text} />
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmButton, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.textLight} />
          ) : (
            <>
              <Ionicons name="checkmark-outline" size={20} color={Colors.textLight} />
              <Text style={styles.confirmButtonText}>Confirmer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ReservationDetails;