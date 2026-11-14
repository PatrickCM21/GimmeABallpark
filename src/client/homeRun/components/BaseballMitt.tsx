export const BaseballMitt = ({ className = '', size = 28 }: { className?: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    className={`overflow-visible select-none pointer-events-none drop-shadow-md ${className}`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="mittLeatherGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#c26a27" />
        <stop offset="45%" stopColor="#9a4d16" />
        <stop offset="100%" stopColor="#683109" />
      </linearGradient>
      <linearGradient id="mittPocketGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#542504" />
        <stop offset="100%" stopColor="#3d1901" />
      </linearGradient>
    </defs>

    {/* Webbing straps between thumb and fingers */}
    <g stroke="#3d1901" strokeWidth="1.2" strokeLinecap="round">
      <line x1="12" y1="9" x2="18" y2="10" />
      <line x1="12" y1="12" x2="18" y2="13" />
      <line x1="12" y1="15" x2="17" y2="16" />
      <line x1="15" y1="8" x2="15" y2="17" />
    </g>

    {/* Main Leather Glove / Mitt Body (Thumb, Pocket, Fingers) */}
    <path
      d="M 6 18 C 5 13, 8 7, 13 6 C 16 5.5, 20 7, 22 9 C 25 11, 27 15, 26 21 C 25 26, 21 28, 16 28 C 10 28, 7 24, 6 18 Z"
      fill="url(#mittLeatherGrad)"
      stroke="#381903"
      strokeWidth="1.5"
    />

    {/* Deep Catch Pocket */}
    <ellipse cx="16" cy="18" rx="6" ry="5.5" fill="url(#mittPocketGrad)" opacity="0.85" />

    {/* Finger segments stitching lines */}
    <path
      d="M 18 8 C 19 12, 20 16, 21 20"
      stroke="#e0a96d"
      strokeWidth="1"
      strokeDasharray="2 1.5"
      fill="none"
    />
    <path
      d="M 22 10 C 23 14, 23 18, 23 22"
      stroke="#e0a96d"
      strokeWidth="1"
      strokeDasharray="2 1.5"
      fill="none"
    />

    {/* Thumb ridge */}
    <path
      d="M 10 8 C 8 11, 8 16, 10 20"
      stroke="#e0a96d"
      strokeWidth="1"
      strokeDasharray="2 1.5"
      fill="none"
    />

    {/* Wrist strap & buckle */}
    <path
      d="M 11 27 C 14 28.5, 18 28.5, 21 27"
      stroke="#381903"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
    />
    <rect x="15" y="26" width="3" height="2" rx="0.5" fill="#eab308" />
  </svg>
);
