import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ACTIVE = '#1d5ff0';
const INACTIVE = '#6b7280';

const TABS = {
  Home: { label: 'Accueil', icon: 'home', iconOff: 'home-outline' },
  Messages: { label: 'Messages', icon: 'chatbubble-ellipses', iconOff: 'chatbubble-outline' },
  Reservations: { label: 'Mes demandes', icon: 'calendar', iconOff: 'calendar-outline' },
  Profile: { label: 'Profil', icon: 'person', iconOff: 'person-outline' },
};

// Client bottom bar: four labelled tabs with a raised "Demande" button in the
// middle. `badges` maps a route name to its unread count; `locked` routes show
// a padlock (guest mode).
// The root view already pads the home-indicator area, so the bar adds none.
const ClientTabBar = ({ state, navigation, onNewRequest, badges = {}, locked = [] }) => {

  const renderTab = (route, index) => {
    const tab = TABS[route.name] || { label: route.name, icon: 'ellipse', iconOff: 'ellipse-outline' };
    const focused = state.index === index;
    const color = focused ? ACTIVE : INACTIVE;
    const isLocked = locked.includes(route.name);
    const badge = badges[route.name];

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };

    return (
      <TouchableOpacity key={route.key} style={styles.tab} onPress={onPress} activeOpacity={0.7}>
        <View>
          <Ionicons
            name={isLocked ? 'lock-closed-outline' : focused ? tab.icon : tab.iconOff}
            size={25}
            color={color}
          />
          {badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.label, { color, fontWeight: focused ? '700' : '500' }]} numberOfLines={1} adjustsFontSizeToFit>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const half = Math.ceil(state.routes.length / 2);

  return (
    <View style={styles.bar}>
      {state.routes.slice(0, half).map((route, i) => renderTab(route, i))}
      <View style={styles.tab}>
        <TouchableOpacity style={styles.fab} onPress={onNewRequest} activeOpacity={0.85}>
          <Ionicons name="add" size={36} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.label, styles.fabLabel]}>Demande</Text>
      </View>
      {state.routes.slice(half).map((route, i) => renderTab(route, i + half))}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingTop: 10,
    paddingBottom: 6,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 14,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  label: {
    fontSize: 11,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ACTIVE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -38,
    borderWidth: 5,
    borderColor: '#fff',
    shadowColor: ACTIVE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabLabel: {
    color: INACTIVE,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default ClientTabBar;
