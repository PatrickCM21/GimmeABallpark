import type { CSSProperties } from 'react';
import { SHARD_COUNT } from '../constants';

const COLS = 7;
const ROWS = Math.ceil(SHARD_COUNT / COLS);

const CLIP_PATHS = [
  'polygon(0 0, 100% 15%, 40% 100%)',
  'polygon(20% 0, 100% 0, 70% 100%)',
  'polygon(0 30%, 100% 0, 80% 100%)',
  'polygon(0 0, 100% 40%, 30% 100%)',
] as const;

type Shard = { style: CSSProperties };

/** Deterministic (render-pure) shard layout so the explosion looks organic but is stable between renders. */
const buildShards = (): Shard[] =>
  Array.from({ length: SHARD_COUNT }, (_, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const angle = (i * 137.5 * Math.PI) / 180;
    const distance = 90 + (i % 5) * 28;
    const style: CSSProperties & Record<string, string | number> = {
      left: `${(col / COLS) * 100}%`,
      top: `${(row / ROWS) * 100}%`,
      width: `${100 / COLS + 3}%`,
      height: `${100 / ROWS + 6}%`,
      clipPath: CLIP_PATHS[i % CLIP_PATHS.length] ?? CLIP_PATHS[0],
      '--dx': `${Math.cos(angle) * distance}px`,
      '--dy': `${Math.sin(angle) * distance + 120}px`,
      '--rot': `${((i % 7) - 3) * 120}deg`,
      animationDelay: `${(i % 4) * 20}ms`,
    };
    return { style };
  });

/** Pieces of glass that fly outwards. Render inside a `relative` container to cover it. */
const SHARDS = buildShards();

export const ShatterShards = () => {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {SHARDS.map((shard, i) => (
        <div
          key={i}
          className="shard absolute bg-white/60 border border-white/80 backdrop-blur-[1px]"
          style={shard.style}
        />
      ))}
    </div>
  );
};
