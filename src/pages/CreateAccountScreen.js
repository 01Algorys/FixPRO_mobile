import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

const { width } = Dimensions.get('window');
const BLUE = '#1a56db';

export default function CreateAccountScreen({ navigation, route }) {
  const { signup } = useAuth();
  const { role } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    telephone: '',
    motDePasse: '',
    confirmationMotDePasse: '',
    // Only for professionals
    selectedServices: [],
    serviceId: null // Required for professionals
  });
  
  const [errors, setErrors] = useState({});

  const isParticulier = role === 'USER';
  const isProfessionnel = role === 'WORKER';

  // Fetch services for professional registration
  useEffect(() => {
    if (isProfessionnel) {
      fetchServices();
    }
  }, [isProfessionnel]);

  const fetchServices = async () => {
    try {
      setLoadingServices(true);
      const response = await apiService.getServices();
      console.log('Services API response:', response); // Debug log
      // Handle different possible response structures
      const servicesData = response?.data?.services || response?.services || response || [];
      setServices(Array.isArray(servicesData) ? servicesData : []);
    } catch (error) {
      console.error('Error fetching services:', error);
      Alert.alert('Erreur', 'Impossible de charger les services');
    } finally {
      setLoadingServices(false);
    }
  };

  const toggleService = (serviceId) => {
    setFormData(prev => {
      const isSelected = prev.selectedServices.includes(serviceId);
      const newSelectedServices = isSelected
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId];
      
      return {
        ...prev,
        selectedServices: newSelectedServices,
        serviceId: newSelectedServices.length > 0 ? newSelectedServices[0] : null
      };
    });
    
    if (errors.selectedServices) {
      setErrors(prev => ({ ...prev, selectedServices: '' }));
    }
    if (errors.serviceId) {
      setErrors(prev => ({ ...prev, serviceId: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Common validations - simplified
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }
    
    if (!formData.telephone.trim()) {
      newErrors.telephone = 'Le téléphone est requis';
    }
    
    if (!formData.motDePasse) {
      newErrors.motDePasse = 'Le mot de passe est requis';
    } else if (formData.motDePasse.length < 6) {
      newErrors.motDePasse = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    if (!formData.confirmationMotDePasse) {
      newErrors.confirmationMotDePasse = 'La confirmation du mot de passe est requise';
    } else if (formData.motDePasse !== formData.confirmationMotDePasse) {
      newErrors.confirmationMotDePasse = 'Les mots de passe ne correspondent pas';
    }
    
    // Professionnel specific validations - simplified with serviceId requirement
    if (isProfessionnel) {
      if (formData.selectedServices.length === 0) {
        newErrors.selectedServices = 'Veuillez sélectionner au moins un service';
      }
      if (!formData.serviceId) {
        newErrors.serviceId = 'Le serviceId est requis';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      // Prepare user data - simplified with serviceId for professionals
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.motDePasse,
        role: role,
        phone: formData.telephone.trim()
      };
      
      // Add serviceId for professionals
      if (isProfessionnel && formData.serviceId) {
        userData.serviceId = formData.serviceId;
      }
      
      const result = await signup(userData);
      
      if (result.success) {
        // Store additional data for profile update after login
        if (isParticulier || isProfessionnel) {
          const additionalData = {};
          
          if (isParticulier) {
            additionalData.location = {
              address: formData.adresse.trim(),
              city: formData.ville.trim(),
              zipCode: formData.codePostal.trim()
            };
          } else if (isProfessionnel) {
            additionalData.businessInfo = {
              companyName: formData.nomEntreprise.trim(),
              specialty: formData.specialite.trim(),
              serviceArea: formData.zoneIntervention.trim(),
              description: formData.descriptionService.trim()
            };
            additionalData.services = formData.selectedServices;
          }
          
          // Store for profile update after successful login
          // This will be handled in the AuthContext or after navigation
          await AsyncStorage.setItem('pendingProfileData', JSON.stringify(additionalData));
        }
        
        // Navigation is handled by AuthContext/AppNavigator based on auth state
      } else {
        Alert.alert('Erreur', result.error || 'Échec de la création du compte');
      }
    } catch (err) {
      Alert.alert('Erreur', err?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <LinearGradient colors={['#1a56db', '#1565c0']} style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Créer un compte</Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* White card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bienvenue chez FixPro !</Text>
            <Text style={styles.cardSub}>
              {isParticulier 
                ? "Créez votre compte pour trouver des professionnels près de chez vous."
                : "Créez votre compte pour proposer vos services sur FixPro."
              }
            </Text>

            {/* Simplified common fields */}
            <View style={styles.inputBox}>
              <Ionicons name="person-outline" size={20} color="#b0b8c9" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inputText}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholder="Nom complet"
                placeholderTextColor="#b0b8c9"
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={20} color="#b0b8c9" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inputText}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="email@exemple.com"
                placeholderTextColor="#b0b8c9"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <View style={styles.inputBox}>
              <Ionicons name="call-outline" size={20} color="#b0b8c9" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inputText}
                value={formData.telephone}
                onChangeText={(value) => handleInputChange('telephone', value)}
                placeholder="Téléphone"
                placeholderTextColor="#b0b8c9"
                keyboardType="phone-pad"
              />
            </View>
            {errors.telephone && <Text style={styles.errorText}>{errors.telephone}</Text>}

            <View style={styles.inputBox}>
              <TextInput
                style={styles.inputText}
                value={formData.motDePasse}
                onChangeText={(value) => handleInputChange('motDePasse', value)}
                placeholder="Mot de passe"
                placeholderTextColor="#b0b8c9"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22} color="#b0b8c9"
                />
              </TouchableOpacity>
            </View>
            {errors.motDePasse && <Text style={styles.errorText}>{errors.motDePasse}</Text>}

            <View style={styles.inputBox}>
              <TextInput
                style={styles.inputText}
                value={formData.confirmationMotDePasse}
                onChangeText={(value) => handleInputChange('confirmationMotDePasse', value)}
                placeholder="Confirmation du mot de passe"
                placeholderTextColor="#b0b8c9"
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22} color="#b0b8c9"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmationMotDePasse && <Text style={styles.errorText}>{errors.confirmationMotDePasse}</Text>}

            {/* Service Selection - only for professionals */}
            {isProfessionnel && (
              <View style={styles.serviceSection}>
                <Text style={styles.sectionTitle}>Services proposés *</Text>
                {errors.selectedServices && <Text style={styles.errorText}>{errors.selectedServices}</Text>}
                {errors.serviceId && <Text style={styles.errorText}>{errors.serviceId}</Text>}
                
                {loadingServices ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={BLUE} />
                    <Text style={styles.loadingText}>Chargement des services...</Text>
                  </View>
                ) : (
                  <View style={styles.servicesContainer}>
                    <ScrollView showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                      {services.map((service) => (
                        <TouchableOpacity
                          key={service.id}
                          style={[
                            styles.serviceItem,
                            formData.selectedServices.includes(service.id) && styles.serviceItemSelected
                          ]}
                          onPress={() => toggleService(service.id)}
                        >
                          <View style={styles.serviceItemContent}>
                            <Ionicons 
                              name={formData.selectedServices.includes(service.id) ? "checkmark-circle" : "ellipse-outline"} 
                              size={20} 
                              color={formData.selectedServices.includes(service.id) ? BLUE : "#9ca3af"} 
                            />
                            <View style={styles.serviceInfo}>
                              <Text style={styles.serviceName}>{service.name}</Text>
                              <Text style={styles.serviceCategory}>{service.category}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* Create account button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.7 }]}
              onPress={handleCreateAccount}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Créer mon compte</Text>
              }
            </TouchableOpacity>

            {/* Login link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Vous avez déjà un compte ? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.registerLink}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 20,
  },
  topTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  cardSub: { fontSize: 14, color: '#6b7280', marginBottom: 20 },

  sectionDivider: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    backgroundColor: '#f9fafb',
  },
  textAreaBox: {
    alignItems: 'flex-start',
    paddingBottom: 8,
  },
  inputText: { 
    flex: 1, 
    fontSize: 15, 
    color: '#111827',
    minHeight: 20,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },

  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },

  loginBtn: {
    backgroundColor: BLUE,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 22,
    marginTop: 8,
  },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  registerRow: { flexDirection: 'row', justifyContent: 'center' },
  registerText: { fontSize: 14, color: '#6b7280' },
  registerLink: { fontSize: 14, fontWeight: '700', color: BLUE },

  // Service selection styles
  serviceSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  servicesContainer: {
    maxHeight: 300,
    marginTop: 8,
  },
  serviceItem: {
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  serviceItemSelected: {
    backgroundColor: '#eff6ff',
    borderColor: BLUE,
  },
  serviceItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceInfo: {
    marginLeft: 12,
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  serviceCategory: {
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  debugText: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
    fontStyle: 'italic',
  },
});
