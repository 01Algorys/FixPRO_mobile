import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from '../ui/PressableScale';
import ImageViewer from '../ui/ImageViewer';

const PRIMARY = '#1d5ff0';
const GAP = 8;
const TILE = Math.floor((Dimensions.get('window').width - 32 - GAP * 2) / 3);

// Photos of past work. With `onAdd`/`onRemove` it is the technician's editable
// version; without them, the read-only gallery clients see.
const PortfolioGrid = ({ images = [], onAdd, onRemove, adding, max }) => {
  const [open, setOpen] = useState(null);
  const canAdd = !!onAdd && images.length < max;

  return (
    <View style={styles.grid}>
      {images.map((image) => (
        <View key={image.id}>
          <PressableScale scaleTo={0.96} onPress={() => setOpen(image.url)}>
            <Image source={{ uri: image.url }} style={styles.tile} />
          </PressableScale>
          {!!onRemove && (
            <PressableScale style={styles.remove} scaleTo={0.88} onPress={() => onRemove(image)} accessibilityLabel="Supprimer la photo">
              <Ionicons name="close" size={15} color="#fff" />
            </PressableScale>
          )}
        </View>
      ))}
      {canAdd && (
        <PressableScale style={[styles.tile, styles.add]} onPress={onAdd} disabled={adding}>
          {adding ? <ActivityIndicator color={PRIMARY} /> : (
            <>
              <Ionicons name="add" size={26} color={PRIMARY} />
              <Text style={styles.addText}>Ajouter</Text>
            </>
          )}
        </PressableScale>
      )}
      <ImageViewer uri={open} onClose={() => setOpen(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: { width: TILE, height: TILE, borderRadius: 14, backgroundColor: '#e2e8f0' },
  add: {
    backgroundColor: '#f2f7ff', borderWidth: 1.5, borderColor: '#cfe0ff', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  addText: { fontSize: 12.5, fontWeight: '700', color: PRIMARY, marginTop: 2 },
  remove: {
    position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.65)', alignItems: 'center', justifyContent: 'center',
  },
});

export default PortfolioGrid;
