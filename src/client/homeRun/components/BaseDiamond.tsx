import { BASE_LABELS } from '../constants';
import { SnooAvatar } from './SnooAvatar';

type BaseDiamondProps = {
  /** Bases earned: 0 = out at the plate, 1-3 = standing on that base, 4 = home run (returned to home plate). */
  playerBases: 0 | 1 | 2 | 3 | 4;
  snoovatarUrl?: string | undefined;
  /** Currently selected base index (0: Home/Q1, 1: 1st/Q2, 2: 2nd/Q3, 3: 3rd/Q4), or null */
  selectedBase?: number | null;
  /** Callback when user clicks a base */
  onSelectBase?: (index: number) => void;
};

/** Exact mathematical coordinates (x, y) matching the SVG baselines perfectly.
 * Indexed by Question/Round (0: Round 1 -> 1st Base Right, 1: Round 2 -> 2nd Base Top,
 * 2: Round 3 -> 3rd Base Left, 3: Round 4 -> Home Base Bottom).
 */
const BASE_POINTS = [
  { x: 82.5, y: 50, label: '1st Base (Q1)' },    // index 0: 1st Base (Right)
  { x: 50, y: 17.5, label: '2nd Base (Q2)' },    // index 1: 2nd Base (Top)
  { x: 17.5, y: 50, label: '3rd Base (Q3)' },    // index 2: 3rd Base (Left)
  { x: 50, y: 82.5, label: 'Home Base (Q4)' },   // index 3: Home Base / Home Plate (Bottom)
] as const;

/**
 * Snoo Avatar token positions by bases earned:
 * - 0: Out on 1st base (positioned midway along the basepath between hitting base/home plate and 1st base)
 * - 1: Standing at 1st base (Right)
 * - 2: Standing at 2nd base (Top)
 * - 3: Standing at 3rd base (Left)
 * - 4: Home Run! Scored at Home Plate (Bottom)
 */
const SNOO_POSITIONS_BY_BASES: Record<0 | 1 | 2 | 3 | 4, { x: number; y: number }> = {
  0: { x: 66.25, y: 56 }, // Between Hitting Base (Home) and 1st Base
  1: { x: 82.5, y: 28 },  // Standing on 1st Base (Right)
  2: { x: 50, y: 4 },     // Standing on 2nd Base (Top)
  3: { x: 17.5, y: 28 },  // Standing on 3rd Base (Left)
  4: { x: 50, y: 60 },    // Returned home for Home Run!
};

/** Authentic 5-sided Home Plate pentagon (flat top, vertical sides, pointed V bottom) displaying base #4 */
const HomePlateSvg = ({ isSelected, isPlayerHere }: { isSelected: boolean; isPlayerHere: boolean }) => (
  <svg viewBox="0 0 30 30" className="w-8 h-8 transition-transform hover:scale-115">
    <path
      d="M 5 6 L 25 6 L 25 16 L 15 26 L 5 16 Z"
      fill={isSelected ? '#FACC15' : isPlayerHere ? '#FEF08A' : '#FFFFFF'}
      stroke="#1E1B4B"
      strokeWidth={isSelected ? '2.5' : '2'}
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
      4
    </text>
  </svg>
);

/** Diamond canvas bag for 1st, 2nd, and 3rd Base */
const DiamondBaseSvg = ({
  number,
  isSelected,
  isPlayerHere,
}: {
  number: number;
  isSelected: boolean;
  isPlayerHere: boolean;
}) => (
  <svg viewBox="0 0 30 30" className="w-7 h-7 transition-transform hover:scale-115">
    <rect
      x="7"
      y="7"
      width="16"
      height="16"
      rx="2"
      transform="rotate(45 15 15)"
      fill={isSelected ? '#FACC15' : isPlayerHere ? '#FEF08A' : '#FFFFFF'}
      stroke="#1E1B4B"
      strokeWidth={isSelected ? '2.5' : '2'}
      strokeLinejoin="round"
    />
    <text
      x="15"
      y="15"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="11"
      fontWeight="900"
      fill="#1E1B4B"
    >
      {number}
    </text>
  </svg>
);

/** Bird's-eye view of the baseball diamond with exact mathematical baseline alignment. */
export const BaseDiamond = ({
  playerBases,
  snoovatarUrl,
  selectedBase = null,
  onSelectBase,
}: BaseDiamondProps) => {
  const isHomeRun = playerBases === 4;
  const snooPos = SNOO_POSITIONS_BY_BASES[playerBases];

  return (
    <div
      className="relative w-40 h-40 sm:w-44 sm:h-44 mx-auto shrink-0 select-none my-0.5"
      role="region"
      aria-label={isHomeRun ? 'Home Run' : playerBases === 0 ? 'Out between home and first base' : BASE_LABELS[playerBases - 1]}
    >
      {/* Complete Vector Baseball Diamond with mathematically aligned baselines and dirt track */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-sm overflow-hidden"
        aria-hidden="true"
      >
        {/* Outfield Grass Diamond */}
        <polygon points="50,2 98,50 50,98 2,50" fill="#84cc16" stroke="#4d7c0f" strokeWidth="2.5" />

        {/* Dirt Infield Basepath Track connecting all 4 bases with dirt cutouts */}
        <polygon
          points="50,82.5 82.5,50 50,17.5 17.5,50"
          fill="none"
          stroke="#c26a2d"
          strokeWidth="11"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="82.5" r="7.5" fill="#c26a2d" />
        <circle cx="82.5" cy="50" r="6.5" fill="#c26a2d" />
        <circle cx="50" cy="17.5" r="6.5" fill="#c26a2d" />
        <circle cx="17.5" cy="50" r="6.5" fill="#c26a2d" />

        {/* Center Infield Grass */}
        <polygon points="50,73.5 73.5,50 50,26.5 26.5,50" fill="#84cc16" />

        {/* Pitcher's Mound in Center */}
        <ellipse cx="50" cy="50" rx="6" ry="6" fill="#b45309" />
        <ellipse cx="50" cy="50" rx="4.5" ry="4.5" fill="#d97706" />
        <rect x="47.5" y="49" width="5" height="2" fill="#ffffff" rx="0.5" />

        {/* White Chalk Foul Lines & Baselines running through the center of every base */}
        <line x1="50" y1="82.5" x2="8.5" y2="41" stroke="#ffffff" strokeWidth="1.4" opacity="0.9" />
        <line x1="50" y1="82.5" x2="91.5" y2="41" stroke="#ffffff" strokeWidth="1.4" opacity="0.9" />
        <polygon
          points="50,82.5 82.5,50 50,17.5 17.5,50"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          opacity="0.95"
        />
      </svg>

      {/* Bases positioned exactly at the mathematical vertices of the baseline */}
      {BASE_POINTS.map((p, i) => {
        const isPlayerHere = playerBases > 0 && i === playerBases - 1;
        const isSelected = selectedBase === i;

        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelectBase?.(i)}
            disabled={!onSelectBase}
            aria-label={`View stats for Question ${i + 1} (${p.label})`}
            aria-pressed={isSelected}
            className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 ${
              onSelectBase ? 'cursor-pointer' : 'cursor-default'
            } ${isSelected ? 'ring-4 ring-indigo-900/40 rounded-full' : ''}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            {i === 3 ? (
              <HomePlateSvg isSelected={isSelected} isPlayerHere={isPlayerHere} />
            ) : (
              <DiamondBaseSvg number={i + 1} isSelected={isSelected} isPlayerHere={isPlayerHere} />
            )}
          </button>
        );
      })}

      {/* Snoo Avatar token positioned ABOVE the base */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center"
        style={{ left: `${snooPos.x}%`, top: `${snooPos.y}%` }}
      >
        <div className="relative">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-sky-100 border-2 border-indigo-950 shadow-md">
            <SnooAvatar src={snoovatarUrl} size={40} headOnly />
          </div>
          {playerBases === 0 && (
            <span className="absolute -top-1.5 -right-3.5 rotate-12 px-1 py-0.5 rounded bg-red-600 text-white text-[8px] font-black border border-white shadow-xs">
              OUT
            </span>
          )}
          {isHomeRun && (
            <span className="absolute -top-1.5 -right-5.5 rotate-12 px-1.5 py-0.5 rounded bg-green-600 text-white text-[8px] font-black border border-white shadow-xs whitespace-nowrap">
              HOME RUN
            </span>
          )}
        </div>
        {/* Subtle shadow ground indicator below Snoo leading down to the base */}
        <span className="w-5 h-1.5 rounded-full bg-black/25 blur-[1px] mt-0.5" />
      </div>
    </div>
  );
};
