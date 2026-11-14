import type { HomeRunOptionPublic } from '../../../shared/types/homeRun';
import { ShatterShards } from './ShatterShards';

export type GlassPaneStatus = 'idle' | 'cracked' | 'smashed';

type GlassPaneProps = {
  option: HomeRunOptionPublic;
  status: GlassPaneStatus;
  /** Revealed value (shown when round resolves, unless already smashed) */
  revealText?: string | undefined;
  isWinner?: boolean | undefined;
  disabled: boolean;
  onSelect: (element: HTMLElement) => void;
};

const CRACKS = (
  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <g stroke="rgba(255,255,255,0.95)" strokeWidth="1.2" fill="none" strokeLinecap="round">
      <path d="M50 50 L18 10 M50 50 L88 22 M50 50 L72 92 M50 50 L8 66 M50 50 L96 60" />
      <path d="M34 30 L24 40 M70 36 L78 26 M62 72 L74 70" />
    </g>
  </svg>
);

/**
 * One answer choice rendered as a pane of glass.
 * When smashed, the glass pane completely disintegrates and the answer text/emoji disappears
 * so you smash through cleanly and the shards fly away.
 */
export const GlassPane = ({ option, status, revealText, isWinner, disabled, onSelect }: GlassPaneProps) => {
  const smashed = status === 'smashed';

  return (
    <button
      type="button"
      disabled={disabled || smashed}
      onClick={(e) => onSelect(e.currentTarget)}
      className={`relative flex-1 min-h-32 sm:min-h-38 rounded-xl p-3.5 sm:p-4 flex flex-col items-center justify-center text-center gap-1.5 overflow-visible transition-all duration-300
        ${
          smashed
            ? 'border-0 bg-transparent shadow-none pointer-events-none opacity-0 scale-105'
            : 'border-2 border-white/80 bg-white/30 backdrop-blur-sm shadow-[inset_0_0_24px_rgba(255,255,255,0.55),0_6px_18px_rgba(15,43,72,0.25)]'
        }
        ${status === 'cracked' ? 'glass-hit' : ''}
        ${!disabled && !smashed ? 'hover:bg-white/45 cursor-none' : 'cursor-default'}`}
    >
      {/* Shatter shards effect when glass breaks */}
      {smashed && <ShatterShards />}

      {/* Pane content only visible while not smashed */}
      {!smashed && (
        <>
          {/* diagonal glare */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-xl pointer-events-none bg-linear-to-br from-white/50 via-transparent to-transparent"
          />

          {status === 'cracked' && CRACKS}

          <span className="relative text-3xl sm:text-4xl leading-none drop-shadow-xs">{option.emoji}</span>
          <span className="relative font-black text-lg sm:text-2xl text-indigo-950 leading-snug tracking-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.75)]">
            {option.label}
          </span>

          {revealText && (
            <span
              className={`relative mt-1 px-3 py-1 rounded-full text-sm sm:text-base font-black shadow-sm ${
                isWinner ? 'bg-green-500 text-white' : 'bg-slate-700/85 text-white'
              }`}
            >
              {isWinner ? '👑 ' : ''}
              {revealText}
            </span>
          )}
        </>
      )}
    </button>
  );
};
