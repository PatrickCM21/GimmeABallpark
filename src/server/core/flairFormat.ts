export type BaseScoreTier = {
  minBases: number;
  label: string;
  backgroundColor: string;
  textColor: 'light' | 'dark';
};

/** Ordered from highest threshold to lowest for lookup. */
export const BASE_SCORE_TIERS: readonly BaseScoreTier[] = [
  { minBases: 300, label: 'Hall of Famer', backgroundColor: '#DC2626', textColor: 'light' },
  { minBases: 100, label: 'All-Star', backgroundColor: '#EAB308', textColor: 'dark' },
  { minBases: 50, label: 'Heavy Hitter', backgroundColor: '#0D9488', textColor: 'light' },
  { minBases: 10, label: 'Slugger', backgroundColor: '#1E3A8A', textColor: 'light' },
  { minBases: 0, label: 'Rookie', backgroundColor: '#334155', textColor: 'light' },
] as const;

const normalizeBases = (bases: number): number =>
  Math.max(0, Math.floor(Number.isFinite(bases) ? bases : 0));

/** Returns the tier metadata for a given total base score. */
export const getBaseScoreTier = (bases: number): BaseScoreTier => {
  const safeBases = normalizeBases(bases);
  for (const tier of BASE_SCORE_TIERS) {
    if (safeBases >= tier.minBases) {
      return tier;
    }
  }
  return BASE_SCORE_TIERS[BASE_SCORE_TIERS.length - 1]!;
};

/** Formats the Reddit user flair text with total bases and tier title. */
export const formatBaseScoreFlairText = (bases: number): string => {
  const safeBases = normalizeBases(bases);
  const tier = getBaseScoreTier(safeBases);
  return `⚾ ${safeBases} ${safeBases === 1 ? 'Base' : 'Bases'} · ${tier.label}`;
};

/** Checks whether a username is a valid Reddit username eligible for user flair. */
export const isFlairEligibleUsername = (username?: string): username is string => {
  if (!username) return false;
  const trimmed = username.trim();
  if (!trimmed || trimmed.toLowerCase() === 'anonymous' || trimmed.startsWith('t2_')) {
    return false;
  }
  return true;
};
