import { HOME_RUN_ROUND_COUNT, countBases, isHomeRun } from '../../../shared/homeRun/engine';
import type { HomeRunGameState } from '../../../shared/types/homeRun';
import { ErrorState } from '../../components/ErrorState';
import { BaseRunningAnimation } from './BaseRunningAnimation';
import { CountdownBar } from './CountdownBar';
import { IntroPanel } from './IntroPanel';
import { MatchupBoard } from './MatchupBoard';
import { ResultScreen } from './ResultScreen';
import { RoundPips } from './RoundPips';
import { SoundToggleButton } from './SoundToggleButton';
import { StadiumBackground } from './StadiumBackground';
import { useHomeRunGame } from '../hooks/useHomeRunGame';

type HomeRunGameProps = {
  state: HomeRunGameState;
  onReset: () => void;
};

/**
 * Home Run Game:
 * Wraps the gameplay in an immersive baseball stadium with crowds.
 *
 * Camera effects:
 * - Slowly edges forward as the countdown clock ticks down.
 * - Smashes through glass with a dramatic forward surge.
 * - Zooms back abruptly on incorrect pane hit.
 */
export const HomeRunGame = ({ state, onReset }: HomeRunGameProps) => {
  const game = useHomeRunGame(state);
  const { phase, outcomes, activeRound, runningToBase, completeBaseRun } = game;

  if (game.error) {
    return <ErrorState error={game.error} onRetry={() => window.location.reload()} />;
  }

  const matchup = state.rounds[activeRound];
  const isPlaying =
    (phase === 'live' ||
      phase === 'resolving' ||
      phase === 'smash' ||
      phase === 'miss' ||
      phase === 'timeout' ||
      phase === 'serving') &&
    matchup;
  const bases = countBases(outcomes);
  const wonHomeRun = isHomeRun(outcomes);

  const timeProgress = Math.max(0, Math.min(1, 1 - game.msLeft / (state.timeLimitMs || 10000)));

  // Outer container zoom calculation:
  // - intro / first_hit: 0 (overview)
  // - playing (smash): large forward surge (+1.65)
  // - playing (miss): zoom back abruptly (0.45)
  // - playing: activeRound + 1
  // - running_base: activeRound + 1.3
  // - result: if won home run, zoomLevel 5 (deep into crowd!), otherwise based on bases reached
  let overallZoom = activeRound + 1;
  if (phase === 'intro') {
    overallZoom = 0;
  } else if (phase === 'smash') {
    overallZoom += 0.4;
  } else if (phase === 'miss') {
    overallZoom = 0.45;
  } else if (phase === 'timeout') {
    overallZoom = 0.6;
  } else if (phase === 'running_base') {
    overallZoom = activeRound + 1.1;
  } else if (phase === 'result') {
    overallZoom = wonHomeRun ? 5 : Math.max(1, bases);
  }

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center p-0.5 sm:p-1.5 select-none overflow-hidden bg-[#1399FF]">
      {/* Stadium backdrop across full viewport */}
      <StadiumBackground
        round={phase === 'intro' ? 0 : phase === 'result' ? (wonHomeRun ? 5 : Math.max(1, bases)) : activeRound + 1}
        phase={phase}
        zoomLevel={overallZoom}
        timeProgress={phase === 'live' || phase === 'serving' ? timeProgress : 0}
        audience={state.audience}
      />

      {/* Main Game Card Floating above the Stadium with clean border outline */}
      <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-2xl border-3 border-indigo-950 w-full max-w-xl p-2.5 sm:p-3.5 h-full max-h-full flex flex-col justify-between overflow-hidden">
        {isPlaying && matchup && (
          <div className="flex flex-col h-full gap-2">
            <div className="flex items-center justify-between gap-2 shrink-0">
              <RoundPips total={HOME_RUN_ROUND_COUNT} outcomes={outcomes} activeRound={activeRound} />
              <SoundToggleButton />
            </div>
            <div className="shrink-0">
              <CountdownBar msLeft={game.msLeft} totalMs={state.timeLimitMs} />
            </div>
            <div className="flex-1 min-h-0 relative">
              <MatchupBoard
                key={activeRound}
                matchup={matchup}
                phase={phase}
                pick={game.pick}
                reveal={game.reveal}
                snoovatarUrl={state.snoovatarUrl}
                audience={state.audience}
                roundIndex={activeRound}
                msLeft={game.msLeft}
                timeLimitMs={state.timeLimitMs}
                onChoose={game.choose}
              />
            </div>
          </div>
        )}

        {phase === 'intro' && (
          <IntroPanel
            ladderTitle={state.ladderTitle}
            puzzleNumber={state.puzzleNumber}
            timeLimitMs={state.timeLimitMs}
            outcomes={outcomes}
            snoovatarUrl={state.snoovatarUrl}
            onPlay={() => void game.begin()}
          />
        )}

        {phase === 'running_base' && (
          <BaseRunningAnimation
            toBase={runningToBase}
            snoovatarUrl={state.snoovatarUrl}
            matchup={matchup}
            reveal={game.reveal}
            onComplete={completeBaseRun}
          />
        )}

        {phase === 'result' && (
          <ResultScreen
            outcomes={outcomes}
            rounds={state.rounds}
            reveals={game.reveals}
            stats={game.stats}
            snoovatarUrl={state.snoovatarUrl}
            username={state.username}
            lifetimeStats={game.lifetimeStats ?? state.lifetimeStats}
            onTryAgain={game.tryAgain}
            onReset={state.canReset ? onReset : undefined}
          />
        )}
      </div>
    </div>
  );
};
