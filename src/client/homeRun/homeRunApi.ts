import type {
  HomeRunAnswerRequest,
  HomeRunAnswerResponse,
  HomeRunExtrasResponse,
  HomeRunGameState,
  HomeRunPracticeAnswerResponse,
  HomeRunStartResponse,
} from '../../shared/types/homeRun';
import type { UserStatsResponse } from '../../shared/types/stats';
import type { LeaderboardPeriod, LeaderboardResponse } from '../../shared/types/leaderboard';

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(path, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Home Run request failed (${res.status}): ${body}`);
  }
  const data: T = await res.json();
  return data;
};

const postJson = <T>(path: string, body?: unknown): Promise<T> =>
  requestJson<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });

export const homeRunApi = {
  getState: () => requestJson<HomeRunGameState>('/api/home-run/state'),
  getExtras: () => requestJson<HomeRunExtrasResponse>('/api/home-run/extras'),
  start: () => postJson<HomeRunStartResponse>('/api/home-run/start'),
  answer: (request: HomeRunAnswerRequest) => postJson<HomeRunAnswerResponse>('/api/home-run/answer', request),
  practiceAnswer: (request: HomeRunAnswerRequest) =>
    postJson<HomeRunPracticeAnswerResponse>('/api/home-run/practice-answer', request),
  reset: () => postJson<{ success: boolean }>('/api/home-run/reset'),
  getUserStats: () => requestJson<UserStatsResponse>('/api/user-stats'),
  getLeaderboard: (period: LeaderboardPeriod, page: number = 1, pageSize: number = 5) =>
    requestJson<LeaderboardResponse>(
      `/api/leaderboard?period=${period}&page=${page}&pageSize=${pageSize}`
    ),
};
