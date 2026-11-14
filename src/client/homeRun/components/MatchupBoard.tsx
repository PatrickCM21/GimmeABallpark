import { useRef } from 'react';
import type { HomeRunMatchupPublic, HomeRunReveal, HomeRunSide } from '../../../shared/types/homeRun';
import { BALL_SIZE_PX } from '../constants';
import { getLaunchPoint, useElementSize, usePointerPosition, type Point } from '../hooks/useArenaGeometry';
import type { HomeRunPhase, PickTarget } from '../hooks/useHomeRunGame';
import { BallCursor, type BallVariant } from './BallCursor';
import { GlassPane, type GlassPaneStatus } from './GlassPane';
import { SnooAvatar } from './SnooAvatar';
import { StadiumBackground } from './StadiumBackground';

type MatchupBoardProps = {
  matchup: HomeRunMatchupPublic;
  phase: HomeRunPhase;
  pick: PickTarget | null;
  reveal: HomeRunReveal | null;
  snoovatarUrl?: string | undefined;
  audience?: import('../../../shared/types/homeRun').HomeRunAudienceMember[] | undefined;
  /** Current round index (0 to 3) */
  roundIndex: number;
  /** Milliseconds remaining on the timer for dynamic camera edge-forward */
  msLeft?: number;
  /** Total round time limit in ms (default 10,000) */
  timeLimitMs?: number;
  onChoose: (side: HomeRunSide, point: Point) => void;
};

const BALL_VARIANT_BY_PHASE: Record<HomeRunPhase, BallVariant> = {
  intro: 'hidden',
  first_hit: 'hidden',
  running_base: 'hidden',
  result: 'hidden',
  serving: 'follow',
  live: 'follow',
  resolving: 'strike',
  smash: 'smash',
  miss: 'bounce',
  timeout: 'fall',
};

const SIDES: readonly HomeRunSide[] = ['a', 'b'];

const paneStatus = (side: HomeRunSide, phase: HomeRunPhase, pick: PickTarget | null): GlassPaneStatus => {
  if (pick?.side !== side) return 'idle';
  if (phase === 'smash') return 'smashed';
  if (phase === 'miss') return 'cracked';
  return 'idle';
};

/**
 * The play area: features the live interactive stadium background.
 *
 * Dynamic camera behavior:
 * 1. As time ticks down, camera edges forward slowly.
 * 2. When glass is smashed, a massive dramatic zoom surges in forward into the crowd (+1.65 scale).
 * 3. When an incorrect answer is struck, camera pulls back abruptly (zoomLevel drops to 0.45).
 */
export const MatchupBoard = ({
  matchup,
  phase,
  pick,
  reveal,
  snoovatarUrl,
  audience,
  roundIndex,
  msLeft = 10000,
  timeLimitMs = 10000,
  onChoose,
}: MatchupBoardProps) => {
  const arenaRef = useRef<HTMLDivElement>(null);
  const { point: pointer, handlers } = usePointerPosition(arenaRef);
  const { width, height } = useElementSize(arenaRef);

  const isLive = phase === 'live';
  const center: Point = { x: width / 2, y: height / 2 };
  const cursor = pointer ?? center;

  const variant = BALL_VARIANT_BY_PHASE[phase];
  const followsCursor = variant === 'follow' || variant === 'launch';
  const ballPosition = pick && !followsCursor ? pick.point : cursor;
  const floorY = height - BALL_SIZE_PX / 2 - 4;

  // Fraction of time elapsed: 0 when full time, 1 when clock hits 0
  const timeProgress = Math.max(0, Math.min(1, 1 - msLeft / (timeLimitMs || 10000)));

  // Dynamic zoom calculation:
  // - Base zoom per round: roundIndex + 1 (1 to 4)
  // - Smash: controlled surge forward (+0.4)
  // - Miss / Wrong answer: camera pulls back abruptly (drops to 0.45)
  // - Timeout: pulls back to wide (0.6)
  let currentZoom = roundIndex + 1;
  if (phase === 'smash') {
    currentZoom += 0.4;
  } else if (phase === 'miss') {
    currentZoom = 0.45;
  } else if (phase === 'timeout') {
    currentZoom = 0.6;
  }

  const handleSelect = (side: HomeRunSide, element: HTMLElement) => {
    const arena = arenaRef.current;
    if (!isLive || !arena) return;
    const arenaRect = arena.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    onChoose(side, {
      x: rect.left - arenaRect.left + rect.width / 2,
      y: rect.top - arenaRect.top + rect.height / 2,
    });
  };

  return (
    <div
      ref={arenaRef}
      {...handlers}
      className={`relative w-full h-full min-h-[19rem] flex-1 rounded-xl overflow-hidden border-3 border-indigo-950 touch-none select-none
        shadow-inner ${isLive ? 'cursor-none' : ''}`}
    >
      {/* Stadium & Crowds Background with progressive zoom & ticking clock forward push */}
      <StadiumBackground
        round={roundIndex + 1}
        phase={phase}
        zoomLevel={currentZoom}
        timeProgress={phase === 'live' || phase === 'serving' ? timeProgress : 0}
        audience={audience}
      />

      {/* Question prompt badge */}
      <div className="relative z-10 pt-2.5 flex justify-center">
        <span className="px-5 py-1.5 rounded-full bg-indigo-950/95 backdrop-blur-xs border-2 border-yellow-400 text-yellow-300 text-sm sm:text-base font-black uppercase tracking-wider shadow-md">
          Which number is bigger?
        </span>
      </div>

      {/* Glass Target Panes */}
      <div className="relative z-10 flex flex-col sm:flex-row gap-3 px-3 pt-2.5 pb-14">
        {SIDES.map((side) => (
          <GlassPane
            key={side}
            option={matchup[side]}
            status={paneStatus(side, phase, pick)}
            revealText={reveal ? (side === 'a' ? reveal.displayA : reveal.displayB) : undefined}
            isWinner={reveal ? reveal.winner === side : undefined}
            disabled={!isLive}
            onSelect={(el) => handleSelect(side, el)}
          />
        ))}
      </div>

      {/* On-base runner status indicator */}
      <div className="absolute left-3 bottom-2.5 z-20 flex items-center gap-2 bg-indigo-950/90 backdrop-blur-xs px-2.5 py-1 rounded-full border-2 border-yellow-400 text-white text-[11px] font-black pointer-events-none shadow-lg">
        <div className="w-5 h-5 rounded-full overflow-hidden bg-white/20 border border-white/50 flex items-center justify-center">
          <SnooAvatar src={snoovatarUrl} size={20} headOnly />
        </div>
        <span className="text-yellow-300">
          {roundIndex === 0
            ? '⚾ Sprinting to 1st'
            : roundIndex === 1
            ? '🏃 On 1st Base'
            : roundIndex === 2
            ? '⚡ On 2nd Base'
            : '🔥 On 3rd Base'}
        </span>
      </div>

      <BallCursor
        variant={variant}
        position={ballPosition}
        launchFrom={getLaunchPoint(height)}
        floorY={floorY}
        bounceDirection={pick?.side === 'b' ? 1 : -1}
      />
    </div>
  );
};
