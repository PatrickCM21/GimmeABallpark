import './index.css';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { navigateTo } from '@devvit/web/client';
import type { GameDataResponse, Config, SaveConfigRequest, GuessResponse } from '../../shared/api';

const fetchGameData = async () => {
  const res = await fetch('/api/game-data');
  if (!res.ok) throw new Error('Failed to fetch game data');
  return await res.json() as GameDataResponse;
};

const saveConfig = async (config: SaveConfigRequest) => {
  const res = await fetch('/api/save-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error('Failed to save config');
  return await res.json();
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
  
  // Setup state
  const [type, setType] = useState<'cost'|'percentage'>('percentage');
  const [text, setText] = useState('');
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(100);
  const [answer, setAnswer] = useState(50);
  
  // Game state
  const [currentGuess, setCurrentGuess] = useState<number>(0);
  
  // Result state
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
    return <div className="min-h-screen bg-[#4a148c] text-white flex items-center justify-center p-4">Error: {error}</div>;
  }
  
  if (!data) {
    return <div className="min-h-screen bg-[#4a148c] text-white flex items-center justify-center p-4">Loading...</div>;
  }

  const handleSetupSubmit = async () => {
    try {
      await saveConfig({ type, text, min, max, answer });
      const newData = await fetchGameData();
      setData(newData);
      if (newData.config) {
        setCurrentGuess(Math.floor((newData.config.min + newData.config.max) / 2));
      }
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
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

  // 1. SETUP SCREEN
  if (!data.configured) {
    if (!data.isAuthor) {
      return (
        <div className="min-h-screen bg-[#4a148c] text-white flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-3xl font-bold mb-4 uppercase tracking-widest text-yellow-400">Not Ready!</h1>
          <p>The author hasn't configured this game yet.</p>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-[#4a148c] text-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border-b-8 border-r-8 border-indigo-900">
          <h1 className="text-2xl font-black uppercase text-indigo-900 mb-6 text-center">Setup Ballpark Game</h1>
          
          <div className="flex flex-col gap-4">
            <label className="flex flex-col font-bold text-sm text-gray-600 uppercase">
              Question Type
              <select value={type} onChange={e => setType(e.target.value as 'cost' | 'percentage')} className="mt-1 p-3 bg-gray-100 rounded-lg font-bold text-lg text-indigo-900">
                <option value="percentage">Percentage (0-100%)</option>
                <option value="cost">Cost / Number</option>
              </select>
            </label>

            <label className="flex flex-col font-bold text-sm text-gray-600 uppercase">
              Question Subject (e.g. "people who like pizza")
              <input type="text" value={text} onChange={e => setText(e.target.value)} className="mt-1 p-3 bg-gray-100 rounded-lg font-bold text-lg text-indigo-900 placeholder:opacity-50" placeholder="Type here..." />
            </label>

            <div className="flex gap-4">
              <label className="flex flex-col font-bold text-sm text-gray-600 uppercase flex-1">
                Min
                <input type="number" value={min} onChange={e => setMin(Number(e.target.value))} className="mt-1 p-3 bg-gray-100 rounded-lg font-bold text-lg text-indigo-900" />
              </label>
              <label className="flex flex-col font-bold text-sm text-gray-600 uppercase flex-1">
                Max
                <input type="number" value={max} onChange={e => setMax(Number(e.target.value))} className="mt-1 p-3 bg-gray-100 rounded-lg font-bold text-lg text-indigo-900" />
              </label>
            </div>

            <label className="flex flex-col font-bold text-sm text-gray-600 uppercase">
              Real Answer
              <input type="number" value={answer} onChange={e => setAnswer(Number(e.target.value))} className="mt-1 p-3 bg-gray-100 rounded-lg font-bold text-lg text-green-600" />
            </label>

            <button onClick={handleSetupSubmit} className="mt-4 bg-yellow-400 hover:bg-yellow-500 text-indigo-900 uppercase font-black text-xl py-4 rounded-xl border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1 transition-all">
              Create Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // GAME SCREENS
  const config = data.config!;
  const displayVal = (val: number) => config.type === 'percentage' ? `${val}%` : val.toLocaleString();
  
  const questionPrefix = config.type === 'percentage' ? "The percentage of" : "The cost of";

  const renderSlider = (isResult: boolean) => {
    const min = config.min;
    const max = config.max;
    const range = max - min;
    
    return (
      <div className="relative w-full py-8 mt-8">
        <input 
          type="range" 
          min={min} 
          max={max} 
          value={isResult ? (data.userGuess ?? currentGuess) : currentGuess}
          onChange={e => !isResult && setCurrentGuess(Number(e.target.value))}
          disabled={isResult}
          className={`w-full h-4 bg-gray-200 rounded-full appearance-none outline-none ${isResult ? 'opacity-50' : 'cursor-pointer'} z-20 relative`}
          style={{
            accentColor: isResult ? '#9CA3AF' : '#EAB308'
          }}
        />
        
        {/* Min / Max Labels */}
        <div className="flex justify-between mt-2 text-sm font-bold text-gray-400 uppercase">
          <span>{displayVal(min)}</span>
          <span>{displayVal(max)}</span>
        </div>

        {/* Results Overlay */}
        {isResult && data.stats && (
          <div className="absolute top-8 left-0 right-0 h-4 pointer-events-none z-10">
            {/* Samples */}
            {data.stats.samples.map((s, i) => {
               const left = ((s - min) / range) * 100;
               return (
                 <div key={i} className="absolute w-2 h-4 bg-purple-300 opacity-30 rounded-full -mt-0" style={{ left: `calc(${left}% - 4px)` }} />
               )
            })}
            
            {/* Average */}
            {(() => {
              const left = ((data.stats.averageGuess - min) / range) * 100;
              return (
                <div className="absolute flex flex-col items-center -top-8" style={{ left: `calc(${left}%)`, transform: 'translateX(-50%)' }}>
                  <span className="text-xs font-black text-blue-500 uppercase">Avg</span>
                  <div className="w-1 h-8 bg-blue-500 rounded" />
                </div>
              );
            })()}

            {/* Answer */}
            {(() => {
              const left = ((config.answer - min) / range) * 100;
              return (
                <div className="absolute flex flex-col items-center top-6" style={{ left: `calc(${left}%)`, transform: 'translateX(-50%)' }}>
                  <div className="w-1 h-6 bg-green-500 rounded" />
                  <span className="text-sm font-black text-green-600 bg-green-100 px-2 py-0.5 rounded-full mt-1 border border-green-500 shadow-sm">{displayVal(config.answer)}</span>
                </div>
              );
            })()}

            {/* User Guess */}
            {(() => {
              const ug = data.userGuess ?? currentGuess;
              const left = ((ug - min) / range) * 100;
              return (
                <div className="absolute flex flex-col items-center -top-12 z-30" style={{ left: `calc(${left}%)`, transform: 'translateX(-50%)' }}>
                  <span className="text-sm font-black text-white bg-indigo-900 px-2 py-1 rounded-full mb-1 shadow-md">You: {displayVal(ug)}</span>
                  <div className="w-3 h-3 bg-indigo-900 rounded-full" />
                </div>
              );
            })()}
          </div>
        )}

        {/* Current Guess Tooltip (Active state) */}
        {!isResult && (
          <div className="absolute -top-6 left-0 right-0 pointer-events-none flex justify-center">
             <span className="text-2xl font-black text-indigo-900 bg-yellow-400 px-4 py-1 rounded-full shadow-lg border-2 border-indigo-900">{displayVal(currentGuess)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#4a148c] text-gray-900 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-[0_10px_0_0_rgba(49,46,129,1)] p-8 w-full max-w-lg border-2 border-indigo-900">
        
        <div className="text-center mb-8">
          <p className="text-sm font-black text-purple-600 uppercase tracking-widest mb-2">Gimme a Ballpark for...</p>
          <h1 className="text-3xl font-black uppercase text-indigo-900 leading-tight">
            {questionPrefix} <span className="text-pink-500">{config.text}</span>
          </h1>
        </div>

        {!showResults ? (
          <div className="flex flex-col items-center">
            {renderSlider(false)}
            
            <button onClick={handleGuessSubmit} className="mt-12 bg-green-500 hover:bg-green-400 text-white uppercase font-black text-2xl py-4 px-12 rounded-full border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all shadow-lg w-full">
              Submit Guess
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center animate-fade-in">
            {renderSlider(true)}

            <div className="mt-16 bg-indigo-50 border-2 border-indigo-100 rounded-xl p-4 w-full text-center">
              <h2 className="text-xl font-black uppercase text-indigo-900 mb-1">Results Are In</h2>
              {guessResult?.closerThanMajority || (data.stats && data.userGuess && Math.abs(data.userGuess - config.answer) < Math.abs(data.stats.averageGuess - config.answer)) ? (
                 <p className="text-green-600 font-bold">You were closer than the average Redditor! 🎉</p>
              ) : (
                 <p className="text-red-500 font-bold">The average Redditor beat you this time! 😅</p>
              )}
            </div>
            
            <button onClick={() => navigateTo('https://www.reddit.com')} className="mt-6 text-sm font-bold text-gray-400 hover:text-indigo-900 uppercase underline transition-colors">
              Return to Reddit
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
