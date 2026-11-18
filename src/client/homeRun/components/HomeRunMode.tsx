import { useCallback, useEffect, useState } from 'react';
import type { HomeRunGameState } from '../../../shared/types/homeRun';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { homeRunApi } from '../homeRunApi';
import { HomeRunGame } from './HomeRunGame';

const toMessage = (e: unknown, fallback: string): string => (e instanceof Error ? e.message : fallback);

type HomeRunModeProps = {
  initialState?: HomeRunGameState | undefined;
};

/** Entry point for Home Run posts: renders immediately when initialState is provided, then loads extras asynchronously. */
export const HomeRunMode = ({ initialState }: HomeRunModeProps) => {
  const [state, setState] = useState<HomeRunGameState | null>(initialState ?? null);
  const [error, setError] = useState<string | null>(null);
  /** Bumping this refetches state (used for retry and dev reset). */
  const [loadId, setLoadId] = useState(0);

  useEffect(() => {
    if (loadId === 0 && initialState) return;
    let cancelled = false;
    homeRunApi
      .getState()
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(toMessage(e, 'Failed to load Home Run'));
      });
    return () => {
      cancelled = true;
    };
  }, [loadId, initialState]);

  // Fetch non-blocking extras (snoovatar, stadium audience, stats) in the background while the user starts playing.
  const needsExtras = Boolean(state && state.audience === undefined);
  useEffect(() => {
    if (!needsExtras) return;
    let cancelled = false;
    homeRunApi
      .getExtras()
      .then((extras) => {
        if (cancelled) return;
        setState((prev) =>
          prev
            ? {
                ...prev,
                snoovatarUrl: prev.snoovatarUrl ?? extras.snoovatarUrl,
                audience: prev.audience ?? extras.audience ?? [],
                stats: prev.stats.length > 0 ? prev.stats : extras.stats,
                lifetimeStats: prev.lifetimeStats ?? extras.lifetimeStats,
                userBases: prev.userBases ?? extras.userBases,
                equippedBat: prev.equippedBat ?? extras.equippedBat,
                ownedBats: prev.ownedBats ?? extras.ownedBats,
                equippedBall: prev.equippedBall ?? extras.equippedBall,
                ownedBalls: prev.ownedBalls ?? extras.ownedBalls,
              }
            : prev
        );
      })
      .catch(() => {
        // Non-critical: gameplay works fine without extras
      });
    return () => {
      cancelled = true;
    };
  }, [needsExtras]);

  const reload = useCallback(() => {
    setError(null);
    setState(null);
    setLoadId((n) => n + 1);
  }, []);

  const handleReset = useCallback(() => {
    homeRunApi
      .reset()
      .then(reload)
      .catch((e: unknown) => setError(toMessage(e, 'Reset failed')));
  }, [reload]);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!state) return <LoadingState />;
  return <HomeRunGame state={state} onReset={handleReset} />;
};
