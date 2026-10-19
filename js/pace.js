/**
 * Pure pace/speed math. No DOM here – this module is unit-tested with node.
 *
 * Canonical value everywhere: paceSec = seconds per kilometre.
 */

export const KM_PER_MILE = 1.609344;

/** Pace range in seconds per km (2:00 – 15:59). */
export const PACE_MIN_SEC = 2 * 60;
export const PACE_MAX_SEC = 15 * 60 + 59;

/** Pace range for the mile wheels (3:00 – 25:59 per mile). */
export const PACE_MI_MIN_SEC = 3 * 60;
export const PACE_MI_MAX_SEC = 25 * 60 + 59;

/** Speed range in km/h and mph. */
export const SPEED_KMH_MIN = 3.0;
export const SPEED_KMH_MAX = 30.0;
export const SPEED_MPH_MIN = 2.0;
export const SPEED_MPH_MAX = 19.0;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function clampPace(paceSec) {
  return clamp(paceSec, PACE_MIN_SEC, PACE_MAX_SEC);
}

/* ---------- pace <-> speed ---------- */

/** seconds per km -> km/h */
export function paceToKmh(paceSec) {
  return 3600 / paceSec;
}

/** km/h -> seconds per km */
export function kmhToPace(kmh) {
  return 3600 / kmh;
}

/** seconds per km -> seconds per mile */
export function paceKmToMi(paceSec) {
  return paceSec * KM_PER_MILE;
}

/** seconds per mile -> seconds per km */
export function paceMiToKm(paceMiSec) {
  return paceMiSec / KM_PER_MILE;
}

/** seconds per km -> mph */
export function paceToMph(paceSec) {
  return 3600 / paceKmToMi(paceSec);
}

/** mph -> seconds per km */
export function mphToPace(mph) {
  return paceMiToKm(3600 / mph);
}

/* ---------- unit helpers ---------- */

/**
 * Pace in the display unit (seconds per km or per mile).
 * @param {number} paceSec seconds per km
 * @param {'km'|'mi'} unit
 */
export function paceInUnit(paceSec, unit) {
  return unit === 'mi' ? paceKmToMi(paceSec) : paceSec;
}

/** Inverse of paceInUnit. */
export function paceFromUnit(value, unit) {
  return unit === 'mi' ? paceMiToKm(value) : value;
}

/** Speed in the display unit (km/h or mph). */
export function speedInUnit(paceSec, unit) {
  return unit === 'mi' ? paceToMph(paceSec) : paceToKmh(paceSec);
}

/** Pace (sec/km) from a speed in the display unit. */
export function paceFromSpeed(speed, unit) {
  return unit === 'mi' ? mphToPace(speed) : kmhToPace(speed);
}

/* ---------- finish times ---------- */

/** Time in seconds to cover `metres` at `paceSec` (sec/km). */
export function timeForDistance(paceSec, metres) {
  return (paceSec * metres) / 1000;
}

/** Pace (sec/km) needed to cover `metres` in `totalSec`. */
export function paceFromTime(totalSec, metres) {
  return (totalSec * 1000) / metres;
}

/* ---------- rounding ---------- */

export function roundToSecond(sec) {
  return Math.round(sec);
}

export function roundToTenth(value) {
  return Math.round(value * 10) / 10;
}

/* ---------- splitting / formatting ---------- */

/** Split seconds into { h, m, s } integer parts (rounded to whole seconds). */
export function splitHms(totalSec) {
  const t = Math.max(0, Math.round(totalSec));
  return { h: Math.floor(t / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

/** Split seconds into { m, s } where m may exceed 59. */
export function splitMs(totalSec) {
  const t = Math.max(0, Math.round(totalSec));
  return { m: Math.floor(t / 60), s: t % 60 };
}

/** Split a decimal into { whole, tenth }. 15.04 -> { whole: 15, tenth: 0 } */
export function splitTenths(value) {
  const tenths = Math.round(value * 10);
  return { whole: Math.floor(tenths / 10), tenth: tenths % 10 };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** m:ss for pace (e.g. 4:05). */
export function formatPace(paceSecInUnit) {
  const { m, s } = splitMs(paceSecInUnit);
  return `${m}:${pad2(s)}`;
}

/** m:ss under one hour, h:mm:ss from one hour. */
export function formatTime(totalSec) {
  const { h, m, s } = splitHms(totalSec);
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}

/** One decimal, with the given decimal separator. 15 -> "15.0" */
export function formatSpeed(speed, decimalSep = '.') {
  return roundToTenth(speed).toFixed(1).replace('.', decimalSep);
}

/* ---------- parsing (URL params) ---------- */

/** Parse "m:ss" or "h:mm:ss" (also plain seconds) into seconds; NaN if invalid. */
export function parseTime(text) {
  if (typeof text !== 'string') return NaN;
  const parts = text.trim().split(':');
  if (parts.length < 1 || parts.length > 3) return NaN;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return NaN;
  return nums.reduce((acc, n) => acc * 60 + n, 0);
}

/** Parse "15", "15.5" or "15,5" into a number; NaN if invalid. */
export function parseDecimal(text) {
  if (typeof text !== 'string') return NaN;
  return Number(text.trim().replace(',', '.'));
}
