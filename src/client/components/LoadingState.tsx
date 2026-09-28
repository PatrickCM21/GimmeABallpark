export const LoadingState = () => {
  return (
    <div className="h-full w-full min-h-screen bg-game-bg flex flex-col items-center justify-center p-4 text-center select-none">
      <div className="bg-white rounded-2xl shadow-2xl border-4 border-indigo-950 p-8 max-w-sm w-full animate-pulse">
        <p className="text-xs font-black text-purple-600 uppercase tracking-widest mb-1">Gimme a Ballpark</p>
        <h2 className="text-2xl font-black uppercase text-indigo-950 mb-5">Loading Game...</h2>
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-indigo-900 rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );
};
