import { Suspense, lazy, useState } from 'react';
import { HOME_RUN_ROUND_COUNT, countBases, isHomeRun } from '../../../shared/homeRun/engine';
import type { HomeRunMatchupPublic, HomeRunOutcome, HomeRunReveal, HomeRunRoundStat } from '../../../shared/types/homeRun';
import type { UserLifetimeStats } from '../../../shared/types/stats';
import { BASE_LABELS } from '../constants';
import { BaseDiamond } from './BaseDiamond';
import { OutcomeBadge } from './OutcomeBadge';
import { RoundPips } from './RoundPips';
import { SoundToggleButton } from './SoundToggleButton';
import { LeaderboardModal, TrophyIcon } from './LeaderboardModal';

const LifetimeStatsModal = lazy(() =>
  import('../../components/LifetimeStatsModal').then((m) => ({ default: m.LifetimeStatsModal }))
);

const StatsIcon = ({ size = 15, className = '' }: { size?: number; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="#1E1B4B"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: '-0.15em', flexShrink: 0 }}
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#ffffff" />
    <rect x="6.5" y="11" width="3" height="7" rx="0.5" fill="#22c55e" strokeWidth="1.5" />
    <rect x="10.5" y="7" width="3" height="11" rx="0.5" fill="#ef4444" strokeWidth="1.5" />
    <rect x="14.5" y="13" width="3" height="5" rx="0.5" fill="#3b82f6" strokeWidth="1.5" />
  </svg>
);

type ResultScreenProps = {
  outcomes: readonly HomeRunOutcome[];
  rounds: readonly HomeRunMatchupPublic[];
  reveals?: readonly HomeRunReveal[] | undefined;
  stats: readonly HomeRunRoundStat[];
  snoovatarUrl?: string | undefined;
  username?: string | undefined;
  lifetimeStats?: UserLifetimeStats | undefined;
  onTryAgain: () => void;
  /** Provided only where replaying is allowed (dev subreddits). */
  onReset?: (() => void) | undefined;
};

type Headline = { title: string; subtitle: string; tone: string };

const getHeadline = (bases: number): Headline => {
  if (bases >= HOME_RUN_ROUND_COUNT) {
    return { title: 'Home Run!', subtitle: 'You cleared all four rounds. Absolute legend.', tone: 'text-green-600' };
  }
  if (bases === 0) {
    return { title: "You're out!", subtitle: 'Struck out on the very first pitch.', tone: 'text-red-600' };
  }
  return {
    title: `Stranded on ${(BASE_LABELS[bases - 1] ?? '').toLowerCase()}`,
    subtitle: `You made it past ${bases} of ${HOME_RUN_ROUND_COUNT} rounds.`,
    tone: 'text-indigo-950',
  };
};

const passRate = ({ attempts, passes }: HomeRunRoundStat): number =>
  attempts === 0 ? 0 : Math.round((passes / attempts) * 100);

/** Final screen: where the player ended up, always displaying the inspected question breakdown for the selected round. */
export const ResultScreen = ({
  outcomes,
  rounds,
  reveals,
  stats,
  snoovatarUrl,
  username,
  lifetimeStats,
  onTryAgain,
  onReset,
}: ResultScreenProps) => {
  const bases = countBases(outcomes);
  const headline = getHeadline(bases);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);

  // Starts viewing the last question attempted by the player (e.g. Q1 if out on Q1, Q4 if home run)
  const initialRound = Math.max(0, Math.min(outcomes.length - 1, rounds.length - 1));
  const [selectedRound, setSelectedRound] = useState<number>(initialRound);

  const inspectedMatchup = rounds[selectedRound];
  const inspectedReveal = reveals?.[selectedRound];
  const inspectedStat = stats[selectedRound] ?? { attempts: 0, passes: 0 };
  const inspectedOutcome = outcomes[selectedRound];
  const inspectedRate = passRate(inspectedStat);

  // Deselecting is disabled: tapping a round switches directly to it, one must always remain selected
  const handleSelectRound = (index: number) => {
    setSelectedRound(index);
  };

  return (
    <div className="relative flex flex-col items-center justify-between text-center animate-pop-bounce w-full h-full max-h-full overflow-hidden px-1 py-0.5 gap-1">
      {/* Top-left Stats & Leaderboard (icon-only on mobile, out of flow so they don't push content down) */}
      <div className="absolute top-0.5 left-0.5 z-30 flex flex-col items-start gap-1.5">
        <button
          type="button"
          onClick={() => setShowStatsModal(true)}
          className="flex items-center gap-1.5 bg-sky-100 hover:bg-sky-200 active:scale-95 text-sky-950 text-[11px] font-black uppercase tracking-wider p-1.5 sm:px-3.5 sm:py-1 rounded-full border-2 border-sky-400 shadow-[0_2px_0_0_#0284C7] cursor-pointer transition-transform"
          title="Stats"
          aria-label="Stats"
        >
          <StatsIcon className="w-6 h-6 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Stats</span>
        </button>

        <button
          type="button"
          onClick={() => setShowLeaderboardModal(true)}
          className="flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 active:scale-95 text-amber-950 text-[11px] font-black uppercase tracking-wider p-1.5 sm:px-3 sm:py-1 rounded-full border-2 border-amber-400 shadow-[0_2px_0_0_#D97706] cursor-pointer transition-transform whitespace-nowrap"
          title="Leaderboard"
          aria-label="Leaderboard"
        >
          <TrophyIcon className="w-6 h-6 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Leaderboard</span>
        </button>
      </div>

      {/* Top-right Sound Toggle (out of flow) */}
      <div className="absolute top-0.5 right-0.5 z-30">
        <SoundToggleButton />
      </div>

      {/* Header with title, subtitle, and Try Again button underneath */}
      <div className="w-full flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
        <h2
          className={`w-full pl-11 pr-24 sm:px-24 text-[clamp(0.75rem,3.4vw,1.375rem)] sm:text-[22px] font-black uppercase leading-tight text-center whitespace-nowrap ${headline.tone}`}
        >
          {headline.title}
        </h2>
        <p className="text-[11px] sm:text-xs font-semibold text-slate-600 px-11 sm:px-0">{headline.subtitle}</p>

        {/* Try Again button & notice below the title */}
        <div className="flex flex-col items-center gap-1 mt-1">
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onTryAgain}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-400 active:scale-95 text-white text-[11px] font-black uppercase tracking-wider px-4 py-1 rounded-full border-2 border-indigo-950 shadow-[0_2px_0_0_#15803d] cursor-pointer transition-transform"
              title="Try Again"
            >
              <span>↻</span>
              <span>Try Again</span>
            </button>

            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="flex items-center gap-1 bg-amber-400 hover:bg-amber-300 active:scale-95 text-amber-950 text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border-2 border-amber-600 shadow-xs cursor-pointer transition-transform"
                title="Reset ladder progress (dev mode)"
              >
                <span>↻</span>
                <span>Dev Reset</span>
              </button>
            )}
          </div>
          <p className="text-[10px] font-semibold text-slate-500 leading-tight">
            This won&apos;t count towards the leaderboard
          </p>
        </div>
      </div>

      {/* Visual field: Bird's eye diamond */}
      <BaseDiamond
        playerBases={isHomeRun(outcomes) ? 4 : bases === 1 ? 1 : bases === 2 ? 2 : bases === 3 ? 3 : 0}
        snoovatarUrl={snoovatarUrl}
        selectedBase={selectedRound}
        onSelectBase={handleSelectRound}
      />

      {/* Interactive round pips (click numbers to inspect) */}
      <div className="flex flex-col items-center gap-0.5">
        <RoundPips
          total={HOME_RUN_ROUND_COUNT}
          outcomes={outcomes}
          activeRound={null}
          selectedRound={selectedRound}
          onSelectRound={handleSelectRound}
        />
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
          Tap a base or number to inspect question
        </span>
      </div>

      {/* Inspected Question Card: Always visible for the selected round */}
      <div className="w-full text-left mt-auto shrink-0 pb-1">
        {inspectedMatchup && inspectedStat && (
          <div className="rounded-xl bg-yellow-50/95 border-2 border-indigo-950 p-2 sm:p-2.5 animate-card-enter">
            <div className="flex items-center justify-between gap-2 border-b border-yellow-200 pb-1 mb-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-950 text-yellow-300 border border-yellow-400 text-xs flex items-center justify-center font-black shadow-xs">
                  {selectedRound + 1}
                </span>
                Question {selectedRound + 1} Breakdown
              </span>
              <div className="flex items-center gap-1.5">
                <OutcomeBadge outcome={inspectedOutcome} className="w-5 h-5" />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="min-w-0 text-center">
                <p className="text-xs font-black text-slate-800 leading-snug">
                  {inspectedMatchup.a.emoji} {inspectedMatchup.a.label}
                </p>
                {inspectedReveal && (
                  <p
                    className={`mt-0.5 text-xs font-black leading-tight ${
                      inspectedReveal.winner === 'a' ? 'text-green-700' : 'text-slate-600'
                    }`}
                  >
                    {inspectedReveal.displayA}
                  </p>
                )}
              </div>
              <span className="text-slate-400 font-bold text-xs">vs</span>
              <div className="min-w-0 text-center">
                <p className="text-xs font-black text-slate-800 leading-snug">
                  {inspectedMatchup.b.emoji} {inspectedMatchup.b.label}
                </p>
                {inspectedReveal && (
                  <p
                    className={`mt-0.5 text-xs font-black leading-tight ${
                      inspectedReveal.winner === 'b' ? 'text-green-700' : 'text-slate-600'
                    }`}
                  >
                    {inspectedReveal.displayB}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-1.5 h-2.5 rounded-full bg-white border border-amber-300 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  inspectedRate > 60 ? 'bg-green-500' : inspectedRate > 30 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${inspectedRate}%` }}
              />
            </div>

            <div className="mt-1 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>
                {inspectedStat.attempts === 0
                  ? 'No community attempts yet'
                  : `${inspectedStat.passes.toLocaleString()} of ${inspectedStat.attempts.toLocaleString()} survived`}
              </span>
              <span className="font-black text-indigo-950 text-sm">{inspectedRate}% pass rate</span>
            </div>
          </div>
        )}
      </div>

      {showStatsModal && (
        <Suspense fallback={null}>
          <LifetimeStatsModal
            show={showStatsModal}
            onClose={() => setShowStatsModal(false)}
            stats={lifetimeStats}
            username={username}
            snoovatarUrl={snoovatarUrl}
          />
        </Suspense>
      )}

      <LeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        currentUsername={username}
        snoovatarUrl={snoovatarUrl}
      />
    </div>
  );
};
