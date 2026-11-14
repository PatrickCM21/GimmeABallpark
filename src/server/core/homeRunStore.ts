import { redis } from '@devvit/web/server';
import { HOME_RUN_ROUND_COUNT, createEmptyProgress } from '../../shared/homeRun/engine';
import type { HomeRunOutcome, HomeRunRoundStat, HomeRunStoredProgress } from '../../shared/types/homeRun';

/** Redis persistence for Home Run. Keys always use the un-prefixed post id. */

const cleanId = (postId: string): string => postId.replace('t3_', '');

export const homeRunKeys = {
  ladder: (postId: string) => `homerun:${cleanId(postId)}:ladder`,
  progress: (postId: string, username: string) => `homerun:${cleanId(postId)}:progress:${username}`,
  attempts: (postId: string, round: number) => `homerun:${cleanId(postId)}:round:${round}:attempts`,
  passes: (postId: string, round: number) => `homerun:${cleanId(postId)}:round:${round}:passes`,
  audience: (postId: string) => `homerun:${cleanId(postId)}:audience`,
  dailyIndex: 'homerun:daily-game:index',
  dailyCount: 'homerun:daily-game:count',
} as const;

const isOutcome = (value: unknown): value is HomeRunOutcome =>
  value === 'correct' || value === 'wrong' || value === 'timeout';

const parseStoredProgress = (raw: string | undefined): HomeRunStoredProgress => {
  if (!raw) return createEmptyProgress();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return createEmptyProgress();
    const outcomes = 'outcomes' in parsed && Array.isArray(parsed.outcomes) ? parsed.outcomes.filter(isOutcome) : [];
    const startedAt = 'roundStartedAt' in parsed ? parsed.roundStartedAt : null;
    return { outcomes, roundStartedAt: typeof startedAt === 'number' ? startedAt : null };
  } catch {
    return createEmptyProgress();
  }
};

export const loadProgress = async (postId: string, username: string): Promise<HomeRunStoredProgress> =>
  parseStoredProgress(await redis.get(homeRunKeys.progress(postId, username)));

export const saveProgress = async (
  postId: string,
  username: string,
  progress: HomeRunStoredProgress
): Promise<void> => {
  await redis.set(homeRunKeys.progress(postId, username), JSON.stringify(progress));
};

export const clearProgress = async (postId: string, username: string): Promise<void> => {
  await redis.del(homeRunKeys.progress(postId, username));
};

/** Counts one attempt at `round`, plus a pass when the outcome was correct. */
export const recordRoundResult = async (postId: string, round: number, outcome: HomeRunOutcome): Promise<void> => {
  await redis.incrBy(homeRunKeys.attempts(postId, round), 1);
  if (outcome === 'correct') {
    await redis.incrBy(homeRunKeys.passes(postId, round), 1);
  }
};

export const loadRoundStats = async (postId: string): Promise<HomeRunRoundStat[]> => {
  const rounds = Array.from({ length: HOME_RUN_ROUND_COUNT }, (_, round) => round);
  return Promise.all(
    rounds.map(async (round) => {
      const [attempts, passes] = await Promise.all([
        redis.get(homeRunKeys.attempts(postId, round)),
        redis.get(homeRunKeys.passes(postId, round)),
      ]);
      return { attempts: Number(attempts ?? 0) || 0, passes: Number(passes ?? 0) || 0 };
    })
  );
};

export type StoredAudienceMember = {
  username: string;
  snoovatarUrl?: string | undefined;
};

export const loadAudience = async (postId: string): Promise<StoredAudienceMember[]> => {
  const raw = await redis.get(homeRunKeys.audience(postId));
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 50) as StoredAudienceMember[];
    }
    return [];
  } catch {
    return [];
  }
};

export const addAudienceMember = async (
  postId: string,
  username: string,
  snoovatarUrl?: string | undefined
): Promise<void> => {
  const current = await loadAudience(postId);
  const existingIndex = current.findIndex((m) => m.username.toLowerCase() === username.toLowerCase());

  if (existingIndex !== -1) {
    // If we now have a snoovatarUrl and didn't before, update it in place
    const existing = current[existingIndex];
    if (snoovatarUrl && existing && !existing.snoovatarUrl) {
      existing.snoovatarUrl = snoovatarUrl;
      await redis.set(homeRunKeys.audience(postId), JSON.stringify(current));
    }
    return;
  }

  // Append new player so existing spectators keep their assigned seats
  const updated = [...current, { username, snoovatarUrl }].slice(0, 50);
  await redis.set(homeRunKeys.audience(postId), JSON.stringify(updated));
};
