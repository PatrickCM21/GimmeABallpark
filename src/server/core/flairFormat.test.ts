import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBaseScoreFlairText,
  getBaseScoreTier,
  isFlairEligibleUsername,
} from './flairFormat.ts';

test('getBaseScoreTier maps base thresholds to expected tier labels', () => {
  assert.equal(getBaseScoreTier(0).label, 'Rookie');
  assert.equal(getBaseScoreTier(9).label, 'Rookie');
  assert.equal(getBaseScoreTier(10).label, 'Slugger');
  assert.equal(getBaseScoreTier(49).label, 'Slugger');
  assert.equal(getBaseScoreTier(50).label, 'Heavy Hitter');
  assert.equal(getBaseScoreTier(99).label, 'Heavy Hitter');
  assert.equal(getBaseScoreTier(100).label, 'All-Star');
  assert.equal(getBaseScoreTier(299).label, 'All-Star');
  assert.equal(getBaseScoreTier(300).label, 'Hall of Famer');
  assert.equal(getBaseScoreTier(500).label, 'Hall of Famer');
});

test('formatBaseScoreFlairText formats total bases with tier word and handles edge values', () => {
  assert.equal(formatBaseScoreFlairText(0), '⚾ 0 Bases · Rookie');
  assert.equal(formatBaseScoreFlairText(1), '⚾ 1 Base · Rookie');
  assert.equal(formatBaseScoreFlairText(10), '⚾ 10 Bases · Slugger');
  assert.equal(formatBaseScoreFlairText(75), '⚾ 75 Bases · Heavy Hitter');
  assert.equal(formatBaseScoreFlairText(150), '⚾ 150 Bases · All-Star');
  assert.equal(formatBaseScoreFlairText(320), '⚾ 320 Bases · Hall of Famer');

  // Edge cases: negative, fractional, non-finite
  assert.equal(formatBaseScoreFlairText(-5), '⚾ 0 Bases · Rookie');
  assert.equal(formatBaseScoreFlairText(3.8), '⚾ 3 Bases · Rookie');
  assert.equal(formatBaseScoreFlairText(Number.NaN), '⚾ 0 Bases · Rookie');
});

test('isFlairEligibleUsername filters out invalid, anonymous, and user IDs', () => {
  assert.equal(isFlairEligibleUsername('Slugger_Sam'), true);
  assert.equal(isFlairEligibleUsername('u_test'), true);

  assert.equal(isFlairEligibleUsername(undefined), false);
  assert.equal(isFlairEligibleUsername(''), false);
  assert.equal(isFlairEligibleUsername('   '), false);
  assert.equal(isFlairEligibleUsername('anonymous'), false);
  assert.equal(isFlairEligibleUsername('Anonymous'), false);
  assert.equal(isFlairEligibleUsername('t2_abc123'), false);
});
