import { BaseballBat } from './BaseballBat';
import { SnooAvatar } from './SnooAvatar';

type BatterProps = {
  snoovatarUrl?: string | undefined;
  swinging: boolean;
};

/** The player's snoovatar at the plate with a high-definition detailed bat. */
export const Batter = ({ snoovatarUrl, swinging }: BatterProps) => (
  <div className="absolute left-2 bottom-1 z-20 w-24 h-24 pointer-events-none" aria-hidden="true">
    <SnooAvatar src={snoovatarUrl} size={80} className="absolute left-0 bottom-0 drop-shadow-lg" />
    {/* Bat: pivots around the knob/grip near Snoo's hands */}
    <div
      className={`absolute left-11 bottom-5 origin-[18px_116px] ${swinging ? 'bat-swing' : ''}`}
      style={{ transform: swinging ? undefined : 'rotate(-72deg)' }}
    >
      <BaseballBat className="w-8 h-24" />
    </div>
  </div>
);
