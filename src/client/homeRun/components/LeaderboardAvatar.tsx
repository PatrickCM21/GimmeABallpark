import React, { useState } from 'react';
import { FALLBACK_SNOO_URL } from '../constants';
import { BaseballBat } from './BaseballBat';
import { HurlingBall } from './HurlingBall';

export type LeaderboardAvatarProps = {
  username?: string | undefined;
  snoovatarUrl?: string | undefined;
  equippedBat?: string | undefined;
  equippedBall?: string | undefined;
  size?: number | undefined;
  className?: string | undefined;
};

/**
 * Leaderboard avatar showing the player's Snoo holding their equipped bat
 * alongside their equipped static ball badge in the bottom-right corner.
 */
export const LeaderboardAvatar: React.FC<LeaderboardAvatarProps> = ({
  username,
  snoovatarUrl,
  equippedBat = 'default',
  equippedBall = 'default',
  size = 38,
  className = '',
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const trimmedUrl = snoovatarUrl?.trim();
  const imgSrc =
    trimmedUrl && trimmedUrl !== '' && failedSrc !== trimmedUrl
      ? trimmedUrl
      : FALLBACK_SNOO_URL;

  const ballSize = Math.max(10, Math.round(size * 0.34));

  return (
    <div
      className={`leaderboard-avatar-outer ${className}`.trim()}
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-hidden="true"
    >
      <div className="leaderboard-avatar-container">
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
          <BaseballBat batId={equippedBat} className="w-full h-full drop-shadow-xs" />
        </div>
      </div>

      {/* 3. Equipped Ball Badge in bottom-right corner */}
      <div className="leaderboard-avatar-ball">
        <HurlingBall
          ballId={equippedBall}
          size={ballSize}
          showWind={false}
          wobble={false}
          spinning={false}
          spinMode="2d"
        />
      </div>
    </div>
  );
};
