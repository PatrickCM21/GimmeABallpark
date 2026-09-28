import './index.css';
import { StrictMode, useEffect, useState, type ChangeEvent } from 'react';
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

export const App = () => {
  const [data, setData] = useState<GameDataResponse | null>(null);
  const [error, setError] = useState('');

  // In-window Creator state (openable in current window without redirect)
  const [showCreator, setShowCreator] = useState(false);

  // Hub / Creator Setup state
  const [type, setType] = useState<'percentage' | 'cost' | 'count'>('percentage');
  const [text, setText] = useState('');
  const [imageMode, setImageMode] = useState<'upload' | 'link'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(100);
  const [answer, setAnswer] = useState(50);
  const [isCreating, setIsCreating] = useState(false);

  // Game state
  const [currentGuess, setCurrentGuess] = useState<number>(50);
  const [showResults, setShowResults] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [resultsAnimated, setResultsAnimated] = useState(false);

  useEffect(() => {
    fetchGameData()
      .then((d) => {
        setData(d);
        if (d.config) {
          setCurrentGuess(Math.round((d.config.min + d.config.max) / 2));
        }
        if (d.userGuess !== undefined) {
          setShowResults(true);
        }
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Unknown error');
      });
  }, []);

  // Trigger slower dynamic bouncy slide-in animation when results are displayed
  useEffect(() => {
    if (showResults) {
      const timer = setTimeout(() => {
        setResultsAnimated(true);
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [showResults]);

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

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Please choose an image under 2MB!');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clampAnswerToRange = (val: number, curMin: number, curMax: number) => {
    return Math.max(curMin, Math.min(curMax, val));
  };

  const handleCreateSubmit = async () => {
    if (!text.trim()) {
      alert('Please enter a question subject!');
      return;
    }
    if (min >= max) {
      alert('Min guess must be less than max guess!');
      return;
    }

    const finalAnswer = clampAnswerToRange(answer, min, max);

    setIsCreating(true);
    try {
      const res = await createGame({
        type,
        text: text.trim().slice(0, maxSubjectLength),
        imageUrl: imageUrl.trim() || undefined,
        min,
        max,
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

  const handleGuessSubmit = async () => {
    try {
      await submitGuess(currentGuess);
      const newData = await fetchGameData();
      setData(newData);
      setShowResults(true);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to submit guess');
    }
  };

  // --- 1. FULL-SCREEN ERROR STATE (PURPLE) ---
  if (error) {
    return (
      <div className="h-full w-full min-h-screen bg-[#4a148c] flex flex-col items-center justify-center p-4 text-center select-none">
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
      <div className="h-full w-full min-h-screen bg-[#4a148c] flex flex-col items-center justify-center p-4 text-center select-none">
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
      <div className="h-full w-full min-h-screen bg-[#4a148c] flex flex-col items-center justify-center p-3 sm:p-4 select-none">
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

            <div className="grid grid-cols-3 gap-2 items-end">
              <label className="flex flex-col font-bold text-xs text-gray-700 uppercase">
                Type
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
                  className="mt-1 p-2 bg-gray-50 rounded-xl font-bold text-xs sm:text-sm text-indigo-950 outline-none border-2 border-indigo-900/40 shadow-xs cursor-pointer focus:border-indigo-900 transition-colors"
                >
                  <option value="percentage">Percentage</option>
                  <option value="cost">Cost</option>
                  <option value="count">How Many</option>
                </select>
              </label>

              {/* Subject Input with dynamic placeholder, no "e.g.", and max length counter */}
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-1">
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
                  className="w-full p-2 bg-gray-50 rounded-lg font-bold text-xs sm:text-sm text-indigo-950 outline-none border border-gray-300 placeholder:text-gray-400 placeholder:font-normal"
                />
              </div>
            </div>

            {/* Fixed-height container for Image Selector to prevent modal shifting */}
            <div className="min-h-[82px] flex flex-col justify-start">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-xs text-gray-700 uppercase">Image (Optional)</span>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-[11px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    ✕ Remove Image
                  </button>
                )}
              </div>

              <div className="flex gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`flex-1 py-1 px-2 text-xs font-black uppercase rounded-lg border-2 transition-all cursor-pointer ${
                    imageMode === 'upload'
                      ? 'bg-indigo-900 text-white border-indigo-950 shadow-xs'
                      : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  📷 Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('link')}
                  className={`flex-1 py-1 px-2 text-xs font-black uppercase rounded-lg border-2 transition-all cursor-pointer ${
                    imageMode === 'link'
                      ? 'bg-indigo-900 text-white border-indigo-950 shadow-xs'
                      : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  🔗 Image Link
                </button>
              </div>

              <div className="h-9 flex items-center">
                {imageMode === 'upload' ? (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer"
                  />
                ) : (
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://... (image URL)"
                    className="w-full h-8 p-2 bg-gray-50 rounded-lg font-bold text-xs sm:text-sm text-indigo-950 outline-none border border-gray-300 placeholder:text-gray-400 placeholder:font-normal"
                  />
                )}
              </div>
            </div>

            {/* Min Guess & Max Guess */}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col font-bold text-xs text-gray-700 uppercase">
                Min Guess
                <input
                  type="number"
                  value={min}
                  onChange={(e) => {
                    const newMin = Number(e.target.value);
                    setMin(newMin);
                    if (answer < newMin) setAnswer(newMin);
                  }}
                  className="mt-1 p-2 bg-gray-50 rounded-lg font-bold text-sm text-indigo-950 outline-none border border-gray-300"
                />
              </label>
              <label className="flex flex-col font-bold text-xs text-gray-700 uppercase">
                Max Guess
                <input
                  type="number"
                  value={max}
                  onChange={(e) => {
                    const newMax = Number(e.target.value);
                    setMax(newMax);
                    if (answer > newMax) setAnswer(newMax);
                  }}
                  className="mt-1 p-2 bg-gray-50 rounded-lg font-bold text-sm text-indigo-950 outline-none border border-gray-300"
                />
              </label>
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
      </div>
    );
  }

  // --- 4. GAME SCREEN (INLINE, PURPLE) ---
  if (!data.configured || !data.config) {
    return (
      <div className="h-full w-full min-h-screen bg-[#4a148c] flex flex-col items-center justify-center p-4 text-center select-none">
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

  // Slower dynamic spring slide-in values (Item 6)
  const displayPosReal = resultsAnimated ? posReal : 0;
  const displayPosAvg = resultsAnimated ? posAvg : 100;
  const dynamicOpacity = resultsAnimated ? 1 : 0;

  // Transparency if overlapping (Item 4)
  const isAvgOverlappingUser = distAvgToUser < 7;

  // Calculate detailed result tier and comment-encouraging feedback (Item 3)
  const userDiff = Math.abs(ug - config.answer);
  const avgDiff = Math.abs(avgVal - config.answer);
  const isSpotOn = ug === config.answer;
  const isWithin3Percent = userDiff / range <= 0.03;
  const isBetterThanAvg = userDiff < avgDiff;

  // Pick deterministic variation (0, 1, or 2)
  const variantIndex = Math.abs(Math.round(ug + config.answer)) % 3;

  let resultHeader: string;
  let resultMessage: string;

  if (isSpotOn) {
    resultHeader = '🎯 SPOT ON BULLSEYE!';
    const variations = [
      "HOLY SNOO! You got it EXACTLY to the digit! That is pure wizardry! Prove you didn't cheat in the comments! 🧙‍♂️",
      'ABSOLUTE PERFECTION! Spot on down to the literal dollar/digit! Drop a comment and take your victory lap! 👑',
      "WHAT ARE THE ODDS?! You hit the exact number! That's unbelievable! Tell everyone your secret in the comments! 🔮",
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
    <div className="h-full w-full min-h-screen bg-[#4a148c] flex flex-col items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-white rounded-2xl shadow-[0_8px_0_0_rgba(49,46,129,1)] p-4 sm:p-5 w-full max-w-lg border-3 border-indigo-950">
        {/* Author / User avatar in circle in top left with "u/x asks:" */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-indigo-950 bg-white p-0.5 shadow-xs overflow-hidden flex items-center justify-center shrink-0">
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
                {/* Antenna */}
                <path d="M50 24V14L62 18" stroke="#1E1B4B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="63" cy="18" r="4" fill="#FF4500" />
                {/* Ears */}
                <circle cx="21" cy="50" r="7" fill="#FFFFFF" stroke="#1E1B4B" strokeWidth="3.5" />
                <circle cx="79" cy="50" r="7" fill="#FFFFFF" stroke="#1E1B4B" strokeWidth="3.5" />
                {/* Eyes */}
                <circle cx="39" cy="50" r="5" fill="#FF4500" />
                <circle cx="61" cy="50" r="5" fill="#FF4500" />
                {/* Smile */}
                <path d="M40 62C44 66 56 66 60 62" stroke="#1E1B4B" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <span className="text-xs sm:text-sm font-black text-indigo-950">
            u/{config.authorName || 'Redditor'} asks:
          </span>
        </div>

        {/* Optional Image */}
        {config.imageUrl && !imageError && (
          <div className="mb-2.5 flex justify-center">
            <img
              src={config.imageUrl}
              alt={config.text}
              onError={() => setImageError(true)}
              className="max-h-32 sm:max-h-36 max-w-full rounded-xl object-contain border border-purple-200 shadow-xs"
            />
          </div>
        )}

        {/* Big Header with generous spacing before slider */}
        <div className="text-center mb-6 sm:mb-8">
          <p className="text-xs font-black text-purple-600 uppercase tracking-widest mb-1">
            {config.type === 'count' ? 'Gimme a Ballpark for' : 'Gimme a Ballpark for the'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-indigo-950 leading-tight">
            {config.type === 'percentage' && 'percentage of '}
            {config.type === 'cost' && 'cost of '}
            {config.type === 'count' && 'how many '}
            <span className="text-pink-600 font-black">{config.text}</span>
          </h1>
        </div>

        {/* GUESSING STATE */}
        {!showResults ? (
          <div className="flex flex-col items-center">
            <div className="relative w-full py-6 mt-6">
              {/* Proportional guess tooltip in purple/yellow palette */}
              <div className="absolute -top-6 left-0 right-0 pointer-events-none flex justify-center">
                <span className="text-sm sm:text-base font-black text-indigo-950 bg-yellow-400 px-3 py-0.5 rounded-full shadow-sm border-2 border-indigo-950">
                  {gameDisplayVal(currentGuess)}
                </span>
              </div>

              {/* Interactive slider */}
              <input
                type="range"
                min={rMin}
                max={rMax}
                value={currentGuess}
                onChange={(e) => setCurrentGuess(Number(e.target.value))}
                className="w-full h-4 bg-gray-200 rounded-full appearance-none outline-none cursor-grab active:cursor-grabbing z-20 relative"
                style={{ accentColor: '#EAB308' }}
              />

              {/* Min / Max Labels */}
              <div className="flex justify-between mt-2 text-xs font-bold text-gray-400 uppercase">
                <span>{gameDisplayVal(rMin)}</span>
                <span>{gameDisplayVal(rMax)}</span>
              </div>
            </div>

            {/* Submit Guess button with opening shake animation */}
            <button
              type="button"
              onClick={handleGuessSubmit}
              className="mt-6 bg-green-500 hover:bg-green-400 text-white uppercase font-black text-base sm:text-lg py-3 px-10 rounded-full border-b-4 border-green-700 active:translate-y-0.5 active:brightness-95 transition-transform shadow-md w-full max-w-xs cursor-pointer animate-button-shake"
            >
              Submit Guess
            </button>
          </div>
        ) : (
          /* RESULTS STATE */
          <div className="flex flex-col items-center">
            {/* Timeline with dots & stems (tighter vertical spacing) */}
            <div className="relative w-full my-7 sm:my-8">
              {/* Timeline Track */}
              <div className="w-full h-4 bg-gray-200 rounded-full relative overflow-visible">
                {/* Semi-transparent sample guesses */}
                {data.stats?.samples.map((s: number, i: number) => {
                  const clamped = Math.max(rMin, Math.min(rMax, s));
                  const leftPct = ((clamped - rMin) / range) * 100;
                  return (
                    <div
                      key={i}
                      className="absolute w-2 h-4 bg-purple-400 opacity-40 rounded-full top-0 pointer-events-none"
                      style={{ left: `calc(${leftPct}% - 4px)` }}
                    />
                  );
                })}

                {/* 1. USER GUESS: Matches Yellow/Purple Wheel Slider Style (Dot + Stem + Badge) */}
                <div
                  className="absolute top-1/2 z-30 pointer-events-none"
                  style={{
                    left: `${posUser}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {/* Stem line going UP */}
                  <div className="absolute bottom-1/2 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-indigo-950" />
                  {/* Badge at top of stem styled like yellow/purple wheel */}
                  <div className="absolute bottom-[28px] left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-[11px] font-black text-indigo-950 bg-yellow-400 border-2 border-indigo-950 px-2.5 py-0.5 rounded-full shadow-md">
                      You: {gameDisplayVal(ug)}
                    </span>
                  </div>
                  {/* Yellow Circular Dot with Indigo border on Timeline */}
                  <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 border-2 border-indigo-950 shadow-sm" />
                </div>

                {/* 2. REAL ANSWER: Dot + Stem + Badge (Spawns from Left, Bounces smoothly) */}
                <div
                  className="absolute top-1/2 z-25 pointer-events-none"
                  style={{
                    left: `${displayPosReal}%`,
                    opacity: dynamicOpacity,
                    transform: 'translate(-50%, -50%)',
                    transition:
                      'left 1.9s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.6s ease-out',
                  }}
                >
                  {/* Stem line going DOWN */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-emerald-600" />
                  {/* Badge at bottom of stem */}
                  <div className="absolute top-[28px] left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-500 shadow-sm">
                      Real: {gameDisplayVal(config.answer)}
                    </span>
                  </div>
                  {/* Circular Dot on Timeline */}
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white shadow-sm" />
                </div>

                {/* 3. AVERAGE GUESS: Dot + Stem + Badge (Spawns from Right, Bounces smoothly, transparent if overlapping) */}
                {data.stats && (
                  <div
                    className={`absolute top-1/2 z-20 pointer-events-none ${
                      isAvgOverlappingUser ? 'opacity-75' : ''
                    }`}
                    style={{
                      left: `${displayPosAvg}%`,
                      opacity: isAvgOverlappingUser ? 0.75 * dynamicOpacity : dynamicOpacity,
                      transform: 'translate(-50%, -50%)',
                      transition:
                        'left 2.1s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.6s ease-out',
                    }}
                  >
                    {avgSide === 'top' ? (
                      <>
                        {/* Stem line going UP */}
                        <div
                          className={`absolute bottom-1/2 left-1/2 -translate-x-1/2 w-0.5 bg-blue-600 ${
                            avgExtended ? 'h-14' : 'h-6'
                          }`}
                        />
                        {/* Badge at top of stem */}
                        <div
                          className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap ${
                            avgExtended ? 'bottom-[60px]' : 'bottom-[28px]'
                          }`}
                        >
                          <span className="text-[11px] font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-400 shadow-sm">
                            Avg: {gameDisplayVal(Math.round(avgVal))}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Stem line going DOWN */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-blue-600" />
                        {/* Badge at bottom of stem */}
                        <div className="absolute top-[28px] left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <span className="text-[11px] font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-400 shadow-sm">
                            Avg: {gameDisplayVal(Math.round(avgVal))}
                          </span>
                        </div>
                      </>
                    )}
                    {/* Circular Dot on Timeline */}
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-sm" />
                  </div>
                )}
              </div>

              {/* Min / Max Labels */}
              <div className="flex justify-between mt-7 text-xs font-bold text-gray-400 uppercase">
                <span>{gameDisplayVal(rMin)}</span>
                <span>{gameDisplayVal(rMax)}</span>
              </div>
            </div>

            {/* Results Banner (Comment-encouraging tiers) */}
            <div className="mt-2.5 bg-purple-50 border-2 border-purple-200 rounded-xl p-3 w-full text-center shadow-xs">
              <h2 className="text-xs sm:text-sm font-black uppercase text-indigo-950 mb-1">
                {resultHeader}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-gray-800 leading-snug">
                {resultMessage}
              </p>
              {data.stats && (
                <p className="text-[11px] text-gray-500 mt-1 font-semibold">
                  {data.stats.totalGuesses} total {data.stats.totalGuesses === 1 ? 'guess' : 'guesses'} submitted
                </p>
              )}
            </div>

            {/* "Ask For Your Own Ballpark" button (opens in-window game maker without redirect) */}
            <button
              type="button"
              onClick={() => {
                setShowCreator(true);
              }}
              className="mt-3.5 w-full bg-yellow-400 hover:bg-yellow-300 text-indigo-950 uppercase font-black text-sm py-2.5 px-6 rounded-xl border-b-4 border-yellow-600 active:translate-y-0.5 active:brightness-95 transition-transform shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>🎯</span> Ask For Your Own Ballpark
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
