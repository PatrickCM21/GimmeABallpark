/**
 * Sound effects manager for Home Run mode.
 * Uses real audio files from /public/sounds/.
 */

import type { BatId } from '../../shared/types/shop';

export type SoundName =
  | 'throw'
  | 'batHit'
  | 'batHitMetal'
  | 'batHitZombie'
  | 'batHitInflatable'
  | 'crowdWow'
  | 'crowdAwh'
  | 'glassSmash'
  | 'wallHit'
  | 'snooRun'
  | 'falling'
  | 'thump'
  | 'gameMusic'
  | 'gameWin';

type InternalSoundKey =
  | 'throw'
  | 'batHit'
  | 'batHitMetal'
  | 'batHitZombie'
  | 'batHitInflatable'
  | 'crowdWow1'
  | 'crowdWow2'
  | 'crowdWow3'
  | 'crowdWow4'
  | 'crowdAwh1'
  | 'crowdAwh2'
  | 'crowdAwh3'
  | 'glassSmash'
  | 'wallHit'
  | 'snooRun'
  | 'falling'
  | 'thump'
  | 'gameMusic'
  | 'gameWin';

export const SOUND_URLS: Record<InternalSoundKey, string> = {
  throw: '/sounds/throw.mp3',
  batHit: '/sounds/bat_hit.mp3',
  batHitMetal: '/sounds/bat_hit_metal.mp3',
  batHitZombie: '/sounds/bat_hit_zombie.mp3',
  batHitInflatable: '/sounds/bat_hit_inflatable.mp3',
  crowdWow1: '/sounds/crowd_wow.mp3',
  crowdWow2: '/sounds/crowd_wow_2.mp3',
  crowdWow3: '/sounds/crowd_wow_3.mp3',
  crowdWow4: '/sounds/crowd_wow_4.mp3',
  crowdAwh1: '/sounds/crowd_awh.mp3',
  crowdAwh2: '/sounds/crowd_awh_2.mp3',
  crowdAwh3: '/sounds/crowd_awh_3.mp3',
  glassSmash: '/sounds/glass_smash.mp3',
  wallHit: '/sounds/wall_hit.mp3',
  snooRun: '/sounds/running.mp3',
  falling: '/sounds/falling.mp3',
  thump: '/sounds/thump.mp3',
  gameMusic: '/sounds/game_music.mp3',
  gameWin: '/sounds/game_win.mp3',
};

const CROWD_WOW_KEYS: readonly InternalSoundKey[] = [
  'crowdWow1',
  'crowdWow2',
  'crowdWow3',
  'crowdWow4',
];

const CROWD_AWH_KEYS: readonly InternalSoundKey[] = [
  'crowdAwh1',
  'crowdAwh2',
  'crowdAwh3',
];

const DEFAULT_VOLUMES: Record<SoundName, number> = {
  throw: 0.85,
  batHit: 2.4, // Boosted via Web Audio GainNode so bat hit is much louder
  batHitMetal: 2.2,
  batHitZombie: 2.3,
  batHitInflatable: 1.8,
  crowdWow: 0.9,
  crowdAwh: 0.9,
  glassSmash: 0.95,
  wallHit: 0.95,
  snooRun: 0.9,
  falling: 0.9,
  thump: 1.0,
  gameMusic: 0.65,
  gameWin: 1.0,
};

export type PlaySoundOptions = {
  volume?: number;
  loop?: boolean;
  playbackRate?: number;
};

export type SoundHandle = {
  stop: () => void;
};

const NOOP_HANDLE: SoundHandle = { stop: () => {} };
const STORAGE_KEY = 'ballpark_sound_muted';

let audioCtx: AudioContext | null = null;
const bufferCache = new Map<InternalSoundKey, AudioBuffer>();
const loadingPromises = new Map<InternalSoundKey, Promise<AudioBuffer | null>>();
const htmlAudioCache = new Map<InternalSoundKey, HTMLAudioElement>();
const activeStops = new Set<() => void>();
const muteListeners = new Set<(muted: boolean) => void>();
let preloadStarted = false;
let deferredPreloadStarted = false;
let lastWowIndex = -1;
let lastAwhIndex = -1;
let activeMusicHandle: SoundHandle | null = null;

const INTRO_SOUND_KEYS: readonly InternalSoundKey[] = [
  'throw',
  'batHit',
  'batHitMetal',
  'batHitZombie',
  'batHitInflatable',
];
const GAMEPLAY_SOUND_KEYS: readonly InternalSoundKey[] = [
  'gameMusic',
  'snooRun',
  'glassSmash',
  'wallHit',
  'falling',
  'thump',
  'crowdWow1',
  'crowdAwh1',
  'crowdWow2',
  'crowdWow3',
  'crowdWow4',
  'crowdAwh2',
  'crowdAwh3',
  'gameWin',
];

let isMutedState: boolean = (() => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
})();

export const isSoundMuted = (): boolean => isMutedState;

export const setSoundMuted = (muted: boolean): void => {
  isMutedState = muted;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(muted));
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }
  if (muted) {
    activeStops.forEach((stopFn) => {
      try {
        stopFn();
      } catch {
        // Ignore
      }
    });
    activeStops.clear();
    activeMusicHandle = null;
  } else {
    unlockAudio();
  }
  muteListeners.forEach((listener) => listener(isMutedState));
};

export const toggleSoundMuted = (): boolean => {
  const next = !isMutedState;
  setSoundMuted(next);
  return next;
};

export const subscribeSoundMuted = (listener: (muted: boolean) => void): (() => void) => {
  muteListeners.add(listener);
  return () => {
    muteListeners.delete(listener);
  };
};

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      try {
        audioCtx = new Ctx();
      } catch {
        audioCtx = null;
      }
    }
  }
  return audioCtx;
};

const loadBuffer = (key: InternalSoundKey): Promise<AudioBuffer | null> => {
  const existing = loadingPromises.get(key);
  if (existing) return existing;

  const url = SOUND_URLS[key];
  const promise = (async () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return null;
      const response = await fetch(url);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      bufferCache.set(key, decoded);
      return decoded;
    } catch {
      return null;
    }
  })();

  loadingPromises.set(key, promise);
  return promise;
};

const preloadKey = (key: InternalSoundKey): void => {
  if (getAudioContext()) {
    void loadBuffer(key);
    return;
  }
  if (htmlAudioCache.has(key)) return;
  try {
    const audio = new Audio(SOUND_URLS[key]);
    audio.preload = 'auto';
    audio.load();
    htmlAudioCache.set(key, audio);
  } catch {
    // Ignore HTMLAudio preload errors in restricted environments
  }
};

const preloadGameplaySounds = (): void => {
  if (typeof window === 'undefined' || isMutedState || deferredPreloadStarted) return;
  deferredPreloadStarted = true;
  GAMEPLAY_SOUND_KEYS.forEach(preloadKey);
};

/** Preloads intro sound effects immediately and defers gameplay/crowd audio asynchronously. */
export const preloadSounds = (): void => {
  if (typeof window === 'undefined' || isMutedState || preloadStarted) return;
  preloadStarted = true;

  INTRO_SOUND_KEYS.forEach(preloadKey);

  const scheduleDeferred =
    typeof window.requestIdleCallback === 'function'
      ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 600 })
      : (cb: () => void) => window.setTimeout(cb, 300);

  scheduleDeferred(preloadGameplaySounds);
};

/** Resumes the Web Audio context on user gesture so sounds are never blocked. */
export const unlockAudio = (): void => {
  preloadSounds();
  preloadGameplaySounds();
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
};

const resolveSoundKey = (name: SoundName): InternalSoundKey => {
  if (name === 'crowdWow') {
    let idx = Math.floor(Math.random() * CROWD_WOW_KEYS.length);
    if (CROWD_WOW_KEYS.length > 1 && idx === lastWowIndex) {
      idx = (idx + 1) % CROWD_WOW_KEYS.length;
    }
    lastWowIndex = idx;
    return CROWD_WOW_KEYS[idx] ?? 'crowdWow1';
  }
  if (name === 'crowdAwh') {
    let idx = Math.floor(Math.random() * CROWD_AWH_KEYS.length);
    if (CROWD_AWH_KEYS.length > 1 && idx === lastAwhIndex) {
      idx = (idx + 1) % CROWD_AWH_KEYS.length;
    }
    lastAwhIndex = idx;
    return CROWD_AWH_KEYS[idx] ?? 'crowdAwh1';
  }
  return name;
};

/**
 * Plays a preloaded sound effect and returns a handle to stop it early if needed.
 */
export const playSound = (name: SoundName, options?: PlaySoundOptions): SoundHandle => {
  if (typeof window === 'undefined' || isMutedState) return NOOP_HANDLE;
  preloadSounds();

  const key = resolveSoundKey(name);
  const rawVolume = Math.max(0, options?.volume ?? DEFAULT_VOLUMES[name]);
  const loop = options?.loop ?? false;
  const playbackRate = options?.playbackRate ?? 1;

  const ctx = getAudioContext();
  const buffer = bufferCache.get(key);

  if (ctx && buffer) {
    try {
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;
      source.playbackRate.value = playbackRate;

      const gainNode = ctx.createGain();
      gainNode.gain.value = rawVolume;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);

      let stopped = false;
      const stop = () => {
        if (stopped) return;
        stopped = true;
        activeStops.delete(stop);
        try {
          gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
          setTimeout(() => {
            try {
              source.stop();
              source.disconnect();
            } catch {
              // Already stopped
            }
          }, 35);
        } catch {
          try {
            source.stop();
          } catch {
            // Ignore
          }
        }
      };

      activeStops.add(stop);
      source.onended = () => {
        activeStops.delete(stop);
      };

      return { stop };
    } catch {
      // Fall through to HTMLAudioElement fallback
    }
  }

  // Fallback to HTMLAudioElement if Web Audio buffer is still loading or unavailable
  try {
    const base = htmlAudioCache.get(key);
    const audio = base ? (base.cloneNode(true) as HTMLAudioElement) : new Audio(SOUND_URLS[key]);
    audio.volume = Math.min(1, rawVolume);
    audio.loop = loop;
    audio.playbackRate = playbackRate;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      void playPromise.catch(() => {
        // Autoplay prevented before first user gesture
      });
    }
    const stop = () => {
      activeStops.delete(stop);
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // Ignore
      }
    };
    activeStops.add(stop);
    audio.addEventListener('ended', () => {
      activeStops.delete(stop);
    });
    return { stop };
  } catch {
    return NOOP_HANDLE;
  }
};

/** Plays the appropriate bat hit sound effect for the given batId. */
export const playBatHitSound = (
  batId?: BatId | string | undefined,
  options?: PlaySoundOptions
): SoundHandle => {
  if (batId === 'metal') {
    return playSound('batHitMetal', options);
  }
  if (batId === 'zombie_killer') {
    return playSound('batHitZombie', options);
  }
  if (batId === 'inflatable') {
    return playSound('batHitInflatable', options);
  }
  return playSound('batHit', options);
};

/** Starts the 10-second round thinking music (stopping any previous instance). */
export const startGameMusic = (): void => {
  activeMusicHandle?.stop();
  activeMusicHandle = playSound('gameMusic');
};

/** Immediately cuts off the round thinking music (e.g. when the ball hits the answer or times out). */
export const stopGameMusic = (): void => {
  if (activeMusicHandle) {
    activeMusicHandle.stop();
    activeMusicHandle = null;
  }
};
