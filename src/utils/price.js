import { t } from '../i18n';
import { formatPrice } from '../i18n/format';

// Each technician names their own price, shown as "À partir de …". The
// service price set from the dashboard (basePrice) is never shown nor used.

const MAX_PRICE = 100000;

// The technician's starting price, or null when they haven't set one
export const startingPrice = (worker) => {
  const value = Number(worker?.hourlyRate);
  return value > 0 ? value : null;
};

// "À partir de 50 TND", or "Prix à convenir" without a price
export const fromLabel = (price) => (Number(price) > 0
  ? t('price.from', { price: formatPrice(Number(price)) })
  : t('price.onRequest'));

// A booking shows its technician's current price. The price saved with older
// bookings may be the service price from the dashboard, so it is not used.
// `technician` is the technician's profile when the booking doesn't carry it
// (the technician's own screens); client bookings come with `worker`.
export const reservationPrice = (reservation, technician) =>
  startingPrice(technician || reservation?.worker);

// What the technician typed: "50", "62,5" -> a number; null when empty; NaN when not a price
export const parsePriceInput = (text) => {
  const clean = String(text ?? '').replace(/\s/g, '').replace(',', '.');
  if (!clean) return null;
  const value = Number(clean);
  if (!Number.isFinite(value) || value <= 0 || value > MAX_PRICE) return NaN;
  return Math.round(value * 100) / 100;
};
