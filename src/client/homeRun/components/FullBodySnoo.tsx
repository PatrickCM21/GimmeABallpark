import { useState, useId } from 'react';
import type { HomeRunAudienceMember } from '../../../shared/types/homeRun';

export type FullBodySnooProps = {
  /** If this bleacher seat is occupied by a real Reddit player */
  player?: HomeRunAudienceMember | undefined;
  /** Seed to deterministically select the random Snoo variation (0 to 47) */
  seed: number;
  /** Height in pixels of the full-body Snoo */
  height: number;
  /** Cheering animation mode */
  animation?: 'bounce' | 'sway' | 'wave' | 'idle';
  className?: string;
};

// 10 Authentic Reddit / Stadium Fur Colorways
const SNOO_FUR_COLORS = [
  { fur: '#FFFFFF', shadow: '#E2E8F0', stroke: '#0F2B48' }, // Classic White
  { fur: '#FFFFFF', shadow: '#E2E8F0', stroke: '#0F2B48' }, // Classic White (weighted)
  { fur: '#FF4500', shadow: '#C23600', stroke: '#7F1D1D' }, // Reddit Orange-Red
  { fur: '#0079D3', shadow: '#005A9E', stroke: '#0C4A6E' }, // Snoo Sky Blue
  { fur: '#24A0ED', shadow: '#1676B2', stroke: '#0369A1' }, // Ballpark Cyan
  { fur: '#FFD635', shadow: '#D4AD10', stroke: '#713F12' }, // Stadium Gold
  { fur: '#46D160', shadow: '#2E9D42', stroke: '#14532D' }, // Turf Green
  { fur: '#7193FF', shadow: '#4B6ECC', stroke: '#312E81' }, // Electric Purple
  { fur: '#DB0064', shadow: '#A00045', stroke: '#701A75' }, // Hot Magenta
  { fur: '#FF8717', shadow: '#C96205', stroke: '#7C2D12' }, // Stadium Amber
  { fur: '#25B79F', shadow: '#198270', stroke: '#134E4A' }, // Emerald Teal
];

// 8 Stadium Baseball Jerseys
const JERSEY_STYLES = [
  { name: 'Navy Pinstripes', bg: '#FFFFFF', stripe: '#0F2B48', collar: '#0F2B48', num: '1' },
  { name: 'Home White', bg: '#F8FAFC', stripe: '#EF4444', collar: '#EF4444', num: '7' },
  { name: 'Royal Blue', bg: '#1D4ED8', stripe: '#FDE047', collar: '#FDE047', num: '24' },
  { name: 'Red Sluggers', bg: '#DC2626', stripe: '#FFFFFF', collar: '#FFFFFF', num: '99' },
  { name: 'Turf Green', bg: '#15803D', stripe: '#FBBF24', collar: '#FBBF24', num: '42' },
  { name: 'Charcoal Night', bg: '#334155', stripe: '#38BDF8', collar: '#38BDF8', num: '10' },
  { name: 'Reddit Classic', bg: '#FF4500', stripe: '#FFFFFF', collar: '#FFFFFF', num: '0' },
  { name: 'Retro Gold', bg: '#F59E0B', stripe: '#1E293B', collar: '#1E293B', num: '5' },
];

// 6 Baseball Cap Colorways
const CAP_COLORS = [
  { crown: '#0F2B48', visor: '#EF4444', button: '#FDE047' }, // Navy / Red
  { crown: '#1D4ED8', visor: '#FFFFFF', button: '#FFFFFF' }, // Royal Blue
  { crown: '#DC2626', visor: '#0F2B48', button: '#FFFFFF' }, // Red / Navy
  { crown: '#15803D', visor: '#F59E0B', button: '#F59E0B' }, // Green / Gold
  { crown: '#FF4500', visor: '#0F2B48', button: '#FFFFFF' }, // Reddit Orange
  { crown: '#1E293B', visor: '#38BDF8', button: '#38BDF8' }, // Charcoal / Cyan
];

/**
 * Big, authentic, full-body Reddit Snoovatar.
 * When an actual Reddit player joins, renders their real full-body Snoovatar without circular cropping.
 * Otherwise renders a rich, randomized full-body Snoo spectator in baseball attire.
 */
export const FullBodySnoo = ({
  player,
  seed,
  height,
  animation = 'bounce',
  className = '',
}: FullBodySnooProps) => {
  const [imgFailed, setImgFailed] = useState(false);
  const uid = useId().replace(/:/g, '');

  // Width is naturally ~72% of height for Snoo's proportions
  const width = Math.round(height * 0.74);

  // Deterministic attributes for this seed
  const fur = SNOO_FUR_COLORS[seed % SNOO_FUR_COLORS.length]!;
  const jersey = JERSEY_STYLES[seed % JERSEY_STYLES.length]!;
  const cap = CAP_COLORS[seed % CAP_COLORS.length]!;
  const hasCap = seed % 3 !== 0; // 66% wear caps
  const capBackwards = seed % 5 === 0; // 20% wear backwards
  const hasShades = seed % 4 === 1; // 25% wear cool sunglasses
  const hasFoamFinger = seed % 6 === 2; // ~16% wave a foam finger
  const armPose = (seed % 3) as 0 | 1 | 2; // 0 = arms up cheering, 1 = foam finger / wave, 2 = fists pumped

  // Animation CSS class
  let animClass = '';
  if (animation === 'bounce') animClass = 'snoo-cheer-bounce';
  else if (animation === 'sway') animClass = 'snoo-cheer-sway';
  else if (animation === 'wave') animClass = 'snoo-cheer-wave';

  const animDelay = `${((seed * 13) % 10) * 0.1}s`;

  // Real player avatar URL (if provided and hasn't failed)
  const realAvatarUrl = player?.snoovatarUrl;
  const showRealImage = Boolean(realAvatarUrl && !imgFailed);

  return (
    <div
      className={`relative flex flex-col items-center justify-end select-none pointer-events-none ${className}`}
      style={{ width, height }}
      aria-label={player ? `u/${player.username}` : 'Full-body Snoo spectator'}
    >
      {/* CHEERING SNOO ACTOR */}
      <div
        className={`relative w-full h-full flex flex-col items-center justify-end ${animClass}`}
        style={{ animationDelay: animDelay }}
      >
        {showRealImage ? (
          /* Real Reddit player's FULL-BODY Snoovatar */
          <img
            src={realAvatarUrl}
            alt={player ? `u/${player.username}` : 'Player Snoovatar'}
            className="w-full h-full object-contain object-bottom drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] select-none pointer-events-none"
            draggable={false}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
          />
        ) : (
          /* Procedural Vector FULL-BODY Snoovatar */
          <svg
            viewBox="0 0 70 95"
            width="100%"
            height="100%"
            className="overflow-visible drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`jerseyShine-${uid}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={jersey.bg} />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.25" />
                <stop offset="100%" stopColor={jersey.bg} />
              </linearGradient>
            </defs>

            {/* --- 1. SNOO ANTENNA --- */}
            {/* The antenna stalk pokes up proudly */}
            <path
              d="M 35 25 L 43 12 L 36 6"
              fill="none"
              stroke={fur.stroke}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Antenna Ball */}
            <circle
              cx="36"
              cy="6"
              r="4"
              fill={fur.fur}
              stroke={fur.stroke}
              strokeWidth="2"
            />

            {/* --- 2. SNOO EARS --- */}
            <circle
              cx="17"
              cy="34"
              r="5.5"
              fill={fur.fur}
              stroke={fur.stroke}
              strokeWidth="2.2"
            />
            <circle
              cx="53"
              cy="34"
              r="5.5"
              fill={fur.fur}
              stroke={fur.stroke}
              strokeWidth="2.2"
            />

            {/* --- 3. LEGS & SHOES --- */}
            {/* Left leg & shoe */}
            <rect
              x="25"
              y="68"
              width="8"
              height="16"
              rx="4"
              fill={fur.fur}
              stroke={fur.stroke}
              strokeWidth="2"
            />
            <ellipse
              cx="28"
              cy="85"
              rx="7"
              ry="4.5"
              fill="#0F2B48"
              stroke="#FFFFFF"
              strokeWidth="1.2"
            />

            {/* Right leg & shoe */}
            <rect
              x="37"
              y="68"
              width="8"
              height="16"
              rx="4"
              fill={fur.fur}
              stroke={fur.stroke}
              strokeWidth="2"
            />
            <ellipse
              cx="42"
              cy="85"
              rx="7"
              ry="4.5"
              fill="#0F2B48"
              stroke="#FFFFFF"
              strokeWidth="1.2"
            />

            {/* --- 4. CHEERING ARMS & HANDS (Behind or beside torso) --- */}
            {armPose === 0 && (
              /* High hands in the air: \o/ */
              <g stroke={fur.stroke} strokeWidth="5.5" strokeLinecap="round">
                <path d="M 24 53 Q 12 40 10 26" fill="none" />
                <path d="M 46 53 Q 58 40 60 26" fill="none" />
                <circle cx="10" cy="25" r="4.5" fill={fur.fur} stroke={fur.stroke} strokeWidth="2" />
                <circle cx="60" cy="25" r="4.5" fill={fur.fur} stroke={fur.stroke} strokeWidth="2" />
              </g>
            )}

            {armPose === 1 && (
              /* Left arm up, right arm holding foam finger or pennant */
              <g stroke={fur.stroke} strokeWidth="5.5" strokeLinecap="round">
                <path d="M 24 53 Q 14 42 16 30" fill="none" />
                <path d="M 46 53 Q 56 46 58 36" fill="none" />
                <circle cx="16" cy="29" r="4.5" fill={fur.fur} stroke={fur.stroke} strokeWidth="2" />
                <circle cx="58" cy="35" r="4.5" fill={fur.fur} stroke={fur.stroke} strokeWidth="2" />
                {hasFoamFinger && (
                  /* Giant #1 Foam Finger */
                  <g transform="translate(56, 17) scale(0.85)">
                    <rect x="0" y="6" width="14" height="18" rx="4" fill="#2563EB" stroke="#1E3A8A" strokeWidth="1.5" />
                    <rect x="4" y="0" width="6" height="12" rx="3" fill="#2563EB" stroke="#1E3A8A" strokeWidth="1.5" />
                    <text x="7" y="18" fill="#FFFFFF" fontSize="8" fontWeight="900" textAnchor="middle">#1</text>
                  </g>
                )}
              </g>
            )}

            {armPose === 2 && (
              /* Fists pumped cheering */
              <g stroke={fur.stroke} strokeWidth="5.5" strokeLinecap="round">
                <path d="M 24 53 Q 16 52 18 42" fill="none" />
                <path d="M 46 53 Q 54 52 52 42" fill="none" />
                <circle cx="18" cy="41" r="4.5" fill={fur.fur} stroke={fur.stroke} strokeWidth="2" />
                <circle cx="52" cy="41" r="4.5" fill={fur.fur} stroke={fur.stroke} strokeWidth="2" />
              </g>
            )}

            {/* --- 5. TORSO & BASEBALL JERSEY --- */}
            <g>
              {/* Jersey Body */}
              <rect
                x="22"
                y="47"
                width="26"
                height="24"
                rx="6"
                fill={jersey.bg}
                stroke={fur.stroke}
                strokeWidth="2.2"
              />

              {/* Jersey Pinstripes */}
              <line x1="28" y1="48" x2="28" y2="70" stroke={jersey.stripe} strokeWidth="1.4" opacity="0.8" />
              <line x1="35" y1="48" x2="35" y2="70" stroke={jersey.stripe} strokeWidth="1.8" />
              <line x1="42" y1="48" x2="42" y2="70" stroke={jersey.stripe} strokeWidth="1.4" opacity="0.8" />

              {/* V-Neck Collar */}
              <path
                d="M 30 47 L 35 54 L 40 47"
                fill="none"
                stroke={jersey.collar}
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Jersey Buttons */}
              <circle cx="35" cy="57" r="1.2" fill="#FFFFFF" stroke="#0F2B48" strokeWidth="0.8" />
              <circle cx="35" cy="63" r="1.2" fill="#FFFFFF" stroke="#0F2B48" strokeWidth="0.8" />
            </g>

            {/* --- 6. SNOO HEAD --- */}
            <ellipse
              cx="35"
              cy="34"
              rx="18"
              ry="14.5"
              fill={fur.fur}
              stroke={fur.stroke}
              strokeWidth="2.4"
            />

            {/* --- 7. EYES & EXPRESSION --- */}
            {hasShades ? (
              /* Cool Baseball Sunglasses */
              <g>
                <path
                  d="M 23 31 Q 29 29 35 32 Q 41 29 47 31 Q 48 38 41 38 Q 35 34 29 38 Q 22 38 23 31 Z"
                  fill="#0F172A"
                  stroke="#38BDF8"
                  strokeWidth="1.2"
                />
                <line x1="25" y1="33" x2="31" y2="35" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
                <line x1="39" y1="33" x2="45" y2="35" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
              </g>
            ) : (
              /* Glowing Red/Orange Snoo Eyes */
              <g>
                <ellipse cx="28" cy="33.5" rx="3" ry="4" fill="#FF4500" />
                <ellipse cx="42" cy="33.5" rx="3" ry="4" fill="#FF4500" />
                {/* Eye glint */}
                <circle cx="27" cy="32" r="1" fill="#FFFFFF" />
                <circle cx="41" cy="32" r="1" fill="#FFFFFF" />
              </g>
            )}

            {/* Smiling / Cheering Mouth */}
            <path
              d="M 30 40 Q 35 46 40 40"
              fill="none"
              stroke={fur.stroke}
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* --- 8. BASEBALL CAP (If equipped) --- */}
            {hasCap && (
              <g>
                {/* Cap Dome */}
                <path
                  d="M 18 29 C 18 17 52 17 52 29 Z"
                  fill={cap.crown}
                  stroke={fur.stroke}
                  strokeWidth="2"
                />

                {/* Cap Visor */}
                {capBackwards ? (
                  /* Backwards Cap strap notch */
                  <path
                    d="M 30 29 C 32 26 38 26 40 29 Z"
                    fill={fur.fur}
                    stroke={fur.stroke}
                    strokeWidth="1.4"
                  />
                ) : (
                  /* Forward Cap Visor curving out */
                  <path
                    d="M 16 29 Q 35 34 54 29 Q 35 26 16 29 Z"
                    fill={cap.visor}
                    stroke={fur.stroke}
                    strokeWidth="1.8"
                  />
                )}

                {/* Button at cap crown */}
                <circle cx="35" cy="20" r="2.2" fill={cap.button} stroke={fur.stroke} strokeWidth="1.2" />
              </g>
            )}
          </svg>
        )}
      </div>
    </div>
  );
};
