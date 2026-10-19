/**
 * The distances shown in the table and selectable in the finish-time card.
 * Labels are per language; `sub` is an optional subtitle per unit.
 */

export const DISTANCES = [
  { id: '400', metres: 400, label: { nb: '400 m', en: '400 m' } },
  { id: '800', metres: 800, label: { nb: '800 m', en: '800 m' } },
  { id: '1k', metres: 1000, label: { nb: '1 km', en: '1 km' } },
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

export function getDistance(id) {
  return DISTANCES.find((d) => d.id === id) || null;
}
