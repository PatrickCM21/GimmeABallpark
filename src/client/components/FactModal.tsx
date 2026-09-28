export const FactModal = ({
  showFactModal,
  setShowFactModal,
  explanation,
  setExplanation,
}: {
  showFactModal: boolean;
  setShowFactModal: (show: boolean) => void;
  explanation: string;
  setExplanation: (text: string) => void;
}) => {
  if (!showFactModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 select-none animate-in fade-in duration-200 touch-none overscroll-none"
      onTouchMove={(e) => {
        if (e.cancelable) e.preventDefault();
      }}
    >
      <div className="bg-white rounded-2xl p-4 sm:p-5 w-full max-w-sm border-3 border-indigo-950 shadow-2xl flex flex-col animate-card-enter">
        <div className="w-full flex items-center justify-between mb-2">
          <h2 className="text-base sm:text-lg font-black uppercase text-indigo-950 tracking-wide flex items-center gap-1.5">
            <span>💡</span>
            <span>Add a Fact</span>
          </h2>
          <button
            type="button"
            onClick={() => setShowFactModal(false)}
            className="text-gray-400 hover:text-gray-700 text-lg font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-[11px] text-gray-500 font-semibold mb-3 text-center">
          Share an interesting fact or backstory for this ballpark (max 222 characters).
        </p>

        <div className="flex flex-col gap-1 w-full">
          <div className="flex justify-between items-center mb-0.5">
            <label className="font-bold text-xs text-gray-700 uppercase">Fact / Backstory</label>
            <span className="text-[10px] font-bold text-gray-400">
              {explanation.length}/222
            </span>
          </div>
          <textarea
            value={explanation}
            maxLength={222}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="e.g. In 2024, the world record was officially confirmed..."
            rows={4}
            className="w-full p-2.5 bg-gray-50 rounded-xl font-bold text-xs sm:text-sm text-indigo-950 outline-none border-2 border-indigo-900/40 shadow-xs focus:border-indigo-900 focus:bg-white placeholder:text-gray-400 placeholder:font-normal resize-none transition-colors"
          />
        </div>

        <p className="text-[10px] text-gray-400 font-semibold mt-2 text-center">
          ⚠️ This fact will be visible to all players after they submit their guess.
        </p>

        <div className="w-full flex items-center justify-between gap-2 mt-3 pt-2 border-t border-gray-100">
          {explanation.trim() ? (
            <button
              type="button"
              onClick={() => setExplanation('')}
              className="px-3 py-1.5 text-xs font-bold rounded-xl text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              Clear Fact
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFactModal(false)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setShowFactModal(false)}
              className="px-4 py-1.5 text-xs font-black uppercase rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
