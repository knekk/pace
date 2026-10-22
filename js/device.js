/**
 * Device detection – pure feature detection in the browser, nothing stored or sent.
 *
 * The inline script in index.html runs the same logic before first paint and sets
 *   <html data-device="phone|tablet|desktop" data-ios data-standalone data-touch>
 * so CSS can adapt without a flash. This module exposes the result to JS.
 */

export function detectDevice() {
  const ua = navigator.userAgent || '';
  const touchPoints = navigator.maxTouchPoints || 0;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const touch = coarse || touchPoints > 0;
  // iPadOS 13+ reports itself as a Mac; the touch points give it away.
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && touchPoints > 1);
  const standalone =
    (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) ||
    navigator.standalone === true;
  const shortSide = Math.min(screen.width || 0, screen.height || 0) || window.innerWidth;
  const device = !coarse ? 'desktop' : shortSide <= 600 ? 'phone' : 'tablet';
  return { device, ios, touch, standalone };
}

export function applyDeviceAttributes(info = detectDevice()) {
  const d = document.documentElement.dataset;
  d.device = info.device;
  if (info.ios) d.ios = ''; else delete d.ios;
  if (info.touch) d.touch = ''; else delete d.touch;
  if (info.standalone) d.standalone = ''; else delete d.standalone;
  return info;
}
