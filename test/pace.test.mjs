// Run: node --test test/pace.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  paceToKmh, kmhToPace, paceKmToMi, paceToMph, mphToPace,
  paceInUnit, paceFromUnit, speedInUnit, paceFromSpeed,
  timeForDistance, paceFromTime, clampPace,
  formatPace, formatTime, formatSpeed, splitTenths, splitHms,
  parseTime, parseDecimal,
  PACE_MIN_SEC, PACE_MAX_SEC,
} from '../js/pace.js';
import {
  DISTANCES, getDistance, isValidDistanceId, normaliseCustomMetres,
  toMetres, fromMetres, formatDistance, CUSTOM_ID, CUSTOM_MIN_METRES, CUSTOM_MAX_METRES,
} from '../js/distances.js';

const near = (a, b, eps = 0.51) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

test('pace <-> km/h', () => {
  assert.equal(paceToKmh(240), 15);
  assert.equal(kmhToPace(15), 240);
  assert.equal(formatSpeed(paceToKmh(240)), '15.0');
  assert.equal(formatSpeed(paceToKmh(240), ','), '15,0');
  assert.equal(formatPace(kmhToPace(12)), '5:00');
  assert.equal(formatPace(kmhToPace(10)), '6:00');
});

test('pace <-> miles', () => {
  // 5:00/km ≈ 8:03/mi, 7.46 mph
  near(paceKmToMi(300), 8 * 60 + 3, 0.6);
  assert.equal(formatPace(paceInUnit(300, 'mi')), '8:03');
  near(paceToMph(300), 7.46, 0.01);
  near(mphToPace(7.46), 300, 0.3);
  near(paceFromUnit(8 * 60 + 3, 'mi'), 300, 0.4);
  assert.equal(paceInUnit(300, 'km'), 300);
  assert.equal(speedInUnit(240, 'km'), 15);
  near(speedInUnit(240, 'mi'), 9.32, 0.01);
  near(paceFromSpeed(15, 'km'), 240, 0);
});

test('finish times at 4:00/km', () => {
  const p = 240;
  const t = (id) => formatTime(timeForDistance(p, getDistance(id).metres));
  assert.equal(t('400'), '1:36');
  assert.equal(t('800'), '3:12');
  assert.equal(t('1k'), '4:00');
  assert.equal(t('2k'), '8:00');
  assert.equal(t('3k'), '12:00');
  assert.equal(t('5k'), '20:00');
  assert.equal(t('10k'), '40:00');
  assert.equal(t('hm'), '1:24:23');
  assert.equal(t('m'), '2:48:47');
});

test('finish time -> pace', () => {
  assert.equal(formatPace(paceFromTime(45 * 60, 10000)), '4:30');
  assert.equal(formatPace(paceFromTime(90 * 60, 21097.5)), '4:16');
  assert.equal(formatPace(paceFromTime(3 * 3600, 42195)), '4:16');
  assert.equal(formatPace(paceFromTime(80, 400)), '3:20');
  // Round trip keeps the exact time
  const pace = paceFromTime(45 * 60 + 30, 10000);
  assert.equal(formatTime(timeForDistance(pace, 10000)), '45:30');
});

test('formatting', () => {
  assert.equal(formatTime(59 * 60 + 59), '59:59');
  assert.equal(formatTime(3600), '1:00:00');
  assert.equal(formatTime(3661), '1:01:01');
  assert.equal(formatTime(5), '0:05');
  assert.deepEqual(splitTenths(15.04), { whole: 15, tenth: 0 });
  assert.deepEqual(splitTenths(14.96), { whole: 15, tenth: 0 });
  assert.deepEqual(splitTenths(12.35), { whole: 12, tenth: 4 });
  assert.deepEqual(splitHms(3661), { h: 1, m: 1, s: 1 });
});

test('clamping', () => {
  assert.equal(clampPace(10), PACE_MIN_SEC);
  assert.equal(clampPace(99999), PACE_MAX_SEC);
  assert.equal(clampPace(300), 300);
  assert.equal(clampPace(paceFromTime(10, 42195)), PACE_MIN_SEC);
  assert.equal(clampPace(paceFromSpeed(1, 'km')), PACE_MAX_SEC);
});

test('parsing', () => {
  assert.equal(parseTime('4:30'), 270);
  assert.equal(parseTime('1:30:00'), 5400);
  assert.equal(parseTime('90'), 90);
  assert.ok(Number.isNaN(parseTime('abc')));
  assert.ok(Number.isNaN(parseTime('1:2:3:4')));
  assert.equal(parseDecimal('15,5'), 15.5);
  assert.equal(parseDecimal('15.5'), 15.5);
  assert.ok(Number.isNaN(parseDecimal('x')));
});

test('distances table', () => {
  assert.deepEqual(
    DISTANCES.map((d) => d.id),
    ['400', '800', '1k', '1500', 'mi', '2k', '3k', '5k', '10k', 'hm', 'm'],
  );
  assert.equal(getDistance('1500').metres, 1500);
  near(getDistance('mi').metres, 1609.344, 0.001);
  assert.equal(getDistance('hm').metres, 21097.5);
  assert.equal(getDistance('m').metres, 42195);
  assert.equal(getDistance('nope'), null);
  assert.ok(isValidDistanceId(CUSTOM_ID));
  assert.ok(isValidDistanceId('10k'));
  assert.ok(!isValidDistanceId('nope'));
});

test('1500 m and mile at 4:00/km', () => {
  assert.equal(formatTime(timeForDistance(240, 1500)), '6:00');
  assert.equal(formatTime(timeForDistance(240, getDistance('mi').metres)), '6:26');
});

test('custom distance', () => {
  assert.equal(toMetres(6300, 'm'), 6300);
  assert.equal(toMetres(6.3, 'km'), 6300);
  near(toMetres(1, 'mi'), 1609.344, 0.001);
  near(fromMetres(6300, 'km'), 6.3, 1e-9);
  near(fromMetres(1609.344, 'mi'), 1, 1e-9);

  assert.equal(normaliseCustomMetres('6300'), 6300);
  assert.equal(normaliseCustomMetres(6300.4), 6300);
  assert.equal(normaliseCustomMetres(1), CUSTOM_MIN_METRES);
  assert.equal(normaliseCustomMetres(1e9), CUSTOM_MAX_METRES);
  assert.ok(Number.isNaN(normaliseCustomMetres('x')));
  assert.ok(Number.isNaN(normaliseCustomMetres(0)));
  assert.ok(Number.isNaN(normaliseCustomMetres(null)));

  assert.equal(formatDistance(6300, 'km', 'nb'), '6,3 km');
  assert.equal(formatDistance(6300, 'km', 'en'), '6.3 km');
  assert.equal(formatDistance(850, 'km', 'en'), '850 m');
  assert.equal(formatDistance(10000, 'km', 'en'), '10 km');
  assert.equal(formatDistance(21097.5, 'km', 'en'), '21.098 km');
  assert.equal(formatDistance(1609.344, 'mi', 'en'), '1 mi');
  assert.equal(formatDistance(7500, 'mi', 'nb'), '4,66 mi');

  // Relay leg: 6.3 km in 25:12 → 4:00/km
  assert.equal(formatPace(paceFromTime(25 * 60 + 12, toMetres(6.3, 'km'))), '4:00');
});
