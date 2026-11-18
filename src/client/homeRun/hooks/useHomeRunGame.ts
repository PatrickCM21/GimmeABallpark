import { useCallback, useEffect, useRef, useState } from 'react';
import { isRunFinished } from '../../../shared/homeRun/engine';
import type {
  HomeRunGameState,
  HomeRunOutcome,
  HomeRunReveal,
  HomeRunRoundStat,
  HomeRunSide,
  BatId,
  BallId,
} from '../../../shared/types/homeRun';
import type { UserLifetimeStats } from '../../../shared/types/stats';
import { calculateTotalBases } from '../../../shared/types/stats';
import { sumOwnedShopCost } from '../../../shared/types/shop';
import { homeRunApi } from '../homeRunApi';
import { FALL_MS, MISS_SETTLE_MS, SERVE_MS, SMASH_SETTLE_MS, STRIKE_MS } from '../constants';
import { playSound, preloadSounds, startGameMusic, stopGameMusic, unlockAudio } from '../sounds';
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
  const [statsOverride, setStats] = useState<HomeRunRoundStat[] | null>(null);
  const [activeRound, setActiveRound] = useState(initial.progress.outcomes.length);
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [pick, setPick] = useState<PickTarget | null>(null);
  const [reveal, setReveal] = useState<HomeRunReveal | null>(null);
  const [reveals, setReveals] = useState<HomeRunReveal[]>(initial.reveals ?? []);
  const [error, setError] = useState<string | null>(null);
  const [runningToBase, setRunningToBase] = useState<number>(1);
  const [lifetimeStatsOverride, setLifetimeStats] = useState<UserLifetimeStats | undefined>(undefined);
  const [userBasesOverride, setUserBasesOverride] = useState<number | undefined>(undefined);
  const [equippedBatOverride, setEquippedBatOverride] = useState<BatId | undefined>(undefined);
  const [ownedBatsOverride, setOwnedBatsOverride] = useState<BatId[] | undefined>(undefined);
  const [equippedBallOverride, setEquippedBallOverride] = useState<BallId | undefined>(undefined);
  const [ownedBallsOverride, setOwnedBallsOverride] = useState<BallId[] | undefined>(undefined);

  const stats = statsOverride ?? initial.stats;
  const lifetimeStats = lifetimeStatsOverride ?? initial.lifetimeStats;
  const ownedBats: BatId[] = ownedBatsOverride ?? initial.ownedBats ?? ['default'];
  const equippedBat: BatId = equippedBatOverride ?? initial.equippedBat ?? 'default';
  const ownedBalls: BallId[] = ownedBallsOverride ?? initial.ownedBalls ?? ['default'];
  const equippedBall: BallId = equippedBallOverride ?? initial.equippedBall ?? 'default';
  const fallbackBases = lifetimeStats
    ? Math.max(0, calculateTotalBases(lifetimeStats) - sumOwnedShopCost(ownedBats, ownedBalls))
    : 0;
  const userBases = userBasesOverride ?? initial.userBases ?? fallbackBases;

  const updateShopState = useCallback(
    (next: {
      userBases?: number;
      equippedBat?: BatId;
      ownedBats?: BatId[];
      equippedBall?: BallId;
      ownedBalls?: BallId[];
    }) => {
      if (typeof next.userBases === 'number') {
        setUserBasesOverride(next.userBases);
      }
      if (next.equippedBat) {
        setEquippedBatOverride(next.equippedBat);
      }
      if (next.ownedBats) {
        setOwnedBatsOverride(next.ownedBats);
      }
      if (next.equippedBall) {
        setEquippedBallOverride(next.equippedBall);
      }
      if (next.ownedBalls) {
        setOwnedBallsOverride(next.ownedBalls);
      }
    },
    []
  );

  const busyRef = useRef(false);
  const roundRef = useRef(activeRound);
  const outcomesRef = useRef<HomeRunOutcome[]>(initial.progress.outcomes);
  const isPracticeRef = useRef(false);
  const mountedRef = useRef(true);
  const pendingNextRoundRef = useRef<{ finished: boolean; nextRound: number } | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    preloadSounds();
    return () => {
      mountedRef.current = false;
      stopGameMusic();
    };
  }, []);

  // Play the 10-second game music while the player is choosing their option
  useEffect(() => {
    if (phase === 'live') {
      startGameMusic();
    } else if (phase !== 'resolving') {
      stopGameMusic();
    }
  }, [phase]);

  // serving -> live once the swing animation has played
  useEffect(() => {
    if (phase !== 'serving') return;
    const timer = setTimeout(() => setPhase((prev) => (prev === 'serving' ? 'live' : prev)), SERVE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const submit = useCallback(async (side: HomeRunSide | null, point: Point | null) => {
    if (busyRef.current) return;
    busyRef.current = true;
    unlockAudio();

    setPick(side && point ? { side, point } : null);
    setPhase(side ? 'resolving' : 'timeout');

    let fallingHandle: { stop: () => void } | null = null;
    if (side) {
      playSound('throw', { volume: 0.65 });
    } else {
      // Timer ran out: cut off game music immediately and play falling sound as ball drops
      stopGameMusic();
      fallingHandle = playSound('falling');
      setTimeout(() => {
        fallingHandle?.stop();
        if (mountedRef.current) {
          playSound('thump');
          setTimeout(() => {
            if (mountedRef.current) playSound('crowdAwh');
          }, 80);
        }
      }, FALL_MS - 60);
    }

    try {
      let outcome: HomeRunOutcome;
      let nextReveal: HomeRunReveal;
      let nextOutcomes: HomeRunOutcome[];
      let finished: boolean;

      if (isPracticeRef.current) {
        const [res] = await Promise.all([
          homeRunApi.practiceAnswer({ round: roundRef.current, pick: side }),
          wait(side ? STRIKE_MS : 0),
        ]);
        if (!mountedRef.current) return;
        outcome = res.outcome;
        nextReveal = res.reveal;
        nextOutcomes = [...outcomesRef.current, outcome];
        finished = isRunFinished(nextOutcomes);
        setStats(res.stats);
        setReveals((prev) => {
          const next = [...prev];
          next[roundRef.current] = nextReveal;
          return next;
        });
      } else {
        const [res] = await Promise.all([
          homeRunApi.answer({ round: roundRef.current, pick: side }),
          wait(side ? STRIKE_MS : 0),
        ]);
        if (!mountedRef.current) return;
        outcome = res.outcome;
        nextReveal = res.reveal;
        nextOutcomes = res.progress.outcomes;
        finished = res.progress.finished;
        setStats(res.stats);
        if (res.reveals) {
          setReveals(res.reveals);
        } else {
          setReveals((prev) => {
            const next = [...prev];
            next[roundRef.current] = nextReveal;
            return next;
          });
        }
        if (res.lifetimeStats) {
          setLifetimeStats(res.lifetimeStats);
        }
        if (typeof res.userBases === 'number') {
          setUserBasesOverride(res.userBases);
        }
      }

      outcomesRef.current = nextOutcomes;
      setReveal(nextReveal);
      setOutcomes(nextOutcomes);

      if (outcome === 'correct') {
        // Ball hits the correct pane: cut off game music right to smash + crowd wow reaction
        stopGameMusic();
        setPhase('smash');
        playSound('glassSmash');
        setTimeout(() => {
          if (mountedRef.current) playSound('crowdWow');
        }, 90);
        await wait(SMASH_SETTLE_MS);
        if (!mountedRef.current) return;

        // Transition to base running animation!
        setRunningToBase(nextOutcomes.length);
        pendingNextRoundRef.current = {
          finished,
          nextRound: nextOutcomes.length,
        };
        setPhase('running_base');
      } else {
        // Ball hits the wrong pane (or timed out): cut off game music right to reaction
        stopGameMusic();
        const isWrongPick = outcome === 'wrong' && side !== null;
        setPhase(isWrongPick ? 'miss' : 'timeout');
        if (isWrongPick) {
          playSound('wallHit');
          setTimeout(() => {
            if (mountedRef.current) playSound('crowdAwh');
          }, 90);
          setTimeout(() => {
            if (mountedRef.current) playSound('thump', { volume: 0.8 });
          }, FALL_MS - 60);
        }
        await wait(MISS_SETTLE_MS);
        if (!mountedRef.current) return;
        setPhase('result');
      }
    } catch (e: unknown) {
      fallingHandle?.stop();
      stopGameMusic();
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      busyRef.current = false;
    }
  }, []);

  const completeBaseRun = useCallback(() => {
    const pending = pendingNextRoundRef.current;
    if (pending?.finished) {
      playSound('gameWin');
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
    if (isPracticeRef.current) {
      outcomesRef.current = [];
      setOutcomes([]);
      roundRef.current = 0;
      setActiveRound(0);
      setPick(null);
      setReveal(null);
      setDeadlineAt(Date.now() + initial.timeLimitMs);
      setPhase('live');
      return;
    }
    try {
      const { progress } = await homeRunApi.start();
      if (!mountedRef.current) return;
      outcomesRef.current = progress.outcomes;
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

  const tryAgain = useCallback(() => {
    if (busyRef.current) return;
    isPracticeRef.current = true;
    pendingNextRoundRef.current = null;
    roundRef.current = 0;
    outcomesRef.current = [];
    setOutcomes([]);
    setActiveRound(0);
    setDeadlineAt(null);
    setPick(null);
    setReveal(null);
    setRunningToBase(1);
    setPhase('intro');
  }, []);

  const choose = useCallback((side: HomeRunSide, point: Point) => void submit(side, point), [submit]);

  return {
    phase,
    outcomes,
    stats,
    activeRound,
    pick,
    reveal,
    reveals,
    error,
    msLeft,
    runningToBase,
    completeBaseRun,
    lifetimeStats,
    userBases,
    equippedBat,
    ownedBats,
    equippedBall,
    ownedBalls,
    updateShopState,
    begin,
    tryAgain,
    choose,
  };
};
