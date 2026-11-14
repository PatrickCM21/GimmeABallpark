import { useId, type CSSProperties } from 'react';

export type HurlingBallSpinMode = '2d' | '3d';

export type HurlingBallProps = {
  /** Diameter of the baseball in pixels (defaults to 36px). The wind overflows this box. */
  size?: number;
  /**
   * Direction (degrees) the wind trails towards. 0 = right, 90 = down (ball flying up), 180 = left, 270 = up.
   * Defaults to 90.
   */
  windAngle?: number;
  /** Show the wind arcs and streaks. Defaults to true. */
  showWind?: boolean;
  /** 'intense' speeds everything up and thickens the wind (hits / strikes). */
  intensity?: 'normal' | 'intense';
  /** Spin the ball. Defaults to true. */
  spinning?: boolean;
  /**
   * How the spin is drawn:
   * - '2d': standard 2D transform: rotate() around the center of the baseball.
   * - '3d': SVG <clipPath> that translates the red stitched seams vertically to simulate a 3D forward-rolling spin.
   * Defaults to '2d'.
   */
  spinMode?: HurlingBallSpinMode;
  /** Subtle air-turbulence jitter. Defaults to true. */
  wobble?: boolean;
  className?: string;
  style?: CSSProperties;
};

/* ------------------------------------------------------------------ */
/* Geometry (SVG user units). Ball is centered on (0, 0) with radius 20. */
/* ------------------------------------------------------------------ */

const BALL_R = 20;
const VIEW = { x: -42, y: -50, w: 84, h: 122 } as const;
const BALL_D = BALL_R * 2;
/** Vertical distance the 3D seam tile scrolls per loop (one full revolution). */
const SEAM_TILE = 40;

type Pt = readonly [number, number];
type Cubic = readonly [Pt, Pt, Pt, Pt];

const cubicPath = ([a, b, c, d]: Cubic) =>
  `M ${a[0]} ${a[1]} C ${b[0]} ${b[1]} ${c[0]} ${c[1]} ${d[0]} ${d[1]}`;

const shiftY = (curve: Cubic, dy: number): Cubic =>
  curve.map(([x, y]) => [x, y + dy] as const) as unknown as Cubic;

/** Short stitch ticks drawn perpendicular to a cubic seam. */
const stitchesFor = ([p0, p1, p2, p3]: Cubic, count: number, len: number) => {
  const ticks: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = 0.08 + (0.84 * i) / (count - 1);
    const mt = 1 - t;
    const x =
      mt ** 3 * p0[0] +
      3 * mt ** 2 * t * p1[0] +
      3 * mt * t ** 2 * p2[0] +
      t ** 3 * p3[0];
    const y =
      mt ** 3 * p0[1] +
      3 * mt ** 2 * t * p1[1] +
      3 * mt * t ** 2 * p2[1] +
      t ** 3 * p3[1];
    const dx =
      3 * mt ** 2 * (p1[0] - p0[0]) +
      6 * mt * t * (p2[0] - p1[0]) +
      3 * t ** 2 * (p3[0] - p2[0]);
    const dy =
      3 * mt ** 2 * (p1[1] - p0[1]) +
      6 * mt * t * (p2[1] - p1[1]) +
      3 * t ** 2 * (p3[1] - p2[1]);
    const mag = Math.hypot(dx, dy) || 1;
    const nx = -dy / mag;
    const ny = dx / mag;
    const h = len / 2;
    ticks.push({
      x1: x - nx * h,
      y1: y - ny * h,
      x2: x + nx * h,
      y2: y + ny * h,
    });
  }
  return ticks;
};

/**
 * Classic ")(" curved red stitched seams on left and right for 2D spin.
 */
const SEAMS_2D: readonly Cubic[] = [
  [[-14, -20], [-4.2, -9], [-4.2, 9], [-14, 20]],
  [[14, -20], [4.2, -9], [4.2, 9], [14, 20]],
];

/**
 * Forward-rolling arched seams for 3D forward spin.
 * Arches curve horizontally across the sphere and tile vertically every SEAM_TILE (40px)
 * creating the continuous illusion of a 3D baseball tumbling/rolling forward.
 */
const SEAMS_3D_TILE: readonly Cubic[] = [
  [[-20, -18], [-8, -7], [8, -7], [20, -18]],
  [[-20, 18], [-8, 7], [8, 7], [20, 18]],
];

/** Layer 1: Top Wind Arcs (inner & outer dome arcs on left and right + vertical center line). */
const TOP_ARCS = [
  { d: 'M -4 -26 C -19 -25 -28 -13 -26 7', delayFrac: 0.0, width: 2.1 },   // inner left dome arc
  { d: 'M 4 -26 C 19 -25 28 -13 26 7', delayFrac: 0.5, width: 2.1 },      // inner right dome arc
  { d: 'M -8 -35 C -27 -31 -36 -15 -34 12', delayFrac: 0.25, width: 1.8 }, // outer left dome arc
  { d: 'M 8 -35 C 27 -31 36 -15 34 12', delayFrac: 0.75, width: 1.8 },     // outer right dome arc
  { d: 'M 0 -45 L 0 -24', delayFrac: 0.15, width: 2.0 },                   // vertical center line
] as const;

/** Layer 3: Bottom Wind Streaks trailing off the bottom half of the ball. */
const BOTTOM_STREAKS = [
  { x: -15, y1: 10, y2: 44, delayFrac: 0.1, width: 1.8 },
  { x: -7.5, y1: 16, y2: 56, delayFrac: 0.6, width: 2.0 },
  { x: 0, y1: 19, y2: 64, delayFrac: 0.35, width: 2.2 },
  { x: 7.5, y1: 16, y2: 56, delayFrac: 0.85, width: 2.0 },
  { x: 15, y1: 10, y2: 44, delayFrac: 0.45, width: 1.8 },
] as const;

const Seam = ({ curve }: { curve: Cubic }) => (
  <g>
    <path
      d={cubicPath(curve)}
      fill="none"
      stroke="#EF4444"
      strokeWidth={2.2}
      strokeLinecap="round"
    />
    <g stroke="#DC2626" strokeWidth={1.6} strokeLinecap="round">
      {stitchesFor(curve, 7, 4.4).map((s, i) => (
        <line key={i} {...s} />
      ))}
    </g>
  </g>
);

/**
 * Self-contained React component using inline SVG and CSS keyframes that recreates
 * and animates the baseball-with-wind graphic.
 *
 * Broken into three distinct layers inside a single SVG:
 * 1. Top Wind Arcs: Curved <path> elements above and around the top of the ball
 *    (inner & outer dome arcs on left and right, plus vertical center line) with a cyan/white outer glow.
 * 2. The Baseball: Circular baseball in the center with dark blue outline (#0F2B48),
 *    light blue shading, and two curved red stitched seams.
 * 3. Bottom Wind Streaks: Vertical <line> elements trailing off the bottom half of the ball.
 */
export const HurlingBall = ({
  size = 36,
  windAngle = 104,
  showWind = true,
  intensity = 'normal',
  spinning = true,
  spinMode = '3d',
  wobble = true,
  className = '',
  style,
}: HurlingBallProps) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ids = {
    glow: `hb-glow-${uid}`,
    clip: `hb-clip-${uid}`,
    fill: `hb-fill-${uid}`,
    shade: `hb-shade-${uid}`,
  };

  const isIntense = intensity === 'intense';
  const px = size / BALL_D;
  const svgW = VIEW.w * px;
  const svgH = VIEW.h * px;
  const left = size / 2 + VIEW.x * px;
  const top = size / 2 + VIEW.y * px;
  const originY = (-VIEW.y / VIEW.h) * 100;

  const windDurSec = isIntense ? 0.56 : 0.82;
  const spinDurSec = isIntense ? 0.42 : 0.68;
  const widthBoost = isIntense ? 0.35 : 0;

  const windStyle = (delayFrac: number): CSSProperties => ({
    animationName: 'hbWindFlowKeyframes',
    animationDuration: `${windDurSec}s`,
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    animationDelay: `${-(delayFrac * windDurSec).toFixed(3)}s`,
  });

  return (
    <div
      className={`relative select-none pointer-events-none ${wobble ? 'hb-wobble-self' : ''} ${className}`}
      style={{ width: size, height: size, ...style }}
      aria-hidden="true"
    >
      {/* Self-contained keyframes so animations are always active regardless of external stylesheets */}
      <style>{`
        @keyframes hbWindFlowKeyframes {
          0% {
            stroke-dashoffset: 55;
            opacity: 0;
          }
          20% {
            opacity: 0.88;
          }
          72% {
            opacity: 0.88;
          }
          100% {
            stroke-dashoffset: -100;
            opacity: 0;
          }
        }
        @keyframes hbSpin2dKeyframes {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes hbSpin3dKeyframes {
          0% {
            transform: translateY(-${SEAM_TILE}px);
          }
          100% {
            transform: translateY(0px);
          }
        }
        @keyframes hbWobbleKeyframes {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          50% {
            transform: translate(0.4px, -0.6px) scale(0.985, 1.015);
          }
        }
        .hb-wind-streak {
          stroke-dasharray: 55 125;
          stroke-dashoffset: 55;
          will-change: stroke-dashoffset, opacity;
        }
        .hb-wobble-self {
          animation: hbWobbleKeyframes 0.3s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>

      <svg
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
        width={svgW}
        height={svgH}
        className="absolute overflow-visible"
        style={{
          left,
          top,
          transform: `rotate(${windAngle - 90}deg)`,
          transformOrigin: `50% ${originY}%`,
        }}
      >
        <defs>
          {/* Subtle white outer glow using userSpaceOnUse so vertical lines are never clipped */}
          <filter
            id={ids.glow}
            filterUnits="userSpaceOnUse"
            x={VIEW.x - 20}
            y={VIEW.y - 20}
            width={VIEW.w + 40}
            height={VIEW.h + 40}
          >
            <feDropShadow dx="0" dy="0" stdDeviation="1.2" floodColor="#FFFFFF" floodOpacity="0.65" />
          </filter>

          {/* Clean white baseball shading */}
          <radialGradient id={ids.fill} cx="36%" cy="30%" r="72%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="65%" stopColor="#FFFFFF" />
            <stop offset="88%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </radialGradient>

          {/* Subtle spherical rim shading */}
          <radialGradient id={ids.shade} cx="50%" cy="50%" r="50%">
            <stop offset="65%" stopColor="#1E1B4B" stopOpacity="0" />
            <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0.14" />
          </radialGradient>

          {/* Circular clipPath for the baseball interior and 3D seam translation */}
          <clipPath id={ids.clip}>
            <circle cx="0" cy="0" r={BALL_R - 1} />
          </clipPath>
        </defs>

        {/* ========== LAYER 3 (Behind Ball): Bottom Wind Streaks ========== */}
        {showWind && (
          <g
            id="bottom-wind-streaks"
            filter={`url(#${ids.glow})`}
            stroke="#FFFFFF"
            fill="none"
            strokeLinecap="round"
            style={{
              filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.65))',
            }}
          >
            {BOTTOM_STREAKS.map((s, i) => (
              <line
                key={i}
                x1={s.x}
                y1={s.y1}
                x2={s.x}
                y2={s.y2}
                pathLength={100}
                strokeWidth={s.width + widthBoost}
                className="hb-wind-streak"
                style={windStyle(s.delayFrac)}
              />
            ))}
          </g>
        )}

        {/* ========== LAYER 2: The Baseball ========== */}
        <g id="the-baseball">
          {/* Baseball base sphere in clean white */}
          <circle cx="0" cy="0" r={BALL_R} fill={`url(#${ids.fill})`} />

          {/* Subtle soft shading crescent inside lower-right of ball */}
          <path
            d="M 11 -16 A 19 19 0 0 1 -15 12 A 17 17 0 0 0 11 -16 Z"
            fill="#CBD5E1"
            opacity={0.35}
          />

          {/* Clipped interior with animated red stitched seams */}
          <g clipPath={`url(#${ids.clip})`}>
            {spinMode === '2d' ? (
              <g
                style={
                  spinning
                    ? {
                        transformBox: 'fill-box',
                        transformOrigin: '50% 50%',
                        animation: `hbSpin2dKeyframes ${spinDurSec}s linear infinite`,
                      }
                    : undefined
                }
              >
                <circle cx="0" cy="0" r={BALL_R} fill="transparent" />
                {SEAMS_2D.map((c, i) => (
                  <Seam key={i} curve={c} />
                ))}
              </g>
            ) : (
              <g
                style={
                  spinning
                    ? {
                        animation: `hbSpin3dKeyframes ${spinDurSec}s linear infinite`,
                      }
                    : undefined
                }
              >
                {/* Stacked vertical tiles of forward-rolling arched seams for seamless 3D forward tumble */}
                {[-SEAM_TILE, 0, SEAM_TILE].map((dy) =>
                  SEAMS_3D_TILE.map((c, i) => <Seam key={`${dy}-${i}`} curve={shiftY(c, dy)} />)
                )}
              </g>
            )}

            {/* Spherical depth shading over seams */}
            <circle cx="0" cy="0" r={BALL_R} fill={`url(#${ids.shade})`} />
          </g>

          {/* Dark outline */}
          <circle cx="0" cy="0" r={BALL_R} fill="none" stroke="#1E1B4B" strokeWidth={2.5} />

          {/* Glossy top-left specular highlight */}
          <ellipse
            cx="-7"
            cy="-9"
            rx="4.8"
            ry="2.6"
            fill="#FFFFFF"
            opacity={0.9}
            transform="rotate(-30 -7 -9)"
          />
        </g>

        {/* ========== LAYER 1 (In Front): Top Wind Arcs ========== */}
        {showWind && (
          <g
            id="top-wind-arcs"
            filter={`url(#${ids.glow})`}
            stroke="#FFFFFF"
            fill="none"
            strokeLinecap="round"
            style={{
              filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.65))',
            }}
          >
            {TOP_ARCS.map((a, i) => (
              <path
                key={i}
                d={a.d}
                pathLength={100}
                strokeWidth={a.width + widthBoost}
                className="hb-wind-streak"
                style={windStyle(a.delayFrac)}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
};
