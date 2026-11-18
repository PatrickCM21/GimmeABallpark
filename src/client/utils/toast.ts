type ToastItem = {
  message: string;
  icon: string | undefined;
};

const toastQueue: ToastItem[] = [];
let isToastActive = false;
let toastTimeoutId: number | undefined = undefined;
let hideTimeoutId: number | undefined = undefined;

const MIN_TOAST_FONT_SIZE_PX = 11;
const FONT_SIZE_STEP_PX = 1;
const TOAST_DISPLAY_MS = 2400;
const TOAST_EXIT_MS = 280;
const TOAST_QUEUE_GAP_MS = 140;

function isToastOverflowing(toast: HTMLElement, toastText: HTMLElement): boolean {
  return toastText.scrollWidth > toastText.clientWidth + 1 || toast.scrollWidth > toast.clientWidth + 1;
}

/**
 * Shrinks toast text (and switches to compact padding/icon if needed) so the
 * message fits within the viewport without being cut off. Falls back to
 * wrapping at the minimum font size if the message is still too wide.
 */
function fitToastToViewport(toast: HTMLElement, toastText: HTMLElement): void {
  toast.classList.remove('ballpark-toast--compact');
  toastText.style.fontSize = '';
  toastText.style.whiteSpace = 'nowrap';

  if (toastText.clientWidth <= 0 || toast.clientWidth <= 0) {
    return;
  }

  if (!isToastOverflowing(toast, toastText)) {
    return;
  }

  const computedFontSize = parseFloat(window.getComputedStyle(toastText).fontSize);
  const startSize = Number.isFinite(computedFontSize) && computedFontSize > 0 ? computedFontSize : 15;
  let currentSize = startSize;

  while (currentSize > MIN_TOAST_FONT_SIZE_PX && isToastOverflowing(toast, toastText)) {
    currentSize = Math.max(MIN_TOAST_FONT_SIZE_PX, currentSize - FONT_SIZE_STEP_PX);
    toastText.style.fontSize = `${currentSize}px`;
    if (currentSize <= startSize * 0.85) {
      toast.classList.add('ballpark-toast--compact');
    }
  }

  if (isToastOverflowing(toast, toastText)) {
    toast.classList.add('ballpark-toast--compact');
    toastText.style.whiteSpace = 'normal';
  }
}

function handleToastResize(): void {
  if (!isToastActive) return;
  const toast = document.getElementById('ballpark-toast');
  const toastText = document.getElementById('ballpark-toast-text');
  if (toast && toastText && toast.style.display !== 'none') {
    fitToastToViewport(toast, toastText);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', handleToastResize);
}

function displayNextToast(): void {
  if (toastQueue.length === 0) {
    isToastActive = false;
    return;
  }

  const next = toastQueue.shift();
  if (!next) {
    isToastActive = false;
    return;
  }

  const toast = document.getElementById('ballpark-toast');
  const toastText = document.getElementById('ballpark-toast-text');
  const toastIcon = toast?.querySelector('.ballpark-toast-icon');

  if (!toast || !toastText) {
    isToastActive = false;
    return;
  }

  isToastActive = true;
  toastText.textContent = next.message;

  if (toastIcon && toastIcon instanceof HTMLElement) {
    if (next.icon) {
      toastIcon.textContent = next.icon;
      toastIcon.style.display = 'flex';
    } else {
      toastIcon.textContent = '';
      toastIcon.style.display = 'none';
    }
  }

  if (toastTimeoutId !== undefined) {
    window.clearTimeout(toastTimeoutId);
    toastTimeoutId = undefined;
  }
  if (hideTimeoutId !== undefined) {
    window.clearTimeout(hideTimeoutId);
    hideTimeoutId = undefined;
  }

  toast.style.display = 'flex';
  fitToastToViewport(toast, toastText);
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  toastTimeoutId = window.setTimeout(() => {
    toast.classList.remove('visible');
    hideTimeoutId = window.setTimeout(() => {
      if (!toast.classList.contains('visible')) {
        toast.style.display = 'none';
      }
      window.setTimeout(() => {
        displayNextToast();
      }, TOAST_QUEUE_GAP_MS);
    }, TOAST_EXIT_MS);
  }, TOAST_DISPLAY_MS);
}

/**
 * In-game toast notification trigger that slides up from the bottom of the screen.
 * Sequentially queues multiple toasts so none are skipped or overwritten.
 */
export function triggerToast(message: string, icon?: string): void {
  if (toastQueue.length < 6) {
    toastQueue.push({ message, icon });
  }
  if (!isToastActive) {
    displayNextToast();
  }
}

export const showToast = triggerToast;
