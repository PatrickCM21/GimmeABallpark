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

export type GameDataResponse = {
  isHub: boolean;
  configured: boolean;
  isDevSubreddit?: boolean;
  hubUrl?: string;
  config?: Config;
  userGuess?: number;
  stats?: {
    totalGuesses: number;
    averageGuess: number;
    samples: number[];
  };
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
};
