/**
 * The distances shown in the table and selectable in the finish-time card.
 * Labels are per language; `sub` is an optional subtitle per unit.
 *
 * A special "custom" distance (id CUSTOM_ID) lets the user type any distance,
 * e.g. a relay leg. Its metres live in state, not here.
 */

import { KM_PER_MILE } from './pace.js';

export const DISTANCES = [
  { id: '400', metres: 400, label: { nb: '400 m', en: '400 m' } },
  { id: '800', metres: 800, label: { nb: '800 m', en: '800 m' } },
  { id: '1k', metres: 1000, label: { nb: '1 km', en: '1 km' } },
  { id: '1500', metres: 1500, label: { nb: '1500 m', en: '1500 m' } },
  {
    id: 'mi',
    metres: KM_PER_MILE * 1000,
    label: { nb: 'Mile', en: 'Mile' },
    sub: { km: { nb: '1609 m', en: '1609 m' }, mi: { nb: '1 mi', en: '1 mi' } },
  },
  { id: '2k', metres: 2000, label: { nb: '2 km', en: '2 km' } },
  { id: '3k', metres: 3000, label: { nb: '3 km', en: '3 km' } },
  { id: '5k', metres: 5000, label: { nb: '5 km', en: '5 km' } },
  { id: '10k', metres: 10000, label: { nb: '10 km', en: '10 km' } },
  {
    id: 'hm',
    metres: 21097.5,
    label: { nb: 'HM', en: 'HM' },
    sub: { km: { nb: '21,1 km', en: '21.1 km' }, mi: { nb: '13,1 mi', en: '13.1 mi' } },
  },
  {
    id: 'm',
    metres: 42195,
    label: { nb: 'M', en: 'M' },
    sub: { km: { nb: '42,2 km', en: '42.2 km' }, mi: { nb: '26,2 mi', en: '26.2 mi' } },
  },
];

export const DEFAULT_DISTANCE_ID = '10k';

export const CUSTOM_ID = 'custom';
export const CUSTOM_MIN_METRES = 50;
export const CUSTOM_MAX_METRES = 500000;
export const DEFAULT_CUSTOM_METRES = 7500;

export function getDistance(id) {
  return DISTANCES.find((d) => d.id === id) || null;
}

export function isValidDistanceId(id) {
  return id === CUSTOM_ID || getDistance(id) !== null;
}

/** Clamp/round a custom distance in metres; NaN if not a usable number. */
export function normaliseCustomMetres(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return NaN;
  return Math.round(Math.min(CUSTOM_MAX_METRES, Math.max(CUSTOM_MIN_METRES, n)));
}

/**
 * Convert a typed distance into metres.
 * @param {number} value
 * @param {'m'|'km'|'mi'} distUnit
 */
export function toMetres(value, distUnit) {
  if (distUnit === 'km') return value * 1000;
  if (distUnit === 'mi') return value * KM_PER_MILE * 1000;
  return value;
}

/** Inverse of toMetres. */
export function fromMetres(metres, distUnit) {
  if (distUnit === 'km') return metres / 1000;
  if (distUnit === 'mi') return metres / (KM_PER_MILE * 1000);
  return metres;
}

/**
 * Human label for an arbitrary distance, e.g. 7500 → "7,5 km" (nb) / "7.5 km" (en),
 * 6300 → "6,3 km", 850 → "850 m", unit mi → "4.66 mi".
 * @param {number} metres
 * @param {'km'|'mi'} unit   display unit from state
 * @param {'nb'|'en'} lang
 */
export function formatDistance(metres, unit, lang) {
  const sep = lang === 'nb' ? ',' : '.';
  const trim = (s) => s.replace(/\.?0+$/, '').replace('.', sep);
  if (unit === 'mi') {
    return `${trim(fromMetres(metres, 'mi').toFixed(2))} mi`;
  }
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${trim((metres / 1000).toFixed(3))} km`;
}
