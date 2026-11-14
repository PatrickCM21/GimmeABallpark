import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { UserLifetimeStats, UserStatsResponse } from '../../shared/types/stats';
import { createEmptyUserStats } from '../../shared/types/stats';
import { GameButton } from './GameButton';

type LifetimeStatsModalProps = {
  show: boolean;
  onClose: () => void;
  stats?: UserLifetimeStats | undefined;
  username?: string | undefined;
  snoovatarUrl?: string | undefined;
  initialTab?: 'homerun' | 'ballpark';
};

export const LifetimeStatsModal = ({
  show,
  onClose,
  stats: initialStats,
  username: initialUsername,
  snoovatarUrl,
  initialTab = 'homerun',
}: LifetimeStatsModalProps) => {
  const [activeTab, setActiveTab] = useState<'homerun' | 'ballpark'>(initialTab);
  const [prevShow, setPrevShow] = useState(show);
  const [fetchedStats, setFetchedStats] = useState<UserLifetimeStats | null>(null);
  const [fetchedUsername, setFetchedUsername] = useState<string | undefined>(undefined);

  // Sync initial tab when modal opens
  if (show !== prevShow) {
    setPrevShow(show);
    if (show) {
      setActiveTab(initialTab);
    }
  }

  useEffect(() => {
    if (!show) return;
    let active = true;

    fetch('/api/user-stats')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json() as Promise<UserStatsResponse>;
      })
      .then((data) => {
        if (!active) return;
        if (data.stats) {
          setFetchedStats(data.stats);
        }
        if (data.username) {
          setFetchedUsername(data.username);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch user stats:', err);
      });

    return () => {
      active = false;
    };
  }, [show]);

  if (!show || typeof document === 'undefined') return null;

  const stats = fetchedStats ?? initialStats ?? createEmptyUserStats();
  const username = fetchedUsername ?? initialUsername ?? 'Redditor';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-indigo-950/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-3 select-none animate-in fade-in duration-200 touch-none overscroll-none"
      onTouchMove={(e) => {
        if (e.cancelable) e.preventDefault();
      }}
    >
      <div className="bg-[#F0F9FF] rounded-2xl w-full max-w-sm sm:max-w-md border-3 border-indigo-950 flex flex-col overflow-hidden animate-card-enter">
        {/* Header - Clean Light Blue Sky with White/Yellow Text */}
        <div className="bg-[#1399FF] text-white px-3.5 py-2 flex items-center justify-between shrink-0 border-b-2 border-sky-300">
          <div className="flex items-center gap-2 min-w-0">
            {snoovatarUrl ? (
              <img
                src={snoovatarUrl}
                alt={username}
                className="w-7 h-7 rounded-full border-2 border-white bg-white object-cover shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-7 h-7 rounded-full border-2 border-white bg-white/20 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                ⚾
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white leading-tight truncate">
                Lifetime Stats
              </h2>
              <p className="text-[10px] font-bold text-sky-100 truncate">u/{username}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white font-black flex items-center justify-center cursor-pointer transition-transform text-xs border border-white/40 shadow-xs"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Mode Selector Pill Menu */}
        <div className="px-3 pt-2 pb-1 shrink-0 bg-[#F0F9FF]">
          <div className="p-1 bg-[#E0F2FE] rounded-xl flex items-center gap-1 border-2 border-indigo-950 shadow-[0_2px_0_0_#1E1B4B]">
            <button
              type="button"
              onClick={() => setActiveTab('homerun')}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'homerun'
                  ? 'bg-indigo-950 text-yellow-300 shadow-xs'
                  : 'text-[#0284C7] hover:text-indigo-950 hover:bg-white/50'
              }`}
            >
              <span>⚾</span>
              <span>Home Run Derby</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ballpark')}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'ballpark'
                  ? 'bg-indigo-950 text-yellow-300 shadow-xs'
                  : 'text-[#0284C7] hover:text-indigo-950 hover:bg-white/50'
              }`}
            >
              <span>🎯</span>
              <span>Gimme a Ballpark</span>
            </button>
          </div>
        </div>

        {/* Content Body - Compact, No-Scroll Layout */}
        <div className="px-3 py-1.5 flex-1 min-h-0 bg-[#F0F9FF]">
          {/* TAB 1: HOME RUN DERBY */}
          {activeTab === 'homerun' && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              {/* Games Played Banner */}
              <div className="bg-white rounded-xl border-2 border-indigo-950 shadow-[0_2px_0_0_#1E1B4B] p-1.5 px-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">⚾</span>
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-950">
                    Derbies Played
                  </span>
                </div>
                <span className="text-[11px] font-black text-indigo-950 bg-yellow-300 px-2 py-0.5 rounded-full border border-indigo-950">
                  {stats.homeRunGamesPlayed} {stats.homeRunGamesPlayed === 1 ? 'game' : 'games'}
                </span>
              </div>

              {/* Base breakdown grid - Original Palette (Gold, Indigo, Sky, Emerald) WITHOUT top-right emojis */}
              <div className="grid grid-cols-2 gap-2">
                {/* Homebases (Home Runs) - Gold/Amber */}
                <div className="bg-amber-100 rounded-xl p-2 border-2 border-indigo-950 shadow-[0_3px_0_0_#1E1B4B] flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-950">
                    Homebases
                  </span>
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-amber-950 leading-none">
                      {stats.homeBases}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wide bg-yellow-300 text-amber-950 px-1.5 py-0.5 rounded-full border border-indigo-950">
                      Home Runs
                    </span>
                  </div>
                </div>

                {/* 3rd Bases - Soft Indigo */}
                <div className="bg-indigo-100 rounded-xl p-2 border-2 border-indigo-950 shadow-[0_3px_0_0_#1E1B4B] flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-950">
                    3rd Bases
                  </span>
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-indigo-950 leading-none">
                      {stats.thirdBases}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wide bg-indigo-200 text-indigo-950 px-1.5 py-0.5 rounded-full border border-indigo-950">
                      Round 3
                    </span>
                  </div>
                </div>

                {/* 2nd Bases - Soft Sky Blue */}
                <div className="bg-sky-100 rounded-xl p-2 border-2 border-indigo-950 shadow-[0_3px_0_0_#1E1B4B] flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-950">
                    2nd Bases
                  </span>
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-sky-950 leading-none">
                      {stats.secondBases}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wide bg-sky-200 text-sky-950 px-1.5 py-0.5 rounded-full border border-indigo-950">
                      Round 2
                    </span>
                  </div>
                </div>

                {/* 1st Bases - Soft Emerald Green */}
                <div className="bg-emerald-100 rounded-xl p-2 border-2 border-indigo-950 shadow-[0_3px_0_0_#1E1B4B] flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950">
                    1st Bases
                  </span>
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-emerald-950 leading-none">
                      {stats.firstBases}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wide bg-emerald-200 text-emerald-950 px-1.5 py-0.5 rounded-full border border-indigo-950">
                      Round 1
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NORMAL GIMME A BALLPARK */}
          {activeTab === 'ballpark' && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              {/* Games Played Banner */}
              <div className="bg-white rounded-xl border-2 border-indigo-950 shadow-[0_2px_0_0_#1E1B4B] p-1.5 px-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🎯</span>
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-950">
                    Ballparks Guessed
                  </span>
                </div>
                <span className="text-[11px] font-black text-indigo-950 bg-yellow-300 px-2 py-0.5 rounded-full border border-indigo-950">
                  {stats.normalGamesPlayed} {stats.normalGamesPlayed === 1 ? 'game' : 'games'}
                </span>
              </div>

              {/* Main Stats: Games & Closeness */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-xl p-2 border-2 border-indigo-950 shadow-[0_3px_0_0_#1E1B4B] text-center flex flex-col justify-center">
                  <span className="text-[9px] font-black uppercase text-[#0284C7] tracking-wider">Games Played</span>
                  <span className="text-2xl font-black text-indigo-950 leading-tight mt-0.5">
                    {stats.normalGamesPlayed}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500">Estimates submitted</span>
                </div>

                <div className="bg-sky-100 rounded-xl p-2 border-2 border-indigo-950 shadow-[0_3px_0_0_#1E1B4B] text-center flex flex-col justify-center">
                  <span className="text-[9px] font-black uppercase text-[#0284C7] tracking-wider">Avg Closeness</span>
                  <span className="text-2xl font-black text-sky-950 leading-tight mt-0.5">
                    {stats.normalGamesPlayed > 0 ? `${stats.avgClosenessPct}%` : '—'}
                  </span>
                  <span className="text-[9px] font-bold text-sky-700">
                    {stats.normalGamesPlayed > 0
                      ? `±${(100 - stats.avgClosenessPct).toFixed(1)}% margin`
                      : 'Take a swing!'}
                  </span>
                </div>
              </div>

              {/* Accuracy Highlights */}
              <div className="bg-white rounded-xl p-2 border-2 border-indigo-950 shadow-[0_3px_0_0_#1E1B4B] space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-950 border-b border-[#BAE6FD] pb-1 flex items-center justify-between">
                  <span>Accuracy Badges</span>
                  <span>🎯</span>
                </div>

                <div className="flex items-center justify-between text-xs py-0.5">
                  <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                    <span>🎯</span>
                    <span>Exact Bullseyes (Spot On)</span>
                  </span>
                  <span className="font-black text-indigo-950 bg-yellow-300 px-2 py-0.5 rounded-full border border-indigo-950 text-[10px]">
                    {stats.exactBullseyes}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-0.5">
                  <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                    <span>🔥</span>
                    <span>Within 3% Margin</span>
                  </span>
                  <span className="font-black text-indigo-950 bg-amber-200 px-2 py-0.5 rounded-full border border-indigo-950 text-[10px]">
                    {stats.withinThreePercent}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-0.5">
                  <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                    <span>🧠</span>
                    <span>Beat the Crowd</span>
                  </span>
                  <span className="font-black text-indigo-950 bg-sky-200 px-2 py-0.5 rounded-full border border-indigo-950 text-[10px]">
                    {stats.beatHivemind}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Classic Yellow GameButton */}
        <div className="p-2.5 bg-[#F0F9FF] border-t-2 border-[#BAE6FD] flex items-center justify-center shrink-0">
          <GameButton
            onClick={onClose}
            color="yellow"
            className="w-full py-2 text-xs sm:text-sm border-2 border-indigo-950 shadow-[0_3px_0_0_#a16207]"
          >
            Back to Game
          </GameButton>
        </div>
      </div>
    </div>,
    document.body
  );
};
