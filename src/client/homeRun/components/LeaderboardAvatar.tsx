import React, { useState } from 'react';
import { FALLBACK_SNOO_URL } from '../constants';
import { BaseballBat } from './BaseballBat';

export type LeaderboardAvatarProps = {
  username?: string | undefined;
  snoovatarUrl?: string | undefined;
  size?: number | undefined;
  className?: string | undefined;
};

/**
 * Leaderboard avatar showing the player's Snoo holding a baseball bat.
 * Follows the layered avatar structure from the trolley problem game.
 */
export const LeaderboardAvatar: React.FC<LeaderboardAvatarProps> = ({
  username,
  snoovatarUrl,
  size = 38,
  className = '',
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const trimmedUrl = snoovatarUrl?.trim();
  const imgSrc =
    trimmedUrl && trimmedUrl !== '' && failedSrc !== trimmedUrl
      ? trimmedUrl
      : FALLBACK_SNOO_URL;

  return (
    <div
      className={`leaderboard-avatar-container ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-hidden="true"
    >
      {/* 1. Player Snoo */}
      <img
        key={imgSrc}
        src={imgSrc}
        alt={username ? `u/${username}'s Snoo` : 'Batter Snoo'}
        className="leaderboard-avatar-snoo"
        loading="lazy"
        draggable={false}
        onError={() => {
          if (trimmedUrl && imgSrc !== FALLBACK_SNOO_URL) {
            setFailedSrc(trimmedUrl);
          }
        }}
      />

      {/* 2. Foreground Layer: Baseball Bat held by Snoo */}
      <div className="leaderboard-avatar-bat">
        <BaseballBat className="w-full h-full drop-shadow-xs" />
      </div>
    </div>
  );
};
