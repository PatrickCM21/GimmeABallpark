import './index.css';
import { THEME } from './theme';
import { StrictMode, useEffect, useState, useRef, type ChangeEvent, type PointerEvent, type CSSProperties, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { navigateTo } from '@devvit/web/client';
import type { GameDataResponse, CreateGameRequest, CreateGameResponse, GuessResponse, Config } from '../shared/api';
import { getDailyBallpark } from '../shared/data/ballparks';
import { getRandomCreatorBallpark } from '../shared/data/randomBallparks';

const fetchGameData = async () => {
  const res = await fetch('/api/game-data');
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to fetch game data (${res.status}): ${errorBody}`);
  }
  return (await res.json()) as GameDataResponse;
};

const createGame = async (config: CreateGameRequest) => {
  const res = await fetch('/api/create-game', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to create game (${res.status}): ${errorBody}`);
  }
  return (await res.json()) as CreateGameResponse;
};

const submitGuess = async (guess: number) => {
  const res = await fetch('/api/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guess }),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to submit guess (${res.status}): ${errorBody}`);
  }
  return (await res.json()) as GuessResponse;
};

import { getTitlePrefix, getPlaceholder, formatValue, toTrackPct } from './utils';

const DEFAULT_BALLPARK: Config = {
  ...getDailyBallpark(),
  authorName: 'GimmeABallpark',
};

const maxSubjectLength = 100;

const postComment = async (text: string) => {
  const res = await fetch('/api/post-comment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to post comment (${res.status}): ${errorBody}`);
  }
  return res.json();
};

import { GameButton } from './components/GameButton';
import { CropModal } from './components/CropModal';
import { FactModal } from './components/FactModal';
import { CommentModal } from './components/CommentModal';
import { ErrorState } from './components/ErrorState';
import { LoadingState } from './components/LoadingState';
import { CreatorView } from './components/CreatorView';
import { GameView } from './components/GameView';

export const App = () => {
  const [data, setData] = useState<GameDataResponse | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Synchronize modular theme background with document and CSS variables
  useEffect(() => {
    document.documentElement.style.setProperty('--game-bg', THEME.background);
    document.documentElement.style.setProperty('--color-game-bg', THEME.background);
    document.body.style.backgroundColor = THEME.background;
  }, []);

  // In-window Creator state (opens in current window without redirect)
  const [showCreator, setShowCreator] = useState(false);

  // Hub / Creator Setup state
  const [type, setType] = useState<'percentage' | 'cost' | 'count'>('percentage');
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(100);
  const [answer, setAnswer] = useState(50);
  const [explanation, setExplanation] = useState('');
  const [showFactModal, setShowFactModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Image Crop Modal state
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropSrc, setCropSrc] = useState<string>('');
  const [cropScale, setCropScale] = useState<number>(1);
  const [cropBaseScale, setCropBaseScale] = useState<number>(1);
  const [cropPos, setCropPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropImgDims, setCropImgDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const cropDragRef = useRef<{ isDragging: boolean; lastX: number; lastY: number }>({
    isDragging: false,
    lastX: 0,
    lastY: 0,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const cropContainerRef = useRef<HTMLDivElement | null>(null);

  // Game state
  const [currentGuess, setCurrentGuess] = useState<number>(50);
  const [showResults, setShowResults] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [buttonShake, setButtonShake] = useState(false);
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);

  // Results page: "wanted you to know" fact expansion + comment modal
  const [factExpanded, setFactExpanded] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // User thumb shrink state:
  // Starts false when results open, quickly animates to true shrinking the 32px thumb into 14px dot on timeline
  const [userDotShrunk, setUserDotShrunk] = useState(false);

  // Animation frame and interaction refs for silky smooth intro slider shift
  const animFrameRef = useRef<number | null>(null);
  const userInteractedRef = useRef<boolean>(false);
  const hasGuessedInitiallyRef = useRef<boolean>(false);
  const animTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAnimTimeouts = () => {
    animTimeoutsRef.current.forEach((t) => clearTimeout(t));
    animTimeoutsRef.current = [];
  };

  // Phased animation steps:
  // 0: Just user guess (thumb shrinking into dot, stem line & badge growing)
  // 1: Average spawns from right & settles
  // 2: Real spawns from left & settles
  // 3: Results banner & Ask for ballpark CTA fade in
  const [animStep, setAnimStep] = useState<0 | 1 | 2 | 3>(0);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    fetchGameData()
      .then((d) => {
        setData(d);
        const activeCfg = d.config || (!d.isHub ? DEFAULT_BALLPARK : undefined);
        if (activeCfg) {
          const mid = Math.round((activeCfg.min + activeCfg.max) / 2);
          const span = activeCfg.max - activeCfg.min;

          if (d.userGuess !== undefined) {
            hasGuessedInitiallyRef.current = true;
            setCurrentGuess(d.userGuess);
            setCardExpanded(true);
            setShowResults(true);
            setUserDotShrunk(true);
            setAnimStep(3); // Already guessed previously, show full results immediately
          } else {
            setCurrentGuess(mid);
            setCardExpanded(false);
            userInteractedRef.current = false;
            let startTime: number | null = null;
            const duration = 1200;

            const stepAnim = (timestamp: number) => {
              if (userInteractedRef.current) return;
              if (!startTime) startTime = timestamp;
              const elapsed = timestamp - startTime;
              const p = Math.min(1, elapsed / duration);

              // Damped harmonic wave: smooth dynamic shift left & right, then smoothly settles to center
              const wave = Math.sin(p * Math.PI * 2.5) * Math.pow(1 - p, 1.5);
              const currentVal = Math.round(mid + span * 0.18 * wave);
              setCurrentGuess(currentVal);

              if (p < 1) {
                animFrameRef.current = requestAnimationFrame(stepAnim);
              } else {
                setCurrentGuess(mid);
                setButtonShake(true);
              }
            };

            animFrameRef.current = requestAnimationFrame(stepAnim);
          }
        }
      })
      .catch((e: unknown) => {
        // Fallback for standalone/offline testing
        setData({ isHub: false, configured: true, config: DEFAULT_BALLPARK });
        const mid = Math.round((DEFAULT_BALLPARK.min + DEFAULT_BALLPARK.max) / 2);
        setCurrentGuess(mid);
        if (e instanceof Error && !e.message.includes('Failed to fetch')) {
          setError(e.message);
        }
      });

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      clearAnimTimeouts();
    };
  }, []);


  // Image Crop Handlers
  const CROP_CW = 260;
  const CROP_CH = 130;

  const handleCropFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const base = Math.max(CROP_CW / w, CROP_CH / h);
        setCropSrc(src);
        setCropImgDims({ w, h });
        setCropBaseScale(base);
        setCropScale(base);
        setCropPos({
          x: (CROP_CW - w * base) / 2,
          y: (CROP_CH - h * base) / 2,
        });
        setShowCropModal(true);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleOpenCropModal = () => {
    setShowCropModal(true);
    if (!cropSrc) {
      fileInputRef.current?.click();
    }
  };

  const handleCropPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!cropSrc) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    cropDragRef.current = {
      isDragging: true,
      lastX: e.clientX,
      lastY: e.clientY,
    };
  };

  const handleCropPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!cropDragRef.current.isDragging || !cropImgDims.w) return;
    const dx = e.clientX - cropDragRef.current.lastX;
    const dy = e.clientY - cropDragRef.current.lastY;
    cropDragRef.current.lastX = e.clientX;
    cropDragRef.current.lastY = e.clientY;

    setCropPos((prev) => {
      const sw = cropImgDims.w * cropScale;
      const sh = cropImgDims.h * cropScale;
      const newX = Math.min(0, Math.max(CROP_CW - sw, prev.x + dx));
      const newY = Math.min(0, Math.max(CROP_CH - sh, prev.y + dy));
      return { x: newX, y: newY };
    });
  };

  const handleCropPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (cropDragRef.current.isDragging) {
      cropDragRef.current.isDragging = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture may have already been released
      }
    }
  };

  const handleCropZoomChange = (newVal: number) => {
    if (!cropImgDims.w) return;
    const newScale = Math.max(cropBaseScale, newVal);
    const centerX = (CROP_CW / 2 - cropPos.x) / cropScale;
    const centerY = (CROP_CH / 2 - cropPos.y) / cropScale;

    let newX = CROP_CW / 2 - centerX * newScale;
    let newY = CROP_CH / 2 - centerY * newScale;

    const sw = cropImgDims.w * newScale;
    const sh = cropImgDims.h * newScale;
    newX = Math.min(0, Math.max(CROP_CW - sw, newX));
    newY = Math.min(0, Math.max(CROP_CH - sh, newY));

    setCropScale(newScale);
    setCropPos({ x: newX, y: newY });
  };

  const handleSaveCrop = () => {
    if (!cropSrc || !cropImgDims.w || !cropImageRef.current) {
      setShowCropModal(false);
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const targetW = 520;
      const targetH = 260;
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setShowCropModal(false);
        return;
      }

      const img = cropImageRef.current;
      const sx = (-cropPos.x / cropScale);
      const sy = (-cropPos.y / cropScale);
      const sWidth = CROP_CW / cropScale;
      const sHeight = CROP_CH / cropScale;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);

      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);
      setImageUrl(croppedBase64);
      setImageError(false);
      setShowCropModal(false);
    } catch {
      setShowCropModal(false);
    }
  };

  // Prevent page scroll while image crop modal is active
  // Prevent page scroll while image crop modal, fact modal, or comment modal is active
  useEffect(() => {
    if (showCropModal || showFactModal || showCommentModal) {
      const prevOverflow = document.body.style.overflow;
      const prevTouchAction = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouchAction;
      };
    }
  }, [showCropModal, showFactModal, showCommentModal]);

  // Non-passive touch listener on crop container to prevent mobile page scrolling while panning
  useEffect(() => {
    const container = cropContainerRef.current;
    if (!container || !showCropModal) return;

    const handleTouchStart = (e: globalThis.TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      const t = e.touches[0];
      if (t) {
        cropDragRef.current = {
          isDragging: true,
          lastX: t.clientX,
          lastY: t.clientY,
        };
      }
    };

    const handleTouchMove = (e: globalThis.TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      if (!cropDragRef.current.isDragging || !cropImgDims.w) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - cropDragRef.current.lastX;
      const dy = t.clientY - cropDragRef.current.lastY;
      cropDragRef.current.lastX = t.clientX;
      cropDragRef.current.lastY = t.clientY;

      setCropPos((prev) => {
        const sw = cropImgDims.w * cropScale;
        const sh = cropImgDims.h * cropScale;
        const newX = Math.min(0, Math.max(CROP_CW - sw, prev.x + dx));
        const newY = Math.min(0, Math.max(CROP_CH - sh, prev.y + dy));
        return { x: newX, y: newY };
      });
    };

    const handleTouchEnd = (e: globalThis.TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      cropDragRef.current.isDragging = false;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [showCropModal, cropSrc, cropImgDims.w, cropImgDims.h, cropScale]);

  const clampAnswerToRange = (val: number, curMin: number, curMax: number) => {
    return Math.max(curMin, Math.min(curMax, val));
  };

  // Quick Random Idea strictly from the 100 dedicated random options (Request 2 & 4: no toast)
  const handlePickRandomIdea = () => {
    const idea = getRandomCreatorBallpark();
    setType(idea.type);
    setText(idea.text);
    setMin(idea.min);
    setMax(idea.max);
    setAnswer(idea.answer);
    if (idea.explanation) {
      setExplanation(idea.explanation.slice(0, 1000));
    } else {
      setExplanation('');
    }
  };

  // Reset all options back to blank/nothing (Request 3)
  const handleResetCreator = () => {
    setText('');
    setType('percentage');
    setMin(0);
    setMax(100);
    setAnswer(50);
    setImageUrl('');
    setCropSrc('');
    setImageError(false);
    setExplanation('');
  };

  const handleCreateSubmit = async () => {
    if (!text.trim()) {
      showToast('⚠️ Please enter a subject for your question!');
      return;
    }
    const finalMin = type === 'percentage' ? 0 : min;
    const finalMax = type === 'percentage' ? 100 : max;
    if (finalMin >= finalMax) {
      showToast('⚠️ Min guess must be less than max guess!');
      return;
    }

    const finalAnswer = clampAnswerToRange(answer, finalMin, finalMax);

    setIsCreating(true);
    try {
      const res = await createGame({
        type,
        text: text.trim().slice(0, maxSubjectLength),
        imageUrl: imageUrl.trim() || undefined,
        min: finalMin,
        max: finalMax,
        answer: finalAnswer,
        explanation: explanation.trim() || undefined,
      });
      if (res.success && res.postUrl) {
        navigateTo(res.postUrl);
      } else if (res.success && res.postId) {
        const cleanId = res.postId.replace('t3_', '');
        navigateTo(`https://reddit.com/comments/${cleanId}`);
      } else {
        setError(res.error || 'Failed to create game');
        setIsCreating(false);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setIsCreating(false);
    }
  };

  const handleGuessSubmit = () => {
    if (isSubmittingGuess || showResults) return;
    setIsSubmittingGuess(true);
    clearAnimTimeouts();

    // 1. Immediately trigger card expansion
    setCardExpanded(true);
    setShowResults(true);
    setUserDotShrunk(false);
    setAnimStep(0);

    // 2. Animate thumb shrinking into dot on timeline
    const shrinkTimer = setTimeout(() => {
      setUserDotShrunk(true);
    }, 450);
    animTimeoutsRef.current.push(shrinkTimer);

    // 3. Fire server request in parallel
    const submitPromise = data?.config
      ? (async () => {
          try {
            await submitGuess(currentGuess);
            return await fetchGameData();
          } catch {
            return null;
          }
        })()
      : Promise.resolve(null);

    const minDelay = new Promise((resolve) => {
      const delayTimer = setTimeout(resolve, 950);
      animTimeoutsRef.current.push(delayTimer);
    });

    Promise.all([submitPromise, minDelay])
      .then(([newData]) => {
        if (newData) {
          setData(newData);
        }
        setIsSubmittingGuess(false);

        // Step 1: Average guess spawns in and settles
        setAnimStep(1);

        // Step 2: Real answer spawns in after Average settles
        const step2Timer = setTimeout(() => {
          setAnimStep(2);

          // Step 3: Results banner & explanation card fade in
          const step3Timer = setTimeout(() => {
            setAnimStep(3);
          }, 1400);
          animTimeoutsRef.current.push(step3Timer);
        }, 1400);
        animTimeoutsRef.current.push(step2Timer);
      })
      .catch((e: unknown) => {
        clearAnimTimeouts();
        setIsSubmittingGuess(false);
        setCardExpanded(false);
        setShowResults(false);
        setUserDotShrunk(false);
        setAnimStep(0);
        showToast(e instanceof Error ? `⚠️ ${e.message}` : '⚠️ Failed to submit guess');
      });
  };

  // Dev Subreddit Reset Handler
  const handleResetGame = async () => {
    try {
      clearAnimTimeouts();
      await fetch('/api/reset-game', { method: 'POST' });
      hasGuessedInitiallyRef.current = false;
      setIsSubmittingGuess(false);
      setCardExpanded(false);
      setShowResults(false);
      setAnimStep(0);
      setUserDotShrunk(false);
      const newData = await fetchGameData();
      setData(newData);
      if (newData.config) {
        setCurrentGuess(Math.round((newData.config.min + newData.config.max) / 2));
      }
      showToast('🔄 Game reset! You can guess again.');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to reset');
    }
  };

  // --- 1. FULL-SCREEN ERROR STATE ---
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          setError('');
          fetchGameData()
            .then(setData)
            .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unknown error'));
        }}
      />
    );
  }

  // --- 2. FULL-SCREEN LOADING STATE ---
  if (!data) {
    return <LoadingState />;
  }

  const isCreatorMode = Boolean(data.isHub || showCreator);
  const clampedAnswer = clampAnswerToRange(answer, min, max);

  // --- 3. GAME CALCULATIONS ---
  const config = data.config || DEFAULT_BALLPARK;
  const gameDisplayVal = (val: number) => formatValue(val, config.type);

  const rMin = config.min;
  const rMax = config.max;
  const range = rMax - rMin || 1;

  // Percentage positions
  const ug = data.userGuess !== undefined ? data.userGuess : currentGuess;
  const clampedUser = Math.max(rMin, Math.min(rMax, ug));
  const posUser = ((clampedUser - rMin) / range) * 100;

  const clampedReal = Math.max(rMin, Math.min(rMax, config.answer));
  const posReal = ((clampedReal - rMin) / range) * 100;

  // Average guess calculation
  const avgVal =
    data.stats?.averageGuess !== undefined
      ? data.stats.averageGuess
      : config.answer * 1.05 + (rMax - rMin) * 0.03;
  const clampedAvg = Math.max(rMin, Math.min(rMax, avgVal));
  const posAvg = ((clampedAvg - rMin) / range) * 100;

  // Collision handling:
  const distAvgToUser = Math.abs(posAvg - posUser);
  const distAvgToReal = Math.abs(posAvg - posReal);

  let avgSide: 'top' | 'bottom' = 'top';
  let avgExtended = false;

  if (distAvgToUser < 26 && distAvgToReal >= 26) {
    avgSide = 'bottom';
  } else if (distAvgToUser < 26 && distAvgToReal < 26) {
    avgExtended = true;
  }

  const isAvgActive = animStep >= 1;
  const isRealActive = animStep >= 2;
  const isResultsRevealed = animStep >= 3;
  const isAnimActive = showResults && animStep < 3;

  const displayPosAvg = isAvgActive ? toTrackPct(posAvg) : 'calc(100% - 16px)';
  const avgOpacity = isAvgActive ? (distAvgToUser < 7 ? 0.75 : 1) : 0;

  const displayPosReal = isRealActive ? toTrackPct(posReal) : '16px';
  const realOpacity = isRealActive ? 1 : 0;

  // Feedback calculations
  const userDiff = Math.abs(ug - config.answer);
  const avgDiff = Math.abs(avgVal - config.answer);
  const isSpotOn = ug === config.answer;
  const isWithin3Percent = userDiff / range <= 0.03;
  const totalGuesses = data.stats?.totalGuesses ?? 0;
  const isFirstGuesser = totalGuesses <= 1 && data.config !== undefined;
  const isExactAverage =
    !isFirstGuesser &&
    (Math.round(ug) === Math.round(avgVal) || gameDisplayVal(ug) === gameDisplayVal(Math.round(avgVal)));
  const isBetterThanAvg = !isSpotOn && !isWithin3Percent && !isExactAverage && userDiff < avgDiff;

  const variantIndex = Math.abs(Math.round(ug + config.answer));

  let resultStatement: string;

  if (isFirstGuesser) {
    if (isSpotOn) {
      const variations = [
        "🎯 FIRST & SPOT ON! Nailed the exact bullseye on guess #1! 👑",
        "🧙‍♂️ FIRST & FLAWLESS! Set the bar impossibly high on guess #1! 🚀",
        "🚀 INSTANT PERFECTION! First to play, 100% accurate to the digit! ✨",
        "👑 LEGENDARY START! First swing and dead-center bullseye! 🎯",
      ];
      resultStatement = variations[variantIndex % variations.length]!;
    } else {
      const variations = [
        "🥇 FIRST IN THE BALLPARK! You set the benchmark for Reddit! 🚀",
        "🥇 PIONEER STATUS! First swing on this ballpark—can anyone beat you? 💬",
        "🥇 TRAILBLAZER! You set the baseline for everyone else! 🎯",
        "🥇 FIRST GUESS SUBMITTED! Drop a comment to defend your estimate! 🗣️",
        "🥇 NUMBER ONE! You're the very first person to take a swing! 🌟",
        "🥇 GROUND FLOOR! You're the benchmark everyone else is chasing! 🏃",
      ];
      resultStatement = variations[variantIndex % variations.length]!;
    }
  } else if (isSpotOn) {
    const variations = [
      "🎯 SPOT ON BULLSEYE! Pure wizardry down to the digit! 🧙‍♂️",
      "👑 ABSOLUTE PERFECTION! Exact match down to the digit! 🏆",
      "🔮 WHAT ARE THE ODDS?! You nailed the exact number! ✨",
      "🎯 100% DEAD CENTER! Drop a comment and take your victory lap! 🚀",
      "💎 FLAWLESS GUESS! Precision of a seasoned expert! 👑",
    ];
    resultStatement = variations[variantIndex % variations.length]!;
  } else if (isExactAverage) {
    const variations = [
      "🧠 YOU ARE THE HIVEMIND! Matched the community average down to the digit! 👥",
      "🧠 PEAK REDDITOR! Exactly in sync with the Reddit crowd average! 💬",
      "🧠 IN LOCKSTEP WITH THE CROWD! You and the hivemind think as one! 🤝",
      "🧠 SYNCHRONIZED MINDS! Dead heat with the crowd average! 🌐",
    ];
    resultStatement = variations[variantIndex % variations.length]!;
  } else if (isWithin3Percent) {
    const variations = [
      "🏆 INCREDIBLE ACCURACY! Within 3% of the real answer! 🧠",
      "🔥 SO CLOSE IT'S SCARY! Less than 3% away from perfection! 🎯",
      "👏 NAILED THE BALLPARK! Razor-thin margin from the bullseye! 🚀",
      "🌟 ALMOST SPOT ON! Within 3%—head to the comments to flex! 💬",
      "💎 ELITE ESTIMATE! You practically hit the exact number! 🏆",
    ];
    resultStatement = variations[variantIndex % variations.length]!;
  } else if (isBetterThanAvg) {
    const variations = [
      "🎉 BEAT THE HIVEMIND! You were closer than the crowd! 💡",
      "🧠 BIG BRAIN MOVE! You outsmarted the average Redditor! 🚀",
      "🗣️ SMARTER THAN AVERAGE! Closer to reality than the crowd! 🌟",
      "🏆 ABOVE THE CONSENSUS! You beat the Reddit average! 👏",
      "📝 SCHOOL THE CROWD! Your estimate beat the hivemind! 💬",
    ];
    resultStatement = variations[variantIndex % variations.length]!;
  } else {
    const variations = [
      "😅 CLOSE CALL! The hivemind edged you out this time! 💬",
      "👥 THE CROWD WINS! Reddit hivemind had the edge this round! 🍿",
      "🤝 RESPECTABLE EFFORT! The collective wisdom beat you by a hair! 🗣️",
      "📊 IN THE BALLPARK! But the hivemind was slightly closer! 👥",
      "🍿 GREAT SWING! Head to the comments to see how others guessed! 💬",
    ];
    resultStatement = variations[variantIndex % variations.length]!;
  }

  return (
    <div
      className="h-full w-full min-h-screen bg-game-bg flex flex-col items-center justify-center p-3 sm:p-4 select-none relative"
    >
      {/* Toast banner */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-950 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-full shadow-2xl border-2 border-yellow-400 flex items-center gap-2 animate-bounce">
          <span>{toast}</span>
        </div>
      )}

      {/* Main Persistent Card Container (Smoothly extends or shortens without fading out) */}
      <div
        className={`bg-white rounded-2xl shadow-[0_8px_0_0_#0A7CD5] border-3 border-[#0F2B48] flex flex-col justify-between my-auto h-auto max-h-[95dvh] transition-all duration-500 ease-out ${
          'w-full max-w-lg px-4 pt-4 pb-6 sm:px-5 sm:pt-5 sm:pb-7'
        }`}
      >
        {isCreatorMode ? (
          <CreatorView
            showCreator={showCreator}
            setShowCreator={setShowCreator}
            data={data}
            type={type}
            setType={setType}
            text={text}
            setText={setText}
            imageUrl={imageUrl}
            setImageUrl={setImageUrl}
            setCropSrc={setCropSrc}
            min={min}
            setMin={setMin}
            max={max}
            setMax={setMax}
            answer={answer}
            setAnswer={setAnswer}
            explanation={explanation}
            setExplanation={setExplanation}
            isCreating={isCreating}
            handlePickRandomIdea={handlePickRandomIdea}
            handleResetCreator={handleResetCreator}
            handleOpenCropModal={handleOpenCropModal}
            handleCreateSubmit={handleCreateSubmit}
            setShowFactModal={setShowFactModal}
            clampedAnswer={clampedAnswer}
          />
              ) : (
        <GameView
            data={data}
            config={config}
            currentGuess={currentGuess}
            setCurrentGuess={setCurrentGuess}
            userInteractedRef={userInteractedRef}
            animFrameRef={animFrameRef}
            showResults={showResults}
            isSubmittingGuess={isSubmittingGuess}
            buttonShake={buttonShake}
            imageError={imageError}
            setImageError={setImageError}
            animStep={animStep}
            posUser={posUser}
            posReal={posReal}
            posAvg={posAvg}
            realOpacity={realOpacity}
            avgOpacity={avgOpacity}
            displayPosAvg={displayPosAvg}
            displayPosReal={displayPosReal}
            avgSide={avgSide}
            avgExtended={avgExtended}
            userDotShrunk={userDotShrunk}
            gameDisplayVal={gameDisplayVal}
            rMin={rMin}
            rMax={rMax}
            range={range}
            resultStatement={resultStatement}
            handleGuessSubmit={handleGuessSubmit}
            handleResetGame={handleResetGame}
            setShowCommentModal={setShowCommentModal}
            setShowCreator={setShowCreator}
            ug={ug}
            avgVal={avgVal}
            isAnimActive={isAnimActive}
            isResultsRevealed={isResultsRevealed}
            cardExpanded={cardExpanded}
            toTrackPct={toTrackPct}
          />
        )}
      </div>

      {/* Hidden file input for crop modal */}
  <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    className="hidden"
    onChange={handleCropFileChange}
  />

  {/* Crop Modal Overlay */}
  <CropModal
    showCropModal={showCropModal}
    setShowCropModal={setShowCropModal}
    cropSrc={cropSrc}
    cropImgDims={cropImgDims}
    cropScale={cropScale}
    cropBaseScale={cropBaseScale}
    cropPos={cropPos}
    cropContainerRef={cropContainerRef}
    cropImageRef={cropImageRef}
    fileInputRef={fileInputRef}
    handleCropPointerDown={handleCropPointerDown}
    handleCropPointerMove={handleCropPointerMove}
    handleCropPointerUp={handleCropPointerUp}
    handleCropZoomChange={handleCropZoomChange}
    handleSaveCrop={handleSaveCrop}
  />

  {/* Fact Textbox Popup Modal */}
  <FactModal
    showFactModal={showFactModal}
    setShowFactModal={setShowFactModal}
    explanation={explanation}
    setExplanation={setExplanation}
  />

  {/* Read More + Comment Modal */}
  <CommentModal
    showCommentModal={showCommentModal}
    setShowCommentModal={setShowCommentModal}
    config={config}
    commentText={commentText}
    setCommentText={setCommentText}
    isPostingComment={isPostingComment}
    setIsPostingComment={setIsPostingComment}
    postComment={postComment}
    showToast={showToast}
  />
</div>
);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
