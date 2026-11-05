import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api';
import { pickImage } from '../utils/pickImage';
import PressableScale from '../components/ui/PressableScale';
import FadeIn from '../components/ui/FadeIn';
import { AuthShell, AuthTitle, PrimaryButton, PRIMARY, INK, MUTED } from '../components/auth/AuthUI';

const DOCUMENTS = [
  { type: 'CIN_FRONT', title: 'CIN, recto', hint: 'Toute la carte, bien lisible, sans reflet.', icon: 'card-outline' },
  { type: 'CIN_BACK', title: 'CIN, verso', hint: 'Toute la carte, bien lisible, sans reflet.', icon: 'card-outline' },
  { type: 'SELFIE', title: 'Selfie avec votre CIN', hint: 'Votre visage et la carte visibles sur la même photo.', icon: 'person-circle-outline', cameraType: 'front' },
  { type: 'PROOF', title: "Preuve d'activité", hint: 'Patente, diplôme, attestation de travail ou facture.', icon: 'document-text-outline' },
];

// Last sign-up step for technicians. A pending account can't log in, so requests
// use the temporary token from sign-up or login (route.params.uploadToken).
export default function VerificationDocumentsScreen({ navigation, route }) {
  const { uploadToken } = route.params || {};
  const [status, setStatus] = useState(null);
  const [previews, setPreviews] = useState({});
  const [uploading, setUploading] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      const res = await apiService.getVerificationStatus(uploadToken);
      setStatus(res.data);
    } catch (error) {
      setFailed(true);
    }
  }, [uploadToken]);

  useEffect(() => { load(); }, [load]);

  const choose = async (doc) => {
    const asset = await pickImage({ title: doc.title, cameraType: doc.cameraType });
    if (!asset) return;
    setUploading(doc.type);
    try {
      const res = await apiService.uploadVerificationDocument(doc.type, asset, uploadToken);
      setStatus(res.data);
      setPreviews((prev) => ({ ...prev, [doc.type]: asset.uri }));
    } catch (error) {
      Alert.alert('Envoi impossible', error.message || 'Réessayez.');
    } finally {
      setUploading(null);
    }
  };

  const finish = () => navigation.reset({ index: 0, routes: [{ name: 'PendingApproval' }] });

  const sent = (type) => status?.documents.find((d) => d.type === type);
  const remaining = status ? status.missing.length + status.rejected.length : DOCUMENTS.length;

  return (
    <AuthShell>
        <AuthTitle
          title="Vérifions votre compte"
          subtitle="Ces documents restent privés : seule notre équipe les consulte, pour valider votre compte."
        />

        {failed ? (
          <PressableScale style={styles.retry} onPress={load}>
            <Ionicons name="refresh" size={18} color={PRIMARY} />
            <Text style={styles.retryText}>Impossible de charger vos documents. Réessayer</Text>
          </PressableScale>
        ) : !status ? (
          <ActivityIndicator color={PRIMARY} style={{ marginTop: 30 }} />
        ) : DOCUMENTS.map((doc, i) => {
          const current = sent(doc.type);
          const rejected = current?.status === 'REJECTED';
          const done = !!current && !rejected;
          const busy = uploading === doc.type;
          return (
            <FadeIn key={doc.type} delay={i * 50}>
              <PressableScale
                scaleTo={0.985}
                style={[styles.card, done && styles.cardDone, rejected && styles.cardRejected]}
                onPress={() => choose(doc)}
                disabled={!!uploading}
              >
                {previews[doc.type] ? (
                  <Image source={{ uri: previews[doc.type] }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]}>
                    <Ionicons name={doc.icon} size={26} color={PRIMARY} />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{doc.title}</Text>
                  <Text style={[styles.cardHint, rejected && styles.cardHintRejected]}>
                    {rejected ? `Refusé : ${current.rejectionReason}` : doc.hint}
                  </Text>
                </View>
                {busy ? <ActivityIndicator color={PRIMARY} /> : (
                  <Ionicons
                    name={done ? 'checkmark-circle' : rejected ? 'alert-circle' : 'camera-outline'}
                    size={24}
                    color={done ? '#16a34a' : rejected ? '#dc2626' : PRIMARY}
                  />
                )}
              </PressableScale>
            </FadeIn>
          );
        })}

        <View style={{ height: 12 }} />
        <PrimaryButton
          label={status?.complete ? 'Envoyer pour vérification' : `Encore ${remaining} document${remaining > 1 ? 's' : ''}`}
          onPress={finish}
          disabled={!status?.complete || !!uploading}
        />
        <Text style={styles.note}>Vous pouvez quitter et reprendre plus tard en vous reconnectant.</Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10,
    backgroundColor: '#f8fafc', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0',
  },
  cardDone: { backgroundColor: '#f0fbf4', borderColor: '#bbf0cd' },
  cardRejected: { backgroundColor: '#fff5f5', borderColor: '#fecaca' },
  thumb: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#e3edff' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15.5, fontWeight: '700', color: INK },
  cardHint: { fontSize: 13, color: MUTED, marginTop: 2, lineHeight: 18 },
  cardHintRejected: { color: '#b91c1c', fontWeight: '600' },
  retry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 24 },
  retryText: { color: PRIMARY, fontSize: 14, fontWeight: '600' },
  note: { fontSize: 12.5, color: '#94a3b8', textAlign: 'center', marginTop: 12 },
});
