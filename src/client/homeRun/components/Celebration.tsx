import { SnooAvatar } from './SnooAvatar';

type CelebrationProps = {
  snoovatarUrl?: string | undefined;
  /** Optional round index currently selected for question inspection */
  selectedRound?: number | null;
  /** Optional callback when a base/round is clicked */
  onSelectRound?: (index: number) => void;
};

const CONFETTI_COLORS = ['bg-yellow-400', 'bg-pink-500', 'bg-sky-400', 'bg-green-500', 'bg-orange-500'] as const;
const CONFETTI_COUNT = 16;

const confettiStyle = (i: number) => ({
  left: `${(i * 41) % 100}%`,
  '--delay': `${(i % 8) * 0.25}s`,
  '--dur': `${1.8 + (i % 5) * 0.3}s`,
});

/** Snoovatar celebrating a home run, with confetti and clickable round pill quick-actions. */
export const Celebration = ({ snoovatarUrl, selectedRound = null, onSelectRound }: CelebrationProps) => (
  <div className="relative w-full max-w-[280px] h-40 sm:h-44 mx-auto overflow-hidden rounded-2xl bg-linear-to-b from-sky-300 to-lime-400 border-3 border-indigo-950 flex flex-col justify-between shrink-0 shadow-sm">
    {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
      <span
        key={i}
        className={`confetti absolute top-0 w-2 h-2.5 rounded-xs pointer-events-none ${CONFETTI_COLORS[i % CONFETTI_COLORS.length]}`}
        style={confettiStyle(i)}
      />
    ))}

    <div className="celebrate absolute inset-0 flex items-end justify-center pb-2 pointer-events-none">
      <SnooAvatar src={snoovatarUrl} size={130} />
    </div>

    <div className="relative z-10 flex items-center justify-between px-3 pt-2 pointer-events-none">
      <span className="text-xl" role="img" aria-label="Trophy">
        🏆
      </span>
      <span className="text-xl" role="img" aria-label="Celebrating">
        🙌
      </span>
    </div>

    {onSelectRound && (
      <div className="relative z-20 flex items-center justify-center gap-1.5 pb-2 px-2 bg-gradient-to-t from-black/40 to-transparent pt-3">
        <span className="text-[10px] font-black uppercase tracking-wider text-white drop-shadow-xs mr-1">
          Bases:
        </span>
        {[0, 1, 2, 3].map((r) => {
          const isSelected = selectedRound === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onSelectRound(r)}
              className={`w-6 h-6 rounded-full font-black text-[11px] border flex items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-yellow-400 border-white text-indigo-950 scale-115 ring-2 ring-yellow-400 shadow-md'
                  : 'bg-white/90 border-slate-700 text-indigo-950 hover:bg-yellow-200'
              }`}
              aria-label={`View stats for Round ${r + 1}`}
            >
              Q{r + 1}
            </button>
          );
        })}
      </div>
    )}
  </div>
);
