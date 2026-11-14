/** Tunables for the Home Run presentation (gameplay rules live in shared/homeRun/engine). */

export const BALL_SIZE_PX = 36;
/** Bat swing + ball launch before the player can answer. */
export const SERVE_MS = 800;
/** Ball flight from cursor to the chosen pane. */
export const STRIKE_MS = 380;
/** How long the smash / miss / timeout animation plays before moving on. */
export const SMASH_SETTLE_MS = 1100;
export const MISS_SETTLE_MS = 1700;
export const FALL_MS = 1000;
export const SHARD_COUNT = 14;

/** Seconds-left threshold where the timer turns urgent. */
export const URGENT_MS = 3_000;

export const FALLBACK_SNOO_URL = '/default_snoo.png';

export const BASE_LABELS = ['First base', 'Second base', 'Third base', 'HOME RUN!'] as const;
