import type { UserLifetimeStats } from './stats';

/**
 * Shared types for the "Home Run" game mode (a fixed 4-step daily ladder).
 *
 * Naming:
 *  - `HomeRunLadder*`  : authoritative content (contains the answers, server-only in practice)
 *  - `HomeRun*Public`  : what is safe to send to the client (no values / winners)
 *  - `HomeRunApi*`     : request / response payloads
 */

export type HomeRunSide = 'a' | 'b';

/** Outcome of a single round. Anything other than `correct` ends the run. */
export type HomeRunOutcome = 'correct' | 'wrong' | 'timeout';

// --- Authoritative content -------------------------------------------------

export type HomeRunOption = {
  label: string;
  emoji: string;
  /** Numeric value used to decide the winner. */
  value: number;
  /** Human friendly value revealed after answering, e.g. "~37 million". */
  display: string;
};

export type HomeRunMatchup = {
  a: HomeRunOption;
  b: HomeRunOption;
};

export type HomeRunRounds = readonly [HomeRunMatchup, HomeRunMatchup, HomeRunMatchup, HomeRunMatchup];

export type HomeRunLadder = {
  id: string;
  title: string;
  /** Ordered easiest -> hardest. The ratio between values shrinks every round. */
  rounds: HomeRunRounds;
};

// --- Client-safe content ---------------------------------------------------

export type HomeRunOptionPublic = Pick<HomeRunOption, 'label' | 'emoji'>;

export type HomeRunMatchupPublic = {
  a: HomeRunOptionPublic;
  b: HomeRunOptionPublic;
};

// --- Progress & stats ------------------------------------------------------

/** Persisted per-user progress (server only). */
export type HomeRunStoredProgress = {
  outcomes: HomeRunOutcome[];
  /** Epoch ms when the current round's timer started, or null if not started yet. */
  roundStartedAt: number | null;
};

/** Progress as seen by the client. */
export type HomeRunProgress = {
  outcomes: HomeRunOutcome[];
  finished: boolean;
  /** Time left for the current round. Equals the full limit if the timer hasn't started. */
  msRemaining: number;
};

export type HomeRunRoundStat = {
  attempts: number;
  passes: number;
};

export type HomeRunAudienceMember = {
  username: string;
  snoovatarUrl?: string | undefined;
};

// --- API payloads ----------------------------------------------------------

export type HomeRunGameState = {
  ladderTitle: string;
  puzzleNumber: number;
  rounds: HomeRunMatchupPublic[];
  /** Revealed answers for all rounds, present only once the run is finished. */
  reveals?: HomeRunReveal[] | undefined;
  progress: HomeRunProgress;
  stats: HomeRunRoundStat[];
  timeLimitMs: number;
  username: string;
  snoovatarUrl?: string | undefined;
  audience?: HomeRunAudienceMember[] | undefined;
  canReset: boolean;
  lifetimeStats?: UserLifetimeStats | undefined;
};

export type HomeRunExtrasResponse = {
  snoovatarUrl?: string | undefined;
  audience?: HomeRunAudienceMember[] | undefined;
  stats: HomeRunRoundStat[];
  lifetimeStats?: UserLifetimeStats | undefined;
};

export type HomeRunStartResponse = {
  progress: HomeRunProgress;
};

export type HomeRunAnswerRequest = {
  round: number;
  /** `null` means the player ran out of time. */
  pick: HomeRunSide | null;
};

export type HomeRunReveal = {
  winner: HomeRunSide;
  displayA: string;
  displayB: string;
};

export type HomeRunAnswerResponse = {
  outcome: HomeRunOutcome;
  reveal: HomeRunReveal;
  /** Revealed answers for all rounds, present when this answer finishes the run. */
  reveals?: HomeRunReveal[] | undefined;
  progress: HomeRunProgress;
  stats: HomeRunRoundStat[];
  lifetimeStats?: UserLifetimeStats | undefined;
};

export type HomeRunPracticeAnswerResponse = {
  outcome: HomeRunOutcome;
  reveal: HomeRunReveal;
  stats: HomeRunRoundStat[];
};

export type HomeRunErrorResponse = {
  error: string;
};

/** Data stored in the Reddit post (`postData`) for Home Run posts. */
export type HomeRunPostData = {
  mode: 'homerun';
  ladderId: string;
  puzzleNumber: number;
};
