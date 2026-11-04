import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import { Colors } from '../styles/theme';

const RatingPage = ({ route, navigation }) => {
  const { reservationId, workerId, workerName } = route.params || {};
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          style={styles.starButton}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={40}
            color={i <= rating ? Colors.star : Colors.border}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner une note');
      return;
    }

    try {
      setSubmitting(true);
      await apiService.createReview({
        reservationId,
        workerId,
        rating,
        comment,
        wouldHireAgain: true,
      });
      Alert.alert('Succès', 'Votre évaluation a été envoyée', [
        {
          text: 'OK',
          onPress: () => {
            // Refresh the reservations page when going back
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to submit review:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer votre évaluation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Évaluer le technicien</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.workerInfo}>
            <Ionicons name="person" size={48} color={Colors.primary} />
            <Text style={styles.workerName}>{workerName || 'technicien'}</Text>
          </View>

          <Text style={styles.label}>Note globale</Text>
          <View style={styles.starsContainer}>{renderStars()}</View>

          <Text style={styles.label}>Commentaire (optionnel)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Partagez votre expérience..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Envoi en cours...' : 'Envoyer l\'évaluation'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.headerBackground,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    color: Colors.textLight,
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 14,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
  },
  workerInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  workerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  commentInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RatingPage;
