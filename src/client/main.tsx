import './index.css';
import { THEME } from './theme';
import { StrictMode, useEffect, useState, useRef, type ChangeEvent, type PointerEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { navigateTo } from '@devvit/web/client';
import type { GameDataResponse, CreateGameRequest, CreateGameResponse, GuessResponse } from '../shared/api';

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

const getTitlePrefix = (t: 'percentage' | 'cost' | 'count') => {
  if (t === 'percentage') return 'the percentage of ';
  if (t === 'cost') return 'the cost of ';
  return 'how many ';
};

const getPlaceholder = (t: 'percentage' | 'cost' | 'count') => {
  switch (t) {
    case 'percentage':
      return 'people who prefer dogs over cats';
    case 'cost':
      return 'a 1990 Honda Civic';
    case 'count':
      return 'stairs in the Eiffel Tower';
  }
};

const formatValue = (val: number, t: 'percentage' | 'cost' | 'count') => {
  if (t === 'percentage') return `${val}%`;
  if (t === 'cost') return `$${val.toLocaleString()}`;
  return val.toLocaleString();
};

// Maps 0-100% position onto the exact range input track bounds (accounting for 32px thumb radius)
const toTrackPct = (pct: number) => {
  const clamped = Math.max(0, Math.min(100, isNaN(pct) ? 50 : pct));
  const offset = 16 - (clamped / 100) * 32;
  return `calc(${clamped}% + ${offset.toFixed(2)}px)`;
};

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

  // Game state
  const [currentGuess, setCurrentGuess] = useState<number>(50);
  const [showResults, setShowResults] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [buttonShake, setButtonShake] = useState(false);
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);

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
        if (d.config) {
          const mid = Math.round((d.config.min + d.config.max) / 2);
          const span = d.config.max - d.config.min;

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
            // Item 1: Silky smooth dynamic slider shift on open using requestAnimationFrame
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
        setError(e instanceof Error ? e.message : 'Unknown error');
      });

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      clearAnimTimeouts();
    };
  }, []);

  // Calculate max allowed subject length so total Reddit title <= 300 chars
  const fullTitlePrefix = `Gimme a Ballpark for ${getTitlePrefix(type)}`;
  const maxSubjectLength = Math.max(50, 300 - fullTitlePrefix.length);

  const previewTitle = `Gimme a Ballpark for ${getTitlePrefix(type)}${text.trim() || '[subject]'}`;

  const getPreviewTitleClass = (len: number) => {
    if (len < 35) return 'text-base sm:text-lg';
    if (len < 70) return 'text-sm sm:text-base';
    if (len < 120) return 'text-xs sm:text-sm';
    return 'text-[11px] leading-tight';
  };

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
        // Ignored: pointer capture may have been released automatically
      }
    }
  };

  const handleCropZoomChange = (newVal: number) => {
    if (!cropImgDims.w) return;
    const newScale = Math.max(cropBaseScale, newVal);

    // Keep center of crop container stationary during zoom
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
    if (!cropImageRef.current || !cropImgDims.w) return;

    const outCanvas = document.createElement('canvas');
    const outW = 520;
    const outH = 260;
    outCanvas.width = outW;
    outCanvas.height = outH;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);

    const ratio = outW / CROP_CW; // 2
    ctx.drawImage(
      cropImageRef.current,
      cropPos.x * ratio,
      cropPos.y * ratio,
      cropImgDims.w * cropScale * ratio,
      cropImgDims.h * cropScale * ratio
    );

    const finalDataUrl = outCanvas.toDataURL('image/jpeg', 0.85);
    setImageUrl(finalDataUrl);
    setShowCropModal(false);
    showToast('✅ Image cropped & attached!');
  };

  const clampAnswerToRange = (val: number, curMin: number, curMax: number) => {
    return Math.max(curMin, Math.min(curMax, val));
  };

  const handleCreateSubmit = async () => {
    // Item 4: Toast if subject is missing
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

    // 1. Immediately trigger card expansion before shrinking the circle
    setCardExpanded(true);
    setShowResults(true);
    setUserDotShrunk(false);
    setAnimStep(0);

    // 2. AFTER the card finishes expanding (~450ms), animate thumb shrinking into dot on timeline
    const shrinkTimer = setTimeout(() => {
      setUserDotShrunk(true);
    }, 450);
    animTimeoutsRef.current.push(shrinkTimer);

    // 3. Fire server request in parallel
    const submitPromise = (async () => {
      await submitGuess(currentGuess);
      return await fetchGameData();
    })();

    // 4. Minimum 1050ms (450ms expansion + 600ms ball shrink & badge pop-up)
    const minDelay = new Promise((resolve) => {
      const delayTimer = setTimeout(resolve, 1050);
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

        // Step 2: Real answer spawns in after Average settles (~1.6s later)
        const step2Timer = setTimeout(() => {
          setAnimStep(2);

          // Step 3: Results banner & CREATE YOUR OWN CTA fade in (~1.6s later)
          const step3Timer = setTimeout(() => {
            setAnimStep(3);
          }, 1600);
          animTimeoutsRef.current.push(step3Timer);
        }, 1600);
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

  // Item 6: Dev Subreddit Reset Handler
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

  // --- 1. FULL-SCREEN ERROR STATE (PURPLE) ---
  if (error) {
    return (
      <div className="h-full w-full min-h-screen bg-game-bg flex flex-col items-center justify-center p-4 text-center select-none">
        <div className="bg-white rounded-2xl shadow-2xl border-4 border-indigo-950 p-6 max-w-sm w-full">
          <p className="text-xl font-black uppercase text-red-600 mb-2">Error</p>
          <p className="font-semibold text-gray-700 text-sm mb-4 break-words">{error}</p>
          <button
            onClick={() => {
              setError('');
              fetchGameData()
                .then(setData)
                .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unknown error'));
            }}
            className="bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black py-2.5 px-6 rounded-full border-b-4 border-yellow-600 active:translate-y-0.5 uppercase tracking-wide text-sm cursor-pointer transition-transform"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // --- 2. FULL-SCREEN LOADING STATE (PURPLE) ---
  if (!data) {
    return (
      <div className="h-full w-full min-h-screen bg-game-bg flex flex-col items-center justify-center p-4 text-center select-none">
        <div className="bg-white rounded-2xl shadow-2xl border-4 border-indigo-950 p-8 max-w-sm w-full animate-pulse">
          <p className="text-xs font-black text-purple-600 uppercase tracking-widest mb-1">Gimme a Ballpark</p>
          <h2 className="text-2xl font-black uppercase text-indigo-950 mb-5">Loading Game...</h2>
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-indigo-900 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // --- 3. CREATOR SCREEN (renders in current window for Hub OR when user clicks "Ask For Your Own Ballpark") ---
  if (data.isHub || showCreator) {
    const clampedAnswer = clampAnswerToRange(answer, min, max);

    return (
      <div className="h-full w-full min-h-screen bg-game-bg flex flex-col items-center justify-center p-3 sm:p-4 select-none relative">
        {/* Toast banner */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-950 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-full shadow-2xl border-2 border-yellow-400 flex items-center gap-2 animate-bounce">
            <span>{toast}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-[0_8px_0_0_rgba(49,46,129,1)] p-4 sm:p-5 w-full max-w-md border-3 border-indigo-950">
          {/* Header with optional Back to Game button if opened in-window */}
          <div className="flex items-center justify-between mb-2">
            {showCreator && !data.isHub ? (
              <button
                type="button"
                onClick={() => setShowCreator(false)}
                className="text-xs font-black text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
              >
                ← Back
              </button>
            ) : (
              <div className="w-12" />
            )}
            <h1 className="text-2xl sm:text-3xl font-black uppercase text-indigo-950 text-center tracking-wide">
              Gimme a Ballpark
            </h1>
            <div className="w-12" />
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Dynamic Title Preview without "Live Title Preview:" text */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-2 text-center min-h-[42px] flex items-center justify-center overflow-hidden">
              <span
                className={`${getPreviewTitleClass(
                  previewTitle.length
                )} font-black text-indigo-950 break-words leading-tight`}
              >
                Gimme a Ballpark for {getTitlePrefix(type)}
                <span className="text-pink-600">{text.trim() || '[subject]'}</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 items-start">
              {/* Type Select */}
              <div className="col-span-1">
                <div className="flex items-center mb-1 h-4">
                  <label className="font-bold text-xs text-gray-700 uppercase">Type</label>
                </div>
                <select
                  value={type}
                  onChange={(e) => {
                    const val = e.target.value as 'percentage' | 'cost' | 'count';
                    setType(val);
                    if (val === 'percentage') {
                      setMin(0);
                      setMax(100);
                      setAnswer(50);
                    } else if (val === 'cost') {
                      setMin(0);
                      setMax(1000);
                      setAnswer(250);
                    } else {
                      setMin(0);
                      setMax(1000);
                      setAnswer(500);
                    }
                  }}
                  className="w-full h-10 px-2.5 bg-gray-50 rounded-xl font-bold text-xs sm:text-sm text-indigo-950 outline-none border-2 border-indigo-900/40 shadow-xs cursor-pointer focus:border-indigo-900 transition-colors"
                >
                  <option value="percentage">Percentage</option>
                  <option value="cost">Cost</option>
                  <option value="count">How Many</option>
                </select>
              </div>

              {/* Subject Input with dynamic placeholder, no "e.g.", and max length counter */}
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-1 h-4">
                  <label className="font-bold text-xs text-gray-700 uppercase">Subject</label>
                  <span className="text-[10px] font-semibold text-gray-400">
                    {text.length}/{maxSubjectLength}
                  </span>
                </div>
                <input
                  type="text"
                  value={text}
                  maxLength={maxSubjectLength}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={getPlaceholder(type)}
                  className="w-full h-10 px-2.5 bg-gray-50 rounded-xl font-bold text-xs sm:text-sm text-indigo-950 outline-none border-2 border-indigo-900/40 shadow-xs focus:border-indigo-900 placeholder:text-gray-400 placeholder:font-normal transition-colors"
                />
              </div>
            </div>

            {/* Single-line Image Trigger & Preview (compact for mobile) */}
            <div className="flex items-center justify-between gap-2 bg-indigo-50/60 px-3 py-2 rounded-xl border border-indigo-100">
              <span className="font-bold text-xs text-gray-700 uppercase whitespace-nowrap">Image (Optional)</span>
              {imageUrl ? (
                <div className="flex items-center gap-2">
                  <img
                    src={imageUrl}
                    alt="Cropped Preview"
                    className="w-12 h-6 object-cover rounded border border-indigo-200 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={handleOpenCropModal}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white text-indigo-950 border border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer"
                  >
                    Edit Crop
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('');
                      setCropSrc('');
                    }}
                    className="p-1 text-xs font-black text-red-500 hover:text-red-700 cursor-pointer"
                    title="Remove Image"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenCropModal}
                  className="py-1 px-3 text-xs font-black uppercase rounded-lg border-2 border-dashed border-indigo-300 bg-white text-indigo-900 hover:bg-indigo-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>📷</span>
                  <span>Add / Crop Image</span>
                </button>
              )}
            </div>

            {/* Min Guess & Max Guess */}
            <div className="grid grid-cols-2 gap-2 items-start">
              <div>
                <div className="flex items-center mb-1 h-4">
                  <label className="font-bold text-xs text-gray-700 uppercase">Min Guess</label>
                </div>
                <input
                  type="number"
                  value={type === 'percentage' ? 0 : min}
                  disabled={type === 'percentage'}
                  readOnly={type === 'percentage'}
                  onChange={(e) => {
                    if (type === 'percentage') return;
                    const newMin = Number(e.target.value);
                    setMin(newMin);
                    if (answer < newMin) setAnswer(newMin);
                  }}
                  className={`w-full h-10 px-2.5 rounded-xl font-bold text-sm text-indigo-950 outline-none border-2 border-indigo-900/40 shadow-xs ${
                    type === 'percentage'
                      ? 'bg-gray-200/80 border-gray-300 text-gray-500 cursor-not-allowed select-none'
                      : 'bg-gray-50'
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center mb-1 h-4">
                  <label className="font-bold text-xs text-gray-700 uppercase">Max Guess</label>
                </div>
                <input
                  type="number"
                  value={type === 'percentage' ? 100 : max}
                  disabled={type === 'percentage'}
                  readOnly={type === 'percentage'}
                  onChange={(e) => {
                    if (type === 'percentage') return;
                    const newMax = Number(e.target.value);
                    setMax(newMax);
                    if (answer > newMax) setAnswer(newMax);
                  }}
                  className={`w-full h-10 px-2.5 rounded-xl font-bold text-sm text-indigo-950 outline-none border-2 border-indigo-900/40 shadow-xs ${
                    type === 'percentage'
                      ? 'bg-gray-200/80 border-gray-300 text-gray-500 cursor-not-allowed select-none'
                      : 'bg-gray-50'
                  }`}
                />
              </div>
            </div>

            {/* Real Answer (BELOW Min & Max, with Slider and Number Input clamped) */}
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-2.5">
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-xs text-gray-700 uppercase">Real Answer</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-400">
                    {formatValue(clampedAnswer, type)}
                  </span>
                  <input
                    type="number"
                    min={min}
                    max={max}
                    value={answer}
                    onChange={(e) => setAnswer(Number(e.target.value))}
                    onBlur={() => setAnswer(clampedAnswer)}
                    className="w-24 p-1 bg-white rounded font-bold text-xs text-emerald-800 outline-none border border-emerald-400 text-right"
                  />
                </div>
              </div>

              {/* Slider for real answer */}
              <input
                type="range"
                min={min}
                max={max}
                value={clampedAnswer}
                onChange={(e) => setAnswer(Number(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-full appearance-none outline-none cursor-pointer mt-1"
                style={{ accentColor: '#10B981' }}
              />
            </div>

            {/* Create Game button: fixed border-b-4 to prevent modal jump */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleCreateSubmit}
                disabled={isCreating}
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-indigo-950 uppercase font-black text-sm sm:text-base py-3 rounded-xl border-b-4 border-yellow-600 active:translate-y-0.5 active:brightness-95 transition-transform disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isCreating ? 'Creating Post...' : '🚀 Create Game Post'}
              </button>
            </div>
          </div>
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
        {showCropModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 select-none animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-4 sm:p-5 w-full max-w-sm border-3 border-indigo-950 shadow-2xl flex flex-col items-center">
              {/* Modal Header */}
              <div className="w-full flex items-center justify-between mb-2">
                <h2 className="text-base sm:text-lg font-black uppercase text-indigo-950 tracking-wide">
                  Crop Question Image
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCropModal(false)}
                  className="text-gray-400 hover:text-gray-700 text-lg font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-[11px] text-gray-500 font-semibold mb-3 text-center">
                This is how your image will appear in the game card.
              </p>

              {/* Crop Viewport or Empty Dropzone */}
              {cropSrc ? (
                <div className="flex flex-col items-center w-full">
                  <div
                    className="w-[260px] h-[130px] rounded-xl border-2 border-indigo-950 overflow-hidden relative cursor-grab active:cursor-grabbing bg-slate-900 shadow-inner touch-none"
                    onPointerDown={handleCropPointerDown}
                    onPointerMove={handleCropPointerMove}
                    onPointerUp={handleCropPointerUp}
                    onPointerCancel={handleCropPointerUp}
                  >
                    <img
                      ref={cropImageRef}
                      src={cropSrc}
                      alt="Crop target"
                      draggable={false}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: `${cropImgDims.w}px`,
                        height: `${cropImgDims.h}px`,
                        transformOrigin: '0 0',
                        transform: `translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropScale})`,
                        userSelect: 'none',
                        pointerEvents: 'none',
                        maxWidth: 'none',
                      }}
                    />
                    {/* Subtle frame indicator */}
                    <div className="absolute inset-0 pointer-events-none border border-white/25 rounded-xl" />
                  </div>

                  <span className="text-[10px] font-bold text-gray-400 uppercase mt-1.5 tracking-wider">
                    Drag to reposition
                  </span>

                  {/* Zoom Controls */}
                  <div className="w-[260px] flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500 font-bold select-none">−</span>
                    <input
                      type="range"
                      min={cropBaseScale}
                      max={cropBaseScale * 3}
                      step={(cropBaseScale * 2) / 100}
                      value={cropScale}
                      onChange={(e) => handleCropZoomChange(Number(e.target.value))}
                      className="flex-1 accent-indigo-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs text-gray-500 font-bold select-none">+</span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-[260px] h-[130px] rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/60 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-100/70 transition-colors p-4 text-center shadow-xs"
                >
                  <span className="text-3xl mb-1">📷</span>
                  <span className="text-xs font-bold text-indigo-950 uppercase">Choose Image File</span>
                  <span className="text-[10px] text-gray-500 mt-0.5">Tap here to select an image</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="w-full flex items-center justify-between gap-2 mt-4 pt-2 border-t border-gray-100">
                {cropSrc ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Change Image
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCropModal(false)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  {cropSrc && (
                    <button
                      type="button"
                      onClick={handleSaveCrop}
                      className="px-4 py-1.5 text-xs font-black uppercase rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-xs cursor-pointer"
                    >
                      Save Crop
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- 4. GAME SCREEN (Item 5: EXACT SAME PAGE STRUCTURE for Guessing & Results) ---
  if (!data.configured || !data.config) {
    return (
      <div className="h-full w-full min-h-screen bg-game-bg flex flex-col items-center justify-center p-4 text-center select-none">
        <div className="bg-white rounded-2xl shadow-xl border-4 border-indigo-950 p-6 max-w-sm w-full">
          <p className="text-lg font-black uppercase text-amber-600 mb-2">Unconfigured Game</p>
          <p className="font-semibold text-gray-600 text-sm">This game post has not been configured yet.</p>
        </div>
      </div>
    );
  }

  const config = data.config;
  const gameDisplayVal = (val: number) => formatValue(val, config.type);

  const rMin = config.min;
  const rMax = config.max;
  const range = rMax - rMin || 1;

  // Percentage positions
  const ug = data.userGuess ?? currentGuess;
  const clampedUser = Math.max(rMin, Math.min(rMax, ug));
  const posUser = ((clampedUser - rMin) / range) * 100;

  const clampedReal = Math.max(rMin, Math.min(rMax, config.answer));
  const posReal = ((clampedReal - rMin) / range) * 100;

  const avgVal = data.stats?.averageGuess ?? ug;
  const clampedAvg = Math.max(rMin, Math.min(rMax, avgVal));
  const posAvg = ((clampedAvg - rMin) / range) * 100;

  // Collision handling:
  // User is on TOP. Real is on BOTTOM.
  const distAvgToUser = Math.abs(posAvg - posUser);
  const distAvgToReal = Math.abs(posAvg - posReal);

  let avgSide: 'top' | 'bottom' = 'top';
  let avgExtended = false;

  if (distAvgToUser < 18 && distAvgToReal >= 18) {
    avgSide = 'bottom';
  } else if (distAvgToUser < 18 && distAvgToReal < 18) {
    avgExtended = true;
  }

  // Slower dynamic spring slide-in values (Item 6 & Item 3)
  // Step 1: Average comes out first (animStep >= 1)
  // Step 2: Real comes out after Average settles (animStep >= 2)
  const isAvgActive = animStep >= 1;
  const isRealActive = animStep >= 2;
  const isResultsRevealed = animStep >= 3;
  const isAnimActive = showResults && animStep < 3;

  const displayPosAvg = isAvgActive ? toTrackPct(posAvg) : 'calc(100% - 16px)';
  const avgOpacity = isAvgActive ? (distAvgToUser < 7 ? 0.75 : 1) : 0;

  const displayPosReal = isRealActive ? toTrackPct(posReal) : '16px';
  const realOpacity = isRealActive ? 1 : 0;

  // Calculate detailed result tier and comment-encouraging feedback (Item 3)
  const userDiff = Math.abs(ug - config.answer);
  const avgDiff = Math.abs(avgVal - config.answer);
  const isSpotOn = ug === config.answer;
  const isWithin3Percent = userDiff / range <= 0.03;
  const totalGuesses = data.stats?.totalGuesses ?? 0;
  const isFirstGuesser = totalGuesses <= 1;
  const isExactAverage =
    !isFirstGuesser &&
    (Math.round(ug) === Math.round(avgVal) || gameDisplayVal(ug) === gameDisplayVal(Math.round(avgVal)));
  const isBetterThanAvg = !isSpotOn && !isWithin3Percent && !isExactAverage && userDiff < avgDiff;

  // Pick deterministic variation (0, 1, or 2)
  const variantIndex = Math.abs(Math.round(ug + config.answer)) % 3;

  let resultHeader: string;
  let resultMessage: string;

  if (isFirstGuesser) {
    if (isSpotOn) {
      resultHeader = '🎯 FIRST & SPOT ON BULLSEYE!';
      const variations = [
        "LEGENDARY! You're the very first guesser AND you nailed the bullseye! Take your victory lap in the comments! 👑",
        "FIRST AND FLAWLESS! You set the bar impossibly high on guess #1! Prove you didn't cheat in the comments! 🧙‍♂️",
        "INSTANT PERFECTION! First to play, 100% accurate down to the digit! Head to the comments and flex! 🚀",
      ];
      resultMessage = variations[variantIndex]!;
    } else {
      resultHeader = '🥇 FIRST IN THE BALLPARK!';
      const variations = [
        "FIRST! You're the very first person to take a swing at this! Head to the comments and see if anyone can beat your benchmark! 🥇",
        "PIONEER STATUS! You're the first guesser on this ballpark! Drop a comment and challenge the community to beat you! 🚀",
        "TRAILBLAZER! You set the baseline for everyone else! Head down to the comments to defend your ballpark! 💬",
      ];
      resultMessage = variations[variantIndex]!;
    }
  } else if (isSpotOn) {
    resultHeader = '🎯 SPOT ON BULLSEYE!';
    const variations = [
      "HOLY SNOO! You got it EXACTLY to the digit! That is pure wizardry! Prove you didn't cheat in the comments! 🧙‍♂️",
      'ABSOLUTE PERFECTION! Spot on down to the literal dollar/digit! Drop a comment and take your victory lap! 👑',
      "WHAT ARE THE ODDS?! You hit the exact number! That's unbelievable! Tell everyone your secret in the comments! 🔮",
    ];
    resultMessage = variations[variantIndex]!;
  } else if (isExactAverage) {
    resultHeader = '🧠 YOU ARE THE HIVEMIND!';
    const variations = [
      "DEAD HEAT WITH THE CROWD! Your guess matched the Reddit average down to the exact number! You are the hivemind incarnate! 🧠",
      "PEAK REDDITOR! You guessed literally the exact community average! Drop a comment and lead your fellow thinkers! 👥",
      "IN LOCKSTEP WITH THE CROWD! You and the hivemind think with one brain! Defend the consensus down in the comments! 💬",
    ];
    resultMessage = variations[variantIndex]!;
  } else if (isWithin3Percent) {
    resultHeader = '🏆 INCREDIBLE ACCURACY!';
    const variations = [
      'INCREDIBLE BALLPARK! You were within 3% of the bullseye! Head to the comments and flex that big brain! 🧠',
      "SO CLOSE IT'S SCARY! Less than 3% away from perfection! Join the discussion down in the comments! 💬",
      'NAILED THE BALLPARK! Within 3% of the real answer! Tell us how you calculated that in the comments! 🚀',
    ];
    resultMessage = variations[variantIndex]!;
  } else if (isBetterThanAvg) {
    resultHeader = '🎉 BEAT THE HIVEMIND!';
    const variations = [
      'BIG BRAIN MOVE! You outsmarted the Reddit hivemind! Drop a comment and tell the crowd what they missed! 💡',
      'ABOVE THE HIVEMIND! You beat the average Redditor guess! School the community down in the comments! 📝',
      'SMARTER THAN AVERAGE! You were closer than the crowd! Head to the comments and join the debate! 🗣️',
    ];
    resultMessage = variations[variantIndex]!;
  } else {
    resultHeader = '😅 THE HIVEMIND TOOK THIS ONE!';
    const variations = [
      'THE HIVEMIND WINS! The average Redditor was closer than you this time. Defend your logic in the comments! 🤺',
      'OUT IN LEFT FIELD! The crowd had a sharper ballpark. Drop a comment and see where your math went wrong! 🧐',
      'OUTSMARTED BY THE CROWD! The community got the upper hand! Tell us your reasoning down in the comments! 💬',
    ];
    resultMessage = variations[variantIndex]!;
  }

  return (
    <div className="h-full w-full bg-game-bg flex flex-col items-center justify-center p-3 sm:p-4 select-none relative overflow-hidden">
      {/* Toast banner */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-950 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-full shadow-2xl border-2 border-yellow-400 flex items-center gap-2 animate-bounce">
          <span>{toast}</span>
        </div>
      )}

      <div className={`bg-white rounded-2xl shadow-[0_8px_0_0_#091E33] p-4 sm:p-5 w-full max-w-lg border-3 border-[#0F2B48] flex flex-col justify-between overflow-hidden transition-[height] duration-500 ease-out my-auto shrink-0 ${
        cardExpanded
          ? 'h-[485px] sm:h-[495px]'
          : (config.imageUrl && !imageError ? 'h-[420px] sm:h-[430px]' : 'h-[370px] sm:h-[380px]')
      }`}>
        {/* Top bar: Author avatar on left + Dev Reset button on right */}
        <div className="flex items-center justify-between shrink-0 mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-indigo-950 bg-white p-0.5 shadow-xs overflow-hidden flex items-center justify-center shrink-0">
              {config.authorAvatarUrl ? (
                <img
                  src={config.authorAvatarUrl}
                  alt={config.authorName || 'user'}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/snoo.png';
                  }}
                  className="w-full h-full object-cover rounded-full"
                  style={{ imageRendering: 'auto' }}
                />
              ) : (
                /* Crisp vector Snoo avatar fallback */
                <svg className="w-full h-full text-indigo-900" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="46" fill="#F1F5F9" />
                  <circle cx="50" cy="52" r="28" fill="#FFFFFF" stroke="#1E1B4B" strokeWidth="4" />
                  <path d="M50 24V14L62 18" stroke="#1E1B4B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="63" cy="18" r="4" fill="#FF4500" />
                  <circle cx="21" cy="50" r="7" fill="#FFFFFF" stroke="#1E1B4B" strokeWidth="3.5" />
                  <circle cx="79" cy="50" r="7" fill="#FFFFFF" stroke="#1E1B4B" strokeWidth="3.5" />
                  <circle cx="39" cy="50" r="5" fill="#FF4500" />
                  <circle cx="61" cy="50" r="5" fill="#FF4500" />
                  <path d="M40 62C44 66 56 66 60 62" stroke="#1E1B4B" strokeWidth="3.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <span className="text-xs sm:text-sm font-black text-indigo-950">
              u/{config.authorName || 'Redditor'} asks:
            </span>
          </div>

          {/* Dev Reset Button for r/gimmeaballpark_dev */}
          {data.isDevSubreddit && (
            <button
              type="button"
              onClick={handleResetGame}
              className="text-[11px] font-black uppercase tracking-wide bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-400 px-2 py-1 rounded-lg cursor-pointer transition-all active:scale-95 shadow-2xs flex items-center gap-1"
              title="Reset your guess (Dev Subreddit Only)"
            >
              <span>🔄</span> Reset (Dev)
            </button>
          )}
        </div>

        {/* Question & Optional Image Container (Dynamically adapts within allocated vertical space) */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-1 sm:py-2">
          {config.imageUrl && !imageError && (
            <div className="mb-1.5 sm:mb-2 flex justify-center max-h-20 sm:max-h-24 overflow-hidden shrink-0">
              <img
                src={config.imageUrl}
                alt={config.text}
                onError={() => setImageError(true)}
                className="max-h-20 sm:max-h-24 w-auto rounded-xl object-contain border border-purple-200 shadow-xs"
              />
            </div>
          )}

          <div className="text-center px-2 w-full">
            <p
              className="font-black uppercase tracking-widest text-xs sm:text-sm mb-1"
              style={{ color: THEME.preamble }}
            >
              {config.type === 'count' ? 'Gimme a Ballpark for' : 'Gimme a Ballpark for the'}
            </p>
            <h1
              className={`font-black uppercase leading-tight break-words ${
                config.imageUrl && !imageError
                  ? config.text.length < 30
                    ? 'text-lg sm:text-xl md:text-2xl'
                    : 'text-base sm:text-lg md:text-xl'
                  : config.text.length < 35
                  ? 'text-3xl sm:text-4xl md:text-5xl'
                  : config.text.length < 65
                  ? 'text-2xl sm:text-3xl md:text-4xl'
                  : 'text-xl sm:text-2xl md:text-3xl'
              }`}
              style={{ color: THEME.questionText }}
            >
              {config.type === 'percentage' && 'percentage of '}
              {config.type === 'cost' && 'cost of '}
              {config.type === 'count' && 'how many '}
              <span className="font-black" style={{ color: THEME.questionHighlight }}>
                {config.text}
              </span>
            </h1>
          </div>
        </div>

        {/* UNIFIED SLIDER & TIMELINE BAR */}
        <div className="flex flex-col items-center w-full shrink-0">
          <div className="relative w-full pt-8 pb-5">
            {/* 16px Track Container */}
            <div className="relative w-full h-4">
              {/* Tooltip badge while guessing - floating directly above slider thumb */}
              {!showResults && (
                <div
                  className="absolute pointer-events-none flex justify-center z-20"
                  style={{
                    left: toTrackPct(posUser),
                    transform: 'translateX(-50%)',
                    bottom: 'calc(100% + 18px)',
                  }}
                >
                  <span
                    className="text-xs sm:text-sm font-black px-3.5 py-0.5 rounded-full shadow-sm border-2"
                    style={{
                      backgroundColor: THEME.guessThumb,
                      color: THEME.guessThumbBorder,
                      borderColor: THEME.guessThumbBorder,
                    }}
                  >
                    {gameDisplayVal(currentGuess)}
                  </span>
                </div>
              )}

              {/* Range Slider Track */}
              <input
                type="range"
                min={rMin}
                max={rMax}
                value={showResults ? ug : currentGuess}
                onChange={(e) => {
                  if (showResults) return;
                  userInteractedRef.current = true;
                  if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
                  setCurrentGuess(Number(e.target.value));
                }}
                onPointerDown={() => {
                  userInteractedRef.current = true;
                  if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
                }}
                onTouchStart={() => {
                  userInteractedRef.current = true;
                  if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
                }}
                disabled={showResults}
                className={`w-full h-4 bg-gray-200 rounded-full appearance-none outline-none z-10 relative ${
                  showResults ? 'cursor-default opacity-80 slider-results-mode' : 'cursor-grab active:cursor-grabbing'
                }`}
                style={{ accentColor: '#EAB308' }}
              />

              {/* MARKERS OVERLAY ON THE EXACT 16px TRACK (INSIDE h-4) */}
              {showResults && (
                <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
                  {/* Sample guesses */}
                  {data.stats?.samples.map((s: number, i: number) => {
                    const clamped = Math.max(rMin, Math.min(rMax, s));
                    const leftPct = ((clamped - rMin) / range) * 100;
                    return (
                      <div
                        key={i}
                        className="absolute w-2 h-4 opacity-40 rounded-full top-0 pointer-events-none"
                        style={{
                          backgroundColor: THEME.sampleMarker,
                          left: `calc(16px + (100% - 32px) * (${leftPct} / 100) - 4px)`,
                        }}
                      />
                    );
                  })}

                  {/* 1. REAL ANSWER (Spawns from Left, Bounces smoothly) */}
                  <div
                    className="absolute top-1/2 z-25 pointer-events-none flex items-center justify-center"
                    style={{
                      left: displayPosReal,
                      opacity: realOpacity,
                      transform: 'translate(-50%, -50%)',
                      transition: isAnimActive
                        ? 'left 1.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out'
                        : 'none',
                    }}
                  >
                    {/* Stem line going DOWN - BEHIND circle */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-emerald-600 z-0" />
                    {/* Badge at bottom of stem */}
                    <div className="absolute top-[28px] left-1/2 -translate-x-1/2 whitespace-nowrap z-30">
                      <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-500 shadow-sm">
                        Real: {gameDisplayVal(config.answer)}
                      </span>
                    </div>
                    {/* Circular Dot on Timeline - IN FRONT OF stem line */}
                    <div className="relative z-10 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white shadow-sm" />
                  </div>

                  {/* 2. AVERAGE GUESS (Spawns from Right, Bounces smoothly) */}
                  {data.stats && (
                    <div
                      className="absolute top-1/2 z-20 pointer-events-none flex items-center justify-center"
                      style={{
                        left: displayPosAvg,
                        opacity: avgOpacity,
                        transform: 'translate(-50%, -50%)',
                        transition: isAnimActive
                          ? 'left 1.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out'
                          : 'none',
                      }}
                    >
                      {avgSide === 'top' ? (
                        <>
                          <div
                            className={`absolute bottom-1/2 left-1/2 -translate-x-1/2 w-0.5 bg-blue-600 z-0 ${
                              avgExtended ? 'h-13' : 'h-6'
                            }`}
                          />
                          <div
                            className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap z-30 ${
                              avgExtended ? 'bottom-[56px]' : 'bottom-[28px]'
                            }`}
                          >
                            <span className="text-[11px] font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-400 shadow-sm">
                              Avg: {gameDisplayVal(Math.round(avgVal))}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-blue-600 z-0" />
                          <div className="absolute top-[28px] left-1/2 -translate-x-1/2 whitespace-nowrap z-30">
                            <span className="text-[11px] font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-400 shadow-sm">
                              Avg: {gameDisplayVal(Math.round(avgVal))}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="relative z-10 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-sm" />
                    </div>
                  )}

                  {/* 3. USER GUESS MARKER (Shrinks from 32px thumb to 14px dot ON THE TIMELINE TRACK) */}
                  <div
                    className="absolute top-1/2 z-30 pointer-events-none flex items-center justify-center"
                    style={{
                      left: toTrackPct(posUser),
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {/* Stem line going UP - BEHIND circle */}
                    <div
                      className={`absolute bottom-1/2 left-1/2 -translate-x-1/2 w-0.5 bg-indigo-950 z-0 origin-bottom transition-all duration-400 ease-out ${
                        userDotShrunk ? 'h-6 scale-y-100 opacity-100' : 'h-0 scale-y-0 opacity-0'
                      }`}
                      style={{
                        transitionDelay: userDotShrunk ? '150ms' : '0ms',
                      }}
                    />

                    {/* Badge at top of stem */}
                    <div
                      className={`absolute bottom-[28px] left-1/2 -translate-x-1/2 whitespace-nowrap z-30 transition-all duration-350 ease-out ${
                        userDotShrunk ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-2'
                      }`}
                      style={{
                        transitionDelay: userDotShrunk ? '250ms' : '0ms',
                      }}
                    >
                      <span className="text-[11px] font-black text-indigo-950 bg-yellow-400 border-2 border-indigo-950 px-2.5 py-0.5 rounded-full shadow-md">
                        You: {gameDisplayVal(ug)}
                      </span>
                    </div>

                    {/* Yellow Circular Dot with Indigo border on Timeline - IN FRONT OF stem line */}
                    <div
                      className={`relative z-10 rounded-full bg-yellow-400 border-indigo-950 transition-all duration-500 ease-out ${
                        userDotShrunk
                          ? 'w-3.5 h-3.5 border-2 shadow-sm'
                          : 'w-8 h-8 border-3 shadow-md'
                      }`}
                      style={{
                        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Min / Max Labels */}
            <div className="flex justify-between text-xs font-bold text-gray-400 uppercase mt-4">
              <span>{gameDisplayVal(rMin)}</span>
              <span>{gameDisplayVal(rMax)}</span>
            </div>
          </div>
        </div>

        {/* 4. BOTTOM ACTION & RESULTS SECTION - Animated height container */}
        <div className={`w-full shrink-0 flex flex-col items-center justify-center transition-[height] duration-500 ease-out ${
          cardExpanded ? 'h-[148px]' : 'h-[60px]'
        }`}>
          {/* State A: Before submitting guess */}
          {!showResults && (
            <button
              type="button"
              onClick={handleGuessSubmit}
              disabled={isSubmittingGuess}
              className={`bg-green-500 hover:bg-green-400 text-white uppercase font-black text-base sm:text-lg py-3 px-10 rounded-full border-b-4 border-green-700 active:translate-y-0.5 active:brightness-95 transition-transform shadow-md w-full max-w-xs cursor-pointer ${
                buttonShake ? 'animate-button-shake' : ''
              }`}
            >
              Submit Guess
            </button>
          )}

          {/* State B: During animation/loading while waiting for other answers */}
          {showResults && !isResultsRevealed && (
            <div className="flex flex-col items-center justify-center gap-2 py-4">
              <div className="flex items-center gap-2 text-indigo-950/70 font-black text-xs uppercase tracking-wider animate-pulse">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                <span>Checking the hivemind...</span>
              </div>
            </div>
          )}

          {/* State C: Results revealed */}
          {showResults && isResultsRevealed && (
            <div className="w-full flex flex-col items-center">
              <div
                className="animate-pop-bounce rounded-xl p-2.5 sm:p-3 w-full text-center shadow-xs border-2"
                style={{
                  backgroundColor: THEME.resultBoxBg,
                  borderColor: THEME.resultBoxBorder,
                }}
              >
                <h2
                  className="text-xs sm:text-sm font-black uppercase mb-0.5"
                  style={{ color: THEME.resultBoxTitle }}
                >
                  {resultHeader}
                </h2>
                <p className="text-xs sm:text-sm font-bold text-gray-800 leading-snug">
                  {resultMessage}
                </p>
                {data.stats && (
                  <p className="text-[11px] text-sky-700 mt-0.5 font-semibold">
                    {data.stats.totalGuesses} total {data.stats.totalGuesses === 1 ? 'guess' : 'guesses'} submitted
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowCreator(true)}
                className="animate-pop-bounce-delayed mt-2 w-full text-slate-900 uppercase font-black text-xs sm:text-sm py-2 px-6 rounded-xl border-b-4 active:translate-y-0.5 active:brightness-95 transition-transform shadow-md cursor-pointer flex items-center justify-center"
                style={{
                  backgroundColor: THEME.createButton,
                  borderColor: THEME.createButtonShadow,
                }}
              >
                CREATE YOUR OWN
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
