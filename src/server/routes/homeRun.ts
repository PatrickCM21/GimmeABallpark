import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import { findHomeRunLadder } from '../../shared/data/homeRunLadders';
import {
  HOME_RUN_TIME_LIMIT_MS,
  buildReveal,
  countBases,
  isRoundExpired,
  isRunFinished,
  judgePick,
  parseHomeRunPostData,
  recordOutcome,
  startRound,
  toPublicMatchups,
  toPublicProgress,
} from '../../shared/homeRun/engine';
import type {
  HomeRunAnswerRequest,
  HomeRunAnswerResponse,
  HomeRunErrorResponse,
  HomeRunExtrasResponse,
  HomeRunGameState,
  HomeRunLadder,
  HomeRunPracticeAnswerResponse,
  HomeRunStartResponse,
  HomeRunStoredProgress,
} from '../../shared/types/homeRun';
import {
  addAudienceMember,
  clearProgress,
  homeRunKeys,
  loadAudience,
  loadProgress,
  loadRoundStats,
  recordRoundResult,
  saveProgress,
} from '../core/homeRunStore';
import { isDevSubreddit } from '../core/subreddit';
import {
  loadUserStats,
  recordHomeRunStats,
  clearHomeRunRecorded,
  loadUserBatShopState,
  buyBatItem,
  equipBatItem,
  addDevBonusBases,
  resetOwnedBats,
} from '../core/userStatsStore';
import { getLeaderboard } from '../core/leaderboard';
import { syncUserBaseFlair } from '../core/flair';
import { calculateTotalBases } from '../../shared/types/stats';
import type { UserLifetimeStats } from '../../shared/types/stats';
import type { ShopBuyRequest, ShopBuyResponse, ShopEquipRequest, ShopEquipResponse } from '../../shared/types/shop';
import type { LeaderboardPeriod, LeaderboardResponse } from '../../shared/types/leaderboard';

export const homeRun = new Hono();

/** Resolves the ladder for the current post from postData, falling back to Redis. */
const getLadderForPost = async (postId: string): Promise<{ ladder: HomeRunLadder; puzzleNumber: number } | undefined> => {
  const postData = parseHomeRunPostData(context.postData);
  if (postData) {
    const ladder = findHomeRunLadder(postData.ladderId);
    return ladder ? { ladder, puzzleNumber: postData.puzzleNumber } : undefined;
  }
  const storedId = await redis.get(homeRunKeys.ladder(postId));
  const ladder = storedId ? findHomeRunLadder(storedId) : undefined;
  return ladder ? { ladder, puzzleNumber: 1 } : undefined;
};

/** If the player walked away and the round's timer lapsed, lock in a timeout. */
const settleExpiredRound = async (
  postId: string,
  username: string,
  progress: HomeRunStoredProgress,
  now: number
): Promise<HomeRunStoredProgress> => {
  if (isRunFinished(progress.outcomes) || !isRoundExpired(progress, now)) return progress;
  const settled = recordOutcome(progress, 'timeout', now);
  await Promise.all([
    saveProgress(postId, username, settled),
    recordRoundResult(postId, progress.outcomes.length, 'timeout'),
  ]);
  return settled;
};

export type HomeRunPlayerContext = {
  postId: string;
  username: string;
  ladder: HomeRunLadder;
  puzzleNumber: number;
};

export const getHomeRunPlayerContext = async (): Promise<HomeRunPlayerContext | HomeRunErrorResponse> => {
  const { postId } = context;
  if (!postId) return { error: 'postId missing' };

  const [username, found] = await Promise.all([reddit.getCurrentUsername(), getLadderForPost(postId)]);
  if (!username) return { error: 'Log in to play Home Run' };
  if (!found) return { error: 'This post has no Home Run ladder configured' };

  return { postId, username, ...found };
};

export const isHomeRunContextError = (
  value: HomeRunPlayerContext | HomeRunErrorResponse
): value is HomeRunErrorResponse => 'error' in value;

const isValidAnswerRequest = (value: unknown): value is HomeRunAnswerRequest => {
  if (typeof value !== 'object' || value === null) return false;
  if (!('round' in value) || typeof value.round !== 'number') return false;
  return 'pick' in value && (value.pick === 'a' || value.pick === 'b' || value.pick === null);
};

const fetchSnoovatarSafe = async (username: string): Promise<string | undefined> => {
  try {
    return await reddit.getSnoovatarUrl(username);
  } catch (e) {
    console.warn('Could not load snoovatar:', e);
    return undefined;
  }
};

/**
 * Builds the initial Home Run state.
 * For active/new runs, defers snoovatar, audience, round stats, and lifetime stats
 * to /api/home-run/extras so the player can enter the game immediately.
 */
export const buildHomeRunInitialState = async (player: HomeRunPlayerContext): Promise<HomeRunGameState> => {
  const now = Date.now();
  const progress = await settleExpiredRound(
    player.postId,
    player.username,
    await loadProgress(player.postId, player.username),
    now
  );

  if (!isRunFinished(progress.outcomes)) {
    const shopState = await loadUserBatShopState(player.username);
    return {
      ladderTitle: player.ladder.title,
      puzzleNumber: player.puzzleNumber,
      rounds: toPublicMatchups(player.ladder),
      progress: toPublicProgress(progress, now),
      stats: [],
      timeLimitMs: HOME_RUN_TIME_LIMIT_MS,
      username: player.username,
      canReset: isDevSubreddit(),
      lifetimeStats: shopState.lifetimeStats,
      userBases: shopState.userBases,
      equippedBat: shopState.equippedBat,
      ownedBats: shopState.ownedBats,
      equippedBall: shopState.equippedBall,
      ownedBalls: shopState.ownedBalls,
    };
  }

  const [snoovatarUrl, audience, stats] = await Promise.all([
    fetchSnoovatarSafe(player.username),
    loadAudience(player.postId),
    loadRoundStats(player.postId),
  ]);

  if (progress.outcomes.length > 0) {
    void addAudienceMember(player.postId, player.username, snoovatarUrl);
  }

  try {
    await recordHomeRunStats(player.postId, player.username, countBases(progress.outcomes), snoovatarUrl);
  } catch (err) {
    console.warn('Could not record Home Run lifetime stats in /state:', err);
  }
  const lifetimeStats = await loadUserStats(player.username);
  const shopState = await loadUserBatShopState(player.username, lifetimeStats);
  void syncUserBaseFlair(player.username, calculateTotalBases(lifetimeStats));

  return {
    ladderTitle: player.ladder.title,
    puzzleNumber: player.puzzleNumber,
    rounds: toPublicMatchups(player.ladder),
    reveals: player.ladder.rounds.map(buildReveal),
    progress: toPublicProgress(progress, now),
    stats,
    timeLimitMs: HOME_RUN_TIME_LIMIT_MS,
    username: player.username,
    snoovatarUrl,
    audience,
    canReset: isDevSubreddit(),
    lifetimeStats,
    userBases: shopState.userBases,
    equippedBat: shopState.equippedBat,
    ownedBats: shopState.ownedBats,
    equippedBall: shopState.equippedBall,
    ownedBalls: shopState.ownedBalls,
  };
};

homeRun.get('/state', async (c) => {
  try {
    const player = await getHomeRunPlayerContext();
    if (isHomeRunContextError(player)) return c.json<HomeRunErrorResponse>(player, 400);

    return c.json<HomeRunGameState>(await buildHomeRunInitialState(player));
  } catch (error: unknown) {
    console.error('API /home-run/state Error:', error);
    return c.json<HomeRunErrorResponse>({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

/** Fetches non-blocking extras (snoovatar, stadium audience, round stats, lifetime stats) asynchronously. */
homeRun.get('/extras', async (c) => {
  try {
    const player = await getHomeRunPlayerContext();
    if (isHomeRunContextError(player)) return c.json<HomeRunErrorResponse>(player, 400);

    const [snoovatarUrl, audience, stats, lifetimeStats, progress] = await Promise.all([
      fetchSnoovatarSafe(player.username),
      loadAudience(player.postId),
      loadRoundStats(player.postId),
      loadUserStats(player.username),
      loadProgress(player.postId, player.username),
    ]);

    if (progress.outcomes.length > 0) {
      void addAudienceMember(player.postId, player.username, snoovatarUrl);
    }
    const shopState = await loadUserBatShopState(player.username, lifetimeStats);
    void syncUserBaseFlair(player.username, calculateTotalBases(lifetimeStats));

    return c.json<HomeRunExtrasResponse>({
      snoovatarUrl,
      audience,
      stats,
      lifetimeStats,
      userBases: shopState.userBases,
      equippedBat: shopState.equippedBat,
      ownedBats: shopState.ownedBats,
      equippedBall: shopState.equippedBall,
      ownedBalls: shopState.ownedBalls,
    });
  } catch (error: unknown) {
    console.error('API /home-run/extras Error:', error);
    return c.json<HomeRunErrorResponse>({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

homeRun.post('/start', async (c) => {
  try {
    const player = await getHomeRunPlayerContext();
    if (isHomeRunContextError(player)) return c.json<HomeRunErrorResponse>(player, 400);

    const now = Date.now();
    const current = await settleExpiredRound(
      player.postId,
      player.username,
      await loadProgress(player.postId, player.username),
      now
    );
    const started = startRound(current, now);
    if (started !== current) await saveProgress(player.postId, player.username, started);

    // Record player into stadium audience as soon as they start playing
    void (async () => {
      try {
        let url: string | undefined;
        try {
          url = await reddit.getSnoovatarUrl(player.username);
        } catch {
          // ignore
        }
        await addAudienceMember(player.postId, player.username, url);
      } catch {
        // ignore
      }
    })();

    return c.json<HomeRunStartResponse>({ progress: toPublicProgress(started, now) });
  } catch (error: unknown) {
    console.error('API /home-run/start Error:', error);
    return c.json<HomeRunErrorResponse>({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

homeRun.post('/answer', async (c) => {
  try {
    const player = await getHomeRunPlayerContext();
    if (isHomeRunContextError(player)) return c.json<HomeRunErrorResponse>(player, 400);

    const body: unknown = await c.req.json();
    if (!isValidAnswerRequest(body)) return c.json<HomeRunErrorResponse>({ error: 'Invalid answer' }, 400);

    const now = Date.now();
    const current = await loadProgress(player.postId, player.username);
    if (isRunFinished(current.outcomes)) return c.json<HomeRunErrorResponse>({ error: 'Run already finished' }, 409);

    const roundIndex = current.outcomes.length;
    if (body.round !== roundIndex) return c.json<HomeRunErrorResponse>({ error: 'Wrong round' }, 409);

    const matchup = player.ladder.rounds[roundIndex];
    if (!matchup) return c.json<HomeRunErrorResponse>({ error: 'Round not found' }, 400);

    const outcome = isRoundExpired(current, now) ? 'timeout' : judgePick(matchup, body.pick);
    const next = recordOutcome(current, outcome, now);

    await Promise.all([
      saveProgress(player.postId, player.username, next),
      recordRoundResult(player.postId, roundIndex, outcome),
    ]);

    // Record player into stadium audience
    void (async () => {
      try {
        let url: string | undefined;
        try {
          url = await reddit.getSnoovatarUrl(player.username);
        } catch {
          // ignore
        }
        await addAudienceMember(player.postId, player.username, url);
      } catch {
        // ignore
      }
    })();

    let lifetimeStats: UserLifetimeStats | undefined;
    let userBases: number | undefined;
    const finished = isRunFinished(next.outcomes);
    if (finished) {
      try {
        lifetimeStats = await recordHomeRunStats(player.postId, player.username, countBases(next.outcomes));
        const shopState = await loadUserBatShopState(player.username, lifetimeStats);
        userBases = shopState.userBases;
      } catch (err) {
        console.warn('Could not record Home Run lifetime stats in /answer:', err);
      }
    }

    return c.json<HomeRunAnswerResponse>({
      outcome,
      reveal: buildReveal(matchup),
      reveals: finished ? player.ladder.rounds.map(buildReveal) : undefined,
      progress: toPublicProgress(next, now),
      stats: await loadRoundStats(player.postId),
      lifetimeStats,
      userBases,
    });
  } catch (error: unknown) {
    console.error('API /home-run/answer Error:', error);
    return c.json<HomeRunErrorResponse>({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

/** Practice replay after finishing the official run: grades picks without saving progress or stats. */
homeRun.post('/practice-answer', async (c) => {
  try {
    const player = await getHomeRunPlayerContext();
    if (isHomeRunContextError(player)) return c.json<HomeRunErrorResponse>(player, 400);

    const body: unknown = await c.req.json();
    if (!isValidAnswerRequest(body)) return c.json<HomeRunErrorResponse>({ error: 'Invalid answer' }, 400);

    const now = Date.now();
    const current = await settleExpiredRound(
      player.postId,
      player.username,
      await loadProgress(player.postId, player.username),
      now
    );
    if (!isRunFinished(current.outcomes)) {
      return c.json<HomeRunErrorResponse>({ error: 'Finish your official run first' }, 409);
    }

    const matchup = Number.isInteger(body.round) ? player.ladder.rounds[body.round] : undefined;
    if (!matchup) return c.json<HomeRunErrorResponse>({ error: 'Round not found' }, 400);

    const outcome = judgePick(matchup, body.pick);

    return c.json<HomeRunPracticeAnswerResponse>({
      outcome,
      reveal: buildReveal(matchup),
      stats: await loadRoundStats(player.postId),
    });
  } catch (error: unknown) {
    console.error('API /home-run/practice-answer Error:', error);
    return c.json<HomeRunErrorResponse>({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

/** Dev subreddits only: lets testers replay the daily ladder. */
homeRun.post('/reset', async (c) => {
  if (!isDevSubreddit()) return c.json<HomeRunErrorResponse>({ error: 'Not available' }, 403);
  const player = await getHomeRunPlayerContext();
  if (isHomeRunContextError(player)) return c.json<HomeRunErrorResponse>(player, 400);
  await clearProgress(player.postId, player.username);
  await clearHomeRunRecorded(player.postId, player.username);
  return c.json({ success: true });
});

homeRun.get('/leaderboard', async (c) => {
  try {
    const periodQuery = c.req.query('period');
    const period: LeaderboardPeriod = periodQuery === 'weekly' ? 'weekly' : 'all_time';
    const pageQuery = c.req.query('page');
    const page = pageQuery ? parseInt(pageQuery, 10) : 1;
    const pageSizeQuery = c.req.query('pageSize');
    const pageSize = pageSizeQuery ? parseInt(pageSizeQuery, 10) : 10;

    let username: string | undefined;
    try {
      username = await reddit.getCurrentUsername();
    } catch {
      // ignore
    }

    const data = await getLeaderboard(
      period,
      isNaN(page) ? 1 : page,
      isNaN(pageSize) ? 10 : pageSize,
      username
    );

    return c.json<LeaderboardResponse>(data);
  } catch (error: unknown) {
    console.error('API /home-run/leaderboard Error:', error);
    return c.json<HomeRunErrorResponse>({ error: 'Failed to fetch leaderboard' }, 500);
  }
});

homeRun.post('/shop/buy', async (c) => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      return c.json<HomeRunErrorResponse>({ error: 'Log in to purchase items' }, 401);
    }

    const body = await c.req.json<ShopBuyRequest>();
    if (!body || typeof body.itemId !== 'string') {
      return c.json<HomeRunErrorResponse>({ error: 'Invalid itemId' }, 400);
    }

    const result = await buyBatItem(username, body.itemId, body.category);
    if (!result.success) {
      return c.json<HomeRunErrorResponse>({ error: result.error }, 400);
    }

    return c.json<ShopBuyResponse>({
      success: true,
      bases: result.bases,
      equippedBat: result.equippedBat,
      ownedBats: result.ownedBats,
      equippedBall: result.equippedBall,
      ownedBalls: result.ownedBalls,
      lifetimeStats: result.lifetimeStats,
    });
  } catch (error: unknown) {
    console.error('API /home-run/shop/buy Error:', error);
    return c.json<HomeRunErrorResponse>({ error: 'Failed to purchase item' }, 500);
  }
});

homeRun.post('/shop/equip', async (c) => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      return c.json<HomeRunErrorResponse>({ error: 'Log in to equip items' }, 401);
    }

    const body = await c.req.json<ShopEquipRequest>();
    if (!body || typeof body.itemId !== 'string') {
      return c.json<HomeRunErrorResponse>({ error: 'Invalid itemId' }, 400);
    }

    const result = await equipBatItem(username, body.itemId, isDevSubreddit(), body.category);
    if (!result.success) {
      return c.json<HomeRunErrorResponse>({ error: result.error }, 400);
    }

    return c.json<ShopEquipResponse>({
      success: true,
      equippedBat: result.equippedBat,
      equippedBall: result.equippedBall,
    });
  } catch (error: unknown) {
    console.error('API /home-run/shop/equip Error:', error);
    return c.json<HomeRunErrorResponse>({ error: 'Failed to equip item' }, 500);
  }
});

homeRun.post('/shop/dev-bases', async (c) => {
  if (!isDevSubreddit()) {
    return c.json<HomeRunErrorResponse>({ error: 'Not available' }, 403);
  }
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      return c.json<HomeRunErrorResponse>({ error: 'Log in required' }, 401);
    }
    const body = await c.req.json<{ amount?: number; resetOwned?: boolean }>().catch(() => ({}));
    if (body && 'resetOwned' in body && body.resetOwned) {
      const resetState = await resetOwnedBats(username);
      return c.json({
        success: true,
        bases: resetState.bases,
        equippedBat: resetState.equippedBat,
        ownedBats: resetState.ownedBats,
        equippedBall: resetState.equippedBall,
        ownedBalls: resetState.ownedBalls,
      });
    }
    const delta =
      body && 'amount' in body && typeof body.amount === 'number' && Number.isFinite(body.amount)
        ? body.amount
        : 100;
    const bases = await addDevBonusBases(username, delta);
    const shopState = await loadUserBatShopState(username);
    return c.json({
      success: true,
      bases,
      equippedBat: shopState.equippedBat,
      ownedBats: shopState.ownedBats,
      equippedBall: shopState.equippedBall,
      ownedBalls: shopState.ownedBalls,
    });
  } catch (error: unknown) {
    console.error('API /home-run/shop/dev-bases Error:', error);
    return c.json<HomeRunErrorResponse>({ error: 'Failed to adjust dev bases' }, 500);
  }
});
