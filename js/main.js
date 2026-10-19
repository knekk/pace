/**
 * Boot: build wheels, wire them to state, render the times grid.
 */

import {
  PACE_MIN_SEC, PACE_MAX_SEC, PACE_MI_MIN_SEC, PACE_MI_MAX_SEC,
  SPEED_KMH_MIN, SPEED_KMH_MAX, SPEED_MPH_MIN, SPEED_MPH_MAX,
  paceInUnit, paceFromUnit, speedInUnit, paceFromSpeed,
  timeForDistance, paceFromTime, clampPace,
  splitMs, splitHms, splitTenths, formatTime,
} from './pace.js';
import { DISTANCES, getDistance } from './distances.js';
import { t, setLang as applyLang } from './i18n.js';
import { Wheel, rangeItems } from './wheel.js';
import * as store from './state.js';

const $ = (sel) => document.querySelector(sel);

/* ---------- wheels ---------- */

const wheels = {
  paceMin: null, paceSec: null,
  speedInt: null, speedTenth: null,
  timeH: null, timeM: null, timeS: null,
};

function paceRange(unit) {
  return unit === 'mi'
    ? { min: PACE_MI_MIN_SEC, max: PACE_MI_MAX_SEC }
    : { min: PACE_MIN_SEC, max: PACE_MAX_SEC };
}

function speedRange(unit) {
  return unit === 'mi'
    ? { min: SPEED_MPH_MIN, max: SPEED_MPH_MAX }
    : { min: SPEED_KMH_MIN, max: SPEED_KMH_MAX };
}

function buildWheels() {
  const { unit } = store.getState();
  const pr = paceRange(unit);
  const sr = speedRange(unit);

  wheels.paceMin = new Wheel($('#wheel-pace-min'), {
    items: rangeItems(Math.floor(pr.min / 60), Math.floor(pr.max / 60)),
    onChange: onPaceWheel,
  });
  wheels.paceSec = new Wheel($('#wheel-pace-sec'), {
    items: rangeItems(0, 59, 2),
    onChange: onPaceWheel,
  });

  wheels.speedInt = new Wheel($('#wheel-speed-int'), {
    items: rangeItems(Math.floor(sr.min), Math.floor(sr.max)),
    onChange: onSpeedWheel,
  });
  wheels.speedTenth = new Wheel($('#wheel-speed-tenth'), {
    items: rangeItems(0, 9),
    onChange: onSpeedWheel,
  });

  // Marathon at the slowest pace (15:59/km) is 11:14:25, so hours go 0–11.
  wheels.timeH = new Wheel($('#wheel-time-h'), {
    items: rangeItems(0, 11),
    onChange: onTimeWheel,
  });
  wheels.timeM = new Wheel($('#wheel-time-m'), {
    items: rangeItems(0, 59, 2),
    onChange: onTimeWheel,
  });
  wheels.timeS = new Wheel($('#wheel-time-s'), {
    items: rangeItems(0, 59, 2),
    onChange: onTimeWheel,
  });
}

/** Rebuild the unit-dependent wheels (pace minutes, speed integer). */
function rebuildUnitWheels() {
  const { unit } = store.getState();
  const pr = paceRange(unit);
  const sr = speedRange(unit);
  wheels.paceMin.setItems(rangeItems(Math.floor(pr.min / 60), Math.floor(pr.max / 60)), wheels.paceMin.value);
  wheels.speedInt.setItems(rangeItems(Math.floor(sr.min), Math.floor(sr.max)), wheels.speedInt.value);
}

/* ---------- wheel -> state ---------- */

function onPaceWheel() {
  const { unit } = store.getState();
  const pr = paceRange(unit);
  let sec = wheels.paceMin.value * 60 + wheels.paceSec.value;
  sec = Math.min(pr.max, Math.max(pr.min, sec));
  const next = clampPace(paceFromUnit(sec, unit));
  if (next === store.getState().paceSec) {
    syncWheels(); // snap back if clamped
  } else {
    store.setPaceSec(next);
  }
}

function onSpeedWheel() {
  const { unit } = store.getState();
  const sr = speedRange(unit);
  let speed = wheels.speedInt.value + wheels.speedTenth.value / 10;
  speed = Math.min(sr.max, Math.max(sr.min, speed));
  const next = clampPace(paceFromSpeed(speed, unit));
  if (next === store.getState().paceSec) {
    syncWheels();
  } else {
    store.setPaceSec(next);
  }
}

function onTimeWheel() {
  const { distanceId } = store.getState();
  const total = wheels.timeH.value * 3600 + wheels.timeM.value * 60 + wheels.timeS.value;
  const metres = getDistance(distanceId).metres;
  const next = clampPace(paceFromTime(Math.max(1, total), metres));
  if (next === store.getState().paceSec) {
    syncWheels();
  } else {
    store.setPaceSec(next);
  }
}

/* ---------- state -> wheels ---------- */

function syncWheels() {
  const { paceSec, unit, distanceId } = store.getState();

  const p = splitMs(paceInUnit(paceSec, unit));
  wheels.paceMin.setValue(p.m);
  wheels.paceSec.setValue(p.s);

  const s = splitTenths(speedInUnit(paceSec, unit));
  wheels.speedInt.setValue(s.whole);
  wheels.speedTenth.setValue(s.tenth);

  const tm = splitHms(timeForDistance(paceSec, getDistance(distanceId).metres));
  wheels.timeH.setValue(tm.h);
  wheels.timeM.setValue(tm.m);
  wheels.timeS.setValue(tm.s);
}

/* ---------- labels, chips, grid ---------- */

function distLabel(d, lang) {
  return d.label[lang] ?? d.label.nb;
}

function distSub(d, unit, lang) {
  return d.sub ? d.sub[unit][lang] : '';
}

function renderLabels() {
  const { unit, lang } = store.getState();
  $('#pace-unit').textContent = unit === 'mi' ? t('perMi') : t('perKm');
  $('#speed-unit').textContent = unit === 'mi' ? t('mph') : t('kmh');
  $('#speed-sep').textContent = t('decimalSep');
  const d = getDistance(store.getState().distanceId);
  const sub = distSub(d, unit, lang);
  $('#time-dist-label').textContent = sub ? `${distLabel(d, lang)} · ${sub}` : distLabel(d, lang);
}

function renderToggles() {
  const { unit, lang } = store.getState();
  document.querySelectorAll('[data-unit]').forEach((b) => {
    const on = b.dataset.unit === unit;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  document.querySelectorAll('[data-lang]').forEach((b) => {
    const on = b.dataset.lang === lang;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

function renderChips() {
  const { distanceId, lang } = store.getState();
  const wrap = $('#dist-chips');
  wrap.innerHTML = '';
  DISTANCES.forEach((d) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (d.id === distanceId ? ' is-active' : '');
    b.dataset.dist = d.id;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', d.id === distanceId ? 'true' : 'false');
    b.textContent = distLabel(d, lang);
    b.addEventListener('click', () => store.setDistanceId(d.id));
    wrap.appendChild(b);
  });
  const active = wrap.querySelector('.is-active');
  if (active && wrap.scrollWidth > wrap.clientWidth) {
    // Centre the active chip horizontally without scrolling the page vertically.
    const left = active.offsetLeft - (wrap.clientWidth - active.offsetWidth) / 2;
    wrap.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }
}

let gridBuilt = false;

function buildGrid() {
  const grid = $('#times-grid');
  grid.innerHTML = '';
  DISTANCES.forEach((d) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'time-cell';
    cell.dataset.dist = d.id;
    cell.innerHTML = `
      <span class="time-dist"></span>
      <span class="time-sub"></span>
      <span class="time-value num"></span>`;
    cell.addEventListener('click', () => store.setDistanceId(d.id));
    grid.appendChild(cell);
  });
  gridBuilt = true;
}

function renderGrid(flash) {
  if (!gridBuilt) buildGrid();
  const { paceSec, unit, lang, distanceId } = store.getState();
  DISTANCES.forEach((d) => {
    const cell = $(`#times-grid [data-dist="${d.id}"]`);
    cell.classList.toggle('is-active', d.id === distanceId);
    cell.querySelector('.time-dist').textContent = distLabel(d, lang);
    const subEl = cell.querySelector('.time-sub');
    const sub = distSub(d, unit, lang);
    subEl.textContent = sub || '\u00a0';
    const title = d.id === 'hm' ? t('halfMarathon') : d.id === 'm' ? t('marathon') : '';
    cell.title = title;
    const v = cell.querySelector('.time-value');
    const txt = formatTime(timeForDistance(paceSec, d.metres));
    if (v.textContent !== txt) {
      v.textContent = txt;
      if (flash) {
        v.classList.remove('is-flash');
        void v.offsetWidth;
        v.classList.add('is-flash');
      }
    }
  });
}

/* ---------- state subscription ---------- */

function onState(state, changed) {
  if (changed.lang) {
    applyLang(state.lang);
    renderChips();
  }
  if (changed.unit) {
    rebuildUnitWheels();
  }
  if (changed.distanceId) {
    renderChips();
  }
  renderToggles();
  renderLabels();
  syncWheels();
  renderGrid(Boolean(changed.paceSec));
}

/* ---------- boot ---------- */

function boot() {
  const state = store.load();
  applyLang(state.lang);
  buildWheels();
  renderToggles();
  renderLabels();
  renderChips();
  syncWheels();
  renderGrid(false);

  document.querySelectorAll('[data-unit]').forEach((b) =>
    b.addEventListener('click', () => store.setUnit(b.dataset.unit)));
  document.querySelectorAll('[data-lang]').forEach((b) =>
    b.addEventListener('click', () => store.setLang(b.dataset.lang)));

  store.subscribe(onState);

  // Re-align wheels after fonts load / orientation change (row height may shift).
  window.addEventListener('resize', syncWheels);
  if (document.fonts?.ready) document.fonts.ready.then(syncWheels);
}

boot();
