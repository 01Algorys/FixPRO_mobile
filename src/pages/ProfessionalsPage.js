import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, ScrollView, TextInput, RefreshControl, StatusBar, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import apiService from '../services/api';
import { getCurrentCoords } from '../utils/location';
import { categoryMeta } from '../utils/categoryMeta';
import { useScreenChrome } from '../context/ChromeContext';
import PressableScale from '../components/ui/PressableScale';
import {
  BLUE, NAVY, PRIMARY, MUTED, PAGE, SORTS, SORTERS, nameOf, prosLabel,
  CategoryIcon, Chip, WorkerCard, SkeletonCard, EmptyState, styles,
} from '../components/workers/WorkerCard';

// "Électricité" and "electricite" match each other
const normalize = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const hasCategory = (worker, key) => (worker.services || []).some((s) => s.category === key);

// Every technician, with search by name or trade, category filter and sorting.
// The whole list is loaded once, so these all run on the phone, instantly.
const ProfessionalsPage = ({ navigation }) => {
  useScreenChrome(BLUE, PAGE);
  const [workers, setWorkers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(null);
  const [sortBy, setSortBy] = useState('rating');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [coords, setCoords] = useState(null);
  const latestRequest = useRef(0);

  // Location can arrive after the first results: they refresh in place, and an
  // older response never overwrites a newer one
  const loadWorkers = async () => {
    const request = ++latestRequest.current;
    try {
      const params = { limit: 100, minRating: 0 };
      if (coords) {
        params.lat = coords.latitude;
        params.lng = coords.longitude;
      }
      const [workersData, categoriesData] = await Promise.all([
        apiService.getWorkers(params),
        apiService.getPublicCategories().catch(() => null),
      ]);
      if (request !== latestRequest.current) return;
      const list = workersData.data?.workers || workersData.workers || [];
      setWorkers(Array.isArray(list) ? list : []);
      const categoryList = categoriesData?.data || categoriesData;
      if (Array.isArray(categoryList)) setCategories(categoryList);
      setFailed(false);
    } catch (error) {
      console.error('Failed to load professionals:', error);
      if (request === latestRequest.current) setFailed(true);
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentCoords().then((position) => {
      if (!position) return;
      setCoords(position);
      setSortBy('distance');
    });
  }, []);

  useEffect(() => { loadWorkers(); }, [coords]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkers();
    setRefreshing(false);
  };

  const categoryNames = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.key, c.name])),
    [categories]
  );

  // Only categories someone can actually be found in
  const categoryChips = useMemo(
    () => categories.filter((c) => workers.some((w) => hasCategory(w, c.key))),
    [categories, workers]
  );

  const visible = useMemo(() => {
    const query = normalize(search.trim());
    const matchesSearch = (w) => {
      const trades = (w.services || []).flatMap((s) => [s.name, categoryNames[s.category]]);
      return [nameOf(w), ...trades].some((text) => normalize(text).includes(query));
    };
    return workers
      .filter((w) => !category || hasCategory(w, category))
      .filter((w) => !onlyAvailable || w.isActive)
      .filter((w) => !query || matchesSearch(w))
      .sort(SORTERS[sortBy]);
  }, [workers, search, category, sortBy, onlyAvailable, categoryNames]);

  const resetFilters = () => {
    setSearch('');
    setCategory(null);
    setOnlyAvailable(false);
  };

  const renderEmpty = () => {
    if (loading) return <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>;
    if (failed) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="Connexion impossible"
          text="Vérifiez votre connexion et réessayez."
          action="Réessayer"
          onAction={() => { setLoading(true); loadWorkers(); }}
        />
      );
    }
    return (
      <EmptyState
        icon="search-outline"
        title="Aucun résultat"
        text="Essayez un autre nom ou retirez vos filtres."
        action="Réinitialiser"
        onAction={resetFilters}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[BLUE, NAVY]} style={styles.header}>
        <View style={styles.headerRow}>
          <PressableScale style={styles.backBtn} scaleTo={0.9} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={23} color="#fff" />
          </PressableScale>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>Tous les professionnels</Text>
            <Text style={styles.subtitle}>{loading ? 'Recherche…' : prosLabel(visible.length)}</Text>
          </View>
        </View>
        <View style={styles.search}>
          <Ionicons name="search" size={19} color={MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nom ou métier"
            placeholderTextColor={MUTED}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={19} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.chips, { paddingBottom: 6 }]}
        >
          <Chip label="Toutes" active={!category} onPress={() => setCategory(null)} />
          {categoryChips.map((c) => {
            const meta = categoryMeta(c.key, c);
            const active = category === c.key;
            return (
              <Chip
                key={c.key}
                label={c.name}
                active={active}
                leading={<CategoryIcon meta={meta} size={16} color={active ? '#fff' : meta.color} />}
                onPress={() => setCategory(active ? null : c.key)}
              />
            );
          })}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.chips, { paddingTop: 6 }]}
        >
          <Chip label="Disponibles" icon="ellipse" active={onlyAvailable} onPress={() => setOnlyAvailable(!onlyAvailable)} />
          {SORTS.filter((s) => !s.needsLocation || coords).map((s) => (
            <Chip key={s.key} label={s.label} active={sortBy === s.key} onPress={() => setSortBy(s.key)} />
          ))}
        </ScrollView>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={visible}
        keyExtractor={(worker) => String(worker.id)}
        renderItem={({ item }) => (
          <WorkerCard
            worker={item}
            categoryNames={categoryNames}
            onOpen={() => navigation.navigate('WorkerProfile', { workerId: item.id })}
            onBook={() => navigation.navigate('ReservationDetails', { workerId: item.id })}
          />
        )}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      />
    </View>
  );
};

export default ProfessionalsPage;
