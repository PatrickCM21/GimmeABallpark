export type LeaderboardPeriod = 'all_time' | 'weekly';

export type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
  snoovatarUrl?: string | undefined;
  isCurrentUser?: boolean | undefined;
};

export type LeaderboardResponse = {
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  currentUserEntry?: LeaderboardEntry | undefined;
  page: number;
  pageSize: number;
  totalEntries: number;
  totalPages: number;
};
