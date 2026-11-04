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

// Technicians of one category. route.params: { category (key), categoryData }.
const ServiceWorkersPage = ({ route, navigation }) => {
  useScreenChrome(BLUE, PAGE);
  const { category, categoryData } = route.params || {};
  const meta = categoryMeta(category, categoryData);
  const title = categoryData?.name || meta.label || 'Professionnels';

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [coords, setCoords] = useState(null);
  const latestRequest = useRef(0);

  // Location can arrive after the first results: they refresh in place, and an
  // older response never overwrites a newer one
  const loadWorkers = async () => {
    const request = ++latestRequest.current;
    try {
      const params = { category, minRating: 0, limit: 50 };
      if (coords) {
        params.lat = coords.latitude;
        params.lng = coords.longitude;
      }
      const data = await apiService.getWorkers(params);
      if (request !== latestRequest.current) return;
      const list = data.data?.workers || data.workers || [];
      setWorkers(Array.isArray(list) ? list : []);
      setFailed(false);
    } catch (error) {
      console.error('Failed to load workers:', error);
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

  useEffect(() => { loadWorkers(); }, [category, coords]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkers();
    setRefreshing(false);
  };

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workers
      .filter((w) => !onlyAvailable || w.isActive)
      .filter((w) => !query || nameOf(w).toLowerCase().includes(query) || w.bio?.toLowerCase().includes(query))
      .sort(SORTERS[sortBy]);
  }, [workers, search, sortBy, onlyAvailable]);

  const resetFilters = () => {
    setSearch('');
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
    if (workers.length === 0) {
      return (
        <EmptyState
          icon="time-outline"
          title="Bientôt disponible"
          text={`Aucun professionnel en ${title} pour le moment. Nos équipes y travaillent.`}
          action="Voir tous les professionnels"
          onAction={() => navigation.navigate('Professionals')}
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
          <LinearGradient colors={meta.gradient || [PRIMARY, NAVY]} style={styles.headerIcon}>
            <CategoryIcon meta={meta} size={24} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.subtitle}>{loading ? 'Recherche…' : prosLabel(visible.length)}</Text>
          </View>
        </View>
        <View style={styles.search}>
          <Ionicons name="search" size={19} color={MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un professionnel"
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
          contentContainerStyle={styles.chips}
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

export default ServiceWorkersPage;
