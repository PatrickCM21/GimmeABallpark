import { useCallback, useEffect, useRef, useState } from 'react';
import type { HomeRunGameState, HomeRunOutcome, HomeRunReveal, HomeRunRoundStat, HomeRunSide } from '../../../shared/types/homeRun';
import type { UserLifetimeStats } from '../../../shared/types/stats';
import { homeRunApi } from '../homeRunApi';
import { MISS_SETTLE_MS, SERVE_MS, SMASH_SETTLE_MS, STRIKE_MS } from '../constants';
import { useCountdown } from './useCountdown';
import type { Point } from './useArenaGeometry';

export type HomeRunPhase =
  | 'intro' // before the player starts (or resumes)
  | 'first_hit' // opening at-bat animation with the bat hit and sprint
  | 'serving' // ball entry
  | 'live' // ball follows the cursor, timer running, waiting for a pick
  | 'resolving' // ball flying to the chosen pane, awaiting the server
  | 'smash' // correct: glass shatters
  | 'running_base' // snoo running to next base animation
  | 'miss' // wrong: ball bounces off the glass and drops
  | 'timeout' // out of time: ball falls flat
  | 'result';

export type PickTarget = { side: HomeRunSide; point: Point };

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** State machine for a single Home Run attempt. Rendering is left to the components. */
export const useHomeRunGame = (initial: HomeRunGameState) => {
  const [phase, setPhase] = useState<HomeRunPhase>(initial.progress.finished ? 'result' : 'intro');
  const [outcomes, setOutcomes] = useState<HomeRunOutcome[]>(initial.progress.outcomes);
  const [stats, setStats] = useState<HomeRunRoundStat[]>(initial.stats);
  const [activeRound, setActiveRound] = useState(initial.progress.outcomes.length);
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [pick, setPick] = useState<PickTarget | null>(null);
  const [reveal, setReveal] = useState<HomeRunReveal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runningToBase, setRunningToBase] = useState<number>(1);
  const [lifetimeStats, setLifetimeStats] = useState<UserLifetimeStats | undefined>(initial.lifetimeStats);

  const busyRef = useRef(false);
  const roundRef = useRef(activeRound);
  const mountedRef = useRef(true);
  const pendingNextRoundRef = useRef<{ finished: boolean; nextRound: number } | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // serving -> live once the swing animation has played
  useEffect(() => {
    if (phase !== 'serving') return;
    const timer = setTimeout(() => setPhase((prev) => (prev === 'serving' ? 'live' : prev)), SERVE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const submit = useCallback(async (side: HomeRunSide | null, point: Point | null) => {
    if (busyRef.current) return;
    busyRef.current = true;

    setPick(side && point ? { side, point } : null);
    setPhase(side ? 'resolving' : 'timeout');

    try {
      const [res] = await Promise.all([
        homeRunApi.answer({ round: roundRef.current, pick: side }),
        wait(side ? STRIKE_MS : 0),
      ]);
      if (!mountedRef.current) return;

      setReveal(res.reveal);
      setOutcomes(res.progress.outcomes);
      setStats(res.stats);
      if (res.lifetimeStats) {
        setLifetimeStats(res.lifetimeStats);
      }

      if (res.outcome === 'correct') {
        setPhase('smash');
        await wait(SMASH_SETTLE_MS);
        if (!mountedRef.current) return;

        // Transition to base running animation!
        setRunningToBase(res.progress.outcomes.length);
        pendingNextRoundRef.current = {
          finished: res.progress.finished,
          nextRound: res.progress.outcomes.length,
        };
        setPhase('running_base');
      } else {
        setPhase(res.outcome === 'wrong' ? 'miss' : 'timeout');
        await wait(MISS_SETTLE_MS);
        if (!mountedRef.current) return;
        setPhase('result');
      }
    } catch (e: unknown) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      busyRef.current = false;
    }
  }, []);

  const completeBaseRun = useCallback(() => {
    const pending = pendingNextRoundRef.current;
    if (pending?.finished) {
      setPhase('result');
      return;
    }
    roundRef.current = pending ? pending.nextRound : activeRound + 1;
    setActiveRound(roundRef.current);
    setReveal(null);
    setPick(null);
    setDeadlineAt(Date.now() + initial.timeLimitMs);
    setPhase('live');
  }, [activeRound, initial.timeLimitMs]);

  const isTimerActive = phase === 'live';
  const msLeft = useCountdown(
    deadlineAt,
    isTimerActive,
    () => {
      void submit(null, null);
    },
    initial.timeLimitMs
  );

  const begin = useCallback(async () => {
    try {
      const { progress } = await homeRunApi.start();
      if (!mountedRef.current) return;
      setOutcomes(progress.outcomes);
      roundRef.current = progress.outcomes.length;
      setActiveRound(roundRef.current);
      if (progress.finished) {
        setPhase('result');
        return;
      }
      setDeadlineAt(Date.now() + (progress.msRemaining || initial.timeLimitMs));
      setPhase('live');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not start');
    }
  }, [initial.timeLimitMs]);

  const choose = useCallback((side: HomeRunSide, point: Point) => void submit(side, point), [submit]);

  return {
    phase,
    outcomes,
    stats,
    activeRound,
    pick,
    reveal,
    error,
    msLeft,
    runningToBase,
    completeBaseRun,
    lifetimeStats,
    begin,
    choose,
  };
};
