import type { HomeRunOutcome } from '../../../shared/types/homeRun';

type OutcomeBadgeProps = {
  outcome: HomeRunOutcome | undefined;
  className?: string;
};

/**
 * High-definition vector badge for question results:
 * - Green tick with smooth lines and curves for correct answers.
 * - Red cross with smooth rounded lines for wrong answers.
 * - Amber clock with smooth curves for timeout.
 * - En dash if the round was not reached.
 */
export const OutcomeBadge = ({ outcome, className = 'w-5 h-5' }: OutcomeBadgeProps) => {
  if (!outcome) {
    return (
      <span className="text-slate-400 font-bold text-sm select-none" aria-label="Not reached">
        –
      </span>
    );
  }

  if (outcome === 'correct') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="Correct"
        role="img"
      >
        <path
          d="M 4.75 12.5 C 6.2 14 7.6 15.6 9.5 17.5 C 13.2 13 16.8 8.5 19.75 5.5"
          stroke="#16a34a"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (outcome === 'wrong') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="Wrong"
        role="img"
      >
        <path
          d="M 6 6 L 18 18 M 18 6 L 6 18"
          stroke="#dc2626"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Timeout outcome
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Out of time"
      role="img"
    >
      <circle cx="12" cy="12" r="9" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M 12 7 V 12 L 15.5 14"
        stroke="#d97706"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
