import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp,
  computeCvStateFromProgress,
  computeRestoreFromProgress,
  computeTrackFill,
  computeWeatherHourFromProgress,
  formatHourToTime,
  getSolarConditions,
  INDOOR_TEMPS,
  OUTDOOR_TEMPS,
  sampleTemperature,
} from './demos';

test('clamp constrains values to range', () => {
  assert.equal(clamp(-0.5, 0, 1), 0);
  assert.equal(clamp(0.4, 0, 1), 0.4);
  assert.equal(clamp(1.8, 0, 1), 1);
});

test('computeCvStateFromProgress transitions smoothly through compact, balanced, and airy', () => {
  const start = computeCvStateFromProgress(0);
  assert.equal(start.preset, 'compact');
  assert.equal(start.font, 10.5);
  assert.equal(start.margin, 20);

  const mid = computeCvStateFromProgress(0.5);
  assert.equal(mid.preset, 'balanced');
  assert.equal(mid.font, 10.8);
  assert.equal(mid.line, 1.58);

  const end = computeCvStateFromProgress(1);
  assert.equal(end.preset, 'airy');
  assert.equal(end.font, 11.2);
  assert.equal(end.margin, 24);
});

test('computeTrackFill calculates percentage accurately', () => {
  assert.equal(computeTrackFill(11, 10, 12), 50);
  assert.equal(computeTrackFill(10, 10, 12), 0);
  assert.equal(computeTrackFill(12, 10, 12), 100);
});

test('computeRestoreFromProgress and staggered desktop timing', () => {
  assert.equal(computeRestoreFromProgress(0, false), 20);
  assert.equal(computeRestoreFromProgress(1, false), 92);
  // Staggered desktop mode completes restore around 61% progress
  assert.equal(computeRestoreFromProgress(0.65, true), 92);
  // Weather staggered desktop mode starts at 32% progress
  assert.equal(computeWeatherHourFromProgress(0.25, true), 0);
  assert.equal(computeWeatherHourFromProgress(0.96, true), 24);
});

test('sampleTemperature and formatHourToTime return accurate readings at integer and fractional hours', () => {
  assert.equal(formatHourToTime(0), '00:00');
  assert.equal(formatHourToTime(14), '14:00');
  assert.equal(formatHourToTime(24), '24:00');

  assert.equal(Number(sampleTemperature(INDOOR_TEMPS, 14).toFixed(1)), 28.2);
  assert.equal(Number(sampleTemperature(OUTDOOR_TEMPS, 14).toFixed(1)), 35.8);
});

test('getSolarConditions returns distinct palettes across morning, midday, dusk, and night', () => {
  const morning = getSolarConditions(7);
  const midday = getSolarConditions(13);
  const dusk = getSolarConditions(17.5);
  const night = getSolarConditions(22);

  assert.equal(morning.paperTone, '#f5f2ea');
  assert.equal(midday.paperTone, '#f3f0e7');
  assert.equal(dusk.paperTone, '#f2ece0');
  assert.equal(night.paperTone, '#eee8da');
});
