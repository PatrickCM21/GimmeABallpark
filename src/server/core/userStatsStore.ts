import { redis } from '@devvit/web/server';
import type { UserLifetimeStats } from '../../shared/types/stats';
import {
  createEmptyUserStats,
  calculateBallparkCloseness,
  applyHomeRunToStats,
  applyNormalGameToStats,
} from '../../shared/types/stats';

const cleanId = (postId: string): string => postId.replace('t3_', '');
const normalizeUser = (username: string): string => username.trim().toLowerCase();

export const userStatsKeys = {
  stats: (username: string) => `user:${normalizeUser(username)}:lifetimeStats`,
  postRecorded: (postId: string, username: string) =>
    `post:${cleanId(postId)}:user:${normalizeUser(username)}:recordedStats`,
  homeRunRecorded: (postId: string, username: string) =>
    `homerun:${cleanId(postId)}:user:${normalizeUser(username)}:recordedStats`,
} as const;

export const loadUserStats = async (username: string): Promise<UserLifetimeStats> => {
  if (!username) return createEmptyUserStats();
  const raw = await redis.get(userStatsKeys.stats(username));
  if (!raw) return createEmptyUserStats();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return createEmptyUserStats();
    const p = parsed as Record<string, unknown>;
    return {
      homeBases: typeof p.homeBases === 'number' ? p.homeBases : 0,
      thirdBases: typeof p.thirdBases === 'number' ? p.thirdBases : 0,
      secondBases: typeof p.secondBases === 'number' ? p.secondBases : 0,
      firstBases: typeof p.firstBases === 'number' ? p.firstBases : 0,
      strikeouts: typeof p.strikeouts === 'number' ? p.strikeouts : 0,
      homeRunGamesPlayed: typeof p.homeRunGamesPlayed === 'number' ? p.homeRunGamesPlayed : 0,
      normalGamesPlayed: typeof p.normalGamesPlayed === 'number' ? p.normalGamesPlayed : 0,
      totalClosenessPct: typeof p.totalClosenessPct === 'number' ? p.totalClosenessPct : 0,
      avgClosenessPct: typeof p.avgClosenessPct === 'number' ? p.avgClosenessPct : 0,
      exactBullseyes: typeof p.exactBullseyes === 'number' ? p.exactBullseyes : 0,
      withinThreePercent: typeof p.withinThreePercent === 'number' ? p.withinThreePercent : 0,
      beatHivemind: typeof p.beatHivemind === 'number' ? p.beatHivemind : 0,
    };
  } catch {
    return createEmptyUserStats();
  }
};

/**
 * Records the outcome of a finished Home Run game for this user.
 * Guarantees that each post is only recorded once per user.
 */
export const recordHomeRunStats = async (
  postId: string,
  username: string,
  bases: number
): Promise<UserLifetimeStats> => {
  if (!username) return createEmptyUserStats();
  const recordedKey = userStatsKeys.homeRunRecorded(postId, username);
  const alreadyRecorded = await redis.get(recordedKey);
  if (alreadyRecorded) {
    return loadUserStats(username);
  }

  await redis.set(recordedKey, '1');

  const current = await loadUserStats(username);
  const updated = applyHomeRunToStats(current, bases);

  await redis.set(userStatsKeys.stats(username), JSON.stringify(updated));
  return updated;
};

/**
 * Records a normal Gimme a Ballpark guess and updates lifetime closeness & games.
 * Guarantees each post is recorded at most once per user.
 */
export const recordNormalBallparkStats = async (
  postId: string,
  username: string,
  guess: number,
  answer: number,
  min: number,
  max: number,
  closerThanMajority: boolean
): Promise<UserLifetimeStats> => {
  if (!username) return createEmptyUserStats();
  const recordedKey = userStatsKeys.postRecorded(postId, username);
  const alreadyRecorded = await redis.get(recordedKey);
  if (alreadyRecorded) {
    return loadUserStats(username);
  }

  await redis.set(recordedKey, '1');

  const current = await loadUserStats(username);
  const closeness = calculateBallparkCloseness(guess, answer, min, max);
  const updated = applyNormalGameToStats(current, closeness, closerThanMajority);

  await redis.set(userStatsKeys.stats(username), JSON.stringify(updated));
  return updated;
};

export const clearHomeRunRecorded = async (postId: string, username: string): Promise<void> => {
  if (!username) return;
  await redis.del(userStatsKeys.homeRunRecorded(postId, username));
};

export const clearNormalBallparkRecorded = async (postId: string, username: string): Promise<void> => {
  if (!username) return;
  await redis.del(userStatsKeys.postRecorded(postId, username));
};
