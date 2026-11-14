import { useCallback, useEffect, useState } from 'react';
import type { HomeRunGameState } from '../../../shared/types/homeRun';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { homeRunApi } from '../homeRunApi';
import { HomeRunGame } from './HomeRunGame';

const toMessage = (e: unknown, fallback: string): string => (e instanceof Error ? e.message : fallback);

/** Entry point for Home Run posts: loads the player's state, then hands over to the game. */
export const HomeRunMode = () => {
  const [state, setState] = useState<HomeRunGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Bumping this refetches state (used for retry and dev reset). */
  const [loadId, setLoadId] = useState(0);

  useEffect(() => {
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
  }, [loadId]);

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
