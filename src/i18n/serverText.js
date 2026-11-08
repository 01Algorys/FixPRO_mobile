import i18next from 'i18next';
import { getLanguage, t } from './index';
import { formatDate } from './format';

// The server answers in French or English whatever the app's language, so its
// known texts are translated here. A text not listed stays as the server sent it.

const ERROR_CODES = {
  ACCOUNT_PENDING_APPROVAL: 'auth.accountPending',
  ACCOUNT_REJECTED: 'auth.accountRejected',
  ACCOUNT_SUSPENDED: 'auth.accountSuspended',
  ACCOUNT_BANNED: 'auth.accountBanned',
  GOOGLE_TOKEN_INVALID: 'errors.googleInvalid',
  APPLE_TOKEN_INVALID: 'errors.appleInvalid',
  SOCIAL_EMAIL_MISSING: 'errors.appleNoEmail',
};

const ERROR_MESSAGES = {
  'Invalid credentials': 'auth.wrongCredentialsHint',
  'Validation failed': 'errors.validation',
  'Reservation not found': 'errors.notFoundReservation',
  'Worker not found': 'errors.notFoundWorker',
  'Worker not found or not active': 'errors.notFoundWorker',
  'Worker profile not found': 'errors.notFoundWorker',
  'Invalid worker ID': 'errors.notFoundWorker',
  'Service not found': 'errors.notFoundService',
  'User not found': 'errors.notFoundUser',
  'Access denied': 'errors.accessDenied',
  'User with this email already exists': 'errors.emailTaken',
  'Ce numéro de téléphone est déjà utilisé': 'errors.phoneTaken',
  'Invalid phone number': 'errors.invalidPhone',
  'Current password is incorrect': 'errors.wrongPassword',
  'Invalid password': 'errors.invalidPassword',
  'Too many login attempts, please try again after 15 minutes': 'errors.tooManyAttempts',
  'Too many requests, please try again later': 'errors.tooManyRequests',
  'Too many upload attempts, please try again later': 'errors.tooManyRequests',
  'Cette réservation ne peut plus être annulée car elle a déjà été acceptée.': 'errors.alreadyAccepted',
  'Messaging not available for this reservation status': 'errors.messagingClosed',
  'Review already exists for this reservation': 'errors.alreadyReviewed',
  'You can only review completed reservations': 'errors.reviewNotCompleted',
  'Invalid image format. Only JPEG and PNG are allowed.': 'errors.imageFormat',
  'Image too large. Please choose an image smaller than 2MB.': 'errors.imageTooLarge',
  'Aucune image reçue.': 'errors.noImage',
  'Vous avez des réservations en cours. Terminez-les ou annulez-les avant de supprimer votre compte.': 'errors.activeReservations',
  'Cannot delete account with active reservations': 'errors.activeReservations',
  'Votre compte est déjà vérifié.': 'errors.alreadyVerified',
  'Type de document inconnu.': 'errors.unknownDocument',
  'Photo introuvable.': 'errors.photoNotFound',
};

export const serverError = (message, code) => {
  const text = String(message || '');
  if (code === 'ACCOUNT_LOCKED') return t('auth.accountLocked', { minutes: text.match(/\d+/)?.[0] || 15 });
  const key = ERROR_CODES[code] || ERROR_MESSAGES[text];
  if (key) return t(key);
  if (/^(You cannot change reservation status|Cannot change status) from/.test(text)) return t('errors.statusChange');
  const portfolio = text.match(/^(\d+) photos maximum/);
  if (portfolio) return t('errors.portfolioFull', { count: portfolio[1] });
  return message;
};

// Service names are French or English in the database. French shows them as
// saved; other languages use the app's translation of the ones it knows.
export const serviceName = (name) => {
  if (!name || getLanguage() === 'fr') return name;
  const key = `service.${String(name).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  return i18next.exists(key) ? t(key) : name;
};

const NOTIFICATION_TITLES = {
  'Nouvelle demande': 'notif.newRequest',
  'Nouvelle demande urgente': 'notif.newRequestUrgent',
  'Nouveau message': 'chat.newMessage',
  'Demande acceptée': 'notif.accepted',
  'Demande refusée': 'notif.rejected',
  'Demande annulée': 'notif.requestCancelled',
  'Intervention commencée': 'notif.started',
  'Intervention terminée': 'notif.completed',
  'Réservation annulée': 'notif.cancelled',
  'Réservation expirée': 'notif.expired',
  'Compte vérifié': 'notif.verified',
  'Document refusé': 'notif.docRejected',
};

const NOTIFICATION_MESSAGES = {
  'Le client a annulé sa réservation.': 'notif.clientCancelled',
  'Une réservation a été annulée.': 'notif.cancelledAny',
  "Votre réservation a expiré car le professionnel n'a pas répondu sous 24h.": 'notif.expiredClient',
  'Une réservation a expiré faute de réponse sous 24h.': 'notif.expiredWorker',
  'Vos documents sont validés : vous avez le badge vérifié et passez en priorité dans les recherches.': 'notif.verifiedBody',
};

// Texts with a name or a service in them: pattern, key, names of the captures
const NOTIFICATION_PATTERNS = [
  [/^(.+) a accepté votre demande de (.+)\.$/, 'notif.acceptedBody', ['name', 'service']],
  [/^(.+) ne peut pas assurer votre demande de (.+)\.$/, 'notif.rejectedBody', ['name', 'service']],
  [/^(.+) a commencé l'intervention\.$/, 'notif.startedBody', ['name']],
  [/^Comment s'est passée l'intervention de (.+) \? Donnez votre avis\.$/, 'notif.completedBody', ['name']],
  [/^(.+) a annulé votre réservation de (.+)\.$/, 'notif.cancelledByWorkerBody', ['name', 'service']],
  [/^(.+) a annulé sa demande de (.+)\.$/, 'notif.cancelledByClientBody', ['name', 'service']],
  [/^(.+) a annulé sa demande\.$/, 'notif.cancelledNamed', ['name']],
  [/^(.+) vous a envoyé un message$/, 'notif.newMessageFrom', ['name']],
  [/^(.*) Renvoyez-le depuis votre profil pour obtenir le badge vérifié\.$/, 'notif.docRejectedBody', ['reason']],
];

const FRENCH_MONTHS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

// "Sami · Plomberie · sam. 7 nov. à 14:00", the line of a new request
const requestLine = (message) => {
  const match = message.match(/^(.+) · (.+) · \S+ (\d{1,2}) (\S+?)\.? à (\d{2}:\d{2})$/);
  const month = match ? FRENCH_MONTHS.indexOf(match[4]) : -1;
  if (month < 0) return null;
  const day = formatDate(new Date(2024, month, Number(match[3])), { day: 'numeric', month: 'short' });
  return t('notif.requestLine', { client: match[1], service: serviceName(match[2]), when: `${day} ${match[5]}` });
};

const notificationMessage = (message) => {
  const text = String(message || '');
  if (NOTIFICATION_MESSAGES[text]) return t(NOTIFICATION_MESSAGES[text]);
  for (const [pattern, key, names] of NOTIFICATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const params = Object.fromEntries(names.map((name, i) => [name, match[i + 1]]));
      if (params.service) params.service = serviceName(params.service);
      return t(key, params);
    }
  }
  return requestLine(text) || message;
};

// Notifications are saved in French; this also covers the old ones
export const localizeNotification = ({ title, message }) => {
  if (getLanguage() === 'fr') return { title, message };
  const key = NOTIFICATION_TITLES[title];
  return { title: key ? t(key) : title, message: notificationMessage(message) };
};
