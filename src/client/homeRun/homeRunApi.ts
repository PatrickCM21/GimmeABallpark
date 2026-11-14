import type {
  HomeRunAnswerRequest,
  HomeRunAnswerResponse,
  HomeRunGameState,
  HomeRunStartResponse,
} from '../../shared/types/homeRun';
import type { UserStatsResponse } from '../../shared/types/stats';

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
  start: () => postJson<HomeRunStartResponse>('/api/home-run/start'),
  answer: (request: HomeRunAnswerRequest) => postJson<HomeRunAnswerResponse>('/api/home-run/answer', request),
  reset: () => postJson<{ success: boolean }>('/api/home-run/reset'),
  getUserStats: () => requestJson<UserStatsResponse>('/api/user-stats'),
};
