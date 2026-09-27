export type Config = {
  type: 'cost' | 'percentage';
  text: string;
  imageUrl?: string;
  min: number;
  max: number;
  answer: number;
};

export type GameDataResponse = {
  isHub: boolean;
  configured: boolean;
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
