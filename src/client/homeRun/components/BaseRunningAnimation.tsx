import { useEffect, useState } from 'react';
import { SnooAvatar } from './SnooAvatar';

type BaseRunningAnimationProps = {
  /** Target base reached: 1 = First base, 2 = Second base, 3 = Third base, 4 = Home plate (Home Run) */
  toBase: number;
  snoovatarUrl?: string | undefined;
  onComplete: () => void;
};

type Point = { x: number; y: number };

type RouteInfo = {
  from: Point;
  to: Point;
  fromName: string;
  toName: string;
  hitType: string;
  safeLabel: string;
  emoji: string;
  facing: 'right' | 'left';
};

/** Exact coordinates on the 100x100 SVG diamond grid */
const BASE_POINTS = {
  home: { x: 50, y: 82.5 },
  first: { x: 82.5, y: 50 },
  second: { x: 50, y: 17.5 },
  third: { x: 17.5, y: 50 },
} as const;

const DEFAULT_ROUTE: RouteInfo = {
  from: BASE_POINTS.home,
  to: BASE_POINTS.first,
  fromName: 'Home Plate',
  toName: '1st Base',
  hitType: 'SINGLE!',
  safeLabel: 'SAFE AT 1ST!',
  emoji: '⚾',
  facing: 'right', // moving up-right along first baseline
};

/** Rush routes based on the base the player is on and going to */
const RUSH_ROUTES: Record<number, RouteInfo> = {
  1: DEFAULT_ROUTE,
  2: {
    from: BASE_POINTS.first,
    to: BASE_POINTS.second,
    fromName: '1st Base',
    toName: '2nd Base',
    hitType: 'DOUBLE!',
    safeLabel: 'SAFE AT 2ND!',
    emoji: '⚡',
    facing: 'left', // moving up-left along second baseline
  },
  3: {
    from: BASE_POINTS.second,
    to: BASE_POINTS.third,
    fromName: '2nd Base',
    toName: '3rd Base',
    hitType: 'TRIPLE!',
    safeLabel: 'SAFE AT 3RD!',
    emoji: '🔥',
    facing: 'left', // moving down-left along third baseline
  },
  4: {
    from: BASE_POINTS.third,
    to: BASE_POINTS.home,
    fromName: '3rd Base',
    toName: 'Home Plate',
    hitType: 'HOME RUN!',
    safeLabel: 'TOUCHED HOME!',
    emoji: '🏆',
    facing: 'right', // moving down-right along home stretch
  },
};

/** Pentagonal Home Plate */
const HomePlate = ({
  isTarget,
  isVisited,
  arrived,
}: {
  isTarget: boolean;
  isVisited: boolean;
  arrived: boolean;
}) => (
  <svg
    viewBox="0 0 30 30"
    className={`w-9 h-9 sm:w-10 sm:h-10 pointer-events-none transition-transform duration-300 drop-shadow-md ${
      isTarget && arrived ? 'scale-115' : ''
    }`}
  >
    <path
      d="M 5 6 L 25 6 L 25 16 L 15 26 L 5 16 Z"
      fill={isTarget && arrived ? '#FACC15' : isTarget ? '#FEF08A' : isVisited ? '#E2E8F0' : '#FFFFFF'}
      stroke="#1E1B4B"
      strokeWidth={isTarget ? '2.5' : '2'}
      strokeLinejoin="round"
    />
    <text
      x="15"
      y="14"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="11"
      fontWeight="900"
      fill="#1E1B4B"
    >
      H
    </text>
  </svg>
);

/** Diamond canvas bag for 1st, 2nd, and 3rd Base */
const DiamondBase = ({
  number,
  isTarget,
  isVisited,
  arrived,
}: {
  number: number;
  isTarget: boolean;
  isVisited: boolean;
  arrived: boolean;
}) => (
  <svg
    viewBox="0 0 30 30"
    className={`w-8 h-8 sm:w-9 sm:h-9 pointer-events-none transition-transform duration-300 drop-shadow-md ${
      isTarget && arrived ? 'scale-115' : ''
    }`}
  >
    <rect
      x="7"
      y="7"
      width="16"
      height="16"
      rx="2"
      transform="rotate(45 15 15)"
      fill={isTarget && arrived ? '#FACC15' : isTarget ? '#FEF08A' : isVisited ? '#E2E8F0' : '#FFFFFF'}
      stroke="#1E1B4B"
      strokeWidth={isTarget ? '2.5' : '2'}
      strokeLinejoin="round"
    />
    <text
      x="15"
      y="15"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="10"
      fontWeight="900"
      fill="#1E1B4B"
    >
      {number}
    </text>
  </svg>
);

/** Determines visited vs target state for each base index */
const getBaseState = (index: number, toBase: number) => {
  if (toBase === 1) {
    return { isTarget: index === 1, isVisited: index === 0 };
  }
  if (toBase === 2) {
    return { isTarget: index === 2, isVisited: index === 0 || index === 1 };
  }
  if (toBase === 3) {
    return { isTarget: index === 3, isVisited: index === 0 || index === 1 || index === 2 };
  }
  if (toBase === 4) {
    return { isTarget: index === 0, isVisited: index === 1 || index === 2 || index === 3 };
  }
  return { isTarget: false, isVisited: false };
};

/**
 * Scaled-up 4-base baseball diamond animation:
 * Snoo rushes from their current base along the dirt baseline path toward the next base,
 * with dust clouds, dynamic directional running, and a slide-in 'SAFE!' celebration.
 */
export const BaseRunningAnimation = ({
  toBase,
  snoovatarUrl,
  onComplete,
}: BaseRunningAnimationProps) => {
  const [hasStarted, setHasStarted] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [phasing, setPhasing] = useState(false);
  const [isMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    const isCoarse = window.matchMedia?.('(pointer: coarse)').matches && !window.matchMedia?.('(pointer: fine)').matches;
    const hasTouchOnly = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && isMobileUA;
    return Boolean(isMobileUA || isCoarse || hasTouchOnly);
  });

  const route = RUSH_ROUTES[toBase] ?? DEFAULT_ROUTE;

  useEffect(() => {
    // 50ms: Begin sprinting down the baseline
    const startTimer = setTimeout(() => {
      setHasStarted(true);
    }, 50);

    // 900ms: Slide into base & safe slam callout
    const arriveTimer = setTimeout(() => {
      setArrived(true);
    }, 900);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(arriveTimer);
    };
  }, []);

  const handleProceed = () => {
    if (phasing) return;
    setPhasing(true);
    setTimeout(() => {
      onComplete();
    }, 180);
  };

  // Interpolated position: from starting base to target base
  const currentPos = hasStarted ? route.to : route.from;

  return (
    <div
      onClick={handleProceed}
      className={`relative w-full h-full min-h-[22rem] sm:min-h-[25rem] flex flex-col items-center justify-between p-3 rounded-2xl overflow-hidden select-none border-3 border-indigo-950 cursor-pointer
        bg-linear-to-b from-[#0A7CD5] via-[#1399FF] to-[#167027] shadow-inner ${
          phasing ? 'phase-fade-out' : 'phase-fade-in'
        }`}
      aria-label={`Running to ${route.toName}`}
    >
      {/* Center Field: Scaled-up 4-Base Baseball Diamond */}
      <div className="relative w-full flex-1 flex items-center justify-center my-1 min-h-0">
        <div className="relative w-64 h-64 xs:w-72 xs:h-72 sm:w-80 sm:h-80 aspect-square select-none">
          {/* Complete Vector Diamond with dirt track & baselines */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-md"
            aria-hidden="true"
          >
            {/* Outfield Grass Diamond */}
            <polygon
              points="50,2 98,50 50,98 2,50"
              fill="#84cc16"
              stroke="#4d7c0f"
              strokeWidth="2.5"
            />

            {/* Dirt Infield Basepath Track connecting all 4 bases with dirt cutouts */}
            <polygon
              points="50,82.5 82.5,50 50,17.5 17.5,50"
              fill="none"
              stroke="#c26a2d"
              strokeWidth="12"
              strokeLinejoin="round"
            />
            <circle cx="50" cy="82.5" r="7.5" fill="#c26a2d" />
            <circle cx="82.5" cy="50" r="7" fill="#c26a2d" />
            <circle cx="50" cy="17.5" r="7" fill="#c26a2d" />
            <circle cx="17.5" cy="50" r="7" fill="#c26a2d" />

            {/* Center Infield Grass */}
            <polygon
              points="50,72 72,50 50,28 28,50"
              fill="#84cc16"
            />

            {/* Pitcher's Mound in Center */}
            <ellipse cx="50" cy="50" rx="6.5" ry="6.5" fill="#b45309" />
            <ellipse cx="50" cy="50" rx="5" ry="5" fill="#d97706" />
            <rect x="47.5" y="49" width="5" height="2" fill="#ffffff" rx="0.5" />

            {/* White Chalk Foul Lines & Baselines running through all bases */}
            <line x1="50" y1="82.5" x2="8.5" y2="41" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
            <line x1="50" y1="82.5" x2="91.5" y2="41" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
            <polygon
              points="50,82.5 82.5,50 50,17.5 17.5,50"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.6"
              opacity="0.95"
            />

            {/* Active Running Baseline: Glowing golden pulse along the route */}
            <line
              x1={route.from.x}
              y1={route.from.y}
              x2={route.to.x}
              y2={route.to.y}
              stroke="#fde047"
              strokeWidth="3.2"
              strokeDasharray="4 2.5"
              className="animate-pulse"
              opacity="0.95"
            />
          </svg>

          {/* Destination Base Glowing Beacon */}
          {!arrived && (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full border-2 border-yellow-300 animate-ping opacity-75 pointer-events-none z-15"
              style={{ left: `${route.to.x}%`, top: `${route.to.y}%` }}
            />
          )}

          {/* Destination Base Arrival Ripple */}
          {arrived && (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-3 border-yellow-400 bg-yellow-300/25 animate-pop-bounce pointer-events-none z-15"
              style={{ left: `${route.to.x}%`, top: `${route.to.y}%` }}
            />
          )}

          {/* Base 0: Home Plate (50%, 82.5%) */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
            style={{ left: `${BASE_POINTS.home.x}%`, top: `${BASE_POINTS.home.y}%` }}
          >
            {(() => {
              const { isTarget, isVisited } = getBaseState(0, toBase);
              return <HomePlate isTarget={isTarget} isVisited={isVisited} arrived={arrived} />;
            })()}
          </div>

          {/* Base 1: 1st Base (82.5%, 50%) */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
            style={{ left: `${BASE_POINTS.first.x}%`, top: `${BASE_POINTS.first.y}%` }}
          >
            {(() => {
              const { isTarget, isVisited } = getBaseState(1, toBase);
              return (
                <DiamondBase
                  number={1}
                  isTarget={isTarget}
                  isVisited={isVisited}
                  arrived={arrived}
                />
              );
            })()}
          </div>

          {/* Base 2: 2nd Base (50%, 17.5%) */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
            style={{ left: `${BASE_POINTS.second.x}%`, top: `${BASE_POINTS.second.y}%` }}
          >
            {(() => {
              const { isTarget, isVisited } = getBaseState(2, toBase);
              return (
                <DiamondBase
                  number={2}
                  isTarget={isTarget}
                  isVisited={isVisited}
                  arrived={arrived}
                />
              );
            })()}
          </div>

          {/* Base 3: 3rd Base (17.5%, 50%) */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
            style={{ left: `${BASE_POINTS.third.x}%`, top: `${BASE_POINTS.third.y}%` }}
          >
            {(() => {
              const { isTarget, isVisited } = getBaseState(3, toBase);
              return (
                <DiamondBase
                  number={3}
                  isTarget={isTarget}
                  isVisited={isVisited}
                  arrived={arrived}
                />
              );
            })()}
          </div>

          {/* SNOO RUNNING / SLIDING ACROSS THE DIRT BASELINE */}
          <div
            className="absolute pointer-events-none z-30 flex flex-col items-center"
            style={{
              left: `${currentPos.x}%`,
              top: `${currentPos.y}%`,
              transform: 'translate(-50%, -85%)',
              transition:
                'left 850ms cubic-bezier(0.2, 0.8, 0.25, 1), top 850ms cubic-bezier(0.2, 0.8, 0.25, 1)',
            }}
          >
            {/* Snoo Avatar with running bob while rushing, or excited jumping once arrived */}
            <div
              className={`relative ${
                !arrived ? 'snoo-run transition-transform duration-200' : 'base-excited-jump'
              }`}
              style={
                !arrived
                  ? {
                      transform:
                        route.facing === 'left'
                          ? 'scaleX(-1) rotate(8deg)'
                          : 'scaleX(1) rotate(-8deg)',
                    }
                  : undefined
              }
            >
              <SnooAvatar src={snoovatarUrl} size={50} className="drop-shadow-lg" />

              {/* Dust clouds trailing while running */}
              {hasStarted && !arrived && (
                <span
                  className={`absolute text-lg dust-cloud pointer-events-none ${
                    route.facing === 'right' ? '-left-4 bottom-1' : '-right-4 bottom-1'
                  }`}
                >
                  💨
                </span>
              )}
            </div>

            {/* Runner ground shadow beneath Snoo's feet */}
            <div className="w-6 h-2 rounded-full bg-black/30 blur-[1px] -mt-1 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Bottom Area: Safe Callout & Proceed Prompt */}
      <div className="relative z-20 flex flex-col items-center gap-2 mb-2 shrink-0">
        {arrived ? (
          <div className="flex flex-col items-center gap-1.5 animate-pop-bounce">
            <div className="safe-slam bg-yellow-400 text-indigo-950 font-black text-sm sm:text-base px-6 py-1.5 rounded-full border-3 border-indigo-950 shadow-xl flex items-center gap-1.5">
              <span>⚾</span>
              <span>{route.safeLabel}</span>
              <span>✓</span>
            </div>
          </div>
        ) : (
          <div className="bg-sky-950/75 text-white font-bold text-xs px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-xs flex items-center gap-1.5 shadow-md">
            <span>Sprinting hard down the baseline...</span>
            <span className="animate-pulse">⚡</span>
          </div>
        )}

        <span className="text-[10px] sm:text-[11px] font-bold text-white/90 uppercase tracking-wider animate-pulse">
          {isMobile ? 'Tap anywhere to continue' : 'Click anywhere to continue'}
        </span>
      </div>
    </div>
  );
};
