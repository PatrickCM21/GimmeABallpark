export type Config = {
  type: 'cost' | 'percentage';
  text: string;
  imageUrl?: string;
  min: number;
  max: number;
  answer: number;
};

export type GameDataResponse = {
  configured: boolean;
  isAuthor: boolean;
  config?: Config;
  userGuess?: number;
  stats?: {
    totalGuesses: number;
    averageGuess: number;
    samples: number[];
  };
};

export type SaveConfigRequest = Config;

export type SaveConfigResponse = {
  success: boolean;
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
