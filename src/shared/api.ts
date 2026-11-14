import type { UserLifetimeStats } from './types/stats';

export type Config = {
  type: 'percentage' | 'cost' | 'count';
  text: string;
  imageUrl?: string | undefined;
  authorName?: string | undefined;
  authorAvatarUrl?: string | undefined;
  min: number;
  max: number;
  answer: number;
  explanation?: string | undefined;
};

export type GameMode = 'ballpark' | 'homerun';

export type GameDataResponse = {
  /** Which game this post hosts. Absent on legacy responses (treated as 'ballpark'). */
  mode?: GameMode;
  isHub: boolean;
  configured: boolean;
  isDevSubreddit?: boolean;
  hubUrl?: string;
  config?: Config;
  userGuess?: number;
  username?: string;
  stats?: {
    totalGuesses: number;
    averageGuess: number;
    samples: number[];
  };
  lifetimeStats?: UserLifetimeStats;
};

export type CreateGameRequest = Config;

export type CreateGameResponse = {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
};

export type GuessRequest = {
  guess: number;
};

export type GuessResponse = {
  success: boolean;
  stats: {
    totalGuesses: number;
    averageGuess: number;
    samples: number[];
  };
  closerThanMajority?: boolean;
  lifetimeStats?: UserLifetimeStats;
};
