import type { CSSProperties } from 'react';
import { BALL_SIZE_PX, FALL_MS, SERVE_MS, STRIKE_MS } from '../constants';
import type { Point } from '../hooks/useArenaGeometry';
import { HurlingBall } from './HurlingBall';

export type BallVariant = 'hidden' | 'launch' | 'follow' | 'strike' | 'smash' | 'bounce' | 'fall';

type BallCursorProps = {
  variant: BallVariant;
  /** Ball centre in arena coordinates (meaning depends on the variant, see MatchupBoard). */
  position: Point;
  /** Where the launch starts (the bat). */
  launchFrom: Point;
  /** Y (arena coordinates) the ball drops to. */
  floorY: number;
  /** Horizontal drift when bouncing off the glass: -1 left, 1 right. */
  bounceDirection: -1 | 1;
};

const BOUNCE_DRIFT_PX = 90;
const HALF = BALL_SIZE_PX / 2;

/**
 * The ball: acts as the player's cursor while live, then flies / smashes / bounces / drops.
 * Always features moving downward wind lines streaming down from behind/around the ball,
 * conveying relentless forward propulsion toward the outfield.
 */
export const BallCursor = ({ variant, position, launchFrom, floorY, bounceDirection }: BallCursorProps) => {
  if (variant === 'hidden') return null;

  const isLaunch = variant === 'launch';
  const dropY = floorY - HALF;

  let x = position.x - HALF;
  let y = position.y - HALF;
  let xTransition = 'none';
  let yTransition = 'none';

  if (variant === 'strike') {
    xTransition = `transform ${STRIKE_MS}ms ease-in`;
    yTransition = xTransition;
  } else if (variant === 'bounce') {
    x += bounceDirection * BOUNCE_DRIFT_PX;
    y = dropY;
    xTransition = `transform ${FALL_MS}ms ease-out`;
    yTransition = `transform ${FALL_MS}ms cubic-bezier(0.45, 0, 0.9, 0.55)`;
  } else if (variant === 'fall') {
    y = dropY;
    yTransition = `transform ${FALL_MS}ms cubic-bezier(0.5, 0, 1, 0.6)`;
  }

  const launchVars: CSSProperties & Record<string, string> = {
    '--from-x': `${launchFrom.x - HALF}px`,
    '--from-y': `${launchFrom.y - HALF}px`,
    '--to-x': `${x}px`,
    '--to-y': `${y}px`,
    '--serve-ms': `${SERVE_MS}ms`,
  };

  const showWind = variant === 'follow' || variant === 'launch' || variant === 'strike' || variant === 'smash';
  const intensity = variant === 'strike' || variant === 'smash' ? 'intense' : 'normal';
  const spinning = variant !== 'fall';
  const wobble = variant !== 'fall';
  const innerClass = `${variant === 'smash' ? 'ball-smash' : ''} ${variant === 'fall' ? 'ball-squash' : ''}`;

  // When smashing, continue rocketing outward in the direction of the hit target (slightly angled toward outfield center/top)
  const smashVars: CSSProperties & Record<string, string> =
    variant === 'smash'
      ? {
          '--smash-dx': `${bounceDirection === 1 ? '45px' : '-45px'}`,
          '--smash-dy': '-190px',
        }
      : {};

  return (
    <div className="absolute left-0 top-0 z-30 pointer-events-none" aria-hidden="true">
      <div
        className={isLaunch ? 'ball-launch-x' : ''}
        style={isLaunch ? launchVars : { transform: `translateX(${x}px)`, transition: xTransition }}
      >
        <div
          className={isLaunch ? 'ball-launch-y' : ''}
          style={isLaunch ? undefined : { transform: `translateY(${y}px)`, transition: yTransition }}
        >
          <div className={innerClass} style={smashVars}>
            <HurlingBall
              size={BALL_SIZE_PX}
              showWind={showWind}
              intensity={intensity}
              spinning={spinning}
              wobble={wobble}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
