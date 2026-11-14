import type { HomeRunOutcome } from '../../../shared/types/homeRun';

type RoundPipsProps = {
  total: number;
  outcomes: readonly HomeRunOutcome[];
  /** Index of the round in play, or null when none is (intro / result). */
  activeRound: number | null;
  /** Optional round index currently selected (for results view inspection) */
  selectedRound?: number | null;
  /** Optional callback when a pip is clicked */
  onSelectRound?: (index: number) => void;
};

const pipClass = (outcome: HomeRunOutcome | undefined, isActive: boolean, isSelected: boolean): string => {
  if (isSelected) return 'bg-yellow-400 border-2 border-indigo-950 text-indigo-950 scale-125 ring-2 ring-indigo-900 shadow-md';
  if (outcome === 'correct') return 'bg-green-500 border-green-700 text-white';
  if (outcome) return 'bg-red-500 border-red-700 text-white';
  if (isActive) return 'bg-yellow-300 border-2 border-indigo-950 text-indigo-950 scale-110';
  return 'bg-slate-200 border-slate-300 text-slate-500';
};

/** Row of numbered pips showing progress through the ladder, clickable when onSelectRound is provided. */
export const RoundPips = ({ total, outcomes, activeRound, selectedRound = null, onSelectRound }: RoundPipsProps) => (
  <ol className="flex items-center gap-2 py-1" aria-label="Round progress">
    {Array.from({ length: total }, (_, i) => {
      const isSelected = selectedRound === i;
      const isActive = activeRound === i;
      const buttonContent = (
        <span
          className={`w-7 h-7 rounded-full border-2 text-xs font-black flex items-center justify-center transition-all ${pipClass(
            outcomes[i],
            isActive,
            isSelected
          )}`}
        >
          {i + 1}
        </span>
      );

      if (onSelectRound) {
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSelectRound(i)}
              className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-full"
              aria-label={`View stats for Question ${i + 1}`}
              aria-pressed={isSelected}
            >
              {buttonContent}
            </button>
          </li>
        );
      }

      return (
        <li key={i}>
          {buttonContent}
        </li>
      );
    })}
  </ol>
);
