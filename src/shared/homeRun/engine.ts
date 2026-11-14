import type {
  HomeRunLadder,
  HomeRunMatchup,
  HomeRunMatchupPublic,
  HomeRunOutcome,
  HomeRunPostData,
  HomeRunProgress,
  HomeRunReveal,
  HomeRunSide,
  HomeRunStoredProgress,
} from '../types/homeRun';

/** Pure game rules for Home Run. No I/O, so it is shared by client and server and easy to test. */

export const HOME_RUN_ROUND_COUNT = 4;
export const HOME_RUN_TIME_LIMIT_MS = 10_000;
/** Allowance for network latency + animations before a late answer counts as a timeout. */
export const HOME_RUN_GRACE_MS = 6_000;

export const createEmptyProgress = (): HomeRunStoredProgress => ({ outcomes: [], roundStartedAt: null });

export const getWinner = (matchup: HomeRunMatchup): HomeRunSide => (matchup.a.value > matchup.b.value ? 'a' : 'b');

export const judgePick = (matchup: HomeRunMatchup, pick: HomeRunSide | null): HomeRunOutcome => {
  if (pick === null) return 'timeout';
  return pick === getWinner(matchup) ? 'correct' : 'wrong';
};

export const buildReveal = (matchup: HomeRunMatchup): HomeRunReveal => ({
  winner: getWinner(matchup),
  displayA: matchup.a.display,
  displayB: matchup.b.display,
});

export const toPublicMatchups = (ladder: HomeRunLadder): HomeRunMatchupPublic[] =>
  ladder.rounds.map(({ a, b }) => ({
    a: { label: a.label, emoji: a.emoji },
    b: { label: b.label, emoji: b.emoji },
  }));

/** Number of bases earned (0 = out, 4 = home run). */
export const countBases = (outcomes: readonly HomeRunOutcome[]): number =>
  outcomes.filter((outcome) => outcome === 'correct').length;

export const isRunFinished = (outcomes: readonly HomeRunOutcome[]): boolean =>
  outcomes.length >= HOME_RUN_ROUND_COUNT || outcomes.some((outcome) => outcome !== 'correct');

export const isHomeRun = (outcomes: readonly HomeRunOutcome[]): boolean =>
  countBases(outcomes) === HOME_RUN_ROUND_COUNT;

export const getMsRemaining = (progress: HomeRunStoredProgress, now: number): number => {
  if (progress.roundStartedAt === null) return HOME_RUN_TIME_LIMIT_MS;
  return Math.max(0, HOME_RUN_TIME_LIMIT_MS - (now - progress.roundStartedAt));
};

export const isRoundExpired = (progress: HomeRunStoredProgress, now: number): boolean =>
  progress.roundStartedAt !== null && now - progress.roundStartedAt > HOME_RUN_TIME_LIMIT_MS + HOME_RUN_GRACE_MS;

export const toPublicProgress = (progress: HomeRunStoredProgress, now: number): HomeRunProgress => ({
  outcomes: progress.outcomes,
  finished: isRunFinished(progress.outcomes),
  msRemaining: getMsRemaining(progress, now),
});

/** Starts the current round's timer if it hasn't started (idempotent, so refreshing can't reset it). */
export const startRound = (progress: HomeRunStoredProgress, now: number): HomeRunStoredProgress =>
  isRunFinished(progress.outcomes) || progress.roundStartedAt !== null ? progress : { ...progress, roundStartedAt: now };

/** Records a result for the current round and arms the timer for the next one if the run continues. */
export const recordOutcome = (
  progress: HomeRunStoredProgress,
  outcome: HomeRunOutcome,
  now: number
): HomeRunStoredProgress => {
  const outcomes = [...progress.outcomes, outcome];
  return { outcomes, roundStartedAt: isRunFinished(outcomes) ? null : now };
};

/** Parses `postData` without casting. Returns undefined for non Home Run posts. */
export const parseHomeRunPostData = (value: unknown): HomeRunPostData | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const mode = 'mode' in value ? value.mode : undefined;
  const ladderId = 'ladderId' in value ? value.ladderId : undefined;
  const puzzleNumber = 'puzzleNumber' in value ? value.puzzleNumber : undefined;
  if (mode !== 'homerun' || typeof ladderId !== 'string') return undefined;
  return { mode, ladderId, puzzleNumber: typeof puzzleNumber === 'number' ? puzzleNumber : 1 };
};
