export const ErrorState = ({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) => {
  return (
    <div className="h-full w-full min-h-screen bg-game-bg flex flex-col items-center justify-center p-4 text-center select-none">
      <div className="bg-white rounded-2xl shadow-2xl border-4 border-indigo-950 p-6 max-w-sm w-full">
        <p className="text-xl font-black uppercase text-red-600 mb-2">Error</p>
        <p className="font-semibold text-gray-700 text-sm mb-4 break-words">{error}</p>
        <button
          onClick={onRetry}
          className="bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black py-2.5 px-6 rounded-full border-b-4 border-yellow-600 active:translate-y-0.5 uppercase tracking-wide text-sm cursor-pointer transition-transform"
        >
          Retry
        </button>
      </div>
    </div>
  );
};
