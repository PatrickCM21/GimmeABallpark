import { useState } from 'react';
import { FALLBACK_SNOO_URL } from '../constants';
import { BaseballMitt } from './BaseballMitt';

type SnooAvatarProps = {
  src?: string | undefined;
  /** Pixel size of the (square) avatar. */
  size: number;
  /** Crop to the head & shoulders (used for the bird's-eye base token). */
  headOnly?: boolean;
  /** Show baseball mitt on Snoo (defaults to false) */
  withMitt?: boolean;
  className?: string;
};

/**
 * Player snoovatar with a graceful fallback to the authentic default naked Reddit Snoo.
 * Supports adding an optional leather baseball mitt on Snoo.
 */
export const SnooAvatar = ({
  src,
  size,
  headOnly = false,
  withMitt = false,
  className = '',
}: SnooAvatarProps) => {
  const [failed, setFailed] = useState(false);
  const url = !src || failed ? FALLBACK_SNOO_URL : src;

  const mittSize = Math.round(size * 0.38);

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={url}
        alt="Your snoovatar"
        width={size}
        height={size}
        draggable={false}
        decoding="async"
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
        className={`select-none pointer-events-none w-full h-full ${
          headOnly ? 'object-cover object-top' : 'object-contain'
        }`}
      />

      {/* Baseball Mitt equipped on Snoo's hand */}
      {withMitt && !headOnly && (
        <div
          className="absolute z-20 pointer-events-none drop-shadow-md"
          style={{
            bottom: '20%',
            left: '17%',
            transform: 'rotate(-10deg)',
          }}
        >
          <BaseballMitt size={mittSize} />
        </div>
      )}
    </div>
  );
};
