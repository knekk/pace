/**
 * Translations. Norwegian (nb) is the default; English via ?lang=en or the toggle.
 */

export const LANGS = ['nb', 'en'];
export const DEFAULT_LANG = 'nb';

const STRINGS = {
  nb: {
    title: 'Pace',
    tagline: 'Pace ↔ fart ↔ sluttid',
    pace: 'Pace',
    speed: 'Fart',
    finishTime: 'Sluttid',
    distance: 'Distanse',
    perKm: 'min/km',
    perMi: 'min/mile',
    kmh: 'km/t',
    mph: 'mph',
    hours: 'timer',
    minutes: 'min',
    seconds: 'sek',
    tenths: 'tidel',
    times: 'Tider på denne pacen',
    halfMarathon: 'Halvmaraton',
    marathon: 'Maraton',
    unitToggle: 'Bytt mellom kilometer og miles',
    langToggle: 'Switch to English',
    shareHint: 'Lenken i adressefeltet husker verdiene dine.',
    footer: 'Laget for løpere. Ingen sporing, ingen innlogging.',
    decimalSep: ',',
  },
  en: {
    title: 'Pace',
    tagline: 'Pace ↔ speed ↔ finish time',
    pace: 'Pace',
    speed: 'Speed',
    finishTime: 'Finish time',
    distance: 'Distance',
    perKm: 'min/km',
    perMi: 'min/mile',
    kmh: 'km/h',
    mph: 'mph',
    hours: 'hours',
    minutes: 'min',
    seconds: 'sec',
    tenths: 'tenth',
    times: 'Times at this pace',
    halfMarathon: 'Half marathon',
    marathon: 'Marathon',
    unitToggle: 'Switch between kilometres and miles',
    langToggle: 'Bytt til norsk',
    shareHint: 'The link in the address bar remembers your values.',
    footer: 'Made for runners. No tracking, no sign-in.',
    decimalSep: '.',
  },
};

let current = DEFAULT_LANG;

export function getLang() {
  return current;
}

export function setLang(lang) {
  current = LANGS.includes(lang) ? lang : DEFAULT_LANG;
  document.documentElement.lang = current === 'nb' ? 'nb' : 'en';
  applyTranslations();
}

export function t(key) {
  return STRINGS[current][key] ?? STRINGS[DEFAULT_LANG][key] ?? key;
}

/** Fill every [data-i18n] / [data-i18n-title] / [data-i18n-aria] element. */
export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
}
