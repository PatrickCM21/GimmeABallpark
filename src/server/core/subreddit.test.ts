import test from 'node:test';
import assert from 'node:assert/strict';
import { isDevSubreddit } from './subreddit.ts';

test('isDevSubreddit identifies dev subreddits correctly', () => {
  // Direct dev server names
  assert.equal(isDevSubreddit('gimmeaballpark_dev'), true);
  assert.equal(isDevSubreddit('gimmeaballparkdev'), true);
  assert.equal(isDevSubreddit('r/gimmeaballpark_dev'), true);
  assert.equal(isDevSubreddit('/r/gimmeaballpark_dev'), true);

  // Suffix patterns
  assert.equal(isDevSubreddit('mytest_dev'), true);
  assert.equal(isDevSubreddit('mytest-dev'), true);
  assert.equal(isDevSubreddit('ballpark_dev'), true);
  assert.equal(isDevSubreddit('ballparkdev'), true);

  // Case insensitivity
  assert.equal(isDevSubreddit('GimmeABallpark_Dev'), true);
  assert.equal(isDevSubreddit('GimmeABallparkDev'), true);

  // Production subreddits
  assert.equal(isDevSubreddit('gimmeaballpark'), false);
  assert.equal(isDevSubreddit('r/gimmeaballpark'), false);
  assert.equal(isDevSubreddit('askreddit'), false);
  assert.equal(isDevSubreddit(''), false);
  assert.equal(isDevSubreddit(undefined), false);
});
