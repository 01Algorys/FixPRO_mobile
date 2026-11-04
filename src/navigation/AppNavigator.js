import React, { forwardRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Ionicons } from '@expo/vector-icons';

// Pages
import WelcomeScreen from '../pages/WelcomeScreen';
import LoginScreen from '../pages/LoginScreen';
import RoleSelectionScreen from '../pages/RoleSelectionScreen';
import AuthPage from '../pages/AuthPage';
import CreateAccountScreen from '../pages/CreateAccountScreen';
import PendingApprovalScreen from '../pages/PendingApprovalScreen';
import SocialWorkerSetupScreen from '../pages/SocialWorkerSetupScreen';
import UserHomePage from '../pages/UserHomePage';
import MessagesPage from '../pages/MessagesPage';
import ReservationsPage from '../pages/ReservationsPage';
import ProfilePage from '../pages/ProfilePage';
import ServiceWorkersPage from '../pages/ServiceWorkersPage';
import ProfessionalsPage from '../pages/ProfessionalsPage';
import ReservationDetails from '../pages/ReservationDetails';
import RatingPage from '../pages/RatingPage';
import NotificationsPage from '../pages/NotificationsPage';
import OrderTracking from '../pages/OrderTracking';
import WorkerProfile from '../pages/WorkerProfile';
import WorkerDashboard from '../pages/WorkerDashboard';
import WorkerHomePage from '../pages/WorkerHomePage';
import WorkerReservationsPage from '../pages/WorkerReservationsPage';
import WorkerMessagesPage from '../pages/WorkerMessagesPage';
import WorkerProfilePage from '../pages/WorkerProfilePage';
import WorkerReservationDetailsPage from '../pages/WorkerReservationDetailsPage';
import LockedScreen from '../components/LockedScreen';
import ClientTabBar from '../components/ClientTabBar';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const WorkerTab = createBottomTabNavigator();
const GuestTab = createBottomTabNavigator();

const MainTabs = () => {
  const { unreadMessages, reservationUnread } = useNotifications();
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <ClientTabBar
          {...props}
          badges={{ Messages: unreadMessages, Reservations: reservationUnread }}
          onNewRequest={() => props.navigation.navigate('Professionals')}
        />
      )}
    >
      <Tab.Screen name="Home" component={UserHomePage} />
      <Tab.Screen name="Messages" component={MessagesPage} />
      <Tab.Screen name="Reservations" component={ReservationsPage} />
      <Tab.Screen name="Profile" component={ProfilePage} />
    </Tab.Navigator>
  );
};

const GuestTabs = () => {
  return (
    <GuestTab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <ClientTabBar
          {...props}
          locked={['Messages', 'Reservations', 'Profile']}
          onNewRequest={() => props.navigation.navigate('Login')}
        />
      )}
    >
      <GuestTab.Screen name="Home" component={UserHomePage} />
      <GuestTab.Screen name="Messages" component={LockedScreen} initialParams={{ title: 'Messagerie réservée', message: 'Connectez-vous pour discuter avec les professionnels.' }} />
      <GuestTab.Screen name="Reservations" component={LockedScreen} initialParams={{ title: 'Réservations réservées', message: 'Connectez-vous pour voir et gérer vos réservations.' }} />
      <GuestTab.Screen name="Profile" component={LockedScreen} initialParams={{ title: 'Profil réservé', message: 'Connectez-vous pour accéder à votre profil.' }} />
    </GuestTab.Navigator>
  );
};

const WorkerTabs = () => {
  const { unreadMessages, reservationUnread } = useNotifications();
  return (
    <WorkerTab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <ClientTabBar
          {...props}
          fabLabel="Nouvelle demande"
          badges={{ Messages: unreadMessages, Demandes: reservationUnread }}
          onNewRequest={() => props.navigation.navigate('Demandes')}
        />
      )}
    >
      <WorkerTab.Screen name="Dashboard" component={WorkerHomePage} />
      <WorkerTab.Screen name="Demandes" component={WorkerReservationsPage} />
      <WorkerTab.Screen name="Messages" component={WorkerMessagesPage} />
      <WorkerTab.Screen name="Profil" component={WorkerProfilePage} />
    </WorkerTab.Navigator>
  );
};

const AppNavigator = forwardRef((props, ref) => {
  const { isAuthenticated, isGuest, loading, user } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }} edges={['top']}>
        <ActivityIndicator size="large" color="#1a56db" />
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer ref={ref}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated && !isGuest ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ cardStyle: { backgroundColor: 'transparent' } }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ cardStyle: { backgroundColor: 'transparent' } }} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} options={{ cardStyle: { backgroundColor: 'transparent' } }} />
            <Stack.Screen name="Auth" component={AuthPage} />
            <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
            <Stack.Screen name="SocialWorkerSetup" component={SocialWorkerSetupScreen} />
            <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} options={{ gestureEnabled: false }} />
          </>
        ) : !isAuthenticated && isGuest ? (
          <>
            <Stack.Screen name="GuestMain" component={GuestTabs} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ cardStyle: { backgroundColor: 'transparent' } }} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} options={{ cardStyle: { backgroundColor: 'transparent' } }} />
            <Stack.Screen name="Auth" component={AuthPage} />
            <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
            <Stack.Screen name="SocialWorkerSetup" component={SocialWorkerSetupScreen} />
            <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} options={{ gestureEnabled: false }} />
          </>
        ) : user?.role === 'WORKER' ? (
          <>
            <Stack.Screen name="WorkerDashboard" component={WorkerTabs} />
            <Stack.Screen name="Notifications" component={NotificationsPage} />
            <Stack.Screen
              name="WorkerReservationDetails"
              component={WorkerReservationDetailsPage}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="WorkerProfile"
              component={WorkerProfile}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Notifications" component={NotificationsPage} />
            <Stack.Screen
              name="ServiceWorkers"
              component={ServiceWorkersPage}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Professionals"
              component={ProfessionalsPage}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ReservationDetails"
              component={ReservationDetails}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="WorkerProfile"
              component={WorkerProfile}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Rating"
              component={RatingPage}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OrderTracking"
              component={OrderTracking}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
});

export default AppNavigator;
