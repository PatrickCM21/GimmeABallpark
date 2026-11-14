import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyUserStats,
  calculateBallparkCloseness,
  applyHomeRunToStats,
  applyNormalGameToStats,
} from '../../shared/types/stats.ts';

test('calculateBallparkCloseness computes accuracy and thresholds correctly', () => {
  // Spot on
  const spotOn = calculateBallparkCloseness(50, 50, 0, 100);
  assert.equal(spotOn.closenessPct, 100);
  assert.equal(spotOn.isSpotOn, true);
  assert.equal(spotOn.isWithin3Percent, true);

  // Within 3%
  const close = calculateBallparkCloseness(52, 50, 0, 100);
  assert.equal(close.closenessPct, 98);
  assert.equal(close.isSpotOn, false);
  assert.equal(close.isWithin3Percent, true);

  // Beyond 3%
  const further = calculateBallparkCloseness(70, 50, 0, 100);
  assert.equal(further.closenessPct, 80);
  assert.equal(further.isSpotOn, false);
  assert.equal(further.isWithin3Percent, false);

  // Large range (cost/count)
  const bigRange = calculateBallparkCloseness(55000, 50000, 0, 100000);
  assert.equal(bigRange.closenessPct, 95);
  assert.equal(bigRange.isWithin3Percent, false);
});

test('applyHomeRunToStats tracks homebases, 1st, 2nd, 3rd bases accurately', () => {
  let stats = createEmptyUserStats();

  // Round 1: 1st base (bases = 1)
  stats = applyHomeRunToStats(stats, 1);
  assert.equal(stats.homeRunGamesPlayed, 1);
  assert.equal(stats.firstBases, 1);
  assert.equal(stats.secondBases, 0);
  assert.equal(stats.thirdBases, 0);
  assert.equal(stats.homeBases, 0);

  // Round 2: 2nd base (bases = 2)
  stats = applyHomeRunToStats(stats, 2);
  assert.equal(stats.homeRunGamesPlayed, 2);
  assert.equal(stats.firstBases, 1);
  assert.equal(stats.secondBases, 1);
  assert.equal(stats.thirdBases, 0);
  assert.equal(stats.homeBases, 0);

  // Round 3: 3rd base (bases = 3)
  stats = applyHomeRunToStats(stats, 3);
  assert.equal(stats.homeRunGamesPlayed, 3);
  assert.equal(stats.firstBases, 1);
  assert.equal(stats.secondBases, 1);
  assert.equal(stats.thirdBases, 1);
  assert.equal(stats.homeBases, 0);

  // Round 4: Home Run / Homebase (bases = 4)
  stats = applyHomeRunToStats(stats, 4);
  assert.equal(stats.homeRunGamesPlayed, 4);
  assert.equal(stats.firstBases, 1);
  assert.equal(stats.secondBases, 1);
  assert.equal(stats.thirdBases, 1);
  assert.equal(stats.homeBases, 1);

  // Strikeout on round 1 (bases = 0)
  stats = applyHomeRunToStats(stats, 0);
  assert.equal(stats.homeRunGamesPlayed, 5);
  assert.equal(stats.strikeouts, 1);
  assert.equal(stats.homeBases, 1);
});

test('applyNormalGameToStats tracks games played and running average closeness', () => {
  let stats = createEmptyUserStats();

  // Game 1: 90% close, beat hivemind
  const closeness1 = calculateBallparkCloseness(60, 50, 0, 100);
  stats = applyNormalGameToStats(stats, closeness1, true);
  assert.equal(stats.normalGamesPlayed, 1);
  assert.equal(stats.avgClosenessPct, 90);
  assert.equal(stats.beatHivemind, 1);
  assert.equal(stats.exactBullseyes, 0);

  // Game 2: 100% close (bullseye)
  const closeness2 = calculateBallparkCloseness(50, 50, 0, 100);
  stats = applyNormalGameToStats(stats, closeness2, true);
  assert.equal(stats.normalGamesPlayed, 2);
  // (90 + 100) / 2 = 95
  assert.equal(stats.avgClosenessPct, 95);
  assert.equal(stats.exactBullseyes, 1);
  assert.equal(stats.withinThreePercent, 1);
  assert.equal(stats.beatHivemind, 2);
});
