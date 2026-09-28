import { GameButton } from './GameButton';
import { THEME } from '../theme';

export const GameView = ({
  data,
  config,
  currentGuess,
  setCurrentGuess,
  userInteractedRef,
  animFrameRef,
  showResults,
  isSubmittingGuess,
  buttonShake,
  imageError,
  setImageError,
  animStep,
  posUser,
  posReal,
  posAvg,
  realOpacity,
  avgOpacity,
  displayPosAvg,
  displayPosReal,
  avgSide,
  avgExtended,
  userDotShrunk,
  gameDisplayVal,
  rMin,
  rMax,
  range,
  resultStatement,
  handleGuessSubmit,
  handleResetGame,
  setShowCommentModal,
  setShowCreator,
  ug,
  avgVal,
  isAnimActive,
  isResultsRevealed,
  cardExpanded,
  toTrackPct
}: any) => {
  return (
    <div key="game-content" className="h-full w-full flex flex-col justify-between animate-fade-in">
      {/* Top bar: Author info on left + Dev Reset button on right */}
      <div className="flex items-center justify-between shrink-0 mb-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-950 bg-white p-0.5 shadow-xs overflow-hidden flex items-center justify-center shrink-0">
            {config.authorAvatarUrl ? (
              <img src={config.authorAvatarUrl} alt="author" className="w-full h-full object-cover rounded-full" />
            ) : (
              <svg className="w-full h-full text-indigo-900" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="46" fill="#F1F5F9" />
                <circle cx="50" cy="52" r="28" fill="#FFFFFF" stroke="#1E1B4B" strokeWidth="4" />
                <path d="M50 24V14L62 18" stroke="#1E1B4B" strokeWidth="4" strokeLinecap="round" />
                <circle cx="63" cy="18" r="4" fill="#FF4500" />
                <circle cx="21" cy="50" r="7" fill="#FFFFFF" stroke="#1E1B4B" strokeWidth="3.5" />
                <circle cx="79" cy="50" r="7" fill="#FFFFFF" stroke="#1E1B4B" strokeWidth="3.5" />
                <circle cx="39" cy="50" r="5" fill="#FF4500" />
                <circle cx="61" cy="50" r="5" fill="#FF4500" />
                <path d="M40 62C44 66 56 66 60 62" stroke="#1E1B4B" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <span className="text-xs sm:text-sm font-black text-indigo-950">
            u/{config.authorName || 'Redditor'} asks:
          </span>
        </div>

        {data.isDevSubreddit && (
          <button
            type="button"
            onClick={handleResetGame}
            title="Reset Game (Dev Mode)"
            className="text-[11px] font-black uppercase tracking-wide bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-400 px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
          >
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span className="hidden sm:inline">Reset (Dev)</span>
            <span className="sm:hidden">Reset</span>
          </button>
        )}
      </div>

      {/* Question Container */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-1 sm:py-2 w-full transition-all duration-500 ease-out">
        {config.imageUrl && !imageError && (
          <div className="mb-1.5 sm:mb-2 flex justify-center min-h-0 shrink w-full max-h-20 sm:max-h-24 transition-all duration-500 ease-out">
            <img
              src={config.imageUrl}
              alt={config.text}
              onError={() => setImageError(true)}
              className="max-h-20 sm:max-h-24 h-full w-auto rounded-xl object-contain border border-purple-200 shadow-xs transition-all duration-500 ease-out"
            />
          </div>
        )}

        <div className="text-center px-2 w-full flex flex-col justify-center transition-all duration-500 ease-out">
          <p
            className="font-black uppercase tracking-widest text-xs sm:text-sm mb-1"
            style={{ color: THEME.preamble }}
          >
            {config.type === 'count' ? 'Gimme a Ballpark for' : 'Gimme a Ballpark for the'}
          </p>
          <h1
            className={`font-black uppercase leading-[1.15] break-words hyphens-auto ${
              config.imageUrl && !imageError
                ? config.text.length < 35
                  ? 'text-base sm:text-lg'
                  : config.text.length < 65
                  ? 'text-sm sm:text-base'
                  : 'text-xs sm:text-sm'
                : config.text.length < 30
                ? 'text-xl sm:text-2xl md:text-3xl'
                : config.text.length < 50
                ? 'text-lg sm:text-xl md:text-2xl'
                : config.text.length < 75
                ? 'text-base sm:text-lg md:text-xl'
                : 'text-sm sm:text-base md:text-lg'
            }`}
            style={{ color: THEME.questionText }}
          >
            {config.type === 'percentage' && 'percentage of '}
            {config.type === 'cost' && 'cost of '}
            {config.type === 'count' && 'how many '}
            <span className="font-black" style={{ color: THEME.questionHighlight }}>
              {config.text.length > 100 ? config.text.slice(0, 100) + 'â€¦' : config.text}
            </span>
          </h1>
        </div>
      </div>

      {/* UNIFIED SLIDER & TIMELINE BAR */}
      <div className="flex flex-col items-center w-full shrink-0">
        <div className="relative w-full pt-8 pb-5">
          {/* 16px Track Container */}
          <div className="relative w-full h-4">
            {/* Tooltip badge while guessing */}
            {!showResults && (
              <div
                className="absolute pointer-events-none flex justify-center z-20"
                style={{
                  left: toTrackPct(posUser),
                  transform: 'translateX(-50%)',
                  bottom: 'calc(100% + 10px)',
                }}
              >
                <span
                  className="text-xs sm:text-sm font-black px-3.5 py-0.5 rounded-full shadow-sm border-2"
                  style={{
                    backgroundColor: THEME.guessThumb,
                    color: THEME.guessThumbBorder,
                    borderColor: THEME.guessThumbBorder,
                  }}
                >
                  {gameDisplayVal(currentGuess)}
                </span>
              </div>
            )}

            {/* Range Slider Track */}
            <input
              type="range"
              min={rMin}
              max={rMax}
              value={showResults ? ug : currentGuess}
              onChange={(e) => {
                if (showResults) return;
                userInteractedRef.current = true;
                if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
                setCurrentGuess(Number(e.target.value));
              }}
              onPointerDown={() => {
                userInteractedRef.current = true;
                if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
              }}
              onTouchStart={() => {
                userInteractedRef.current = true;
                if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
              }}
              disabled={showResults}
              className={`w-full h-4 bg-gray-200 rounded-full appearance-none outline-none z-10 relative ${
                showResults ? 'cursor-default opacity-80 slider-results-mode' : 'cursor-grab active:cursor-grabbing'
              }`}
              style={{ accentColor: '#EAB308' }}
            />

            {/* MARKERS OVERLAY ON THE EXACT 16px TRACK */}
            {showResults && (
              <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
                {/* Sample guesses */}
                {data.stats?.samples?.map((s: number, i: number) => {
                  const clamped = Math.max(rMin, Math.min(rMax, s));
                  const leftPct = ((clamped - rMin) / range) * 100;
                  return (
                    <div
                      key={i}
                      className="absolute w-2 h-4 opacity-40 rounded-full top-0 pointer-events-none"
                      style={{
                        backgroundColor: THEME.sampleMarker,
                        left: `calc(16px + (100% - 32px) * (${leftPct} / 100) - 4px)`,
                      }}
                    />
                  );
                })}

                {/* 1. REAL ANSWER */}
                <div
                  className="absolute top-1/2 z-25 pointer-events-none flex items-center justify-center"
                  style={{
                    left: displayPosReal,
                    opacity: realOpacity,
                    transform: 'translate(-50%, -50%)',
                    transition: isAnimActive
                      ? 'left 1.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out'
                      : 'none',
                  }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-emerald-600 z-0" />
                  <div className="absolute top-[28px] left-1/2 -translate-x-1/2 whitespace-nowrap z-30">
                    <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-500 shadow-sm">
                      Real: {gameDisplayVal(config.answer)}
                    </span>
                  </div>
                  <div className="relative z-10 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white shadow-sm" />
                </div>

                {/* 2. AVERAGE GUESS */}
                {data.stats && (
                  <div
                    className="absolute top-1/2 z-20 pointer-events-none flex items-center justify-center"
                    style={{
                      left: displayPosAvg,
                      opacity: avgOpacity,
                      transform: 'translate(-50%, -50%)',
                      transition: isAnimActive
                        ? 'left 1.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out'
                        : 'none',
                    }}
                  >
                    {avgSide === 'top' ? (
                      <>
                        <div
                          className={`absolute bottom-1/2 left-1/2 -translate-x-1/2 w-0.5 bg-blue-600 z-0 ${
                            avgExtended ? 'h-13' : 'h-6'
                          }`}
                        />
                        <div
                          className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap z-30 ${
                            avgExtended ? 'bottom-[56px]' : 'bottom-[28px]'
                          }`}
                        >
                          <span className="text-[11px] font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-400 shadow-sm">
                            Avg: {gameDisplayVal(Math.round(avgVal))}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-blue-600 z-0" />
                        <div className="absolute top-[28px] left-1/2 -translate-x-1/2 whitespace-nowrap z-30">
                          <span className="text-[11px] font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-400 shadow-sm">
                            Avg: {gameDisplayVal(Math.round(avgVal))}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="relative z-10 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-sm" />
                  </div>
                )}

                {/* 3. USER GUESS MARKER */}
                <div
                  className="absolute top-1/2 z-30 pointer-events-none flex items-center justify-center"
                  style={{
                    left: toTrackPct(posUser),
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div
                    className={`absolute bottom-1/2 left-1/2 -translate-x-1/2 w-0.5 bg-indigo-950 z-0 origin-bottom transition-all duration-400 ease-out ${
                      userDotShrunk ? 'h-6 scale-y-100 opacity-100' : 'h-0 scale-y-0 opacity-0'
                    }`}
                    style={{
                      transitionDelay: userDotShrunk ? '150ms' : '0ms',
                    }}
                  />
                  <div
                    className={`absolute bottom-[28px] left-1/2 -translate-x-1/2 whitespace-nowrap z-30 transition-all duration-350 ease-out ${
                      userDotShrunk ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-2'
                    }`}
                    style={{
                      transitionDelay: userDotShrunk ? '250ms' : '0ms',
                    }}
                  >
                    <span className="text-[11px] font-black text-indigo-950 bg-yellow-400 border-2 border-indigo-950 px-2.5 py-0.5 rounded-full shadow-md">
                      You: {gameDisplayVal(ug)}
                    </span>
                  </div>
                  <div
                    className={`relative z-10 rounded-full bg-yellow-400 border-indigo-950 transition-all duration-500 ease-out ${
                      userDotShrunk ? 'w-3.5 h-3.5 border-2 shadow-sm' : 'w-8 h-8 border-3 shadow-md'
                    }`}
                    style={{
                      transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Min / Max Labels */}
          <div className="flex justify-between text-xs font-bold text-gray-400 uppercase mt-4">
            <span>{gameDisplayVal(rMin)}</span>
            <span>{gameDisplayVal(rMax)}</span>
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION & RESULTS SECTION */}
      <div
        className={`w-full shrink-0 flex flex-col items-center justify-center transition-all duration-[1500ms] ease-out
overflow-hidden px-1 pb-2 -mb-2 pt-1 -mt-1 ${
            showResults ? 'max-h-[220px]' : 'max-h-[72px]'
        }`}
      >
        {/* State A: Before submitting guess */}
        {!showResults && (
          <GameButton
            onClick={handleGuessSubmit}
            disabled={isSubmittingGuess}
            color="green"
            className={`w-full max-w-xs ${buttonShake ? 'animate-button-shake' : ''}`}
          >
            Submit Guess
          </GameButton>
        )}

                {/* State B & C: Waiting and Results (Combined to hold layout height) */}
        {showResults && (
          <div className="w-full flex flex-col items-center relative h-full">
            {/* Loading Overlay */}
            <div
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 z-10 ${
                isResultsRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-2 py-4">
                <div className="flex items-center gap-2 text-indigo-950/70 font-black text-xs uppercase tracking-wider animate-pulse bg-white/80 px-4 py-2 rounded-full backdrop-blur-sm">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                  <span>Checking the hivemind...</span>
                </div>
              </div>
            </div>

            {/* Actual Results Content (Invisible until revealed, but always dictates layout height) */}
            <div
              className={`w-full flex flex-col items-center transition-all duration-300 ${
                isResultsRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-4'
              }`}
            >
              <div
                className={`rounded-xl p-2 sm:p-2.5 w-full text-center shadow-xs border-2 shrink-0 ${isResultsRevealed ? 'animate-pop-bounce' : ''}`}
                style={{
                  backgroundColor: THEME.resultBoxBg,
                  borderColor: THEME.resultBoxBorder,
                }}
              >
                <h2
                  className="text-xs sm:text-sm font-black uppercase tracking-tight leading-snug"
                  style={{ color: THEME.resultBoxTitle }}
                >
                  {resultStatement}
                </h2>

                {/* Verified Explanation / Fact Card */}
                {config.explanation && (() => {
                  const PREVIEW_LEN = 60;
                  const isLong = config.explanation.length > PREVIEW_LEN;
                  const preview = isLong
                    ? config.explanation.slice(0, PREVIEW_LEN).trimEnd() + '…'
                    : config.explanation;
                  return (
                    <div className="mt-1.5 px-2 py-1.5 bg-amber-50/90 border border-amber-300 rounded-lg text-left shadow-2xs shrink-0 flex items-center gap-2 min-w-0">
                      <p className="text-[10px] sm:text-[11px] text-amber-900 leading-tight flex-1 min-w-0 truncate">
                        <span className="font-bold">💡 u/{config.authorName || 'the creator'}:</span>
                        {' '}
                        <span className="text-gray-700">{preview}</span>
                      </p>
                      {isLong && (
                        <button
                          type="button"
                          onClick={() => setShowCommentModal(true)}
                          className="shrink-0 text-[9px] sm:text-[10px] font-black text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-400 px-2 py-0.5 rounded-full cursor-pointer whitespace-nowrap transition-colors"
                        >
                          Read more
                        </button>
                      )}
                      {!isLong && (
                        <button
                          type="button"
                          onClick={() => setShowCommentModal(true)}
                          className="shrink-0 text-[9px] sm:text-[10px] font-black text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-300 px-2 py-0.5 rounded-full cursor-pointer whitespace-nowrap transition-colors"
                        >
                          💬 Reply
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              <GameButton
                onClick={() => setShowCreator(true)}
                color="yellow"
                className={`mt-2 w-full text-sm sm:text-base rounded-xl ${isResultsRevealed ? 'animate-pop-bounce-delayed' : ''}`}
                style={{ backgroundColor: THEME.createButton, borderColor: THEME.createButtonShadow }}
              >
                CREATE YOUR OWN
              </GameButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
