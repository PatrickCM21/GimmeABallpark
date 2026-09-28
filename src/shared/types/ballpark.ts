export type GameType =
  | 'slider'
  | 'higher_lower'
  | 'which_is_higher'
  | 'order_magnitude'
  | 'rank_sort'
  | 'range_bracket';

export type Category =
  | 'nature'
  | 'space'
  | 'human_body'
  | 'money'
  | 'tech'
  | 'geography'
  | 'history'
  | 'pop_culture'
  | 'everyday';

export interface BaseQuestion {
  id: number;
  gameType: GameType;
  category: Category;
  prompt: string;
  fact: string;
  source: string;
  crowdAccuracy: number; // 0-100 baseline percentage
}

export interface SliderQuestion extends BaseQuestion {
  gameType: 'slider';
  min: number;
  max: number;
  answer: number;
  unit: string;
  format: 'percentage' | 'cost' | 'count' | 'measurement';
  tolerancePercent?: number; // default 15%
}

export interface HigherLowerQuestion extends BaseQuestion {
  gameType: 'higher_lower';
  benchmark: number;
  answer: number;
  unit: string;
  isHigher: boolean;
  benchmarkDisplay: string;
  answerDisplay: string;
  crowdSplit: { higher: number; lower: number };
}

export interface WhichIsHigherOption {
  name: string;
  value: number;
  display: string;
  icon?: string;
}

export interface WhichIsHigherQuestion extends BaseQuestion {
  gameType: 'which_is_higher';
  optionA: WhichIsHigherOption;
  optionB: WhichIsHigherOption;
  winner: 'A' | 'B';
  crowdSplit: { a: number; b: number };
}

export interface OrderMagnitudeQuestion extends BaseQuestion {
  gameType: 'order_magnitude';
  answer: number;
  answerDisplay: string;
  unit: string;
  options: string[]; // 4 options, e.g. ["~10,000", "~100,000", "~1,000,000", "~10,000,000"]
  correctIndex: number;
  crowdDist: [number, number, number, number];
}

export interface RankSortItem {
  id: string;
  name: string;
  value: number;
  display: string;
}

export interface RankSortQuestion extends BaseQuestion {
  gameType: 'rank_sort';
  items: RankSortItem[]; // 3 or 4 items to sort from lowest to highest
  correctOrder: string[]; // array of item IDs in ascending order
}

export interface RangeBracketOption {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface RangeBracketQuestion extends BaseQuestion {
  gameType: 'range_bracket';
  answer: number;
  answerDisplay: string;
  unit: string;
  options: RangeBracketOption[]; // 4 options
}

export type BallparkQuestion =
  | SliderQuestion
  | HigherLowerQuestion
  | WhichIsHigherQuestion
  | OrderMagnitudeQuestion
  | RankSortQuestion
  | RangeBracketQuestion;

export interface DailyGameSummary {
  date: string;
  dayNumber: number;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  results: {
    questionId: number;
    gameType: GameType;
    prompt: string;
    isCorrect: boolean;
    userChoice: string | number;
    realAnswer: string | number;
  }[];
}
