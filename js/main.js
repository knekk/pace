/**
 * Boot: build wheels, wire them to state, render the times grid.
 */

import {
  PACE_MIN_SEC, PACE_MAX_SEC, PACE_MI_MIN_SEC, PACE_MI_MAX_SEC,
  SPEED_KMH_MIN, SPEED_KMH_MAX, SPEED_MPH_MIN, SPEED_MPH_MAX,
  paceInUnit, paceFromUnit, speedInUnit, paceFromSpeed,
  timeForDistance, paceFromTime, clampPace,
  splitMs, splitHms, splitTenths, formatTime, formatPace, parseDecimal,
} from './pace.js';
import {
  DISTANCES, CUSTOM_ID, toMetres, fromMetres, formatDistance, formatNumber,
} from './distances.js';
import { t, setLang as applyLang } from './i18n.js';
import { Wheel, rangeItems } from './wheel.js';
import { applyDeviceAttributes } from './device.js';
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

/** Hours needed for the slowest pace over the selected distance (so the wheel fits any distance). */
function maxHours() {
  return Math.floor(timeForDistance(PACE_MAX_SEC, store.selectedMetres()) / 3600);
}

function buildWheels() {
  const { unit } = store.getState();
  const pr = paceRange(unit);
  const sr = speedRange(unit);

  wheels.paceMin = new Wheel($('#wheel-pace-min'), {
    items: rangeItems(Math.floor(pr.min / 60), Math.floor(pr.max / 60)),
    onChange: onPaceWheel, maxDigits: 2, ariaLabel: t('minutes'),
  });
  wheels.paceSec = new Wheel($('#wheel-pace-sec'), {
    items: rangeItems(0, 59, 2),
    onChange: onPaceWheel, loop: true, maxDigits: 2, ariaLabel: t('seconds'),
  });

  wheels.speedInt = new Wheel($('#wheel-speed-int'), {
    items: rangeItems(Math.floor(sr.min), Math.floor(sr.max)),
    onChange: onSpeedWheel, maxDigits: 2, ariaLabel: t('speed'),
  });
  wheels.speedTenth = new Wheel($('#wheel-speed-tenth'), {
    items: rangeItems(0, 9),
    onChange: onSpeedWheel, loop: true, maxDigits: 1, ariaLabel: t('tenths'),
  });

  wheels.timeH = new Wheel($('#wheel-time-h'), {
    items: rangeItems(0, maxHours()),
    onChange: onTimeWheel, maxDigits: 2, ariaLabel: t('hours'),
  });
  wheels.timeM = new Wheel($('#wheel-time-m'), {
    items: rangeItems(0, 59, 2),
    onChange: onTimeWheel, loop: true, maxDigits: 2, ariaLabel: t('minutes'),
  });
  wheels.timeS = new Wheel($('#wheel-time-s'), {
    items: rangeItems(0, 59, 2),
    onChange: onTimeWheel, loop: true, maxDigits: 2, ariaLabel: t('seconds'),
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

/** Rebuild the hours wheel when the distance changes (0–2 for 10 km, 0–11 for a marathon…). */
function rebuildHoursWheel() {
  const max = maxHours();
  if (wheels.timeH.items.length === max + 1) return;
  wheels.timeH.setItems(rangeItems(0, max), wheels.timeH.value);
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
  const total = wheels.timeH.value * 3600 + wheels.timeM.value * 60 + wheels.timeS.value;
  const next = clampPace(paceFromTime(Math.max(1, total), store.selectedMetres()));
  if (next === store.getState().paceSec) {
    syncWheels();
  } else {
    store.setPaceSec(next);
  }
}

/* ---------- state -> wheels ---------- */

function syncWheels() {
  const { paceSec, unit } = store.getState();

  const p = splitMs(paceInUnit(paceSec, unit));
  wheels.paceMin.setValue(p.m);
  wheels.paceSec.setValue(p.s);

  const s = splitTenths(speedInUnit(paceSec, unit));
  wheels.speedInt.setValue(s.whole);
  wheels.speedTenth.setValue(s.tenth);

  const tm = splitHms(timeForDistance(paceSec, store.selectedMetres()));
  wheels.timeH.setValue(tm.h);
  wheels.timeM.setValue(tm.m);
  wheels.timeS.setValue(tm.s);
}

/* ---------- labels, chips, grid ---------- */

function distLabel(d, lang) {
  if (d.id === CUSTOM_ID) return t('custom');
  return d.label[lang] ?? d.label.nb;
}

function distSub(d, unit, lang) {
  if (d.id === CUSTOM_ID) return formatDistance(store.getState().customMetres, unit, lang);
  return d.sub ? d.sub[unit][lang] : '';
}

function distTitle(d) {
  switch (d.id) {
    case 'hm': return t('halfMarathon');
    case 'm': return t('marathon');
    case 'mi': return t('mile');
    case CUSTOM_ID: return t('customDistance');
    default: return '';
  }
}

/** All distances incl. the custom one, in display order. */
function allDistances() {
  return [...DISTANCES, { id: CUSTOM_ID }];
}

function renderLabels() {
  const { unit, lang, distanceId, customMetres } = store.getState();
  $('#pace-unit').textContent = unit === 'mi' ? t('perMi') : t('perKm');
  $('#speed-unit').textContent = unit === 'mi' ? t('mph') : t('kmh');
  $('#speed-sep').textContent = t('decimalSep');
  if (distanceId === CUSTOM_ID) {
    $('#time-dist-label').textContent = formatDistance(customMetres, unit, lang);
  } else {
    const d = allDistances().find((x) => x.id === distanceId);
    const sub = distSub(d, unit, lang);
    $('#time-dist-label').textContent = sub ? `${distLabel(d, lang)} · ${sub}` : distLabel(d, lang);
  }
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
  allDistances().forEach((d) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (d.id === distanceId ? ' is-active' : '') + (d.id === CUSTOM_ID ? ' chip-custom' : '');
    b.dataset.dist = d.id;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', d.id === distanceId ? 'true' : 'false');
    b.textContent = d.id === CUSTOM_ID ? `+ ${t('custom')}` : distLabel(d, lang);
    const title = distTitle(d);
    if (title) b.title = title;
    b.addEventListener('click', () => {
      store.setDistanceId(d.id);
      if (d.id === CUSTOM_ID) focusCustomInput();
    });
    wrap.appendChild(b);
  });
  const active = wrap.querySelector('.is-active');
  if (active && wrap.scrollWidth > wrap.clientWidth) {
    // Centre the active chip horizontally without scrolling the page vertically.
    const left = active.offsetLeft - (wrap.clientWidth - active.offsetWidth) / 2;
    wrap.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }
}

/* ---------- custom distance panel ---------- */

let customUnit = 'm';          // 'm' | 'km' | 'mi' – the unit the user types in
let customInputFocused = false;

function formatCustomValue(metres) {
  const v = fromMetres(metres, customUnit);
  const digits = customUnit === 'm' ? 0 : 3;
  return formatNumber(v, digits, t('decimalSep'));
}

function renderCustomPanel() {
  const { distanceId, customMetres } = store.getState();
  const panel = $('#custom-panel');
  const show = distanceId === CUSTOM_ID;
  panel.hidden = !show;
  if (!show) return;
  document.querySelectorAll('[data-dunit]').forEach((b) => {
    const on = b.dataset.dunit === customUnit;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const input = $('#custom-input');
  if (!customInputFocused) input.value = formatCustomValue(customMetres);
}

function commitCustomInput() {
  const v = parseDecimal($('#custom-input').value);
  if (!Number.isFinite(v) || v <= 0) return;
  store.setCustomMetres(toMetres(v, customUnit));
}

function focusCustomInput() {
  const input = $('#custom-input');
  if (input && !input.closest('[hidden]')) {
    input.focus({ preventScroll: true });
    input.select();
  }
}

function wireCustomPanel() {
  const input = $('#custom-input');
  input.addEventListener('focus', () => { customInputFocused = true; });
  input.addEventListener('blur', () => {
    customInputFocused = false;
    commitCustomInput();
    renderCustomPanel();
  });
  input.addEventListener('input', commitCustomInput);
  // Enter / "Go" on a keyboard, or the OK button, submits the form.
  // iOS's decimal keypad has no return key, so the OK button is the only way
  // to explicitly confirm and dismiss the keyboard there.
  $('#custom-form').addEventListener('submit', (e) => {
    e.preventDefault();
    commitCustomInput();
    input.blur();
  });
  document.querySelectorAll('[data-dunit]').forEach((b) =>
    b.addEventListener('click', () => {
      customUnit = b.dataset.dunit;
      customInputFocused = false;
      renderCustomPanel();
    }));
}

/* ---------- times grid ---------- */

function buildGrid() {
  const grid = $('#times-grid');
  grid.innerHTML = '';
  allDistances().forEach((d) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'time-cell' + (d.id === CUSTOM_ID ? ' is-custom' : '');
    cell.dataset.dist = d.id;
    cell.innerHTML = `
      <span class="time-dist"></span>
      <span class="time-sub"></span>
      <span class="time-value num"></span>`;
    cell.addEventListener('click', () => store.setDistanceId(d.id));
    grid.appendChild(cell);
  });
}

function renderGrid(flash) {
  const { paceSec, unit, lang, distanceId } = store.getState();
  allDistances().forEach((d) => {
    const cell = $(`#times-grid [data-dist="${d.id}"]`);
    cell.classList.toggle('is-active', d.id === distanceId);
    cell.querySelector('.time-dist').textContent = distLabel(d, lang);
    const subEl = cell.querySelector('.time-sub');
    const sub = distSub(d, unit, lang);
    subEl.textContent = sub || '\u00a0';
    cell.title = distTitle(d);
    const v = cell.querySelector('.time-value');
    const txt = formatTime(timeForDistance(paceSec, store.metresFor(d.id)));
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

/* ---------- share ---------- */

let toastTimer = null;

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 1800);
}

async function share() {
  const { paceSec, unit } = store.getState();
  const url = store.shareUrl();
  const text = `${formatPace(paceInUnit(paceSec, unit))} ${unit === 'mi' ? t('perMi') : t('perKm')}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Pace', text, url });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return; // user cancelled
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast(t('copied'));
  } catch {
    // Last resort: let the user copy from the prompt.
    window.prompt(t('shareTitle'), url);
  }
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
    rebuildHoursWheel();
  }
  if (changed.customMetres) {
    rebuildHoursWheel();
  }
  renderToggles();
  renderLabels();
  renderCustomPanel();
  syncWheels();
  renderGrid(Boolean(changed.paceSec));
}

/* ---------- boot ---------- */

function boot() {
  applyDeviceAttributes();
  const state = store.load();
  applyLang(state.lang);
  if (state.unit === 'mi') customUnit = 'mi';
  buildWheels();
  buildGrid();
  wireCustomPanel();
  renderToggles();
  renderLabels();
  renderChips();
  renderCustomPanel();
  syncWheels();
  renderGrid(false);

  document.querySelectorAll('[data-unit]').forEach((b) =>
    b.addEventListener('click', () => store.setUnit(b.dataset.unit)));
  document.querySelectorAll('[data-lang]').forEach((b) =>
    b.addEventListener('click', () => store.setLang(b.dataset.lang)));
  $('#share-btn').addEventListener('click', share);

  store.subscribe(onState);

  // Re-align wheels after fonts load / orientation change (row height may shift).
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(syncWheels, 100);
  });
  if (document.fonts?.ready) document.fonts.ready.then(syncWheels);
}

boot();
