import { percentageBallparks, type BallparkItem } from './percentageBallparks';
import { costBallparks } from './costBallparks';
import { countBallparks } from './countBallparks';

export type { BallparkItem };

// Exactly 300 verified ballpark items: 100 percentage, 100 cost, 100 count
export const allBallparks: BallparkItem[] = [
  ...percentageBallparks,
  ...costBallparks,
  ...countBallparks,
];

// Reference epoch for daily game tracking (Jan 1, 2024 UTC)
const EPOCH_DATE = new Date('2024-01-01T00:00:00Z').getTime();

export const getDayNumber = (date: Date = new Date()): number => {
  const utcDate = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const diffDays = Math.floor((utcDate - EPOCH_DATE) / 86400000);
  return Math.max(1, diffDays + 1);
};

// Deterministically picks 5 distinct ballparks for a given day (e.g. 2 percentage, 2 cost, 1 count or balanced mix)
export const getDailyBallparks = (date: Date = new Date()): BallparkItem[] => {
  const dayNum = getDayNumber(date);

  // Use a pseudo-random hash generator based on the day number
  const getIndex = (seedOffset: number, max: number) => {
    const x = Math.sin(dayNum * 997 + seedOffset * 1013) * 10000;
    return Math.floor(Math.abs(x - Math.floor(x)) * max);
  };

  // Pick 2 percentage, 2 cost, and 1 count (or alternate based on day)
  const p1 = percentageBallparks[getIndex(1, percentageBallparks.length)]!;
  let p2Index = getIndex(2, percentageBallparks.length);
  if (percentageBallparks[p2Index]!.id === p1.id) {
    p2Index = (p2Index + 1) % percentageBallparks.length;
  }
  const p2 = percentageBallparks[p2Index]!;

  const c1 = costBallparks[getIndex(3, costBallparks.length)]!;
  let c2Index = getIndex(4, costBallparks.length);
  if (costBallparks[c2Index]!.id === c1.id) {
    c2Index = (c2Index + 1) % costBallparks.length;
  }
  const c2 = costBallparks[c2Index]!;

  const count1 = countBallparks[getIndex(5, countBallparks.length)]!;

  // Shuffle order deterministically based on day
  const dailySet = [p1, c1, count1, p2, c2];
  const orderShift = dayNum % 5;
  return [...dailySet.slice(orderShift), ...dailySet.slice(0, orderShift)];
};

export const getBallparkById = (id: number): BallparkItem | undefined => {
  return allBallparks.find((item) => item.id === id);
};

export const getRandomBallparks = (count: number = 5): BallparkItem[] => {
  const shuffled = [...allBallparks].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Returns a single deterministic daily ballpark for a given date
export const getDailyBallpark = (date: Date = new Date()): BallparkItem => {
  const dayNum = getDayNumber(date);
  return allBallparks[dayNum % allBallparks.length]!;
};

// Returns a single random ballpark from the 300 verified items
export const getRandomBallpark = (): BallparkItem => {
  const idx = Math.floor(Math.random() * allBallparks.length);
  return allBallparks[idx]!;
};

