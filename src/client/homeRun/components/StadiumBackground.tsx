import { useMemo } from 'react';
import type { HomeRunAudienceMember } from '../../../shared/types/homeRun';
import type { HomeRunPhase } from '../hooks/useHomeRunGame';
import { FullBodySnoo } from './FullBodySnoo';

export type StadiumBackgroundProps = {
  /**
   * Round number:
   * 0: Intro (wide view from home plate)
   * 1: Round 1 (Pitcher's mound & Pitcher Snoo visible)
   * 2: Round 2 (2nd base in foreground, pitcher gone)
   * 3: Round 3 (Outfield wall & start of bleachers)
   * 4: Round 4 (Inside the bleachers with a bit of grass underneath)
   * 5+: Home Run Win celebration deep in the crowd
   */
  round?: number;
  /** Legacy zoomLevel: fallback if round is omitted */
  zoomLevel?: number;
  /** Game phase for dynamic camera responses (smash, miss, live, etc.) */
  phase?: HomeRunPhase;
  /**
   * Continuous time progress (0 = full time left, 1 = time expired).
   * Edges the camera smoothly forward as the clock ticks down.
   */
  timeProgress?: number;
  /** Actual reddit players who have played this game to populate the crowd */
  audience?: HomeRunAudienceMember[] | undefined;
  className?: string;
};

type BleacherSeat = {
  row: number;
  col: number;
  priority: number;
  xPct: number;
  yPct: number;
  height: number;
  animation: 'bounce' | 'sway' | 'wave';
};

type FakeSponsor = {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  brandColor: string;
  accentColor: string;
  badgeBg: string;
};

const FAKE_SPONSORS: readonly FakeSponsor[] = [
  {
    id: 'upvote-cola',
    name: 'UPVOTE COLA',
    tagline: 'Refresh Your Feed',
    icon: '🥤',
    brandColor: '#FF4500',
    accentColor: '#FED7AA',
    badgeBg: 'bg-orange-600',
  },
  {
    id: 'snoo-brew',
    name: 'SNOO BREW',
    tagline: 'Official Draft of the Bleachers',
    icon: '🍺',
    brandColor: '#38BDF8',
    accentColor: '#E0F2FE',
    badgeBg: 'bg-sky-600',
  },
  {
    id: 'karma-credit',
    name: 'KARMA CREDIT',
    tagline: 'Spend Where It Counts',
    icon: '💳',
    brandColor: '#F59E0B',
    accentColor: '#FEF08A',
    badgeBg: 'bg-amber-600',
  },
  {
    id: 'touch-grass',
    name: 'TOUCH GRASS CO.',
    tagline: 'Step Outside Sometime',
    icon: '🌿',
    brandColor: '#22C55E',
    accentColor: '#BBF7D0',
    badgeBg: 'bg-green-600',
  },
  {
    id: 'ballpark-franks',
    name: 'BALLPARK FRANKS',
    tagline: '100% Mystery, 100% Meat',
    icon: '🌭',
    brandColor: '#EF4444',
    accentColor: '#FECACA',
    badgeBg: 'bg-red-600',
  },
  {
    id: 'diamond-hands',
    name: 'DIAMOND HANDS',
    tagline: 'Never Sell Your Sparkle',
    icon: '💎',
    brandColor: '#C084FC',
    accentColor: '#F3E8FF',
    badgeBg: 'bg-purple-600',
  },
  {
    id: 'mod-energy',
    name: 'MOD ENERGY',
    tagline: 'Ban Fatigue Instantly',
    icon: '⚡',
    brandColor: '#FACC15',
    accentColor: '#FEF9C3',
    badgeBg: 'bg-yellow-500',
  },
  {
    id: 'narwhal-motors',
    name: 'NARWHAL MOTORS',
    tagline: 'Bacons at Midnight',
    icon: '🚗',
    brandColor: '#22D3EE',
    accentColor: '#CFFAFE',
    badgeBg: 'bg-cyan-600',
  },
] as const;

// 36 bleacher seats across 4 tiered grandstand rows for Round 4 & Win
const BLEACHER_SEATS: BleacherSeat[] = (() => {
  const seats: BleacherSeat[] = [];
  const rows = 4;
  const cols = 9;

  const rowHeights = [52, 64, 78, 94];
  const rowYPct = [22, 44, 66, 88];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const jitterX = ((idx * 17) % 7) - 3;
      const jitterY = ((idx * 29) % 5) - 2;
      const staggerOffset = r % 2 === 1 ? 4.5 : 0;

      const animationType: 'bounce' | 'sway' | 'wave' =
        (r + c) % 3 === 0 ? 'bounce' : (r + c) % 3 === 1 ? 'sway' : 'wave';

      const distFromCenter = Math.abs(c - Math.floor(cols / 2));
      const priority = (3 - r) * 10 + distFromCenter;

      seats.push({
        row: r,
        col: c,
        priority,
        xPct: Math.min(94, Math.max(6, (c / (cols - 1)) * 86 + 7 + staggerOffset + jitterX * 0.3)),
        yPct: rowYPct[r]! + jitterY * 0.35,
        height: rowHeights[r]!,
        animation: animationType,
      });
    }
  }
  return seats.sort((a, b) => a.priority - b.priority);
})();

/** Digital LED sponsor ribbon ticker component */
const LedRibbonTicker = ({ heightClass = 'h-7' }: { heightClass?: string }) => (
  <div className={`relative w-full ${heightClass} bg-[#030712] border-y border-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.35)] overflow-hidden flex items-center pointer-events-none led-screen-pattern shrink-0`}>
    <div className="absolute inset-x-0 top-0 h-[1px] bg-amber-400/90 shadow-[0_0_6px_#fbbf24] z-10" />
    <div className="absolute inset-x-0 bottom-0 h-[1px] bg-amber-400/90 shadow-[0_0_6px_#fbbf24] z-10" />
    <div className="animate-ticker flex items-center">
      {[...FAKE_SPONSORS, ...FAKE_SPONSORS].map((sponsor, idx) => (
        <div
          key={`${sponsor.id}-${idx}`}
          className="inline-flex items-center gap-2 px-3 py-0.5 mx-2 rounded-md bg-black/75 border border-slate-700/70 shadow-xs shrink-0 select-none"
        >
          <span className={`w-4.5 h-4.5 rounded-full ${sponsor.badgeBg} flex items-center justify-center text-[10px] shadow-xs shrink-0`}>
            {sponsor.icon}
          </span>
          <span
            className="font-black text-[10px] tracking-wider uppercase whitespace-nowrap drop-shadow-xs"
            style={{ color: sponsor.brandColor, textShadow: `0 0 6px ${sponsor.brandColor}66` }}
          >
            {sponsor.name}
          </span>
          <span className="text-[7px] text-amber-400/70 font-mono">◆</span>
          <span
            className="font-bold text-[9px] tracking-wide whitespace-nowrap"
            style={{ color: sponsor.accentColor }}
          >
            {sponsor.tagline}
          </span>
        </div>
      ))}
    </div>
  </div>
);

/** Individual Stadium Floodlight Tower with full steel lattice stand extending down to the bleachers */
const StadiumLightTower = ({
  side,
  bleachersTopPct,
}: {
  side: 'left' | 'right';
  bleachersTopPct: number;
}) => (
  <div
    className={`absolute pointer-events-none z-10 flex flex-col items-center ${
      side === 'left' ? 'left-5 sm:left-8' : 'right-5 sm:right-8'
    }`}
    style={{
      top: '4px',
      height: `calc(${bleachersTopPct}% - 2px)`,
      width: '28px',
    }}
  >
    {/* Light Head Fixture Bar at Top */}
    <div className="w-full flex flex-col items-center shrink-0">
      <div className="w-full h-3 bg-slate-200 rounded-xs border border-slate-400 shadow-sm flex justify-around items-center px-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-300 shadow-[0_0_4px_#fde047]" />
        <span className="w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-300 shadow-[0_0_4px_#fde047]" />
        <span className="w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-300 shadow-[0_0_4px_#fde047]" />
        <span className="w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-300 shadow-[0_0_4px_#fde047]" />
      </div>
      <div className="w-3/4 h-1.5 bg-slate-300 rounded-b-xs border-x border-b border-slate-400 flex justify-around items-center px-1">
        <span className="w-1 h-1 rounded-full bg-amber-100" />
        <span className="w-1 h-1 rounded-full bg-amber-100" />
      </div>
    </div>

    {/* Steel Lattice Truss Stand extending all the way down to the bleachers */}
    <div className="w-full flex-1 relative min-h-0">
      <svg
        className="w-full h-full"
        preserveAspectRatio="none"
        viewBox="0 0 28 100"
      >
        {/* Main Vertical Steel Legs */}
        <line x1="8" y1="0" x2="8" y2="100" stroke="#475569" strokeWidth="2" />
        <line x1="20" y1="0" x2="20" y2="100" stroke="#475569" strokeWidth="2" />
        <line x1="14" y1="0" x2="14" y2="100" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />

        {/* Diagonal Cross-Bracing lattice rungs going all the way down */}
        <line x1="8" y1="10" x2="20" y2="10" stroke="#64748b" strokeWidth="1.2" />
        <line x1="8" y1="10" x2="20" y2="25" stroke="#64748b" strokeWidth="1" />
        <line x1="20" y1="10" x2="8" y2="25" stroke="#64748b" strokeWidth="1" />

        <line x1="8" y1="25" x2="20" y2="25" stroke="#64748b" strokeWidth="1.2" />
        <line x1="8" y1="25" x2="20" y2="40" stroke="#64748b" strokeWidth="1" />
        <line x1="20" y1="25" x2="8" y2="40" stroke="#64748b" strokeWidth="1" />

        <line x1="8" y1="40" x2="20" y2="40" stroke="#64748b" strokeWidth="1.2" />
        <line x1="8" y1="40" x2="20" y2="55" stroke="#64748b" strokeWidth="1" />
        <line x1="20" y1="40" x2="8" y2="55" stroke="#64748b" strokeWidth="1" />

        <line x1="8" y1="55" x2="20" y2="55" stroke="#64748b" strokeWidth="1.2" />
        <line x1="8" y1="55" x2="20" y2="70" stroke="#64748b" strokeWidth="1" />
        <line x1="20" y1="55" x2="8" y2="70" stroke="#64748b" strokeWidth="1" />

        <line x1="8" y1="70" x2="20" y2="70" stroke="#64748b" strokeWidth="1.2" />
        <line x1="8" y1="70" x2="20" y2="85" stroke="#64748b" strokeWidth="1" />
        <line x1="20" y1="70" x2="8" y2="85" stroke="#64748b" strokeWidth="1" />

        <line x1="8" y1="85" x2="20" y2="85" stroke="#64748b" strokeWidth="1.2" />
        <line x1="8" y1="85" x2="20" y2="100" stroke="#475569" strokeWidth="1.5" />
        <line x1="20" y1="85" x2="8" y2="100" stroke="#475569" strokeWidth="1.5" />

        {/* Steel Anchor Footing plate mounted directly onto the bleachers */}
        <rect x="5" y="96" width="18" height="4" fill="#1e293b" rx="1" />
      </svg>
    </div>
  </div>
);

/** Shared Stadium Floodlights whose stands extend all the way down to the bleachers */
const Floodlights = ({ bleachersTopPct = 26 }: { bleachersTopPct?: number }) => (
  <>
    <StadiumLightTower side="left" bleachersTopPct={bleachersTopPct} />
    <StadiumLightTower side="right" bleachersTopPct={bleachersTopPct} />
  </>
);

/** Tiered Bleacher Crowd scaled by distance for Rounds 0–3 */
const TieredBleacherCrowd = ({
  audience = [],
  rowHeights,
  cols,
}: {
  audience?: HomeRunAudienceMember[];
  rowHeights: readonly number[];
  cols: number;
}) => {
  const rows = rowHeights.length;
  return (
    <div className="relative w-full flex-1 overflow-hidden flex flex-col justify-between pointer-events-none">
      {/* Tiered concrete & wooden bench rows */}
      {rowHeights.map((_, r) => (
        <div
          key={r}
          className="w-full flex-1 border-b border-[#1E3A5F]/70 relative"
          style={{ backgroundColor: r % 2 === 0 ? '#122B48' : '#0F2642' }}
        >
          <div className="absolute bottom-0 inset-x-0 h-1 bg-[#B45309]/90" />
        </div>
      ))}

      {/* Snoos seated across each tier */}
      <div className="absolute inset-0">
        {rowHeights.map((h, r) => {
          const yPct = Math.round(((r + 1) / rows) * 95);
          return Array.from({ length: cols }, (_, c) => {
            const idx = r * cols + c;
            const stagger = r % 2 === 1 ? (100 / cols) * 0.35 : 0;
            const xPct = ((c + 0.5) / cols) * 92 + 4 + stagger;
            const anim: 'bounce' | 'sway' | 'wave' =
              (r + c) % 3 === 0 ? 'bounce' : (r + c) % 3 === 1 ? 'sway' : 'wave';
            return (
              <div
                key={`${r}-${c}`}
                className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center"
                style={{
                  left: `${Math.min(96, Math.max(4, xPct))}%`,
                  top: `${yPct}%`,
                  zIndex: (r + 1) * 10,
                }}
              >
                <FullBodySnoo
                  player={audience[idx]}
                  seed={idx + r * 7}
                  height={h}
                  animation={anim}
                />
              </div>
            );
          });
        })}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* DRAWING 0: INTRO / OVERVIEW (Behind Home Plate)                           */
/* -------------------------------------------------------------------------- */
const DrawingIntro = ({ audience = [] }: { audience?: HomeRunAudienceMember[] }) => (
  <div className="absolute inset-0">
    {/* Sky */}
    <div className="absolute inset-x-0 top-0 h-[50%] bg-linear-to-b from-[#0A7CD5] via-[#1399FF] to-[#60A5FA]" />
    <Floodlights bleachersTopPct={28} />
    <div className="absolute top-0 inset-x-0 h-10 bg-linear-to-b from-[#0A7CD5]/80 to-transparent" />

    {/* Distant Bleachers with tiny cheering Snoos */}
    <div className="absolute top-[28%] inset-x-0 h-[20%] bg-[#0B1E36] overflow-hidden flex flex-col justify-end z-5">
      <TieredBleacherCrowd audience={audience} rowHeights={[13, 17]} cols={14} />
      <LedRibbonTicker heightClass="h-5" />
    </div>

    {/* Outfield Wall: directly contiguous on top of turf boundary */}
    <div className="absolute top-[48%] inset-x-0 h-6 bg-emerald-950 border-t-2 border-yellow-400 flex items-center justify-center z-10 shadow-xs">
      <span className="text-[10px] font-black text-yellow-300 tracking-wider">330 FT</span>
    </div>

    {/* Grass & Infield: seamlessly starts from 48% with pt-6 for wall */}
    <div className="absolute top-[48%] inset-x-0 bottom-0 pt-6 bg-linear-to-b from-[#1b7a2d] to-[#0f541c] z-0">
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Brown dirt running lines (basepaths) enclosing green infield grass */}
        <polygon
          points="50,95 84,62 50,30 16,62"
          fill="none"
          stroke="#b46332"
          strokeWidth="8.5"
          strokeLinejoin="round"
        />
        {/* Dirt cutouts at Home Plate and Bases */}
        <ellipse cx="50" cy="95" rx="13" ry="7.5" fill="#b46332" />
        <ellipse cx="50" cy="30" rx="6" ry="3.8" fill="#b46332" />
        <ellipse cx="16" cy="62" rx="5.5" ry="3.5" fill="#b46332" />
        <ellipse cx="84" cy="62" rx="5.5" ry="3.5" fill="#b46332" />

        {/* Inner Green Infield Grass Diamond */}
        <polygon points="50,88 77,62 50,37 23,62" fill="#176d27" />

        {/* White chalk foul lines extending to the fence & basepath chalk lines */}
        <line x1="50" y1="95" x2="2" y2="48" stroke="#ffffff" strokeWidth="0.9" opacity="0.9" />
        <line x1="50" y1="95" x2="98" y2="48" stroke="#ffffff" strokeWidth="0.9" opacity="0.9" />
        <polyline points="16,62 50,30 84,62" fill="none" stroke="#ffffff" strokeWidth="0.9" opacity="0.9" />

        {/* Flat perspective-aligned bases on the ground */}
        <polygon points="50,26.5 53.5,30 50,33.5 46.5,30" fill="#ffffff" stroke="#1E1B4B" strokeWidth="0.8" strokeLinejoin="round" />
        <polygon points="16,58.8 19.2,62 16,65.2 12.8,62" fill="#ffffff" stroke="#1E1B4B" strokeWidth="0.8" strokeLinejoin="round" />
        <polygon points="84,58.8 87.2,62 84,65.2 80.8,62" fill="#ffffff" stroke="#1E1B4B" strokeWidth="0.8" strokeLinejoin="round" />
      </svg>

      {/* 2nd Base Number (aligned flat on ground at 30%) */}
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
        <span className="text-[7px] font-black text-indigo-950 leading-none">2</span>
      </div>

      {/* Pitcher Mound & Pitcher Snoo */}
      <div className="absolute top-[64%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <div className="w-14 h-5 rounded-[50%] bg-[#b46332] border border-[#8c430e] flex items-center justify-center shadow-xs">
          <div className="w-4 h-1 bg-white rounded-2xs" />
        </div>
        <div className="absolute bottom-2">
          <img src="/default_snoo_small.png" alt="pitcher" className="w-7 h-7 object-contain drop-shadow-sm pointer-events-none" />
        </div>
      </div>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* DRAWING 1: ROUND 1 (Batter's View of Pitcher Snoo on Mound)               */
/* -------------------------------------------------------------------------- */
const DrawingRound1 = ({ audience = [] }: { audience?: HomeRunAudienceMember[] }) => (
  <div className="absolute inset-0">
    {/* Sunny Blue Sky */}
    <div className="absolute inset-x-0 top-0 h-[48%] bg-linear-to-b from-[#0A7CD5] via-[#1399FF] to-[#60A5FA]" />
    <Floodlights bleachersTopPct={25} />
    <div className="absolute top-0 inset-x-0 h-8 bg-linear-to-b from-[#0A7CD5]/80 to-transparent" />

    {/* Distant Bleachers with small cheering Snoos */}
    <div className="absolute top-[25%] inset-x-0 h-[22%] bg-[#0B1E36] overflow-hidden flex flex-col justify-end z-5">
      <TieredBleacherCrowd audience={audience} rowHeights={[16, 20]} cols={13} />
      <LedRibbonTicker heightClass="h-5" />
    </div>

    {/* Outfield Wall: directly contiguous on top of turf boundary */}
    <div className="absolute top-[47%] inset-x-0 h-6 bg-emerald-950 border-t-2 border-yellow-400 flex items-center justify-around px-4 z-10 shadow-xs">
      <span className="text-[9px] font-black text-yellow-300 tracking-wider">330 FT</span>
      <span className="text-[10px] font-black text-white/90 uppercase tracking-widest">⚾ SNOO STADIUM ⚾</span>
      <span className="text-[9px] font-black text-yellow-300 tracking-wider">330 FT</span>
    </div>

    {/* Field Turf: seamlessly starts from 47% with pt-6 for wall */}
    <div className="absolute top-[47%] inset-x-0 bottom-0 pt-6 bg-linear-to-b from-[#1b7a2d] via-[#156e26] to-[#0f541c] z-0">
      {/* Grass mowing stripes */}
      <div className="absolute inset-0 opacity-15 flex">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className={`flex-1 h-full ${i % 2 === 0 ? 'bg-black/25' : 'bg-white/25'}`} />
        ))}
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Brown dirt running lines (basepaths) enclosing green infield grass */}
        <polygon
          points="50,96 84,62 50,30 16,62"
          fill="none"
          stroke="#b46332"
          strokeWidth="9"
          strokeLinejoin="round"
        />
        {/* Dirt cutouts at Home Plate and Bases */}
        <ellipse cx="50" cy="96" rx="14" ry="8" fill="#b46332" />
        <ellipse cx="50" cy="30" rx="6.5" ry="4" fill="#b46332" />
        <ellipse cx="16" cy="62" rx="6" ry="3.8" fill="#b46332" />
        <ellipse cx="84" cy="62" rx="6" ry="3.8" fill="#b46332" />

        {/* Inner Green Infield Grass Diamond */}
        <polygon points="50,88.5 76.5,62 50,37 23.5,62" fill="#176d27" opacity="0.95" />

        {/* White chalk foul lines extending to the fence & basepath chalk lines */}
        <line x1="50" y1="96" x2="2" y2="48" stroke="#ffffff" strokeWidth="0.9" opacity="0.9" />
        <line x1="50" y1="96" x2="98" y2="48" stroke="#ffffff" strokeWidth="0.9" opacity="0.9" />
        <polyline points="16,62 50,30 84,62" fill="none" stroke="#ffffff" strokeWidth="0.9" opacity="0.9" />

        {/* Flat perspective-aligned bases lying on the ground */}
        <polygon points="50,26.2 53.8,30 50,33.8 46.2,30" fill="#ffffff" stroke="#1E1B4B" strokeWidth="0.8" strokeLinejoin="round" />
        <polygon points="16,58.5 19.5,62 16,65.5 12.5,62" fill="#ffffff" stroke="#1E1B4B" strokeWidth="0.8" strokeLinejoin="round" />
        <polygon points="84,58.5 87.5,62 84,65.5 80.5,62" fill="#ffffff" stroke="#1E1B4B" strokeWidth="0.8" strokeLinejoin="round" />
      </svg>

      {/* Base numbers aligned flat on the ground */}
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
        <span className="text-[8px] font-black text-indigo-950 leading-none">2</span>
      </div>
      <div className="absolute top-[62%] left-[16%] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
        <span className="text-[7px] font-black text-indigo-950 leading-none">3</span>
      </div>
      <div className="absolute top-[62%] left-[84%] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
        <span className="text-[7px] font-black text-indigo-950 leading-none">1</span>
      </div>

      {/* Pitcher's Mound & Pitcher Snoo: Centered in the green infield diamond below 2nd base */}
      <div className="absolute top-[66%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-20">
        {/* Dirt Mound */}
        <div className="w-20 h-7 rounded-[50%] bg-[#b46332] border-2 border-[#8c430e] flex items-center justify-center shadow-md">
          {/* Pitching rubber */}
          <div className="w-5 h-1.5 bg-white rounded-2xs shadow-xs" />
        </div>

        {/* Pitcher Snoo who threw the ball */}
        <div className="absolute bottom-3.5 flex flex-col items-center">
          <img
            src="/default_snoo.png"
            alt="Pitcher Snoo"
            className="w-11 h-11 object-contain drop-shadow-lg pointer-events-none select-none"
            draggable={false}
          />
          <div className="w-6 h-1.5 rounded-full bg-black/40 blur-[1px] -mt-1" />
        </div>
      </div>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* DRAWING 2: ROUND 2 (2nd Base Foreground — Pitcher GONE)                   */
/* -------------------------------------------------------------------------- */
const DrawingRound2 = ({ audience = [] }: { audience?: HomeRunAudienceMember[] }) => (
  <div className="absolute inset-0">
    {/* Sky */}
    <div className="absolute inset-x-0 top-0 h-[45%] bg-linear-to-b from-[#0A7CD5] via-[#1399FF] to-[#60A5FA]" />
    <Floodlights bleachersTopPct={18} />
    <div className="absolute top-0 inset-x-0 h-8 bg-linear-to-b from-[#0A7CD5]/80 to-transparent" />

    {/* Bleachers: Closer now, with medium-small Snoos cheering in tiered rows */}
    <div className="absolute top-[18%] inset-x-0 h-[23%] bg-[#0B1E36] overflow-hidden flex flex-col justify-end z-5">
      <TieredBleacherCrowd audience={audience} rowHeights={[22, 28]} cols={11} />
      <LedRibbonTicker heightClass="h-6" />
    </div>

    {/* Outfield Wall: Much closer, prominent distance marker */}
    <div className="absolute top-[41%] inset-x-0 h-9 bg-linear-to-b from-emerald-800 to-emerald-950 border-t-3 border-yellow-400 flex items-center justify-around px-4 shadow-md z-10">
      <span className="text-yellow-300 font-black text-xs font-mono">330 FT</span>
      <span className="text-white font-black text-xs tracking-wider uppercase drop-shadow-sm flex items-center gap-1.5">
        <span>⚾</span>
        <span>HIT OVER 2ND BASE</span>
        <span>⚾</span>
      </span>
      <span className="text-yellow-300 font-black text-xs font-mono">330 FT</span>
    </div>

    {/* Outfield Grass & Infield Edge with 2nd Base: starts seamlessly from 41% with pt-9 for wall */}
    <div className="absolute top-[41%] inset-x-0 bottom-0 pt-9 bg-linear-to-b from-[#1b7a2d] via-[#156e26] to-[#0f541c] z-0">
      {/* Outfield mowing lines */}
      <div className="absolute inset-0 opacity-20 flex">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className={`flex-1 h-full ${i % 2 === 0 ? 'bg-black/20' : 'bg-white/20'}`} />
        ))}
      </div>

      {/* Brown dirt running lines meeting at 2nd base with green infield grass below */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Wide brown dirt running paths from 3rd Base (left) and 1st Base (right) meeting at 2nd Base */}
        <polyline
          points="4,98 50,54 96,98"
          fill="none"
          stroke="#b46332"
          strokeWidth="13"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Dirt cutout circle around 2nd Base */}
        <ellipse cx="50" cy="54" rx="11" ry="6.5" fill="#b46332" stroke="#8c430e" strokeWidth="0.6" />

        {/* Inner Green Infield Grass below the brown running lines */}
        <polygon points="50,62 84,100 16,100" fill="#176d27" opacity="0.95" />

        {/* Crisp white chalk running lines meeting at 2nd Base */}
        <polyline
          points="4,98 50,54 96,98"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.4"
          opacity="0.92"
        />

        {/* 2nd Base Bag lying flat on the ground, aligned with the running line perspective */}
        <polygon
          points="50,47.2 56.8,54 50,60.8 43.2,54"
          fill="#ffffff"
          stroke="#1E1B4B"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>

      {/* 2nd Base Number "2" centered on the flat ground-aligned base bag */}
      <div className="absolute top-[54%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-20">
        <span className="text-xs sm:text-sm font-black text-indigo-950 leading-none">2</span>
      </div>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* DRAWING 3: ROUND 3 (Outfield Wall & Start of Bleachers)                   */
/* -------------------------------------------------------------------------- */
const DrawingRound3 = ({ audience = [] }: { audience?: HomeRunAudienceMember[] }) => (
  <div className="absolute inset-0">
    {/* Sky */}
    <div className="absolute inset-x-0 top-0 h-[46%] bg-linear-to-b from-[#0A7CD5] via-[#1399FF] to-[#60A5FA]" />
    <Floodlights bleachersTopPct={12} />
    <div className="absolute top-0 inset-x-0 h-6 bg-linear-to-b from-[#0A7CD5]/80 to-transparent" />

    {/* The Start of the Bleachers: Rising right above the wall with medium-large Snoos */}
    <div className="absolute top-[12%] inset-x-0 h-[34%] bg-[#0B1E36] overflow-hidden flex flex-col justify-end z-5">
      <TieredBleacherCrowd audience={audience} rowHeights={[30, 38, 46]} cols={10} />
    </div>

    {/* Massive Outfield Wall right across the midground */}
    <div className="absolute top-[46%] inset-x-0 h-16 bg-linear-to-b from-emerald-800 via-emerald-900 to-emerald-950 border-t-4 border-yellow-400 shadow-xl z-20 flex flex-col justify-between">
      <div className="flex items-center justify-between px-6 pt-1">
        <span className="text-yellow-300 font-mono font-black text-sm tracking-wider">330 FT</span>
        <span className="text-white font-black text-xs uppercase tracking-widest drop-shadow-sm flex items-center gap-1.5">
          <span>⚾</span>
          <span>OUTFIELD WALL — HIT OVER!</span>
          <span>⚾</span>
        </span>
        <span className="text-yellow-300 font-mono font-black text-sm tracking-wider">330 FT</span>
      </div>
      <LedRibbonTicker heightClass="h-7" />
    </div>

    {/* Deep Outfield Grass & Warning Track Dirt: starts seamlessly from 46% with pt-16 for wall */}
    <div className="absolute top-[46%] inset-x-0 bottom-0 pt-16 bg-linear-to-b from-[#1b7a2d] to-[#0f541c] z-0">
      {/* Warning track dirt strip directly beneath the wall */}
      <div className="w-full h-10 bg-[#b85d19] border-b-3 border-[#8c430e] shadow-inner" />
      {/* Deep green turf below */}
      <div className="w-full flex-1 bg-linear-to-b from-[#156e26] to-[#0f541c]" />
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* DRAWING 4: ROUND 4 (Inside the Bleachers with a bit of grass underneath)   */
/* -------------------------------------------------------------------------- */
const DrawingRound4 = ({ audience = [] }: { audience?: HomeRunAudienceMember[] }) => {
  const seatAssignments = useMemo(() => {
    return BLEACHER_SEATS.map((seat, index) => {
      const player = audience[index];
      return {
        ...seat,
        player,
      };
    });
  }, [audience]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Stadium Roof Canopy at Top */}
      <div className="absolute top-0 inset-x-0 h-8 bg-linear-to-b from-[#0A7CD5] to-transparent z-40" />

      {/* We are INSIDE THE BLEACHERS: Tiered seating filled with Full-Body Snoos */}
      <div className="absolute top-0 inset-x-0 bottom-12 bg-[#0B1E36] overflow-hidden">
        {/* Concrete tiers & wooden benches */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          <div className="w-full h-[25%] bg-[#122B48] border-b-2 border-[#1E3A5F]/70 relative">
            <div className="absolute bottom-0 inset-x-0 h-2 bg-[#B45309]" />
          </div>
          <div className="w-full h-[25%] bg-[#0F2642] border-b-2 border-[#1E3A5F]/70 relative">
            <div className="absolute bottom-0 inset-x-0 h-2 bg-[#B45309]" />
          </div>
          <div className="w-full h-[25%] bg-[#0D2038] border-b-2 border-[#1E3A5F]/70 relative">
            <div className="absolute bottom-0 inset-x-0 h-2 bg-[#B45309]" />
          </div>
          <div className="w-full h-[25%] bg-[#0A1B2E] relative">
            <div className="absolute bottom-0 inset-x-0 h-2 bg-[#B45309]" />
          </div>
        </div>

        {/* Real Reddit Players & Procedural Snoos in the Bleachers */}
        <div className="absolute inset-0">
          {seatAssignments.map((seat, idx) => (
            <div
              key={idx}
              className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center"
              style={{
                left: `${seat.xPct}%`,
                top: `${seat.yPct}%`,
                zIndex: (seat.row + 1) * 10,
              }}
            >
              <FullBodySnoo
                player={seat.player}
                seed={idx}
                height={seat.height}
                animation={seat.animation}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom edge: Wall top padding and a sliver of green grass visible underneath */}
      <div className="absolute bottom-0 inset-x-0 h-12 z-50 flex flex-col shadow-2xl">
        {/* Yellow top padding of the outfield wall */}
        <div className="w-full h-3 bg-yellow-400 border-y border-amber-600 shadow-sm flex items-center justify-around">
          <span className="w-2 h-1 bg-amber-600 rounded-2xs" />
          <span className="text-[7px] font-black text-indigo-950 font-mono tracking-wider">330 FT LINE</span>
          <span className="w-2 h-1 bg-amber-600 rounded-2xs" />
        </div>
        {/* Warning track dirt & green outfield grass underneath */}
        <div className="w-full h-4 bg-[#b85d19] border-b border-[#8c430e]" />
        <div className="w-full flex-1 bg-[#156e26] border-t border-[#1b7a2d]" />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* DRAWING 5: WIN / HOME RUN CELEBRATION (Deep in the Bleachers)              */
/* -------------------------------------------------------------------------- */
const DrawingRound5 = ({ audience = [] }: { audience?: HomeRunAudienceMember[] }) => (
  <div className="absolute inset-0 overflow-hidden bg-[#0A1B2E]">
    <DrawingRound4 audience={audience} />
    {/* Confetti & Golden Home Run Celebration Overlay */}
    <div className="absolute inset-0 pointer-events-none z-50 flex flex-col items-center justify-start pt-3 bg-yellow-400/10">
      <div className="px-5 py-1 rounded-full bg-yellow-400 border-2 border-indigo-950 text-indigo-950 font-black text-xs uppercase tracking-widest shadow-xl animate-bounce">
        🏆 HOME RUN INTO THE SNOO BLEACHERS! 🏆
      </div>
      <div className="absolute inset-0 flex justify-around pointer-events-none overflow-hidden">
        {['🎊', '⭐', '✨', '🎉', '⚾', '✨', '🎊', '🎉'].map((icon, i) => (
          <span
            key={i}
            className="text-2xl animate-fall"
            style={{ animationDelay: `${i * 250}ms`, animationDuration: '2.5s' }}
          >
            {icon}
          </span>
        ))}
      </div>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT: Layered Per-Round Drawing + Dynamic Move In/Out            */
/* -------------------------------------------------------------------------- */
export const StadiumBackground = ({
  round,
  zoomLevel,
  phase,
  timeProgress = 0,
  audience = [],
  className = '',
}: StadiumBackgroundProps) => {
  // Determine which distinct perspective drawing to render:
  // 0 = Intro
  // 1 = Round 1 (Pitcher's mound & Pitcher Snoo)
  // 2 = Round 2 (2nd base foreground, pitcher gone)
  // 3 = Round 3 (Outfield wall & start of bleachers)
  // 4 = Round 4 (Inside the bleachers with a bit of grass underneath)
  // 5+ = Win Celebration
  const currentRound = useMemo(() => {
    if (round !== undefined) return Math.max(0, Math.min(5, round));
    if (zoomLevel !== undefined) return Math.max(0, Math.min(5, Math.floor(zoomLevel)));
    return 1;
  }, [round, zoomLevel]);

  // Dynamic Camera Move In / Out FOR THIS ROUND'S DRAWING:
  // - Starts at base scale 1.0.
  // - Edges forward smoothly as time counts down (+0.12 scale).
  // - Zooms in dynamically on smash (+0.35 scale).
  // - Pulls back abruptly on miss / timeout (-0.15 scale).
  const transformStyle = useMemo(() => {
    const isSmashing = phase === 'smash' || (zoomLevel !== undefined && zoomLevel % 1 >= 0.35);
    const isMiss = phase === 'miss' || (zoomLevel !== undefined && zoomLevel > 0 && zoomLevel < 0.9);
    const isTimeout = phase === 'timeout';

    let deltaScale = 0;
    if (isSmashing) {
      deltaScale = 0.35; // zoom in on smash
    } else if (isMiss) {
      deltaScale = -0.15; // pull back on miss
    } else if (isTimeout) {
      deltaScale = -0.12; // pull back on timeout
    } else if (timeProgress > 0) {
      deltaScale = timeProgress * 0.12; // slow edge forward as timer counts down
    }

    const finalScale = Math.max(0.75, 1.0 + deltaScale);

    let transition = 'transform 0.4s cubic-bezier(0.1, 0.9, 0.2, 1)';
    if (isSmashing) {
      transition = 'transform 0.65s cubic-bezier(0.15, 0.95, 0.2, 1.05)';
    } else if (isMiss) {
      transition = 'transform 0.5s cubic-bezier(0.3, 0, 0.8, 0.25)';
    }

    return {
      transform: `scale(${finalScale.toFixed(3)})`,
      transformOrigin: '50% 70%',
      transition,
    };
  }, [phase, zoomLevel, timeProgress]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <div className="w-full h-full relative" style={transformStyle}>
        {currentRound === 0 && <DrawingIntro audience={audience} />}
        {currentRound === 1 && <DrawingRound1 audience={audience} />}
        {currentRound === 2 && <DrawingRound2 audience={audience} />}
        {currentRound === 3 && <DrawingRound3 audience={audience} />}
        {currentRound === 4 && <DrawingRound4 audience={audience} />}
        {currentRound >= 5 && <DrawingRound5 audience={audience} />}

        {/* Stadium Daylight Vignette Atmosphere */}
        <div className="absolute inset-0 bg-radial from-transparent via-transparent to-[#0A7CD5]/20 pointer-events-none" />
      </div>
    </div>
  );
};
