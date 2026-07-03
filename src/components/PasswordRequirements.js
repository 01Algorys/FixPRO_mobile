import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { validatePassword } from '../utils/passwordValidation';

/**
 * Displays live password-strength requirements beneath the password input.
 * Each line turns green and shows a checkmark as soon as its rule is met.
 */
export default function PasswordRequirements({ password }) {
  const requirements = validatePassword(password || '');

  return (
    <View style={styles.container}>
      {requirements.map((req) => (
        <View key={req.key} style={styles.row}>
          <Ionicons
            name={req.satisfied ? 'checkmark-circle' : 'ellipse-outline'}
            size={15}
            color={req.satisfied ? '#22c55e' : '#9ca3af'}
            style={styles.icon}
          />
          <Text style={[styles.label, req.satisfied && styles.labelSatisfied]}>
            {req.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  icon: {
    marginRight: 7,
  },
  label: {
    fontSize: 13,
    color: '#9ca3af',
  },
  labelSatisfied: {
    color: '#16a34a',
  },
});
