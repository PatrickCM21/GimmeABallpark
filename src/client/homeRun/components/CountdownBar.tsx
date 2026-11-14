import { URGENT_MS } from '../constants';

type CountdownBarProps = {
  msLeft: number;
  totalMs: number;
};

/** Shrinking timer bar with a seconds readout. Turns red and pulses when time is nearly up. */
export const CountdownBar = ({ msLeft, totalMs }: CountdownBarProps) => {
  const pct = Math.max(0, Math.min(100, (msLeft / totalMs) * 100));
  const urgent = msLeft <= URGENT_MS;
  const seconds = Math.ceil(msLeft / 1000);

  return (
    <div className="flex items-center gap-2 w-full" role="timer" aria-live="off" aria-label={`${seconds} seconds left`}>
      <div className="flex-1 h-3 rounded-full bg-slate-200 border-2 border-indigo-950 overflow-hidden">
        <div
          className={`h-full rounded-full ${urgent ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`w-8 text-right text-lg font-black tabular-nums ${urgent ? 'text-red-600 urgent-pulse' : 'text-indigo-950'}`}
      >
        {seconds}
      </span>
    </div>
  );
};
