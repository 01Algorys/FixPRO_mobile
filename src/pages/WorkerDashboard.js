import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive, wp, hp, rf, scale } from '../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const createStyles = (width, height, isTablet, isSmallPhone, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingTop: insets.top + hp(2),
    paddingBottom: hp(2),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    padding: wp(2),
    borderRadius: scale(8),
  },
  content: {
    flex: 1,
    padding: wp(4),
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: scale(16),
    padding: wp(5),
    marginBottom: hp(2),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatar: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  welcomeText: {
    fontSize: rf(22),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: hp(1),
  },
  welcomeSubtext: {
    fontSize: rf(13),
    color: '#666',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: scale(12),
    padding: wp(4),
    alignItems: 'center',
    marginHorizontal: wp(1),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: rf(22),
    fontWeight: 'bold',
    color: '#333',
    marginVertical: hp(1),
  },
  statLabel: {
    fontSize: rf(11),
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: scale(16),
    padding: wp(5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  infoTitle: {
    fontSize: rf(16),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: hp(1.5),
  },
  infoText: {
    fontSize: rf(13),
    color: '#666',
    marginBottom: hp(2),
    lineHeight: rf(18),
  },
  featureList: {
    gap: hp(1.5),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: rf(13),
    color: '#666',
    marginLeft: wp(2),
  },
});

const WorkerDashboard = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { width, height, isTablet, isSmallPhone } = useResponsive();
  const insets = useSafeAreaInsets();
  const styles = createStyles(width, height, isTablet, isSmallPhone, insets);

  const handleLogout = async () => {
    await logout();
    navigation.replace('Auth');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Worker Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.welcomeCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#667eea" />
          </View>
          <Text style={styles.welcomeText}>Welcome, {user?.name || 'Worker'}</Text>
          <Text style={styles.welcomeSubtext}>Manage your services and reservations</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="briefcase" size={32} color="#667eea" />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={32} color="#eab308" />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Dashboard Under Development</Text>
          <Text style={styles.infoText}>
            This page is currently being developed. You will soon be able to:
          </Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={16} color="#22c55e" />
              <Text style={styles.featureText}>View your reservations</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={16} color="#22c55e" />
              <Text style={styles.featureText}>Update your profile</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={16} color="#22c55e" />
              <Text style={styles.featureText}>Manage your services</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={16} color="#22c55e" />
              <Text style={styles.featureText}>Track earnings</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default WorkerDashboard;
