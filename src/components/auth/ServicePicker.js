import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { categoryMeta } from '../../utils/categoryMeta';
import PressableScale from '../ui/PressableScale';
import { PRIMARY, INK, MUTED } from './AuthUI';

// Technician services grouped under their category (names and order come from
// the categories managed in the admin dashboard).
const ServicePicker = ({ selected, onChange, error }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setFailed(false);
      const [servicesRes, categoriesRes] = await Promise.all([
        apiService.getServices({ limit: 200 }),
        apiService.getPublicCategories().catch(() => null),
      ]);
      const services = servicesRes?.data?.services || servicesRes?.services || [];
      const categories = categoriesRes?.data || [];
      const byKey = {};
      services.forEach((s) => {
        (byKey[s.category] = byKey[s.category] || []).push(s);
      });
      const ordered = categories.filter((c) => byKey[c.key]).map((c) => ({ key: c.key, name: c.name, category: c, services: byKey[c.key] }));
      Object.keys(byKey)
        .filter((k) => !ordered.some((g) => g.key === k))
        .forEach((k) => ordered.push({ key: k, name: categoryMeta(k).label || k, services: byKey[k] }));
      setGroups(ordered);
    } catch (e) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={PRIMARY} />
        <Text style={styles.stateText}>Chargement des services…</Text>
      </View>
    );
  }
  if (failed) {
    return (
      <PressableScale style={styles.state} onPress={load}>
        <Ionicons name="refresh" size={18} color={PRIMARY} />
        <Text style={[styles.stateText, { color: PRIMARY }]}>Impossible de charger les services. Réessayer</Text>
      </PressableScale>
    );
  }

  return (
    <View>
      {groups.map((g) => {
        const meta = categoryMeta(g.key, g.category);
        const Icon = meta.lib === 'mci' ? MaterialCommunityIcons : Ionicons;
        return (
          <View key={g.key} style={styles.group}>
            <View style={styles.groupHeader}>
              <View style={[styles.groupIcon, { backgroundColor: meta.bg }]}>
                <Icon name={meta.icon} size={15} color={meta.color} />
              </View>
              <Text style={styles.groupName}>{g.name}</Text>
            </View>
            <View style={styles.chips}>
              {g.services.map((s) => {
                const on = selected.includes(s.id);
                return (
                  <PressableScale key={s.id} style={[styles.chip, on && styles.chipOn]} onPress={() => toggle(s.id)}>
                    <Ionicons name={on ? 'checkmark-circle' : 'add-circle-outline'} size={16} color={on ? '#fff' : PRIMARY} />
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.name}</Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        );
      })}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  state: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18 },
  stateText: { fontSize: 14, color: MUTED },
  group: { marginBottom: 14 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  groupIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  groupName: { fontSize: 14, fontWeight: '700', color: INK },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 14, backgroundColor: '#eef4ff', borderWidth: 1, borderColor: '#dbe7ff',
  },
  chipOn: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 13.5, fontWeight: '600', color: INK },
  chipTextOn: { color: '#fff' },
  error: { color: '#dc2626', fontSize: 12.5, marginTop: 2, marginLeft: 4 },
});

export default ServicePicker;
