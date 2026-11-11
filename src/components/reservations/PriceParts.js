import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../../i18n';
import { formatPrice } from '../../i18n/format';
import { reservationPrice, fromLabel } from '../../utils/price';

const INK = '#0f172a';
const MUTED = '#64748b';
const PRIMARY = '#1d5ff0';

// Small price for a reservation card: "À partir de" above the technician's price
export const PriceTag = ({ reservation, technician, style }) => {
  const price = reservationPrice(reservation, technician);
  if (!price) return null;
  return (
    <View style={[styles.tag, style]}>
      <Text style={styles.tagLabel} numberOfLines={1}>{t('price.fromShort')}</Text>
      <Text style={styles.tagAmount}>{formatPrice(price)}</Text>
    </View>
  );
};

// The technician's price on a reservation's page, worded for who is looking
// ('client' or 'worker')
export const PriceCard = ({ reservation, technician, role, style }) => (
  <View style={[styles.card, style]}>
    <Ionicons name="pricetag-outline" size={18} color={PRIMARY} />
    <Text style={styles.label}>{role === 'client' ? t('price.techStarting') : t('price.yourStarting')}</Text>
    <Text style={styles.value}>{fromLabel(reservationPrice(reservation, technician))}</Text>
  </View>
);

const styles = StyleSheet.create({
  tag: { alignItems: 'flex-end', maxWidth: 140 },
  tagLabel: { fontSize: 11, color: MUTED, fontWeight: '600' },
  tagAmount: { fontSize: 15.5, fontWeight: '800', color: INK },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderRadius: 20,
    shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  label: { flex: 1, fontSize: 14, color: '#475569', fontWeight: '600' },
  value: { fontSize: 15, color: INK, fontWeight: '800' },
});
