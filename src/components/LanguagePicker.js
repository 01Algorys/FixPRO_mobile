import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LANGUAGES, getLanguage, languageLabel, setLanguage, t } from '../i18n';

const PRIMARY = '#1d5ff0';
const INK = '#0f172a';

// The language list as a bottom sheet. Choosing another language reloads the app.
export const LanguageSheet = ({ visible, onClose }) => {
  const [changing, setChanging] = useState(null);

  const choose = async (code) => {
    if (code === getLanguage()) {
      onClose();
      return;
    }
    setChanging(code);
    await setLanguage(code);
    setChanging(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: 20 + (initialWindowMetrics?.insets.bottom ?? 0) }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>{t('common.chooseLanguage')}</Text>
        <ScrollView style={styles.list} bounces={false}>
          {LANGUAGES.map(({ code, label }) => {
            const current = code === getLanguage();
            return (
              <TouchableOpacity
                key={code}
                style={[styles.row, current && styles.rowCurrent]}
                onPress={() => choose(code)}
                disabled={!!changing}
                activeOpacity={0.7}
              >
                <Text style={[styles.label, current && styles.labelCurrent]}>{label}</Text>
                {changing === code ? <ActivityIndicator size="small" color={PRIMARY} /> : current && (
                  <Ionicons name="checkmark-circle" size={22} color={PRIMARY} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
};

// Small globe button for the screens before login
export const LanguageButton = ({ style, color = '#fff' }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={[styles.button, { borderColor: color }, style]}
        onPress={() => setOpen(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={t('common.chooseLanguage')}
      >
        <Ionicons name="globe-outline" size={16} color={color} />
        <Text style={[styles.buttonText, { color }]}>{languageLabel()}</Text>
      </TouchableOpacity>
      <LanguageSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '700', color: INK, marginBottom: 12 },
  list: { maxHeight: Dimensions.get('window').height * 0.62 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
  },
  rowCurrent: { backgroundColor: '#eaf1ff' },
  label: { fontSize: 16, color: INK },
  labelCurrent: { fontWeight: '700', color: PRIMARY },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  buttonText: { fontSize: 13, fontWeight: '600' },
});
