import './index.css';
import { StrictMode, useEffect, useState } from 'react';
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

  // Hub Setup state
  const [type, setType] = useState<'percentage' | 'cost' | 'count'>('percentage');
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(100);
  const [answer, setAnswer] = useState(50);
  const [isCreating, setIsCreating] = useState(false);

  // Game state
  const [currentGuess, setCurrentGuess] = useState<number>(50);
  const [showResults, setShowResults] = useState(false);
  const [guessResult, setGuessResult] = useState<GuessResponse | null>(null);
  const [imageError, setImageError] = useState(false);

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

  // Calculate max allowed subject length so total Reddit title <= 300 chars
  const fullTitlePrefix = `Gimme a Ballpark for ${getTitlePrefix(type)}`;
  const maxSubjectLength = Math.max(50, 300 - fullTitlePrefix.length);

  const handleCreateSubmit = async () => {
    if (!text.trim()) {
      alert('Please enter a question subject!');
      return;
    }
    if (min >= max) {
      alert('Min value must be less than max value!');
      return;
    }
    if (answer < min || answer > max) {
      alert(`The real answer (${answer}) must be between min (${min}) and max (${max})!`);
      return;
    }

    setIsCreating(true);
    try {
      const res = await createGame({
        type,
        text: text.trim().slice(0, maxSubjectLength),
        imageUrl: imageUrl.trim() || undefined,
        min,
        max,
        answer,
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
      const res = await submitGuess(currentGuess);
      setGuessResult(res);
      const newData = await fetchGameData();
      setData(newData);
      setShowResults(true);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to submit guess');
    }
  };

  // --- 1. FULL-SCREEN ERROR STATE (DARK BLUE) ---
  if (error) {
    return (
      <div className="h-full w-full min-h-screen bg-[#0b1528] flex flex-col items-center justify-center p-4 text-center select-none">
        <div className="bg-white rounded-2xl shadow-2xl border-4 border-slate-900 p-6 max-w-sm w-full">
          <p className="text-xl font-black uppercase text-red-600 mb-2">Error</p>
          <p className="font-semibold text-gray-700 text-sm mb-4 break-words">{error}</p>
          <button
            onClick={() => {
              setError('');
              fetchGameData()
                .then(setData)
                .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unknown error'));
            }}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-2.5 px-6 rounded-full border-b-4 border-amber-600 active:translate-y-0.5 uppercase tracking-wide text-sm cursor-pointer transition-transform"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // --- 2. FULL-SCREEN LOADING STATE (DARK BLUE) ---
  if (!data) {
    return (
      <div className="h-full w-full min-h-screen bg-[#0b1528] flex flex-col items-center justify-center p-4 text-center select-none">
        <div className="bg-white rounded-2xl shadow-2xl border-4 border-slate-900 p-8 max-w-sm w-full animate-pulse">
          <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Gimme a Ballpark</p>
          <h2 className="text-2xl font-black uppercase text-slate-900 mb-5">Loading Game...</h2>
          <div className="w-12 h-12 border-4 border-amber-400 border-t-blue-900 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // --- 3. HUB / CREATOR SCREEN (DARK BLUE) ---
  if (data.isHub) {
    return (
      <div className="h-full w-full min-h-screen bg-[#0b1528] flex flex-col items-center justify-center p-3 sm:p-4 select-none">
        <div className="bg-white rounded-2xl shadow-[0_8px_0_0_rgba(11,21,40,1)] p-4 sm:p-5 w-full max-w-md border-3 border-slate-900">
          <div className="text-center mb-3">
            <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Gimme a Ballpark</p>
            <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-950">Game Creator Hub</h1>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Live title preview */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-2 text-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase block">Live Title Preview:</span>
              <span className="text-xs sm:text-sm font-black text-slate-950 leading-tight">
                Gimme a Ballpark for {getTitlePrefix(type)}
                <span className="text-pink-600">{text.trim() || '[subject]'}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
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
                  className="mt-1 p-2 bg-gray-50 rounded-lg font-bold text-sm text-slate-900 outline-none border border-gray-300"
                >
                  <option value="percentage">Percentage</option>
                  <option value="cost">Cost</option>
                  <option value="count">How Many</option>
                </select>
              </label>

              <label className="flex flex-col font-bold text-xs text-gray-700 uppercase">
                Real Answer
                <input
                  type="number"
                  value={answer}
                  onChange={(e) => setAnswer(Number(e.target.value))}
                  className="mt-1 p-2 bg-gray-50 rounded-lg font-bold text-sm text-emerald-700 outline-none border border-emerald-400"
                />
              </label>
            </div>

            {/* Subject Input with dynamic placeholder, no "e.g.", and max length counter */}
            <div>
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
                className="w-full p-2 bg-gray-50 rounded-lg font-bold text-sm text-slate-900 outline-none border border-gray-300 placeholder:text-gray-400 placeholder:font-normal"
              />
            </div>

            {/* Image URL submission box */}
            <div>
              <label className="block font-bold text-xs text-gray-700 uppercase mb-1">Image URL (Optional)</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... (optional image link)"
                className="w-full p-2 bg-gray-50 rounded-lg font-bold text-sm text-slate-900 outline-none border border-gray-300 placeholder:text-gray-400 placeholder:font-normal"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col font-bold text-xs text-gray-700 uppercase">
                Min Guess
                <input
                  type="number"
                  value={min}
                  onChange={(e) => setMin(Number(e.target.value))}
                  className="mt-1 p-2 bg-gray-50 rounded-lg font-bold text-sm text-slate-900 outline-none border border-gray-300"
                />
              </label>
              <label className="flex flex-col font-bold text-xs text-gray-700 uppercase">
                Max Guess
                <input
                  type="number"
                  value={max}
                  onChange={(e) => setMax(Number(e.target.value))}
                  className="mt-1 p-2 bg-gray-50 rounded-lg font-bold text-sm text-slate-900 outline-none border border-gray-300"
                />
              </label>
            </div>

            {/* Create Game button: fixed border-b-4 to prevent modal jump */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleCreateSubmit}
                disabled={isCreating}
                className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 uppercase font-black text-sm sm:text-base py-3 rounded-xl border-b-4 border-amber-600 active:translate-y-0.5 active:brightness-95 transition-transform disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isCreating ? 'Creating Post...' : '🚀 Create Game Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 4. GAME SCREEN (INLINE, DARK BLUE) ---
  if (!data.configured || !data.config) {
    return (
      <div className="h-full w-full min-h-screen bg-[#0b1528] flex flex-col items-center justify-center p-4 text-center select-none">
        <div className="bg-white rounded-2xl shadow-xl border-4 border-slate-900 p-6 max-w-sm w-full">
          <p className="text-lg font-black uppercase text-amber-600 mb-2">Unconfigured Game</p>
          <p className="font-semibold text-gray-600 text-sm">This game post has not been configured yet.</p>
        </div>
      </div>
    );
  }

  const config = data.config;
  const gameDisplayVal = (val: number) => formatValue(val, config.type);

  const renderSlider = (isResult: boolean) => {
    const rMin = config.min;
    const rMax = config.max;
    const range = rMax - rMin || 1;
    const activeValue = isResult ? (data.userGuess ?? currentGuess) : currentGuess;

    return (
      <div className="relative w-full py-5 mt-3">
        {/* Slider input */}
        <input
          type="range"
          min={rMin}
          max={rMax}
          value={activeValue}
          onChange={(e) => !isResult && setCurrentGuess(Number(e.target.value))}
          disabled={isResult}
          className={`w-full h-4 bg-slate-200 rounded-full appearance-none outline-none ${
            isResult ? 'opacity-60 cursor-default' : 'cursor-grab active:cursor-grabbing'
          } z-20 relative`}
          style={{ accentColor: isResult ? '#94A3B8' : '#F59E0B' }}
        />

        {/* Min / Max Labels */}
        <div className="flex justify-between mt-2 text-xs font-bold text-gray-400 uppercase">
          <span>{gameDisplayVal(rMin)}</span>
          <span>{gameDisplayVal(rMax)}</span>
        </div>

        {/* Results Overlay */}
        {isResult && data.stats && (
          <div className="absolute top-5 left-0 right-0 h-4 pointer-events-none z-10">
            {/* Samples */}
            {data.stats.samples.map((s: number, i: number) => {
              const clamped = Math.max(rMin, Math.min(rMax, s));
              const leftPercent = ((clamped - rMin) / range) * 100;
              return (
                <div
                  key={i}
                  className="absolute w-2 h-5 bg-sky-400 opacity-50 rounded-full -top-0.5"
                  style={{ left: `calc(${leftPercent}% - 4px)` }}
                />
              );
            })}

            {/* Average guess */}
            {(() => {
              const clamped = Math.max(rMin, Math.min(rMax, data.stats.averageGuess));
              const leftPercent = ((clamped - rMin) / range) * 100;
              return (
                <div
                  className="absolute flex flex-col items-center -top-8 z-25"
                  style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)' }}
                >
                  <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full border border-blue-400 uppercase shadow-xs">
                    Avg: {gameDisplayVal(Math.round(data.stats.averageGuess))}
                  </span>
                  <div className="w-1 h-8 bg-blue-600 rounded" />
                </div>
              );
            })()}

            {/* Real Answer */}
            {(() => {
              const clamped = Math.max(rMin, Math.min(rMax, config.answer));
              const leftPercent = ((clamped - rMin) / range) * 100;
              return (
                <div
                  className="absolute flex flex-col items-center top-5 z-25"
                  style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="w-1.5 h-6 bg-emerald-600 rounded" />
                  <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full mt-1 border border-emerald-500 shadow-sm whitespace-nowrap">
                    Real: {gameDisplayVal(config.answer)}
                  </span>
                </div>
              );
            })()}

            {/* User Guess */}
            {(() => {
              const ug = data.userGuess ?? currentGuess;
              const clamped = Math.max(rMin, Math.min(rMax, ug));
              const leftPercent = ((clamped - rMin) / range) * 100;
              return (
                <div
                  className="absolute flex flex-col items-center -top-14 z-30"
                  style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)' }}
                >
                  <span className="text-xs font-black text-white bg-slate-900 px-2.5 py-1 rounded-full mb-1 shadow-md whitespace-nowrap">
                    You: {gameDisplayVal(ug)}
                  </span>
                  <div className="w-3 h-3 bg-slate-900 rounded-full" />
                </div>
              );
            })()}
          </div>
        )}

        {/* Current Guess Tooltip while guessing */}
        {!isResult && (
          <div className="absolute -top-7 left-0 right-0 pointer-events-none flex justify-center">
            <span className="text-lg font-black text-slate-950 bg-amber-400 px-3.5 py-0.5 rounded-full shadow-md border-2 border-slate-900">
              {gameDisplayVal(currentGuess)}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full w-full min-h-screen bg-[#0b1528] flex flex-col items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-white rounded-2xl shadow-[0_8px_0_0_rgba(11,21,40,1)] p-4 sm:p-6 w-full max-w-lg border-3 border-slate-900">
        {/* Optional Image */}
        {config.imageUrl && !imageError && (
          <div className="mb-3 flex justify-center">
            <img
              src={config.imageUrl}
              alt={config.text}
              onError={() => setImageError(true)}
              className="max-h-32 sm:max-h-36 max-w-full rounded-xl object-contain border border-slate-200 shadow-xs"
            />
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-2">
          <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-0.5">
            {config.type === 'count' ? 'Gimme a Ballpark for' : 'Gimme a Ballpark for the'}
          </p>
          <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-950 leading-snug">
            {config.type === 'percentage' && 'percentage of '}
            {config.type === 'cost' && 'cost of '}
            {config.type === 'count' && 'how many '}
            <span className="text-pink-600 font-black">{config.text}</span>
          </h1>
        </div>

        {!showResults ? (
          <div className="flex flex-col items-center">
            {renderSlider(false)}
            <button
              type="button"
              onClick={handleGuessSubmit}
              className="mt-5 bg-emerald-500 hover:bg-emerald-400 text-white uppercase font-black text-base sm:text-lg py-3 px-10 rounded-full border-b-4 border-emerald-700 active:translate-y-0.5 active:brightness-95 transition-transform shadow-md w-full max-w-xs cursor-pointer"
            >
              Submit Guess
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {renderSlider(true)}

            <div className="mt-14 bg-blue-50 border-2 border-blue-200 rounded-xl p-3 w-full text-center shadow-xs">
              <h2 className="text-base font-black uppercase text-slate-950 mb-1">Results Are In</h2>
              {guessResult?.closerThanMajority ||
              (data.stats &&
                data.userGuess !== undefined &&
                Math.abs(data.userGuess - config.answer) < Math.abs(data.stats.averageGuess - config.answer)) ? (
                <p className="text-emerald-700 font-bold text-sm">🎉 You were closer than the majority of Redditors!</p>
              ) : (
                <p className="text-amber-800 font-bold text-sm">
                  😅 The majority of Redditors were closer than you this time!
                </p>
              )}
              {data.stats && (
                <p className="text-xs text-gray-500 mt-1 font-semibold">
                  {data.stats.totalGuesses} total {data.stats.totalGuesses === 1 ? 'guess' : 'guesses'} submitted
                </p>
              )}
            </div>
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
