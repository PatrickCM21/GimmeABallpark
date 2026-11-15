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
} from '../core/userStatsStore';
import { getLeaderboard } from '../core/leaderboard';
import type { UserLifetimeStats } from '../../shared/types/stats';
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

type PlayerContext = {
  postId: string;
  username: string;
  ladder: HomeRunLadder;
  puzzleNumber: number;
};

const getPlayerContext = async (): Promise<PlayerContext | HomeRunErrorResponse> => {
  const { postId } = context;
  if (!postId) return { error: 'postId missing' };

  const username = await reddit.getCurrentUsername();
  if (!username) return { error: 'Log in to play Home Run' };

  const found = await getLadderForPost(postId);
  if (!found) return { error: 'This post has no Home Run ladder configured' };

  return { postId, username, ...found };
};

const isError = (value: PlayerContext | HomeRunErrorResponse): value is HomeRunErrorResponse => 'error' in value;

const isValidAnswerRequest = (value: unknown): value is HomeRunAnswerRequest => {
  if (typeof value !== 'object' || value === null) return false;
  if (!('round' in value) || typeof value.round !== 'number') return false;
  return 'pick' in value && (value.pick === 'a' || value.pick === 'b' || value.pick === null);
};

homeRun.get('/state', async (c) => {
  try {
    const player = await getPlayerContext();
    if (isError(player)) return c.json<HomeRunErrorResponse>(player, 400);

    const now = Date.now();
    const progress = await settleExpiredRound(
      player.postId,
      player.username,
      await loadProgress(player.postId, player.username),
      now
    );

    let snoovatarUrl: string | undefined;
    try {
      snoovatarUrl = await reddit.getSnoovatarUrl(player.username);
    } catch (e) {
      console.warn('Could not load snoovatar:', e);
    }

    // If player has participated (or is active), ensure they are in the stadium audience
    if (progress.outcomes.length > 0) {
      void addAudienceMember(player.postId, player.username, snoovatarUrl);
    }

    const audience = await loadAudience(player.postId);

    if (isRunFinished(progress.outcomes)) {
      try {
        await recordHomeRunStats(player.postId, player.username, countBases(progress.outcomes), snoovatarUrl);
      } catch (err) {
        console.warn('Could not record Home Run lifetime stats in /state:', err);
      }
    }
    const lifetimeStats = await loadUserStats(player.username);

    return c.json<HomeRunGameState>({
      ladderTitle: player.ladder.title,
      puzzleNumber: player.puzzleNumber,
      rounds: toPublicMatchups(player.ladder),
      progress: toPublicProgress(progress, now),
      stats: await loadRoundStats(player.postId),
      timeLimitMs: HOME_RUN_TIME_LIMIT_MS,
      username: player.username,
      snoovatarUrl,
      audience,
      canReset: isDevSubreddit(),
      lifetimeStats,
    });
  } catch (error: unknown) {
    console.error('API /home-run/state Error:', error);
    return c.json<HomeRunErrorResponse>({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

homeRun.post('/start', async (c) => {
  try {
    const player = await getPlayerContext();
    if (isError(player)) return c.json<HomeRunErrorResponse>(player, 400);

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
    const player = await getPlayerContext();
    if (isError(player)) return c.json<HomeRunErrorResponse>(player, 400);

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
    if (isRunFinished(next.outcomes)) {
      try {
        lifetimeStats = await recordHomeRunStats(player.postId, player.username, countBases(next.outcomes));
      } catch (err) {
        console.warn('Could not record Home Run lifetime stats in /answer:', err);
      }
    }

    return c.json<HomeRunAnswerResponse>({
      outcome,
      reveal: buildReveal(matchup),
      progress: toPublicProgress(next, now),
      stats: await loadRoundStats(player.postId),
      lifetimeStats,
    });
  } catch (error: unknown) {
    console.error('API /home-run/answer Error:', error);
    return c.json<HomeRunErrorResponse>({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

/** Practice replay after finishing the official run: grades picks without saving progress or stats. */
homeRun.post('/practice-answer', async (c) => {
  try {
    const player = await getPlayerContext();
    if (isError(player)) return c.json<HomeRunErrorResponse>(player, 400);

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
  const player = await getPlayerContext();
  if (isError(player)) return c.json<HomeRunErrorResponse>(player, 400);
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
