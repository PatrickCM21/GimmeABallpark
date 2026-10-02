export const CreatorWarningModal = ({
  showCreatorWarning,
  setShowCreatorWarning,
  onProceed,
}: {
  showCreatorWarning: boolean;
  setShowCreatorWarning: (show: boolean) => void;
  onProceed: () => void;
}) => {
  if (!showCreatorWarning) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 select-none animate-in fade-in duration-200"
      onTouchMove={(e) => {
        if (e.cancelable) e.preventDefault();
      }}
    >
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm border-3 border-indigo-950 shadow-2xl flex flex-col gap-3 animate-card-enter">
        <h2 className="text-lg font-black uppercase text-indigo-950 tracking-wide flex items-center gap-1.5">
          <span>⚠️</span>
          <span>Just a heads up!</span>
        </h2>
        
        <p className="text-sm font-bold text-gray-700">
          Creating this game will post and comment on the subreddit <span className="text-indigo-600">on your behalf</span>.
        </p>

        <p className="text-xs text-gray-500 font-semibold mb-2">
          This lets players see that you made the game, and attribute your fact/explanation to you!
        </p>

        <div className="w-full flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowCreatorWarning(false)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              setShowCreatorWarning(false);
              onProceed();
            }}
            className="px-4 py-2 text-xs font-black uppercase rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-xs cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
