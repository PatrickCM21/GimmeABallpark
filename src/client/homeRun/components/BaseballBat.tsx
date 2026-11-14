import type { CSSProperties } from 'react';

type BaseballBatProps = {
  className?: string;
  style?: CSSProperties;
};

/**
 * High-definition vector baseball bat with realistic wood grain,
 * 3D cylindrical lighting, grip tape wrapping, and sweet-spot maker's mark.
 */
export const BaseballBat = ({ className = 'w-8 h-24', style }: BaseballBatProps) => {
  return (
    <svg
      viewBox="0 0 36 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none pointer-events-none drop-shadow-md ${className}`}
      style={style}
      aria-hidden="true"
    >
      <defs>
        {/* 3D cylindrical lighting on the maple wood barrel */}
        <linearGradient id="batWoodGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#451A03" />
          <stop offset="18%" stopColor="#92400E" />
          <stop offset="42%" stopColor="#FDE68A" />
          <stop offset="68%" stopColor="#D97706" />
          <stop offset="88%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#5B21B6" stopOpacity="0.4" />
        </linearGradient>

        {/* Grip tape texture gradient */}
        <linearGradient id="batGripGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="35%" stopColor="#475569" />
          <stop offset="70%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* Gloss reflection running down the barrel */}
        <linearGradient id="batGloss" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Gold trim ring */}
        <linearGradient id="goldTrim" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="50%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
      </defs>

      {/* Main bat body: Barrel -> Taper -> Handle */}
      {/* Path outline starts at top-left barrel, down taper to knob, around knob, up right side */}
      <path
        d="
          M 10 8
          Q 9 6 18 6
          Q 27 6 26 8
          L 26 44
          Q 25 68 20.5 82
          L 20.5 118
          L 15.5 118
          L 15.5 82
          Q 11 68 10 44
          Z
        "
        fill="url(#batWoodGradient)"
        stroke="#451A03"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Barrel cupped top cap */}
      <ellipse cx="18" cy="7.5" rx="8" ry="2.2" fill="#78350F" stroke="#451A03" strokeWidth="0.8" />
      <ellipse cx="18" cy="7.5" rx="5.5" ry="1.2" fill="#451A03" />

      {/* Wood grain subtle streaks */}
      <path
        d="M 13 14 Q 14 30 14 50 M 23 12 Q 22 34 22 48 M 16 20 Q 15 36 17 56"
        stroke="#78350F"
        strokeWidth="0.6"
        strokeOpacity="0.4"
        strokeDasharray="6 3"
        fill="none"
      />

      {/* Brand stamp / Sweet-spot logo (oval medal with 'BP' star) */}
      <g transform="translate(18, 30)">
        <ellipse cx="0" cy="0" rx="6" ry="9" fill="#78350F" fillOpacity="0.35" stroke="#451A03" strokeWidth="0.7" />
        <ellipse cx="0" cy="0" rx="4.8" ry="7.5" fill="none" stroke="#FDE68A" strokeWidth="0.5" strokeOpacity="0.8" />
        {/* Star in logo */}
        <path
          d="M 0 -3.5 L 0.9 -1.2 L 3.2 -1 L 1.5 0.5 L 2 2.8 L 0 1.6 L -2 2.8 L -1.5 0.5 L -3.2 -1 L -0.9 -1.2 Z"
          fill="#FDE68A"
        />
        {/* Text 'PRO' below star */}
        <text
          x="0"
          y="4.8"
          fontSize="2.4"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
          fill="#FDE68A"
          textAnchor="middle"
          letterSpacing="0.4"
        >
          BALLPARK
        </text>
      </g>

      {/* Gloss reflection stripe on barrel */}
      <path
        d="M 14.5 10 L 16 10 L 16 52 L 14.5 52 Z"
        fill="url(#batGloss)"
        opacity="0.6"
      />

      {/* Gold accent collar between taper and grip */}
      <rect x="15" y="80.5" width="6" height="2" rx="0.5" fill="url(#goldTrim)" stroke="#451A03" strokeWidth="0.5" />

      {/* Grip tape section */}
      <rect
        x="15.2"
        y="82.5"
        width="5.6"
        height="35.5"
        fill="url(#batGripGradient)"
        stroke="#0F172A"
        strokeWidth="0.6"
      />

      {/* Diagonal athletic grip tape wrap seams */}
      <g stroke="#0F172A" strokeWidth="0.8" strokeLinecap="round" opacity="0.9">
        <line x1="15.2" y1="86" x2="20.8" y2="89" />
        <line x1="15.2" y1="91" x2="20.8" y2="94" />
        <line x1="15.2" y1="96" x2="20.8" y2="99" />
        <line x1="15.2" y1="101" x2="20.8" y2="104" />
        <line x1="15.2" y1="106" x2="20.8" y2="109" />
        <line x1="15.2" y1="111" x2="20.8" y2="114" />
        <line x1="15.2" y1="115" x2="20.8" y2="117.5" />
      </g>

      {/* Tape highlight edges for 3D wrapped look */}
      <g stroke="#94A3B8" strokeWidth="0.4" strokeLinecap="round" opacity="0.45">
        <line x1="15.2" y1="86.8" x2="20.8" y2="89.8" />
        <line x1="15.2" y1="91.8" x2="20.8" y2="94.8" />
        <line x1="15.2" y1="96.8" x2="20.8" y2="99.8" />
        <line x1="15.2" y1="101.8" x2="20.8" y2="104.8" />
        <line x1="15.2" y1="106.8" x2="20.8" y2="109.8" />
        <line x1="15.2" y1="111.8" x2="20.8" y2="114.8" />
      </g>

      {/* Knob flared base */}
      <ellipse
        cx="18"
        cy="120"
        rx="6"
        ry="3"
        fill="url(#batWoodGradient)"
        stroke="#451A03"
        strokeWidth="1.1"
      />
      <ellipse
        cx="18"
        cy="120.5"
        rx="3.5"
        ry="1.4"
        fill="#92400E"
      />
    </svg>
  );
};
