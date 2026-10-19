/**
 * Single source of truth + persistence (URL params and localStorage).
 *
 *   paceSec     seconds per km (float, clamped to PACE_MIN_SEC..PACE_MAX_SEC)
 *   unit        'km' | 'mi'
 *   lang        'nb' | 'en'
 *   distanceId  id from distances.js
 */

import {
  clampPace, paceFromUnit, paceFromSpeed, paceFromTime, paceInUnit,
  parseTime, parseDecimal, formatPace,
} from './pace.js';
import { DISTANCES, DEFAULT_DISTANCE_ID, getDistance } from './distances.js';
import { LANGS, DEFAULT_LANG } from './i18n.js';

const STORAGE_KEY = 'pace.v1';
const DEFAULT_PACE_SEC = 5 * 60; // 5:00 min/km

const listeners = new Set();

const state = {
  paceSec: DEFAULT_PACE_SEC,
  unit: 'km',
  lang: DEFAULT_LANG,
  distanceId: DEFAULT_DISTANCE_ID,
};

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(changed) {
  persist();
  listeners.forEach((fn) => fn(state, changed));
}

/* ---------- mutations ---------- */

export function setPaceSec(paceSec) {
  const v = clampPace(paceSec);
  if (v === state.paceSec) return;
  state.paceSec = v;
  notify({ paceSec: true });
}

export function setUnit(unit) {
  if (unit !== 'km' && unit !== 'mi') return;
  if (unit === state.unit) return;
  state.unit = unit;
  notify({ unit: true });
}

export function setLang(lang) {
  if (!LANGS.includes(lang) || lang === state.lang) return;
  state.lang = lang;
  notify({ lang: true });
}

export function setDistanceId(id) {
  if (!getDistance(id) || id === state.distanceId) return;
  state.distanceId = id;
  notify({ distanceId: true });
}

/* ---------- load ---------- */

/** Read localStorage, then let URL params override. */
export function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      if (Number.isFinite(saved.paceSec)) state.paceSec = clampPace(saved.paceSec);
      if (saved.unit === 'km' || saved.unit === 'mi') state.unit = saved.unit;
      if (LANGS.includes(saved.lang)) state.lang = saved.lang;
      if (getDistance(saved.distanceId)) state.distanceId = saved.distanceId;
    }
  } catch { /* ignore */ }

  const q = new URLSearchParams(location.search);

  const lang = q.get('lang');
  if (lang && LANGS.includes(lang)) state.lang = lang;

  const unit = q.get('unit');
  if (unit === 'km' || unit === 'mi') state.unit = unit;

  const dist = q.get('dist');
  if (dist && getDistance(dist)) state.distanceId = dist;

  // Priority: time (with dist) > pace > speed.
  const time = parseTime(q.get('time') ?? '');
  const pace = parseTime(q.get('pace') ?? '');
  const speed = parseDecimal(q.get('speed') ?? '');
  if (Number.isFinite(time) && time > 0) {
    state.paceSec = clampPace(paceFromTime(time, getDistance(state.distanceId).metres));
  } else if (Number.isFinite(pace) && pace > 0) {
    state.paceSec = clampPace(paceFromUnit(pace, state.unit));
  } else if (Number.isFinite(speed) && speed > 0) {
    state.paceSec = clampPace(paceFromSpeed(speed, state.unit));
  }

  persist();
  return state;
}

/* ---------- persist ---------- */

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }

  const q = new URLSearchParams();
  if (state.lang !== DEFAULT_LANG) q.set('lang', state.lang);
  if (state.unit !== 'km') q.set('unit', state.unit);
  q.set('pace', formatPace(paceInUnit(state.paceSec, state.unit)));
  if (state.distanceId !== DEFAULT_DISTANCE_ID) q.set('dist', state.distanceId);
  const url = `${location.pathname}?${q.toString()}${location.hash}`;
  history.replaceState(null, '', url);
}

export { DISTANCES };
