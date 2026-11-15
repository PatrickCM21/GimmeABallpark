import { useState } from 'react';
import { HOME_RUN_ROUND_COUNT, countBases, isHomeRun } from '../../../shared/homeRun/engine';
import type { HomeRunMatchupPublic, HomeRunOutcome, HomeRunRoundStat } from '../../../shared/types/homeRun';
import type { UserLifetimeStats } from '../../../shared/types/stats';
import { BASE_LABELS } from '../constants';
import { BaseDiamond } from './BaseDiamond';
import { OutcomeBadge } from './OutcomeBadge';
import { RoundPips } from './RoundPips';
import { SoundToggleButton } from './SoundToggleButton';
import { LifetimeStatsModal } from '../../components/LifetimeStatsModal';

type ResultScreenProps = {
  outcomes: readonly HomeRunOutcome[];
  rounds: readonly HomeRunMatchupPublic[];
  stats: readonly HomeRunRoundStat[];
  snoovatarUrl?: string | undefined;
  username?: string | undefined;
  lifetimeStats?: UserLifetimeStats | undefined;
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
  stats,
  snoovatarUrl,
  username,
  lifetimeStats,
  onReset,
}: ResultScreenProps) => {
  const bases = countBases(outcomes);
  const headline = getHeadline(bases);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Starts viewing the last question attempted by the player (e.g. Q1 if out on Q1, Q4 if home run)
  const initialRound = Math.max(0, Math.min(outcomes.length - 1, rounds.length - 1));
  const [selectedRound, setSelectedRound] = useState<number>(initialRound);

  const inspectedMatchup = rounds[selectedRound];
  const inspectedStat = stats[selectedRound] ?? { attempts: 0, passes: 0 };
  const inspectedOutcome = outcomes[selectedRound];
  const inspectedRate = passRate(inspectedStat);

  // Deselecting is disabled: tapping a round switches directly to it, one must always remain selected
  const handleSelectRound = (index: number) => {
    setSelectedRound(index);
  };

  return (
    <div className="relative flex flex-col items-center justify-between text-center animate-pop-bounce w-full h-full max-h-full overflow-hidden px-1 py-0.5 gap-1">
      {/* Top-right Sound Toggle */}
      <div className="absolute top-0.5 right-0.5 z-30">
        <SoundToggleButton />
      </div>

      {/* Header with title, subtitle, and action buttons underneath */}
      <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
        <h2 className={`text-xl sm:text-2xl font-black uppercase leading-tight ${headline.tone}`}>{headline.title}</h2>
        <p className="text-[11px] sm:text-xs font-semibold text-slate-600">{headline.subtitle}</p>

        {/* Action buttons below the title so they never overlap */}
        <div className="flex items-center justify-center gap-2 mt-1">
          <button
            type="button"
            onClick={() => setShowStatsModal(true)}
            className="flex items-center gap-1.5 bg-sky-100 hover:bg-sky-200 active:scale-95 text-sky-950 text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full border-2 border-sky-400 shadow-[0_2px_0_0_#0284C7] cursor-pointer transition-transform"
            title="Stats"
          >
            <span>📊</span>
            <span>Stats</span>
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
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
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

            <p className="text-xs font-black text-slate-800 leading-snug">
              {inspectedMatchup.a.emoji} {inspectedMatchup.a.label}
              <span className="text-slate-400 font-bold mx-1">vs</span>
              {inspectedMatchup.b.emoji} {inspectedMatchup.b.label}
            </p>

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

      <LifetimeStatsModal
        show={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        stats={lifetimeStats}
        username={username}
        snoovatarUrl={snoovatarUrl}
      />
    </div>
  );
};
