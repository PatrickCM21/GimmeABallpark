export type UserLifetimeStats = {
  // Home Run Derby Mode
  homeBases: number;
  thirdBases: number;
  secondBases: number;
  firstBases: number;
  strikeouts: number;
  homeRunGamesPlayed: number;

  // Normal Gimme a Ballpark Mode
  normalGamesPlayed: number;
  totalClosenessPct: number;
  avgClosenessPct: number;
  exactBullseyes: number;
  withinThreePercent: number;
  beatHivemind: number;
};

export type UserStatsResponse = {
  username?: string | undefined;
  stats: UserLifetimeStats;
};

export const createEmptyUserStats = (): UserLifetimeStats => ({
  homeBases: 0,
  thirdBases: 0,
  secondBases: 0,
  firstBases: 0,
  strikeouts: 0,
  homeRunGamesPlayed: 0,
  normalGamesPlayed: 0,
  totalClosenessPct: 0,
  avgClosenessPct: 0,
  exactBullseyes: 0,
  withinThreePercent: 0,
  beatHivemind: 0,
});

export type BallparkClosenessResult = {
  closenessPct: number;
  errorRatio: number;
  isSpotOn: boolean;
  isWithin3Percent: boolean;
};

export const calculateBallparkCloseness = (
  guess: number,
  answer: number,
  min: number,
  max: number
): BallparkClosenessResult => {
  const range = Math.max(1, max - min);
  const diff = Math.abs(guess - answer);
  const errorRatio = Math.min(1, Math.max(0, diff / range));
  const closenessPct = Math.round((1 - errorRatio) * 1000) / 10;
  return {
    closenessPct,
    errorRatio,
    isSpotOn: diff === 0,
    isWithin3Percent: errorRatio <= 0.03,
  };
};

export const applyHomeRunToStats = (current: UserLifetimeStats, bases: number): UserLifetimeStats => {
  const updated = { ...current, homeRunGamesPlayed: current.homeRunGamesPlayed + 1 };
  if (bases >= 4) {
    updated.homeBases += 1;
  } else if (bases === 3) {
    updated.thirdBases += 1;
  } else if (bases === 2) {
    updated.secondBases += 1;
  } else if (bases === 1) {
    updated.firstBases += 1;
  } else {
    updated.strikeouts += 1;
  }
  return updated;
};

export const calculateTotalBases = (stats: UserLifetimeStats): number =>
  stats.firstBases * 1 +
  stats.secondBases * 2 +
  stats.thirdBases * 3 +
  stats.homeBases * 4;

export const applyNormalGameToStats = (
  current: UserLifetimeStats,
  closeness: BallparkClosenessResult,
  closerThanMajority: boolean
): UserLifetimeStats => {
  const normalGamesPlayed = current.normalGamesPlayed + 1;
  const totalClosenessPct = Math.round((current.totalClosenessPct + closeness.closenessPct) * 10) / 10;
  const avgClosenessPct = Math.round((totalClosenessPct / normalGamesPlayed) * 10) / 10;
  return {
    ...current,
    normalGamesPlayed,
    totalClosenessPct,
    avgClosenessPct,
    exactBullseyes: current.exactBullseyes + (closeness.isSpotOn ? 1 : 0),
    withinThreePercent: current.withinThreePercent + (closeness.isWithin3Percent ? 1 : 0),
    beatHivemind: current.beatHivemind + (closerThanMajority ? 1 : 0),
  };
};
