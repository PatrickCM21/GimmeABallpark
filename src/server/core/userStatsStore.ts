import { redis } from '@devvit/web/server';
import type { UserLifetimeStats } from '../../shared/types/stats';
import {
  createEmptyUserStats,
  calculateBallparkCloseness,
  applyHomeRunToStats,
  applyNormalGameToStats,
  calculateTotalBases,
} from '../../shared/types/stats';
import type { BatId, BallId, ShopCategory } from '../../shared/types/shop';
import {
  getBatItemById,
  isValidBatId,
  getBallItemById,
  isValidBallId,
  sumOwnedShopCost,
} from '../../shared/types/shop';
import { ensureWeeklyBaseInitialized, syncUserLeaderboard } from './leaderboard';

const cleanId = (postId: string): string => postId.replace('t3_', '');
const normalizeUser = (username: string): string => username.trim().toLowerCase();

export const userStatsKeys = {
  stats: (username: string) => `user:${normalizeUser(username)}:lifetimeStats`,
  postRecorded: (postId: string, username: string) =>
    `post:${cleanId(postId)}:user:${normalizeUser(username)}:recordedStats`,
  homeRunRecorded: (postId: string, username: string) =>
    `homerun:${cleanId(postId)}:user:${normalizeUser(username)}:recordedStats`,
  ownedBats: (username: string) => `homerun:user:${normalizeUser(username)}:owned_bats`,
  equippedBat: (username: string) => `homerun:user:${normalizeUser(username)}:equipped_bat`,
  ownedBalls: (username: string) => `homerun:user:${normalizeUser(username)}:owned_balls`,
  equippedBall: (username: string) => `homerun:user:${normalizeUser(username)}:equipped_ball`,
  bonusBases: (username: string) => `homerun:user:${normalizeUser(username)}:bonus_bases`,
} as const;

export const parseOwnedBats = (raw?: string | null): BatId[] => {
  const result: BatId[] = ['default'];
  if (!raw) return result;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === 'string' && isValidBatId(item) && !result.includes(item)) {
          result.push(item);
        }
      }
    }
  } catch {
    // ignore invalid json
  }
  return result;
};

export const parseEquippedBat = (raw?: string | null): BatId => {
  if (raw && isValidBatId(raw)) {
    return raw;
  }
  return 'default';
};

export const parseOwnedBalls = (raw?: string | null): BallId[] => {
  const result: BallId[] = ['default'];
  if (!raw) return result;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === 'string' && isValidBallId(item) && !result.includes(item)) {
          result.push(item);
        }
      }
    }
  } catch {
    // ignore invalid json
  }
  return result;
};

export const parseEquippedBall = (raw?: string | null): BallId => {
  if (raw && isValidBallId(raw)) {
    return raw;
  }
  return 'default';
};

export const loadUserBatShopState = async (
  username: string,
  existingStats?: UserLifetimeStats
): Promise<{
  userBases: number;
  equippedBat: BatId;
  ownedBats: BatId[];
  equippedBall: BallId;
  ownedBalls: BallId[];
  lifetimeStats: UserLifetimeStats;
}> => {
  const lifetimeStats = existingStats ?? (await loadUserStats(username));
  if (!username || username === 'anonymous') {
    return {
      userBases: Math.max(0, calculateTotalBases(lifetimeStats)),
      equippedBat: 'default',
      ownedBats: ['default'],
      equippedBall: 'default',
      ownedBalls: ['default'],
      lifetimeStats,
    };
  }

  const [ownedBatsRaw, equippedBatRaw, ownedBallsRaw, equippedBallRaw, bonusRaw] = await redis.mGet([
    userStatsKeys.ownedBats(username),
    userStatsKeys.equippedBat(username),
    userStatsKeys.ownedBalls(username),
    userStatsKeys.equippedBall(username),
    userStatsKeys.bonusBases(username),
  ]);

  const ownedBats = parseOwnedBats(ownedBatsRaw);
  const equippedBat = parseEquippedBat(equippedBatRaw);
  const ownedBalls = parseOwnedBalls(ownedBallsRaw);
  const equippedBall = parseEquippedBall(equippedBallRaw);
  const bonusBases = bonusRaw ? parseInt(bonusRaw, 10) || 0 : 0;
  const totalEarnedBases = Math.max(0, calculateTotalBases(lifetimeStats) + bonusBases);
  const spentBases = sumOwnedShopCost(ownedBats, ownedBalls);
  const userBases = Math.max(0, totalEarnedBases - spentBases);

  return {
    userBases,
    equippedBat,
    ownedBats,
    equippedBall,
    ownedBalls,
    lifetimeStats,
  };
};

const resolveShopCategory = (itemId: string, category?: ShopCategory): ShopCategory => {
  if (category === 'ball' || category === 'bat') return category;
  if (itemId !== 'default' && getBallItemById(itemId)) return 'ball';
  return 'bat';
};

export const buyBatItem = async (
  username: string,
  itemId: string,
  category?: ShopCategory
): Promise<
  | {
      success: true;
      bases: number;
      equippedBat: BatId;
      ownedBats: BatId[];
      equippedBall: BallId;
      ownedBalls: BallId[];
      lifetimeStats: UserLifetimeStats;
    }
  | {
      success: false;
      error: string;
    }
> => {
  if (!username || username === 'anonymous') {
    return { success: false, error: 'Log in to purchase items' };
  }

  const resolvedCategory = resolveShopCategory(itemId, category);

  if (resolvedCategory === 'ball') {
    const ballItem = getBallItemById(itemId);
    if (!ballItem) {
      return { success: false, error: 'Ball not found' };
    }

    const state = await loadUserBatShopState(username);

    if (state.ownedBalls.includes(ballItem.id)) {
      await Promise.all([
        redis.set(userStatsKeys.equippedBall(username), ballItem.id),
        redis.set(`homerun:user:${username}:equipped_ball`, ballItem.id),
      ]);
      return {
        success: true,
        bases: state.userBases,
        equippedBat: state.equippedBat,
        ownedBats: state.ownedBats,
        equippedBall: ballItem.id,
        ownedBalls: state.ownedBalls,
        lifetimeStats: state.lifetimeStats,
      };
    }

    if (state.userBases < ballItem.price) {
      return { success: false, error: 'Not enough bases' };
    }

    const updatedOwnedBalls: BallId[] = [...state.ownedBalls, ballItem.id];
    const newBases = Math.max(0, state.userBases - ballItem.price);

    await Promise.all([
      redis.set(userStatsKeys.ownedBalls(username), JSON.stringify(updatedOwnedBalls)),
      redis.set(userStatsKeys.equippedBall(username), ballItem.id),
      redis.set(`homerun:user:${username}:equipped_ball`, ballItem.id),
    ]);

    return {
      success: true,
      bases: newBases,
      equippedBat: state.equippedBat,
      ownedBats: state.ownedBats,
      equippedBall: ballItem.id,
      ownedBalls: updatedOwnedBalls,
      lifetimeStats: state.lifetimeStats,
    };
  }

  const item = getBatItemById(itemId);
  if (!item) {
    return { success: false, error: 'Bat not found' };
  }

  const state = await loadUserBatShopState(username);

  // If already owned, simply equip it and return current balance (matches trolley problem store logic)
  if (state.ownedBats.includes(item.id)) {
    await Promise.all([
      redis.set(userStatsKeys.equippedBat(username), item.id),
      redis.set(`homerun:user:${username}:equipped_bat`, item.id),
    ]);
    return {
      success: true,
      bases: state.userBases,
      equippedBat: item.id,
      ownedBats: state.ownedBats,
      equippedBall: state.equippedBall,
      ownedBalls: state.ownedBalls,
      lifetimeStats: state.lifetimeStats,
    };
  }

  if (state.userBases < item.price) {
    return { success: false, error: 'Not enough bases' };
  }

  const updatedOwned: BatId[] = [...state.ownedBats, item.id];
  const newBases = Math.max(0, state.userBases - item.price);

  await Promise.all([
    redis.set(userStatsKeys.ownedBats(username), JSON.stringify(updatedOwned)),
    redis.set(userStatsKeys.equippedBat(username), item.id),
    redis.set(`homerun:user:${username}:equipped_bat`, item.id),
  ]);

  return {
    success: true,
    bases: newBases,
    equippedBat: item.id,
    ownedBats: updatedOwned,
    equippedBall: state.equippedBall,
    ownedBalls: state.ownedBalls,
    lifetimeStats: state.lifetimeStats,
  };
};

export const equipBatItem = async (
  username: string,
  itemId: string,
  isDev: boolean = false,
  category?: ShopCategory
): Promise<
  | { success: true; equippedBat: BatId; equippedBall: BallId }
  | { success: false; error: string }
> => {
  if (!username || username === 'anonymous') {
    return { success: false, error: 'Log in to equip items' };
  }

  const resolvedCategory = resolveShopCategory(itemId, category);

  if (resolvedCategory === 'ball') {
    const ballItem = getBallItemById(itemId);
    if (!ballItem) {
      return { success: false, error: 'Ball not found' };
    }

    const [ownedBallsRaw, equippedBatRaw] = await redis.mGet([
      userStatsKeys.ownedBalls(username),
      userStatsKeys.equippedBat(username),
    ]);
    const ownedBalls = parseOwnedBalls(ownedBallsRaw);
    const equippedBat = parseEquippedBat(equippedBatRaw);

    if (!isDev && !ownedBalls.includes(ballItem.id) && ballItem.id !== 'default') {
      return { success: false, error: 'Ball not owned' };
    }

    await Promise.all([
      redis.set(userStatsKeys.equippedBall(username), ballItem.id),
      redis.set(`homerun:user:${username}:equipped_ball`, ballItem.id),
    ]);

    return {
      success: true,
      equippedBat,
      equippedBall: ballItem.id,
    };
  }

  const item = getBatItemById(itemId);
  if (!item) {
    return { success: false, error: 'Bat not found' };
  }

  const [ownedRaw, equippedBallRaw] = await redis.mGet([
    userStatsKeys.ownedBats(username),
    userStatsKeys.equippedBall(username),
  ]);
  const ownedBats = parseOwnedBats(ownedRaw);
  const equippedBall = parseEquippedBall(equippedBallRaw);

  if (!isDev && !ownedBats.includes(item.id) && item.id !== 'default') {
    return { success: false, error: 'Bat not owned' };
  }

  await Promise.all([
    redis.set(userStatsKeys.equippedBat(username), item.id),
    redis.set(`homerun:user:${username}:equipped_bat`, item.id),
  ]);

  return {
    success: true,
    equippedBat: item.id,
    equippedBall,
  };
};

export const addDevBonusBases = async (username: string, delta: number): Promise<number> => {
  if (!username || username === 'anonymous') return 0;
  await redis.incrBy(userStatsKeys.bonusBases(username), delta);
  const state = await loadUserBatShopState(username);
  return state.userBases;
};

export const resetOwnedBats = async (
  username: string
): Promise<{
  bases: number;
  equippedBat: BatId;
  ownedBats: BatId[];
  equippedBall: BallId;
  ownedBalls: BallId[];
}> => {
  if (!username || username === 'anonymous') {
    return {
      bases: 0,
      equippedBat: 'default',
      ownedBats: ['default'],
      equippedBall: 'default',
      ownedBalls: ['default'],
    };
  }
  await Promise.all([
    redis.del(userStatsKeys.ownedBats(username)),
    redis.set(userStatsKeys.equippedBat(username), 'default'),
    redis.set(`homerun:user:${username}:equipped_bat`, 'default'),
    redis.del(userStatsKeys.ownedBalls(username)),
    redis.set(userStatsKeys.equippedBall(username), 'default'),
    redis.set(`homerun:user:${username}:equipped_ball`, 'default'),
  ]);
  const state = await loadUserBatShopState(username);
  return {
    bases: state.userBases,
    equippedBat: state.equippedBat,
    ownedBats: state.ownedBats,
    equippedBall: state.equippedBall,
    ownedBalls: state.ownedBalls,
  };
};

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
  bases: number,
  snoovatarUrl?: string | undefined
): Promise<UserLifetimeStats> => {
  if (!username) return createEmptyUserStats();
  const recordedKey = userStatsKeys.homeRunRecorded(postId, username);
  const alreadyRecorded = await redis.get(recordedKey);
  if (alreadyRecorded) {
    const existing = await loadUserStats(username);
    void syncUserLeaderboard(username, snoovatarUrl).catch((err) =>
      console.warn('Could not sync leaderboard on existing stats:', err)
    );
    return existing;
  }

  await redis.set(recordedKey, '1');

  const current = await loadUserStats(username);
  await ensureWeeklyBaseInitialized(username, calculateTotalBases(current));
  const updated = applyHomeRunToStats(current, bases);

  await redis.set(userStatsKeys.stats(username), JSON.stringify(updated));
  await syncUserLeaderboard(username, snoovatarUrl);
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
