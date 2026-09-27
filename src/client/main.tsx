import './index.css';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { navigateTo } from '@devvit/web/client';
import type { GameDataResponse, Config, CreateGameRequest, CreateGameResponse, GuessResponse } from '../../shared/api';

const fetchGameData = async () => {
  const res = await fetch('/api/game-data');
  if (!res.ok) throw new Error('Failed to fetch game data');
  return await res.json() as GameDataResponse;
};

const createGame = async (config: CreateGameRequest) => {
  const res = await fetch('/api/create-game', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error('Failed to create game');
  return await res.json() as CreateGameResponse;
};

const submitGuess = async (guess: number) => {
  const res = await fetch('/api/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guess })
  });
  if (!res.ok) throw new Error('Failed to submit guess');
  return (await res.json()) as GuessResponse;
};

export const App = () => {
  const [data, setData] = useState<GameDataResponse | null>(null);
  const [error, setError] = useState('');
  
  // Hub Setup state
  const [type, setType] = useState<'cost'|'percentage'>('percentage');
  const [text, setText] = useState('');
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(100);
  const [answer, setAnswer] = useState(50);
  const [isCreating, setIsCreating] = useState(false);
  
  // Game state
  const [currentGuess, setCurrentGuess] = useState<number>(0);
  const [showResults, setShowResults] = useState(false);
  const [guessResult, setGuessResult] = useState<GuessResponse | null>(null);

  useEffect(() => {
    fetchGameData().then(d => {
      setData(d);
      if (d.config) {
        setCurrentGuess(Math.floor((d.config.min + d.config.max) / 2));
      }
      if (d.userGuess !== undefined) {
        setShowResults(true);
      }
    }).catch(e => setError(e.message));
  }, []);

  if (error) {
    return <div className="p-8 bg-[#4a148c] text-white rounded-xl text-center">Error: {error}</div>;
  }
  
  if (!data) {
    return <div className="p-8 bg-[#4a148c] text-white rounded-xl text-center animate-pulse font-black text-xl">Loading...</div>;
  }

  const handleCreateSubmit = async () => {
    setIsCreating(true);
    try {
      const res = await createGame({ type, text, min, max, answer });
      if (res.success && res.postId) {
         navigateTo(`https://reddit.com/comments/${res.postId}`);
      } else {
         setError(res.error || 'Failed to create game');
         setIsCreating(false);
      }
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
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
    } catch(e: unknown) {
      if (e instanceof Error) alert("Failed to guess: " + e.message);
    }
  };

  // --- RENDERING ---

  const displayVal = (val: number) => type === 'percentage' ? `${val}%` : val.toLocaleString();

  // 1. HUB / CREATOR SCREEN
  if (data.isHub) {
    return (
      <div className="w-full bg-[#4a148c] text-gray-900 flex flex-col items-center justify-center p-4 rounded-xl shadow-inner">
        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border-b-8 border-r-8 border-indigo-900">
          <h1 className="text-2xl font-black uppercase text-indigo-900 mb-6 text-center">Game Creator Hub</h1>
          
          <div className="flex flex-col gap-4">
            <label className="flex flex-col font-bold text-sm text-gray-600 uppercase">
              Question Type
              <select value={type} onChange={e => setType(e.target.value as 'cost' | 'percentage')} className="mt-1 p-3 bg-gray-100 rounded-lg font-bold text-lg text-indigo-900 outline-none">
                <option value="percentage">Percentage (0-100%)</option>
                <option value="cost">Cost / Number</option>
              </select>
            </label>

            <label className="flex flex-col font-bold text-sm text-gray-600 uppercase">
              Question Subject
              <input type="text" value={text} onChange={e => setText(e.target.value)} className="mt-1 p-3 bg-gray-100 rounded-lg font-bold text-lg text-indigo-900 outline-none placeholder:opacity-50" placeholder="e.g. people who like pizza" />
            </label>

            <div className="flex gap-4">
              <label className="flex flex-col font-bold text-sm text-gray-600 uppercase flex-1">
                Min Value
                <input type="number" value={min} onChange={e => setMin(Number(e.target.value))} className="mt-1 p-3 bg-gray-100 rounded-lg font-bold text-lg text-indigo-900 outline-none" />
              </label>
              <label className="flex flex-col font-bold text-sm text-gray-600 uppercase flex-1">
                Max Value
                <input type="number" value={max} onChange={e => setMax(Number(e.target.value))} className="mt-1 p-3 bg-gray-100 rounded-lg font-bold text-lg text-indigo-900 outline-none" />
              </label>
            </div>

            <label className="flex flex-col font-bold text-sm text-gray-600 uppercase">
              Real Answer
              <input type="number" value={answer} onChange={e => setAnswer(Number(e.target.value))} className="mt-1 p-3 bg-gray-100 rounded-lg font-bold text-lg text-green-600 outline-none" />
            </label>

            <button onClick={handleCreateSubmit} disabled={isCreating} className="mt-4 bg-yellow-400 hover:bg-yellow-500 text-indigo-900 uppercase font-black text-xl py-4 rounded-xl border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50">
              {isCreating ? 'Creating...' : 'Create Game Post'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. INLINE GAME SCREEN
  if (!data.configured || !data.config) {
    return <div className="p-8 bg-red-100 text-red-900 font-bold rounded-xl text-center">This game is missing configuration!</div>;
  }

  const config = data.config;
  const questionPrefix = config.type === 'percentage' ? "The percentage of" : "The cost of";
  const gameDisplayVal = (val: number) => config.type === 'percentage' ? `${val}%` : val.toLocaleString();

  const renderSlider = (isResult: boolean) => {
    const rMin = config.min;
    const rMax = config.max;
    const range = rMax - rMin;
    
    return (
      <div className="relative w-full py-8 mt-6">
        <input 
          type="range" 
          min={rMin} 
          max={rMax} 
          value={isResult ? (data.userGuess ?? currentGuess) : currentGuess}
          onChange={e => !isResult && setCurrentGuess(Number(e.target.value))}
          disabled={isResult}
          className={`w-full h-4 bg-gray-200 rounded-full appearance-none outline-none ${isResult ? 'opacity-50' : 'cursor-pointer'} z-20 relative`}
          style={{ accentColor: isResult ? '#9CA3AF' : '#EAB308' }}
        />
        
        {/* Min / Max Labels */}
        <div className="flex justify-between mt-2 text-sm font-bold text-gray-400 uppercase">
          <span>{gameDisplayVal(rMin)}</span>
          <span>{gameDisplayVal(rMax)}</span>
        </div>

        {/* Results Overlay */}
        {isResult && data.stats && (
          <div className="absolute top-8 left-0 right-0 h-4 pointer-events-none z-10">
            {/* Samples */}
            {data.stats.samples.map((s, i) => {
               const left = ((s - rMin) / range) * 100;
               return (
                 <div key={i} className="absolute w-2 h-4 bg-purple-300 opacity-30 rounded-full -mt-0" style={{ left: `calc(${left}% - 4px)` }} />
               )
            })}
            
            {/* Average */}
            {(() => {
              const left = ((data.stats.averageGuess - rMin) / range) * 100;
              return (
                <div className="absolute flex flex-col items-center -top-8" style={{ left: `calc(${left}%)`, transform: 'translateX(-50%)' }}>
                  <span className="text-xs font-black text-blue-500 uppercase">Avg</span>
                  <div className="w-1 h-8 bg-blue-500 rounded" />
                </div>
              );
            })()}

            {/* Answer */}
            {(() => {
              const left = ((config.answer - rMin) / range) * 100;
              return (
                <div className="absolute flex flex-col items-center top-6" style={{ left: `calc(${left}%)`, transform: 'translateX(-50%)' }}>
                  <div className="w-1 h-6 bg-green-500 rounded" />
                  <span className="text-sm font-black text-green-600 bg-green-100 px-2 py-0.5 rounded-full mt-1 border border-green-500 shadow-sm">{gameDisplayVal(config.answer)}</span>
                </div>
              );
            })()}

            {/* User Guess */}
            {(() => {
              const ug = data.userGuess ?? currentGuess;
              const left = ((ug - rMin) / range) * 100;
              return (
                <div className="absolute flex flex-col items-center -top-12 z-30" style={{ left: `calc(${left}%)`, transform: 'translateX(-50%)' }}>
                  <span className="text-sm font-black text-white bg-indigo-900 px-2 py-1 rounded-full mb-1 shadow-md">You: {gameDisplayVal(ug)}</span>
                  <div className="w-3 h-3 bg-indigo-900 rounded-full" />
                </div>
              );
            })()}
          </div>
        )}

        {/* Current Guess Tooltip */}
        {!isResult && (
          <div className="absolute -top-6 left-0 right-0 pointer-events-none flex justify-center">
             <span className="text-xl font-black text-indigo-900 bg-yellow-400 px-3 py-1 rounded-full shadow-lg border-2 border-indigo-900">{gameDisplayVal(currentGuess)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-[#4a148c] text-gray-900 flex flex-col items-center justify-center p-4 rounded-xl shadow-inner min-h-[400px]">
      <div className="bg-white rounded-2xl shadow-[0_8px_0_0_rgba(49,46,129,1)] p-6 w-full max-w-lg border-2 border-indigo-900">
        
        <div className="text-center mb-6">
          <p className="text-xs font-black text-purple-600 uppercase tracking-widest mb-1">Gimme a Ballpark for...</p>
          <h1 className="text-2xl font-black uppercase text-indigo-900 leading-tight">
            {questionPrefix} <span className="text-pink-500">{config.text}</span>
          </h1>
        </div>

        {!showResults ? (
          <div className="flex flex-col items-center">
            {renderSlider(false)}
            <button onClick={handleGuessSubmit} className="mt-8 bg-green-500 hover:bg-green-400 text-white uppercase font-black text-xl py-3 px-10 rounded-full border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all shadow-md w-full max-w-xs">
              Submit Guess
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {renderSlider(true)}
            <div className="mt-12 bg-indigo-50 border-2 border-indigo-100 rounded-xl p-3 w-full text-center shadow-sm">
              <h2 className="text-lg font-black uppercase text-indigo-900 mb-1">Results Are In</h2>
              {guessResult?.closerThanMajority || (data.stats && data.userGuess && Math.abs(data.userGuess - config.answer) < Math.abs(data.stats.averageGuess - config.answer)) ? (
                 <p className="text-green-600 font-bold text-sm">You were closer than the average Redditor! 🎉</p>
              ) : (
                 <p className="text-red-500 font-bold text-sm">The average Redditor beat you this time! 😅</p>
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
