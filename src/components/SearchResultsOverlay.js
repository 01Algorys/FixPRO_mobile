import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../styles/theme';

// Bolds the substring of `label` that matches `query` (case-insensitive).
const HighlightedText = ({ label, query, style }) => {
  if (!query) return <Text style={style}>{label}</Text>;

  const index = label?.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1 || index === undefined) return <Text style={style}>{label}</Text>;

  const before = label.slice(0, index);
  const match = label.slice(index, index + query.length);
  const after = label.slice(index + query.length);

  return (
    <Text style={style}>
      {before}
      <Text style={styles.highlight}>{match}</Text>
      {after}
    </Text>
  );
};

const SectionHeader = ({ title }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

const SearchResultsOverlay = ({
  query,
  loading,
  results,
  recentSearches,
  onSelectCategory,
  onSelectService,
  onSelectWorker,
  onSelectRecent,
  onClearRecent,
}) => {
  const hasQuery = !!query?.trim();
  const hasResults = hasQuery && (
    results?.categories?.length || results?.services?.length || results?.workers?.length
  );

  return (
    <View style={styles.overlay}>
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Recherche en cours...</Text>
          </View>
        )}

        {!loading && hasQuery && !hasResults && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={32} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>Aucun résultat pour "{query}"</Text>
          </View>
        )}

        {!loading && hasQuery && results?.categories?.length > 0 && (
          <View>
            <SectionHeader title="Catégories" />
            {results.categories.map((item) => (
              <TouchableOpacity
                key={`cat-${item.id}`}
                style={styles.resultRow}
                onPress={() => onSelectCategory(item)}
              >
                <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
                <HighlightedText label={item.label} query={query} style={styles.resultLabel} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!loading && hasQuery && results?.services?.length > 0 && (
          <View>
            <SectionHeader title="Services" />
            {results.services.map((item) => (
              <TouchableOpacity
                key={`svc-${item.id}`}
                style={styles.resultRow}
                onPress={() => onSelectService(item)}
              >
                <Ionicons name="construct-outline" size={18} color={Colors.primary} />
                <View style={styles.resultTextContainer}>
                  <HighlightedText label={item.label} query={query} style={styles.resultLabel} />
                  {!!item.subtitle && <Text style={styles.resultSubtitle}>{item.subtitle}</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!loading && hasQuery && results?.workers?.length > 0 && (
          <View>
            <SectionHeader title="Professionnels" />
            {results.workers.map((item) => (
              <TouchableOpacity
                key={`wrk-${item.id}`}
                style={styles.resultRow}
                onPress={() => onSelectWorker(item)}
              >
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={16} color={Colors.primary} />
                  </View>
                )}
                <View style={styles.resultTextContainer}>
                  <HighlightedText label={item.label} query={query} style={styles.resultLabel} />
                  {!!item.subtitle && <Text style={styles.resultSubtitle}>{item.subtitle}</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!hasQuery && recentSearches?.length > 0 && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <SectionHeader title="Recherches récentes" />
              <TouchableOpacity onPress={onClearRecent}>
                <Text style={styles.clearText}>Effacer</Text>
              </TouchableOpacity>
            </View>
            {recentSearches.map((term, index) => (
              <TouchableOpacity
                key={`recent-${index}`}
                style={styles.resultRow}
                onPress={() => onSelectRecent(term)}
              >
                <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.resultLabel}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!hasQuery && results?.popular?.length > 0 && (
          <View>
            <SectionHeader title="Recherches populaires" />
            {results.popular.map((item) => (
              <TouchableOpacity
                key={`pop-${item.id}`}
                style={styles.resultRow}
                onPress={() => onSelectCategory(item)}
              >
                <Ionicons name="flame-outline" size={18} color={Colors.warning} />
                <Text style={styles.resultLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: -8,
    maxHeight: 360,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
  scroll: {
    padding: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 10,
  },
  clearText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  resultSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  highlight: {
    fontWeight: '800',
    color: Colors.primary,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SearchResultsOverlay;
