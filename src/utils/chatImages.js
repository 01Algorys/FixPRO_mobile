import { Alert } from 'react-native';
import apiService from '../services/api';
import { t } from '../i18n';

// Shows the photo in the conversation straight away, then swaps it for the
// saved message. The socket may deliver that message first, so both are handled.
export const sendChatImage = async ({ asset, reservationId, sender, setMessages }) => {
  const localId = `local_${Date.now()}_${Math.random()}`;
  setMessages((prev) => [...prev, {
    _localId: localId,
    _localUri: asset.uri,
    id: Date.now(),
    type: 'image',
    content: '',
    senderId: sender.id,
    sender,
    createdAt: new Date().toISOString(),
  }]);

  try {
    const response = await apiService.sendChatImage(reservationId, asset);
    const saved = response.data;
    setMessages((prev) => (prev.some((m) => m.id === saved.id)
      ? prev.filter((m) => m._localId !== localId)
      : prev.map((m) => (m._localId === localId ? saved : m))));
  } catch (error) {
    console.error('Failed to send photo:', error);
    setMessages((prev) => prev.filter((m) => m._localId !== localId));
    Alert.alert(t('picker.notSent'), error.message || t('common.tryAgain'));
  }
};
