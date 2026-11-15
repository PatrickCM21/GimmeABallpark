import { useEffect, useState } from 'react';
import { isSoundMuted, subscribeSoundMuted, toggleSoundMuted } from '../sounds';

type SoundToggleButtonProps = {
  className?: string;
};

/**
 * Top-right Sound Effects toggle button using the speaker icon and ON/OFF switch
 * design from The Trolley Problem.
 */
export const SoundToggleButton = ({ className = '' }: SoundToggleButtonProps) => {
  const [muted, setMuted] = useState<boolean>(() => isSoundMuted());

  useEffect(() => {
    return subscribeSoundMuted(setMuted);
  }, []);

  const enabled = !muted;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? 'Turn off sound effects' : 'Turn on sound effects'}
      title={enabled ? 'Sound Effects: ON (click to mute)' : 'Sound Effects: OFF (click to unmute)'}
      onClick={(e) => {
        e.stopPropagation();
        toggleSoundMuted();
      }}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-yellow-200 border-2 border-indigo-950 text-indigo-950 cursor-pointer transition-all active:translate-y-0.5 shadow-xs select-none ${className}`}
    >
      {/* Trolley Problem Speaker Off/On SVG Icon */}
      <span className="flex items-center justify-center w-4 h-4 text-indigo-950 shrink-0">
        {muted ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="block">
            <path
              d="M13.173 6.414l1.413-1.413L16 6.415l-1.413 1.413L16 9.242l-1.414 1.414-1.413-1.413-1.414 1.413-1.414-1.414 1.413-1.414-1.413-1.413 1.414-1.414 1.414 1.413zM0 3h2l6-3v16l-6-3H0V3zm2 2v6l3.997 2V3L2 5z"
              fillRule="evenodd"
            />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="block">
            <path
              d="M10 2c3.314 0 6 2.693 6 6 0 3.314-2.693 6-6 6v-2c2.205 0 4-1.79 4-4 0-2.205-1.79-4-4-4V2zm0 4c1.105 0 2 .888 2 2 0 1.105-.888 2-2 2V6zM0 3h2l6-3v16l-6-3H0V3zm2 2v6l4 2V3L2 5z"
              fillRule="evenodd"
            />
          </svg>
        )}
      </span>

      {/* Trolley Problem ON/OFF Switch Pill */}
      <span
        className={`relative w-11 h-5 rounded-full flex items-center p-0.5 transition-colors ${
          enabled ? 'bg-indigo-950 justify-end' : 'bg-slate-300 justify-start'
        }`}
      >
        {enabled ? (
          <span className="absolute left-1.5 text-[9px] font-black uppercase tracking-tight text-white leading-none">
            ON
          </span>
        ) : (
          <span className="absolute right-1.5 text-[9px] font-black uppercase tracking-tight text-indigo-950 leading-none">
            OFF
          </span>
        )}
        <span
          className={`w-4 h-4 rounded-full bg-white transition-transform ${
            !enabled ? 'border border-slate-400' : ''
          }`}
        />
      </span>
    </button>
  );
};
