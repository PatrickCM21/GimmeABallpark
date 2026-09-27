import './index.css';
import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { GameDataResponse } from '../../shared/api';

const fetchGameData = async () => {
  const res = await fetch('/api/game-data');
  if (!res.ok) throw new Error('Failed to fetch game data');
  return await res.json() as GameDataResponse;
};

export const Splash = () => {
  const [data, setData] = useState<GameDataResponse | null>(null);

  useEffect(() => {
    fetchGameData().then(setData).catch(console.error);
  }, []);

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-[#4a148c] p-4 cursor-pointer" onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}>
      <div className="bg-white rounded-2xl shadow-[0_8px_0_0_rgba(49,46,129,1)] p-6 w-full max-w-sm border-2 border-indigo-900 text-center flex flex-col items-center">
        
        <h2 className="text-xl font-black uppercase text-indigo-900 mb-2">Gimme a Ballpark...</h2>
        
        {data ? (
          data.configured ? (
            <p className="text-md font-bold text-gray-700 mb-6 uppercase">
              {data.config?.type === 'percentage' ? "The percentage of" : "The cost of"} <span className="text-pink-500">{data.config?.text}</span>
            </p>
          ) : (
            <p className="text-md font-bold text-red-500 mb-6 uppercase">
              {data.isAuthor ? "Game needs setup!" : "Not configured yet"}
            </p>
          )
        ) : (
          <p className="text-md font-bold text-gray-400 mb-6 uppercase animate-pulse">Loading...</p>
        )}

        <button
          className="bg-yellow-400 hover:bg-yellow-500 text-indigo-900 uppercase font-black text-lg py-3 px-8 rounded-full border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1 transition-all pointer-events-none"
        >
          {data?.configured ? (data.userGuess !== undefined ? "View Results" : "Play Now") : (data?.isAuthor ? "Setup Game" : "Waiting...")}
        </button>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
