import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { categoryMeta, categoryName } from '../../utils/categoryMeta';
import PressableScale from '../ui/PressableScale';
import { PRIMARY, INK, MUTED } from './AuthUI';
import { t } from '../../i18n';

// Grid of the categories a technician works in, as checkbox tiles. A tile
// stands for every service of its category; `selected` holds service ids.
// Names and order come from the categories managed in the admin dashboard.
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
      const ordered = categories.filter((c) => byKey[c.key]).map((c) => ({ key: c.key, name: categoryName(c.key, c.name), category: c, services: byKey[c.key] }));
      Object.keys(byKey)
        .filter((k) => !ordered.some((g) => g.key === k))
        .forEach((k) => ordered.push({ key: k, name: categoryMeta(k).label || k, services: byKey[k] }));
      // Two categories can share a display name: show one tile for them
      const merged = [];
      ordered.forEach((g) => {
        const same = merged.find((m) => m.name === g.name);
        if (same) same.services.push(...g.services);
        else merged.push({ ...g, services: [...g.services] });
      });
      setGroups(merged);
    } catch (e) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const isOn = (group) => group.services.every((s) => selected.includes(s.id));
  const toggle = (group) => {
    const ids = group.services.map((s) => s.id);
    onChange(isOn(group) ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
  };

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={PRIMARY} />
        <Text style={styles.stateText}>{t('auth.servicesLoading')}</Text>
      </View>
    );
  }
  if (failed) {
    return (
      <PressableScale style={styles.state} onPress={load}>
        <Ionicons name="refresh" size={18} color={PRIMARY} />
        <Text style={[styles.stateText, { color: PRIMARY }]}>{t('auth.servicesFailed')}</Text>
      </PressableScale>
    );
  }

  return (
    <View>
      <View style={styles.grid}>
        {groups.map((g) => {
          const meta = categoryMeta(g.key, g.category);
          const Icon = meta.lib === 'mci' ? MaterialCommunityIcons : Ionicons;
          const on = isOn(g);
          return (
            <PressableScale key={g.key} style={[styles.tile, on && styles.tileOn]} onPress={() => toggle(g)}>
              <View style={[styles.tick, on && styles.tickOn]}>
                {on && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Icon name={meta.icon} size={36} color={PRIMARY} />
              <Text style={styles.tileName} numberOfLines={2}>{g.name}</Text>
            </PressableScale>
          );
        })}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  state: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18 },
  stateText: { fontSize: 14, color: MUTED },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: '31.8%', minHeight: 104, paddingTop: 14, paddingBottom: 10, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#d9e2f2',
  },
  tileOn: { backgroundColor: '#eaf2ff', borderColor: PRIMARY, borderWidth: 1.5 },
  tick: {
    position: 'absolute', top: 7, right: 7, width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#94a3b8', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  tickOn: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  tileName: { fontSize: 13, fontWeight: '800', color: INK, textAlign: 'center' },
  error: { color: '#dc2626', fontSize: 12.5, marginTop: 8, marginLeft: 4 },
});

export default ServicePicker;
