import { redis, reddit } from '@devvit/web/server';
import { calculateTotalBases } from '../../shared/types/stats';
import type {
  LeaderboardPeriod,
  LeaderboardEntry,
  LeaderboardResponse,
} from '../../shared/types/leaderboard';
import { loadUserStats } from './userStatsStore';

export function getCurrentWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export async function calculateUserLifetimeBases(username: string): Promise<number> {
  if (!username || username === 'anonymous') return 0;
  const stats = await loadUserStats(username);
  return Math.max(0, calculateTotalBases(stats));
}

export async function fetchUserSnoovatarUrl(username: string): Promise<string | undefined> {
  if (!username || username === 'anonymous') return undefined;
  const cacheKey = `homerun:user:${username}:snoovatar`;
  const cached = await redis.get(cacheKey);
  if (cached && cached !== '') {
    return cached === 'none' ? undefined : cached;
  }

  try {
    const directUrl = await reddit.getSnoovatarUrl(username).catch(() => undefined);
    if (directUrl && typeof directUrl === 'string' && directUrl.trim() !== '') {
      await redis.set(cacheKey, directUrl.trim());
      return directUrl.trim();
    }

    const user = await reddit.getUserByUsername(username).catch(() => undefined);
    if (user) {
      const userUrl = await user.getSnoovatarUrl().catch(() => undefined);
      if (userUrl && typeof userUrl === 'string' && userUrl.trim() !== '') {
        await redis.set(cacheKey, userUrl.trim());
        return userUrl.trim();
      }
    }

    await redis.set(cacheKey, 'none');
  } catch (err) {
    console.warn(`Notice: Could not fetch snoovatar for ${username}:`, err);
  }

  return undefined;
}

export async function ensureWeeklyBaseInitialized(
  username: string,
  baselineLifetimeBases: number
): Promise<number> {
  const weekKey = getCurrentWeekKey();
  let initialWeek = await redis.get('homerun:leaderboard:initial_week');
  if (!initialWeek) {
    await redis.set('homerun:leaderboard:initial_week', weekKey);
    initialWeek = weekKey;
  }

  const baseKey = `homerun:user:${username}:weekly_base:${weekKey}`;
  const baseStr = await redis.get(baseKey);
  if (baseStr === undefined || baseStr === null) {
    const weeklyBase = weekKey === initialWeek ? 0 : Math.max(0, baselineLifetimeBases);
    await redis.set(baseKey, String(weeklyBase));
    return weeklyBase;
  }

  const parsed = parseInt(baseStr, 10);
  return !isNaN(parsed) ? parsed : 0;
}

export async function syncUserLeaderboard(
  username: string,
  snoovatarUrl?: string | undefined
): Promise<{ lifetimeBases: number; weeklyBases: number }> {
  if (!username || username === 'anonymous') {
    return { lifetimeBases: 0, weeklyBases: 0 };
  }

  const lifetimeBases = await calculateUserLifetimeBases(username);
  const weekKey = getCurrentWeekKey();
  const weeklyBase = await ensureWeeklyBaseInitialized(username, lifetimeBases);
  const weeklyBases = Math.max(0, lifetimeBases - weeklyBase);

  const profileSaves: Promise<unknown>[] = [
    redis.hSet('homerun:users', { [username]: '1' }),
    redis.zAdd('homerun:leaderboard:all_time', { member: username, score: lifetimeBases }),
    redis.zAdd(`homerun:leaderboard:weekly:${weekKey}`, { member: username, score: weeklyBases }),
  ];

  let snoovatarToSave = snoovatarUrl;
  if (!snoovatarToSave) {
    const existing = await redis.get(`homerun:user:${username}:snoovatar`);
    if (!existing || existing === '') {
      snoovatarToSave = await fetchUserSnoovatarUrl(username);
    }
  }

  if (snoovatarToSave && snoovatarToSave !== 'none') {
    profileSaves.push(redis.set(`homerun:user:${username}:snoovatar`, snoovatarToSave));
  }

  await Promise.all(profileSaves);
  return { lifetimeBases, weeklyBases };
}

type SampleBatter = {
  username: string;
  allTimeScore: number;
  weeklyScore: number;
  snoovatarUrl: string;
};

const SAMPLE_BATTERS: readonly SampleBatter[] = [
  {
    username: 'Slugger_Sam',
    allTimeScore: 64,
    weeklyScore: 22,
    snoovatarUrl: 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_0.png',
  },
  {
    username: 'DerbyKing99',
    allTimeScore: 51,
    weeklyScore: 18,
    snoovatarUrl: 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png',
  },
  {
    username: 'GrandSlamGus',
    allTimeScore: 39,
    weeklyScore: 15,
    snoovatarUrl: 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_2.png',
  },
  {
    username: 'FenceBuster',
    allTimeScore: 28,
    weeklyScore: 11,
    snoovatarUrl: 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_3.png',
  },
  {
    username: 'LineDriveLou',
    allTimeScore: 17,
    weeklyScore: 7,
    snoovatarUrl: 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_4.png',
  },
  {
    username: 'RookieBatter',
    allTimeScore: 9,
    weeklyScore: 4,
    snoovatarUrl: 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_5.png',
  },
];

async function ensureSeededLeaderboard(key: string, period: LeaderboardPeriod): Promise<void> {
  const currentCount = await redis.zCard(key);
  if (currentCount > 0) return;

  const weekKey = getCurrentWeekKey();
  const seedPromises: Promise<unknown>[] = [];

  for (const batter of SAMPLE_BATTERS) {
    const score = period === 'all_time' ? batter.allTimeScore : batter.weeklyScore;
    seedPromises.push(
      redis.zAdd(key, { member: batter.username, score }),
      redis.set(`homerun:user:${batter.username}:snoovatar`, batter.snoovatarUrl)
    );
    if (period === 'all_time') {
      seedPromises.push(
        redis.zAdd(`homerun:leaderboard:weekly:${weekKey}`, {
          member: batter.username,
          score: batter.weeklyScore,
        })
      );
    } else {
      seedPromises.push(
        redis.zAdd('homerun:leaderboard:all_time', {
          member: batter.username,
          score: batter.allTimeScore,
        })
      );
    }
  }

  await Promise.all(seedPromises);
}

export async function getLeaderboard(
  period: LeaderboardPeriod,
  page: number,
  pageSize: number,
  currentUsername?: string
): Promise<LeaderboardResponse> {
  const weekKey = getCurrentWeekKey();
  const key =
    period === 'all_time'
      ? 'homerun:leaderboard:all_time'
      : `homerun:leaderboard:weekly:${weekKey}`;

  await ensureSeededLeaderboard(key, period);

  if (currentUsername && currentUsername !== 'anonymous') {
    await syncUserLeaderboard(currentUsername);
  }

  const totalEntries = await redis.zCard(key);
  const safePageSize = Math.max(1, Math.min(50, pageSize));
  const totalPages = Math.max(1, Math.ceil(totalEntries / safePageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));

  const start = (safePage - 1) * safePageSize;
  const stop = start + safePageSize - 1;

  const rawRange = await redis.zRange(key, start, stop, { by: 'rank', reverse: true });

  const usernames = rawRange.map((item) => item.member);
  const snoovatarKeys = usernames.map((name) => `homerun:user:${name}:snoovatar`);
  const cachedSnoovatars = snoovatarKeys.length > 0 ? await redis.mGet(snoovatarKeys) : [];

  const resolvedSnoovatars = await Promise.all(
    usernames.map(async (name, i) => {
      const cached = cachedSnoovatars[i];
      if (cached && cached !== 'none' && cached !== '') {
        return cached;
      }
      return fetchUserSnoovatarUrl(name);
    })
  );

  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < rawRange.length; i++) {
    const raw = rawRange[i];
    if (!raw) continue;
    entries.push({
      rank: start + i + 1,
      username: raw.member,
      score: raw.score,
      snoovatarUrl: resolvedSnoovatars[i],
      isCurrentUser: currentUsername ? raw.member === currentUsername : false,
    });
  }

  let currentUserEntry: LeaderboardEntry | undefined = undefined;
  if (currentUsername && currentUsername !== 'anonymous') {
    const [userBottomRank, userScore, snooVal] = await Promise.all([
      redis.zRank(key, currentUsername),
      redis.zScore(key, currentUsername),
      redis.get(`homerun:user:${currentUsername}:snoovatar`),
    ]);

    let userSnoovatar = snooVal && snooVal !== 'none' && snooVal !== '' ? snooVal : undefined;
    if (!userSnoovatar) {
      userSnoovatar = await fetchUserSnoovatarUrl(currentUsername);
    }

    if (userBottomRank !== undefined && userScore !== undefined) {
      const userRank = totalEntries - userBottomRank;
      currentUserEntry = {
        rank: userRank,
        username: currentUsername,
        score: userScore,
        snoovatarUrl: userSnoovatar,
        isCurrentUser: true,
      };
    }
  }

  return {
    period,
    entries,
    currentUserEntry,
    page: safePage,
    pageSize: safePageSize,
    totalEntries,
    totalPages,
  };
}
