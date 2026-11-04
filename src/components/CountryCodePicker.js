import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COUNTRIES, countryFlag } from '../utils/countries';

const INK = '#0f172a';
const PRIMARY = '#1d5ff0';

// "é" matches "e" when searching country names
const plain = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Flag and calling code in a phone field; tapping it opens the country list
const CountryCodePicker = ({ country, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = plain(query.trim().replace(/^\+/, ''));
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => plain(c.name).includes(q) || c.dial.startsWith(q) || c.code.toLowerCase() === q);
  }, [query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <TouchableOpacity style={styles.prefix} onPress={() => setOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 6 }}>
        <Text style={styles.flag}>{countryFlag(country.code)}</Text>
        <Text style={styles.dial}>+{country.dial}</Text>
        <Ionicons name="chevron-down" size={15} color={INK} />
        <View style={styles.divider} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <SafeAreaView style={styles.sheet} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>Choisir un pays</Text>
            <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={26} color={INK} />
            </TouchableOpacity>
          </View>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher un pays ou un indicatif"
              placeholderTextColor="#64748b"
              autoCorrect={false}
            />
          </View>
          <FlatList
            data={results}
            keyExtractor={(c) => c.code}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => {
                  onChange(item);
                  close();
                }}
              >
                <Text style={styles.rowFlag}>{countryFlag(item.code)}</Text>
                <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.rowDial}>+{item.dial}</Text>
                {item.code === country.code && <Ionicons name="checkmark" size={20} color={PRIMARY} />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.empty}>Aucun pays trouvé</Text>}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  prefix: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  flag: { fontSize: 18 },
  dial: { fontSize: 15.5, fontWeight: '700', color: INK },
  divider: { width: 1, height: 22, backgroundColor: '#e2e8f0', marginLeft: 5 },
  sheet: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: INK },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#f1f5f9',
  },
  searchInput: { flex: 1, fontSize: 15.5, color: INK, paddingVertical: 0 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0',
  },
  rowFlag: { fontSize: 22 },
  rowName: { flex: 1, fontSize: 15.5, color: INK },
  rowDial: { fontSize: 15, fontWeight: '600', color: '#475569' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 30, fontSize: 15 },
});

export default CountryCodePicker;
