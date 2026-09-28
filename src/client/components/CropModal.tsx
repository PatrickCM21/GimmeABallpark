import type { PointerEvent, RefObject } from 'react';

export const CropModal = ({
  showCropModal,
  setShowCropModal,
  cropSrc,
  cropImgDims,
  cropScale,
  cropBaseScale,
  cropPos,
  cropContainerRef,
  cropImageRef,
  fileInputRef,
  handleCropPointerDown,
  handleCropPointerMove,
  handleCropPointerUp,
  handleCropZoomChange,
  handleSaveCrop,
}: {
  showCropModal: boolean;
  setShowCropModal: (show: boolean) => void;
  cropSrc: string;
  cropImgDims: { w: number; h: number };
  cropScale: number;
  cropBaseScale: number;
  cropPos: { x: number; y: number };
  cropContainerRef: RefObject<HTMLDivElement | null>;
  cropImageRef: RefObject<HTMLImageElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleCropPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  handleCropPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
  handleCropPointerUp: (e: PointerEvent<HTMLDivElement>) => void;
  handleCropZoomChange: (val: number) => void;
  handleSaveCrop: () => void;
}) => {
  if (!showCropModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 select-none animate-in fade-in duration-200 touch-none overscroll-none"
      onTouchMove={(e) => {
        if (e.cancelable) e.preventDefault();
      }}
    >
      <div className="bg-white rounded-2xl p-4 sm:p-5 w-full max-w-sm border-3 border-indigo-950 shadow-2xl flex flex-col items-center">
        <div className="w-full flex items-center justify-between mb-2">
          <h2 className="text-base sm:text-lg font-black uppercase text-indigo-950 tracking-wide">
            Crop Question Image
          </h2>
          <button
            type="button"
            onClick={() => setShowCropModal(false)}
            className="text-gray-400 hover:text-gray-700 text-lg font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-[11px] text-gray-500 font-semibold mb-3 text-center">
          This is how your image will appear in the game card.
        </p>

        {cropSrc ? (
          <div className="flex flex-col items-center w-full">
            <div
              ref={cropContainerRef}
              className="w-[260px] h-[130px] rounded-xl border-2 border-indigo-950 overflow-hidden relative cursor-grab active:cursor-grabbing bg-slate-900 shadow-inner touch-none select-none overscroll-none"
              style={{ touchAction: 'none' }}
              onPointerDown={handleCropPointerDown}
              onPointerMove={handleCropPointerMove}
              onPointerUp={handleCropPointerUp}
              onPointerCancel={handleCropPointerUp}
            >
              <img
                ref={cropImageRef}
                src={cropSrc}
                alt="Crop target"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: `${cropImgDims.w}px`,
                  height: `${cropImgDims.h}px`,
                  transformOrigin: '0 0',
                  transform: `translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropScale})`,
                  userSelect: 'none',
                  pointerEvents: 'none',
                  maxWidth: 'none',
                }}
              />
              <div className="absolute inset-0 pointer-events-none border border-white/25 rounded-xl" />
            </div>

            <span className="text-[10px] font-bold text-gray-400 uppercase mt-1.5 tracking-wider">
              Drag to reposition
            </span>

            {/* Zoom Controls */}
            <div className="w-[260px] flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500 font-bold select-none">−</span>
              <input
                type="range"
                min={cropBaseScale}
                max={cropBaseScale * 3}
                step={(cropBaseScale * 2) / 100}
                value={cropScale}
                onChange={(e) => handleCropZoomChange(Number(e.target.value))}
                className="flex-1 accent-indigo-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
              />
              <span className="text-xs text-gray-500 font-bold select-none">+</span>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-[260px] h-[130px] rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/60 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-100/70 transition-colors p-4 text-center shadow-xs"
          >
            <span className="text-3xl mb-1">📷</span>
            <span className="text-xs font-bold text-indigo-950 uppercase">Choose Image File</span>
            <span className="text-[10px] text-gray-500 mt-0.5">Tap here to select an image</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full flex items-center justify-between gap-2 mt-4 pt-2 border-t border-gray-100">
          {cropSrc ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Change Image
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCropModal(false)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {cropSrc && (
              <button
                type="button"
                onClick={handleSaveCrop}
                className="px-4 py-1.5 text-xs font-black uppercase rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-xs cursor-pointer"
              >
                Save Crop
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
