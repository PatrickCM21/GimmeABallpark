import { GameButton } from './GameButton';
import { getTitlePrefix, getPlaceholder, formatValue } from '../utils';

type GameDataResponse = any; // Just using any for now to avoid importing complex types unnecessarily, or we can use the actual type if needed.

export const CreatorView = ({
  showCreator,
  setShowCreator,
  data,
  type,
  setType,
  text,
  setText,
  imageUrl,
  setImageUrl,
  setCropSrc,
  min,
  setMin,
  max,
  setMax,
  answer,
  setAnswer,
  explanation,
  setExplanation,
  isCreating,
  handlePickRandomIdea,
  handleResetCreator,
  handleOpenCropModal,
  handleCreateSubmit,
  setShowFactModal,
  clampedAnswer,
}: {
  showCreator: boolean;
  setShowCreator: (val: boolean) => void;
  data: any;
  type: 'percentage' | 'cost' | 'count';
  setType: (val: 'percentage' | 'cost' | 'count') => void;
  text: string;
  setText: (val: string) => void;
  imageUrl: string;
  setImageUrl: (val: string) => void;
  setCropSrc: (val: string) => void;
  min: number;
  setMin: (val: number) => void;
  max: number;
  setMax: (val: number) => void;
  answer: number;
  setAnswer: (val: number) => void;
  explanation: string;
  setExplanation: (val: string) => void;
  isCreating: boolean;
  handlePickRandomIdea: () => void;
  handleResetCreator: () => void;
  handleOpenCropModal: () => void;
  handleCreateSubmit: () => void;
  setShowFactModal: (val: boolean) => void;
  clampedAnswer: number;
}) => {
  const maxSubjectLength = 100;
  const previewTitle = `Gimme a Ballpark for ${getTitlePrefix(type)}${text.trim() || '[subject]'}`;

  const getPreviewTitleClass = (len: number) => {
    if (len < 30) return 'text-sm sm:text-base';
    if (len < 60) return 'text-xs sm:text-sm';
    return 'text-[11px] sm:text-xs leading-tight';
  };

  return (
    <div key="creator-content" className="h-full w-full flex flex-col justify-between animate-fade-in">
      {/* Header with optional Back to Game button */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        {showCreator && !data.isHub ? (
          <button
            type="button"
            onClick={() => setShowCreator(false)}
            className="text-xs font-black text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>BACK</span>
          </button>
        ) : (
          <div className="w-12" />
        )}
        <h1 className="text-sm sm:text-base font-black uppercase text-indigo-950 text-center tracking-wide flex-1 mx-2">
          Gimme a Ballpark
        </h1>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Black and white outlined Die button for 100 random ballparks */}
          <button
            type="button"
            onClick={handlePickRandomIdea}
            title="Pick a random question (from 100 dedicated options)"
            className="text-[11px] font-black text-slate-900 bg-yellow-400 hover:bg-yellow-300 px-2 py-1 rounded-lg border-2 border-slate-900 shadow-2xs cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            {/* Custom Crisp Black & White Outlined Die Icon */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="20" height="20" rx="4" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
              <circle cx="6.5" cy="6.5" r="1.75" fill="#000000" />
              <circle cx="17.5" cy="6.5" r="1.75" fill="#000000" />
              <circle cx="12" cy="12" r="1.75" fill="#000000" />
              <circle cx="6.5" cy="17.5" r="1.75" fill="#000000" />
              <circle cx="17.5" cy="17.5" r="1.75" fill="#000000" />
            </svg>
            <span className="hidden sm:inline font-black uppercase text-[10px]">Random</span>
          </button>

          {/* Reset button next to the die that resets all options back to nothing */}
          <button
            type="button"
            onClick={handleResetCreator}
            title="Reset all fields to blank"
            className="text-[11px] font-bold text-gray-700 hover:text-red-700 bg-gray-100 hover:bg-red-50 px-2 py-1 rounded-lg border-2 border-gray-400 hover:border-red-400 shadow-2xs cursor-pointer flex items-center gap-1 transition-colors"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span className="hidden sm:inline font-bold uppercase text-[10px]">Reset</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {/* Dynamic Title Preview (Fixed height so it never pushes layout) */}
        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl px-2.5 py-1 text-center h-[42px] max-h-[42px] flex items-center justify-center overflow-hidden shrink-0">
          <span
            className={`${getPreviewTitleClass(
              previewTitle.length
            )} font-black text-indigo-950 line-clamp-2 leading-tight`}
          >
            Gimme a Ballpark for {getTitlePrefix(type)}
            <span className="text-pink-600">{text.trim() || '[subject]'}</span>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 items-start">
          {/* Type Select */}
          <div className="col-span-1">
            <div className="flex items-center mb-0.5 h-3.5">
              <label className="font-bold text-[10px] sm:text-[11px] text-gray-700 uppercase">Type</label>
            </div>
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
              className="w-full h-8 sm:h-8.5 px-2 bg-gray-50 rounded-lg font-bold text-xs text-indigo-950 outline-none border-2 border-indigo-900/40 shadow-xs cursor-pointer focus:border-indigo-900 transition-colors"
            >
              <option value="percentage">Percentage</option>
              <option value="cost">Cost</option>
              <option value="count">How Many</option>
            </select>
          </div>

          {/* Subject Input */}
          <div className="col-span-2">
            <div className="flex justify-between items-center mb-0.5 h-3.5">
              <label className="font-bold text-[10px] sm:text-[11px] text-gray-700 uppercase">Subject</label>
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
              className="w-full h-8 sm:h-8.5 px-2 bg-gray-50 rounded-lg font-bold text-xs text-indigo-950 outline-none border-2 border-indigo-900/40 shadow-xs focus:border-indigo-900 placeholder:text-gray-400 placeholder:font-normal transition-colors"
            />
          </div>
        </div>

        {/* Single-line Image Trigger & Preview */}
        <div className="h-7 sm:h-8 px-2.5 bg-indigo-50/60 rounded-lg border border-indigo-100 flex items-center justify-between gap-2 shrink-0">
          <span className="font-bold text-[10px] sm:text-[11px] text-gray-700 uppercase whitespace-nowrap">Image (Optional)</span>
          {imageUrl ? (
            <div className="flex items-center gap-1.5 h-6">
              <img
                src={imageUrl}
                alt="Cropped Preview"
                className="w-10 h-6 object-cover rounded border border-indigo-200 shadow-xs shrink-0"
              />
              <button
                type="button"
                onClick={handleOpenCropModal}
                className="h-6 px-2 text-[11px] font-bold rounded bg-white text-indigo-950 border border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer flex items-center justify-center"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setImageUrl('');
                  setCropSrc('');
                }}
                className="h-6 w-6 flex items-center justify-center text-xs font-black text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                title="Remove Image"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleOpenCropModal}
              className="h-6 px-2.5 text-[11px] font-bold rounded border border-indigo-300 bg-white text-indigo-900 hover:bg-indigo-50 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <span>📷</span>
              <span>Add / Crop Image</span>
            </button>
          )}
        </div>

        {/* Min Guess & Max Guess */}
        <div className="grid grid-cols-2 gap-2 items-start">
          <div>
            <div className="flex items-center mb-0.5 h-3.5">
              <label className="font-bold text-[10px] sm:text-[11px] text-gray-700 uppercase">Min Guess</label>
            </div>
            <input
              type="number"
              value={type === 'percentage' ? 0 : min}
              disabled={type === 'percentage'}
              readOnly={type === 'percentage'}
              onChange={(e) => {
                if (type === 'percentage') return;
                const newMin = Number(e.target.value);
                setMin(newMin);
                if (answer < newMin) setAnswer(newMin);
              }}
              className={`w-full h-8 sm:h-8.5 px-2 rounded-lg font-bold text-xs text-indigo-950 outline-none border-2 border-indigo-900/40 shadow-xs ${
                type === 'percentage'
                  ? 'bg-gray-200/80 border-gray-300 text-gray-500 cursor-not-allowed select-none'
                  : 'bg-gray-50'
              }`}
            />
          </div>
          <div>
            <div className="flex items-center mb-0.5 h-3.5">
              <label className="font-bold text-[10px] sm:text-[11px] text-gray-700 uppercase">Max Guess</label>
            </div>
            <input
              type="number"
              value={type === 'percentage' ? 100 : max}
              disabled={type === 'percentage'}
              readOnly={type === 'percentage'}
              onChange={(e) => {
                if (type === 'percentage') return;
                const newMax = Number(e.target.value);
                setMax(newMax);
                if (answer > newMax) setAnswer(newMax);
              }}
              className={`w-full h-8 sm:h-8.5 px-2 rounded-lg font-bold text-xs text-indigo-950 outline-none border-2 border-indigo-900/40 shadow-xs ${
                type === 'percentage'
                  ? 'bg-gray-200/80 border-gray-300 text-gray-500 cursor-not-allowed select-none'
                  : 'bg-gray-50'
              }`}
            />
          </div>
        </div>

        {/* Real Answer (with Slider and Number Input) */}
        <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-1.5 sm:p-2 shrink-0">
          <div className="flex justify-between items-center mb-0.5">
            <label className="font-bold text-[10px] sm:text-[11px] text-gray-700 uppercase">Real Answer</label>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-400">
                {formatValue(clampedAnswer, type)}
              </span>
              <input
                type="number"
                min={min}
                max={max}
                value={answer}
                onChange={(e) => setAnswer(Number(e.target.value))}
                onBlur={() => setAnswer(clampedAnswer)}
                className="w-20 p-0.5 bg-white rounded font-bold text-[11px] text-emerald-800 outline-none border border-emerald-400 text-right"
              />
            </div>
          </div>

          {/* Slider for real answer */}
          <input
            type="range"
            min={min}
            max={max}
            value={clampedAnswer}
            onChange={(e) => setAnswer(Number(e.target.value))}
            className="w-full h-2.5 bg-gray-200 rounded-full appearance-none outline-none cursor-pointer mt-0.5"
            style={{ accentColor: '#10B981' }}
          />
        </div>

        {/* Fact Section: Single-row button opening Popup Modal */}
        <div className="shrink-0 flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => setShowFactModal(true)}
            className="flex-1 min-w-0 h-7 sm:h-8 px-2.5 bg-purple-50 hover:bg-purple-100 border-2 border-dashed border-purple-300 text-purple-950 rounded-lg font-bold text-[11px] sm:text-xs flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
          >
            <span className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <span className="shrink-0">💡</span>
              <span className="truncate min-w-0">
                {explanation.trim() ? `Fact: "${explanation.trim()}"` : 'Add a Fact (Optional)'}
              </span>
            </span>
            <span className="text-[10px] font-bold text-purple-700 shrink-0">
              {explanation.trim() ? 'Edit' : '+'}
            </span>
          </button>
          {explanation.trim() && (
            <button
              type="button"
              onClick={() => setExplanation('')}
              className="h-7 sm:h-8 w-7 sm:w-8 flex items-center justify-center text-xs font-black text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors cursor-pointer shrink-0"
              title="Remove Fact"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Create Game button */}
      <div className="pt-4 shrink-0">
        <GameButton
          onClick={handleCreateSubmit}
          disabled={isCreating}
          color="green"
          className="w-full text-sm sm:text-base py-2.5 sm:py-3 rounded-xl"
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Launching Ballpark...</span>
            </>
          ) : (
            <span>CREATE BALLPARK 🚀</span>
          )}
        </GameButton>
      </div>
    </div>
  );
};
