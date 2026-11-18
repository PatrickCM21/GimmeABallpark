import { useId, type CSSProperties } from 'react';
import type { BallId } from '../../../shared/types/shop';

export type HurlingBallSpinMode = '2d' | '3d';

export type HurlingBallProps = {
  /** Which ball skin to render: 'default' | 'tennis' | 'cricket' | 'golf'. Defaults to 'default'. */
  ballId?: BallId | string | undefined;
  /** Diameter of the ball in pixels (defaults to 36px). The wind overflows this box. */
  size?: number;
  /**
   * Direction (degrees) the wind trails towards. 0 = right, 90 = down (ball flying up), 180 = left, 270 = up.
   * Defaults to 90.
   */
  windAngle?: number;
  /** Show the wind arcs and streaks. Defaults to true. */
  wind?: boolean;
  showWind?: boolean;
  /** 'intense' speeds everything up and thickens the wind (hits / strikes). */
  intensity?: 'normal' | 'intense';
  /** Spin the ball. Defaults to true. */
  spinning?: boolean;
  /**
   * How the spin is drawn:
   * - '2d': standard 2D transform: rotate() around the center of the ball.
   * - '3d': SVG <clipPath> that animates the interior surface details to simulate a 3D spin.
   * Defaults to '3d'.
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
/** Vertical distance the 3D baseball seam tile scrolls per loop (one full revolution). */
const SEAM_TILE = 40;
/** Vertical distance the cricket stitch belt scrolls per loop. */
const CRICKET_TILE = 16;
/** Vertical distance the golf dimple lattice scrolls per loop. */
const GOLF_TILE = 36;

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
 * Classic ")(" curved red stitched seams on left and right for 2D baseball spin.
 */
const SEAMS_2D: readonly Cubic[] = [
  [[-14, -20], [-4.2, -9], [-4.2, 9], [-14, 20]],
  [[14, -20], [4.2, -9], [4.2, 9], [14, 20]],
];

/**
 * Forward-rolling arched seams for 3D forward baseball spin.
 * Arches curve horizontally across the sphere and tile vertically every SEAM_TILE (40px)
 * creating the continuous illusion of a 3D baseball tumbling/rolling forward.
 */
const SEAMS_3D_TILE: readonly Cubic[] = [
  [[-20, -18], [-8, -7], [8, -7], [20, -18]],
  [[-20, 18], [-8, 7], [8, 7], [20, 18]],
];

/**
 * Classic tennis ball curved saddle seam for a single vertical tile (40px).
 * Tiling this every 40px and scrolling along Y creates a smooth 3D forward-rolling
 * tennis ball with its iconic opposing white rubber curves.
 */
const TENNIS_SEAMS_3D_TILE: readonly Cubic[] = [
  [[-21, -17], [-9, -5.5], [9, -5.5], [21, -17]],
  [[-21, 17], [-9, 5.5], [9, 5.5], [21, 17]],
];

/**
 * Staggered honeycomb dimple rows within a single 36px vertical tile for the Golf Ball.
 */
const GOLF_DIMPLE_ROWS: readonly { y: number; xs: readonly number[]; r: number }[] = [
  { y: -15, xs: [-13.5, -4.5, 4.5, 13.5], r: 2.15 },
  { y: -9, xs: [-18, -9, 0, 9, 18], r: 2.25 },
  { y: -3, xs: [-13.5, -4.5, 4.5, 13.5], r: 2.3 },
  { y: 3, xs: [-18, -9, 0, 9, 18], r: 2.25 },
  { y: 9, xs: [-13.5, -4.5, 4.5, 13.5], r: 2.2 },
  { y: 15, xs: [-18, -9, 0, 9, 18], r: 2.15 },
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
 * Self-contained React component using inline SVG and CSS keyframes that renders
 * and animates the 4 unlockable balls ('default', 'tennis', 'cricket', 'golf') with
 * identical wind layers and unique rotation looks per ball:
 * - 'default' (Classic Baseball): 3D forward-tumbling curved red stitched seams.
 * - 'tennis' (Tennis Ball): Optic yellow felt with smooth forward-rolling 3D white hourglass seams.
 * - 'cricket' (Cricket Ball): Polished cherry leather with canted gyro-wobbling 6-row stitched equator seam.
 * - 'golf' (Golf Ball): Pearlescent dimpled tour ball with smooth, unhurried 3D dimple roll.
 */
export const HurlingBall = ({
  ballId = 'default',
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
    tennisFill: `hb-tennis-fill-${uid}`,
    cricketFill: `hb-cricket-fill-${uid}`,
    golfFill: `hb-golf-fill-${uid}`,
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

  const renderBallInterior = () => {
    if (ballId === 'tennis') {
      // Slower, smooth forward-rolling 3D topspin
      const tennisForwardDur = (spinDurSec * 1.65).toFixed(3);
      return (
        <g id="the-tennis-ball">
          {/* Optic yellow-green felt base sphere */}
          <circle cx="0" cy="0" r={BALL_R} fill={`url(#${ids.tennisFill})`} />

          {/* Lower-right felt shadow crescent */}
          <path
            d="M 11 -16 A 19 19 0 0 1 -15 12 A 17 17 0 0 0 11 -16 Z"
            fill="#4D7C0F"
            opacity={0.35}
          />

          {/* Clipped interior with forward-rolling 3D white rubber tennis seams */}
          <g clipPath={`url(#${ids.clip})`}>
            <g transform="rotate(-10)">
              <g
                style={
                  spinning
                    ? {
                        animation: `hbSpin3dKeyframes ${tennisForwardDur}s linear infinite`,
                      }
                    : undefined
                }
              >
                {[-SEAM_TILE, 0, SEAM_TILE].map((dy) =>
                  TENNIS_SEAMS_3D_TILE.map((c, i) => {
                    const d = cubicPath(shiftY(c, dy));
                    return (
                      <g key={`${dy}-${i}`}>
                        {/* Recessed olive felt groove */}
                        <path
                          d={d}
                          fill="none"
                          stroke="#3F6212"
                          strokeWidth={4.4}
                          strokeLinecap="round"
                        />
                        {/* Classic thick white rubber tennis seam */}
                        <path
                          d={d}
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth={2.7}
                          strokeLinecap="round"
                        />
                      </g>
                    );
                  })
                )}
              </g>
            </g>

            {/* Spherical depth shading over seams */}
            <circle cx="0" cy="0" r={BALL_R} fill={`url(#${ids.shade})`} />
          </g>

          {/* Dark outline */}
          <circle cx="0" cy="0" r={BALL_R} fill="none" stroke="#1E1B4B" strokeWidth={2.5} />

          {/* Soft fuzzy felt highlight */}
          <ellipse
            cx="-7"
            cy="-9"
            rx="4.6"
            ry="2.4"
            fill="#FEF9C3"
            opacity={0.72}
            transform="rotate(-30 -7 -9)"
          />
        </g>
      );
    }

    if (ballId === 'cricket') {
      const cricketSeamDur = (spinDurSec * 0.42).toFixed(3);
      const cricketGyroDur = (spinDurSec * 0.72).toFixed(3);
      return (
        <g id="the-cricket-ball">
          {/* Polished cherry-crimson leather sphere */}
          <circle cx="0" cy="0" r={BALL_R} fill={`url(#${ids.cricketFill})`} />

          {/* Deep mahogany leather crescent shadow */}
          <path
            d="M 11 -16 A 19 19 0 0 1 -15 12 A 17 17 0 0 0 11 -16 Z"
            fill="#450A0A"
            opacity={0.45}
          />

          {/* Clipped interior with canted gyro-wobbling equatorial stitched seam belt */}
          <g clipPath={`url(#${ids.clip})`}>
            <g
              style={
                spinning
                  ? {
                      animation: `hbCricketGyroKeyframes ${cricketGyroDur}s ease-in-out infinite`,
                    }
                  : { transform: 'rotate(-22deg)' }
              }
            >
              {/* Subtle perpendicular quarter-leather join lines */}
              <path
                d="M -22 0 Q 0 -4 22 0"
                fill="none"
                stroke="#7F1D1D"
                strokeWidth={1.1}
                opacity={0.65}
              />

              {/* Raised dark crimson leather seam belt backing */}
              <rect x="-5.4" y="-26" width="10.8" height="52" fill="#7F1D1D" opacity={0.55} />
              <line x1="-5.2" y1="-26" x2="-5.2" y2="26" stroke="#450A0A" strokeWidth={0.9} opacity={0.7} />
              <line x1="5.2" y1="-26" x2="5.2" y2="26" stroke="#450A0A" strokeWidth={0.9} opacity={0.7} />

              {/* Central equatorial split groove */}
              <line x1="0" y1="-26" x2="0" y2="26" stroke="#2A0404" strokeWidth={1.4} />

              {/* Rapidly scrolling 6-row white/cream stitched seam along the canted equator */}
              <g
                style={
                  spinning
                    ? {
                        animation: `hbSpinCricketSeamKeyframes ${cricketSeamDur}s linear infinite`,
                      }
                    : undefined
                }
              >
                {[-CRICKET_TILE * 2, -CRICKET_TILE, 0, CRICKET_TILE, CRICKET_TILE * 2].map((dy) => (
                  <g key={dy} transform={`translate(0, ${dy})`}>
                    {[0, 4, 8, 12].map((offset) => (
                      <g key={offset} transform={`translate(0, ${offset - 6})`}>
                        {/* Inner double stitch rows (angled herringbone / parallel ticks) */}
                        <line
                          x1="-2.2"
                          y1="-1.2"
                          x2="-1.2"
                          y2="1.2"
                          stroke="#FFFFFF"
                          strokeWidth={1.35}
                          strokeLinecap="round"
                        />
                        <line
                          x1="2.2"
                          y1="-1.2"
                          x2="1.2"
                          y2="1.2"
                          stroke="#FFFFFF"
                          strokeWidth={1.35}
                          strokeLinecap="round"
                        />
                        {/* Outer stitch rows */}
                        <line
                          x1="-4.1"
                          y1="-1.1"
                          x2="-4.1"
                          y2="1.1"
                          stroke="#FEF08A"
                          strokeWidth={1.15}
                          strokeLinecap="round"
                        />
                        <line
                          x1="4.1"
                          y1="-1.1"
                          x2="4.1"
                          y2="1.1"
                          stroke="#FEF08A"
                          strokeWidth={1.15}
                          strokeLinecap="round"
                        />
                      </g>
                    ))}
                  </g>
                ))}
              </g>
            </g>

            {/* Spherical depth shading */}
            <circle cx="0" cy="0" r={BALL_R} fill={`url(#${ids.shade})`} />
          </g>

          {/* Dark outline */}
          <circle cx="0" cy="0" r={BALL_R} fill="none" stroke="#1E1B4B" strokeWidth={2.5} />

          {/* High-gloss polished cherry leather shine */}
          <ellipse
            cx="-7.5"
            cy="-9"
            rx="5.2"
            ry="2.8"
            fill="#FFFFFF"
            opacity={0.88}
            transform="rotate(-30 -7.5 -9)"
          />
          <circle cx="-11" cy="-4.5" r="1.3" fill="#FECACA" opacity={0.8} />
        </g>
      );
    }

    if (ballId === 'golf') {
      // Slower, smooth 3D dimple roll so individual dimples are clearly visible as it travels
      const golfSpinDur = (spinDurSec * 1.75).toFixed(3);
      return (
        <g id="the-golf-ball">
          {/* Pearlescent tour-white base sphere */}
          <circle cx="0" cy="0" r={BALL_R} fill={`url(#${ids.golfFill})`} />

          {/* Cool slate crescent shading */}
          <path
            d="M 11 -16 A 19 19 0 0 1 -15 12 A 17 17 0 0 0 11 -16 Z"
            fill="#94A3B8"
            opacity={0.38}
          />

          {/* Clipped interior with slower, smooth-rolling 3D honeycomb dimple matrix */}
          <g clipPath={`url(#${ids.clip})`}>
            <g transform="rotate(-8)">
              <g
                style={
                  spinning
                    ? {
                        animation: `hbSpinGolfDimplesKeyframes ${golfSpinDur}s linear infinite`,
                      }
                    : undefined
                }
              >
                {[-GOLF_TILE, 0, GOLF_TILE].map((dy) => (
                  <g key={dy} transform={`translate(0, ${dy})`}>
                    {GOLF_DIMPLE_ROWS.map((row, rIdx) =>
                      row.xs.map((x, cIdx) => (
                        <g key={`${rIdx}-${cIdx}`} transform={`translate(${x}, ${row.y})`}>
                          {/* Concave dimple shadow */}
                          <circle cx="0" cy="0" r={row.r} fill="#CBD5E1" opacity={0.85} />
                          {/* Upper-left recessed inner shadow arc */}
                          <circle
                            cx="-0.35"
                            cy="-0.35"
                            r={row.r * 0.78}
                            fill="#94A3B8"
                            opacity={0.55}
                          />
                          {/* Lower-right concave rim highlight */}
                          <circle
                            cx="0.45"
                            cy="0.45"
                            r={row.r * 0.65}
                            fill="#FFFFFF"
                            opacity={0.9}
                          />
                        </g>
                      ))
                    )}
                  </g>
                ))}
              </g>
            </g>

            {/* Spherical depth shading over dimples */}
            <circle cx="0" cy="0" r={BALL_R} fill={`url(#${ids.shade})`} />
          </g>

          {/* Dark outline */}
          <circle cx="0" cy="0" r={BALL_R} fill="none" stroke="#1E1B4B" strokeWidth={2.5} />

          {/* Glossy urethane cover specular highlight */}
          <ellipse
            cx="-7"
            cy="-9"
            rx="4.8"
            ry="2.6"
            fill="#FFFFFF"
            opacity={0.92}
            transform="rotate(-30 -7 -9)"
          />
        </g>
      );
    }

    // Default: Classic Baseball
    return (
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
    );
  };

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
        @keyframes hbCricketGyroKeyframes {
          0%, 100% {
            transform: rotate(-27deg) translateX(-1.4px);
          }
          50% {
            transform: rotate(-15deg) translateX(1.4px);
          }
        }
        @keyframes hbSpinCricketSeamKeyframes {
          0% {
            transform: translateY(-${CRICKET_TILE}px);
          }
          100% {
            transform: translateY(0px);
          }
        }
        @keyframes hbSpinGolfDimplesKeyframes {
          0% {
            transform: translateY(-${GOLF_TILE}px);
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

          {/* Optic yellow-green tennis ball felt shading */}
          <radialGradient id={ids.tennisFill} cx="35%" cy="30%" r="72%">
            <stop offset="0%" stopColor="#F0FF66" />
            <stop offset="32%" stopColor="#D9F92D" />
            <stop offset="70%" stopColor="#A3E635" />
            <stop offset="92%" stopColor="#65A30D" />
            <stop offset="100%" stopColor="#4D7C0F" />
          </radialGradient>

          {/* Polished cherry-red leather cricket ball shading */}
          <radialGradient id={ids.cricketFill} cx="35%" cy="28%" r="74%">
            <stop offset="0%" stopColor="#FCA5A5" />
            <stop offset="28%" stopColor="#EF4444" />
            <stop offset="68%" stopColor="#B91C1C" />
            <stop offset="90%" stopColor="#7F1D1D" />
            <stop offset="100%" stopColor="#450A0A" />
          </radialGradient>

          {/* Pearlescent dimpled tour golf ball shading */}
          <radialGradient id={ids.golfFill} cx="34%" cy="28%" r="74%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#F8FAFC" />
            <stop offset="84%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </radialGradient>

          {/* Subtle spherical rim shading */}
          <radialGradient id={ids.shade} cx="50%" cy="50%" r="50%">
            <stop offset="65%" stopColor="#1E1B4B" stopOpacity="0" />
            <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0.16" />
          </radialGradient>

          {/* Circular clipPath for the ball interior and 3D spin animations */}
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

        {/* ========== LAYER 2: The Ball ========== */}
        {renderBallInterior()}

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
