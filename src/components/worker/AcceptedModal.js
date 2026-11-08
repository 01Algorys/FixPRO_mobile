import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from '../ui/PressableScale';
import { t } from '../../i18n';

const PRIMARY = '#1d5ff0';
const INK = '#0f172a';

// Short strokes radiating around the green check
const SPARKS = [
  { top: 6, left: 30, rotate: '-45deg', color: '#22c55e' },
  { top: 42, left: 8, rotate: '90deg', color: '#22c55e' },
  { top: 80, left: 28, rotate: '45deg', color: '#22c55e' },
  { top: 6, right: 30, rotate: '45deg', color: '#eab308' },
  { top: 42, right: 8, rotate: '90deg', color: '#22c55e' },
  { top: 80, right: 28, rotate: '-45deg', color: '#22c55e' },
];

// Confirmation after a technician accepts a request
const AcceptedModal = ({ visible, onContact, onViewJobs, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View style={styles.card}>
        <TouchableOpacity style={styles.close} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={26} color={INK} />
        </TouchableOpacity>

        <View style={styles.badge}>
          {SPARKS.map(({ rotate, color, ...position }, i) => (
            <View key={i} style={[styles.spark, position, { backgroundColor: color, transform: [{ rotate }] }]} />
          ))}
          <View style={styles.check}>
            <Ionicons name="checkmark" size={46} color="#fff" />
          </View>
        </View>

        <Text style={styles.title}>{t('wdetails.accepted')}</Text>
        <Text style={styles.text}>
          {t('wdetails.clientNotified')}{'\n'}{t('wdetails.contactToConfirm')}
        </Text>

        <PressableScale style={styles.primaryBtn} onPress={onContact}>
          <Ionicons name="chatbubble-ellipses-outline" size={21} color="#fff" />
          <Text style={styles.primaryText}>{t('wdetails.contactClient')}</Text>
        </PressableScale>
        <PressableScale style={styles.secondaryBtn} onPress={onViewJobs}>
          <Ionicons name="list" size={21} color={INK} />
          <Text style={styles.secondaryText}>{t('wdetails.seeJobs')}</Text>
        </PressableScale>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 28, paddingHorizontal: 22, paddingTop: 30, paddingBottom: 22, alignItems: 'center' },
  close: { position: 'absolute', top: 16, right: 16, zIndex: 1 },
  badge: { width: 130, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  check: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute', width: 12, height: 4, borderRadius: 2 },
  title: { fontSize: 23, fontWeight: '800', color: INK, letterSpacing: -0.4, textAlign: 'center' },
  text: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22, marginTop: 8, marginBottom: 20 },
  primaryBtn: {
    alignSelf: 'stretch', height: 54, borderRadius: 16, backgroundColor: PRIMARY,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  primaryText: { fontSize: 16.5, fontWeight: '700', color: '#fff' },
  secondaryBtn: {
    alignSelf: 'stretch', height: 52, borderRadius: 16, backgroundColor: '#eef1f6', marginTop: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  secondaryText: { fontSize: 15.5, fontWeight: '700', color: INK },
});

export default AcceptedModal;
