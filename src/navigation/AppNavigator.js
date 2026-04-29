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
import UserHomePage from '../pages/UserHomePage';
import MessagesPage from '../pages/MessagesPage';
import ReservationsPage from '../pages/ReservationsPage';
import ProfilePage from '../pages/ProfilePage';
import ServiceWorkersPage from '../pages/ServiceWorkersPage';
import ProfessionalsPage from '../pages/ProfessionalsPage';
import ReservationDetails from '../pages/ReservationDetails';
import RatingPage from '../pages/RatingPage';
import OrderTracking from '../pages/OrderTracking';
import WorkerProfile from '../pages/WorkerProfile';
import WorkerDashboard from '../pages/WorkerDashboard';
import WorkerHomePage from '../pages/WorkerHomePage';
import WorkerReservationsPage from '../pages/WorkerReservationsPage';
import WorkerMessagesPage from '../pages/WorkerMessagesPage';
import WorkerProfilePage from '../pages/WorkerProfilePage';
import WorkerReservationDetailsPage from '../pages/WorkerReservationDetailsPage';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const WorkerTab = createBottomTabNavigator();

const MainTabs = () => {
  const { unreadMessages, reservationUnread } = useNotifications();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Reservations') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={UserHomePage} />
      <Tab.Screen 
        name="Messages" 
        component={MessagesPage} 
        options={{
          tabBarBadge: unreadMessages > 0 ? (unreadMessages > 99 ? '99+' : unreadMessages) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#FF3B30',
            color: '#fff',
            fontSize: 10,
          }
        }}
      />
      <Tab.Screen 
        name="Reservations" 
        component={ReservationsPage}
        options={{
          tabBarBadge: reservationUnread > 0 ? (reservationUnread > 99 ? '99+' : reservationUnread) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#FF3B30',
            color: '#fff',
            fontSize: 10,
          }
        }}
      />
      <Tab.Screen name="Profile" component={ProfilePage} />
    </Tab.Navigator>
  );
};

const WorkerTabs = () => {
  const { unreadMessages, reservationUnread } = useNotifications();
  return (
    <WorkerTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Demandes') {
            iconName = focused ? 'clipboard' : 'clipboard-outline';
          } else {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
      })}
    >
      <WorkerTab.Screen name="Dashboard" component={WorkerHomePage} />
      <WorkerTab.Screen 
        name="Demandes" 
        component={WorkerReservationsPage}
        options={{
          tabBarBadge: reservationUnread > 0 ? (reservationUnread > 99 ? '99+' : reservationUnread) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#FF3B30',
            color: '#fff',
            fontSize: 10,
          }
        }}
      />
      <WorkerTab.Screen 
        name="Messages" 
        component={WorkerMessagesPage}
        options={{
          tabBarBadge: unreadMessages > 0 ? (unreadMessages > 99 ? '99+' : unreadMessages) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#FF3B30',
            color: '#fff',
            fontSize: 10,
          }
        }}
      />
      <WorkerTab.Screen name="Profil" component={WorkerProfilePage} />
    </WorkerTab.Navigator>
  );
};

const AppNavigator = forwardRef((props, ref) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }} edges={['top']}>
        <ActivityIndicator size="large" color="#667eea" />
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer ref={ref}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="Auth" component={AuthPage} />
            <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
          </>
        ) : user?.role === 'WORKER' ? (
          <>
            <Stack.Screen name="WorkerDashboard" component={WorkerTabs} />
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
