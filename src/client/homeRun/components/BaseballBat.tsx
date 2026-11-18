import type { CSSProperties } from 'react';
import type { BatId } from '../../../shared/types/shop';

export type BaseballBatProps = {
  batId?: BatId | string | undefined;
  className?: string;
  style?: CSSProperties;
};

const BAT_BODY_PATH = `
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
`;

const ClassicWoodBat = () => (
  <>
    <defs>
      <linearGradient id="batWoodGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#451A03" />
        <stop offset="18%" stopColor="#92400E" />
        <stop offset="42%" stopColor="#FDE68A" />
        <stop offset="68%" stopColor="#D97706" />
        <stop offset="88%" stopColor="#B45309" />
        <stop offset="100%" stopColor="#5B21B6" stopOpacity="0.4" />
      </linearGradient>

      <linearGradient id="batGripGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#1E293B" />
        <stop offset="35%" stopColor="#475569" />
        <stop offset="70%" stopColor="#334155" />
        <stop offset="100%" stopColor="#0F172A" />
      </linearGradient>

      <linearGradient id="batGloss" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
        <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>

      <linearGradient id="goldTrim" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#B45309" />
        <stop offset="50%" stopColor="#FDE047" />
        <stop offset="100%" stopColor="#92400E" />
      </linearGradient>
    </defs>

    <path
      d={BAT_BODY_PATH}
      fill="url(#batWoodGradient)"
      stroke="#451A03"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />

    <ellipse cx="18" cy="7.5" rx="8" ry="2.2" fill="#78350F" stroke="#451A03" strokeWidth="0.8" />
    <ellipse cx="18" cy="7.5" rx="5.5" ry="1.2" fill="#451A03" />

    <path
      d="M 13 14 Q 14 30 14 50 M 23 12 Q 22 34 22 48 M 16 20 Q 15 36 17 56"
      stroke="#78350F"
      strokeWidth="0.6"
      strokeOpacity="0.4"
      strokeDasharray="6 3"
      fill="none"
    />

    <g transform="translate(18, 30)">
      <ellipse cx="0" cy="0" rx="6" ry="9" fill="#78350F" fillOpacity="0.35" stroke="#451A03" strokeWidth="0.7" />
      <ellipse cx="0" cy="0" rx="4.8" ry="7.5" fill="none" stroke="#FDE68A" strokeWidth="0.5" strokeOpacity="0.8" />
      <path
        d="M 0 -3.5 L 0.9 -1.2 L 3.2 -1 L 1.5 0.5 L 2 2.8 L 0 1.6 L -2 2.8 L -1.5 0.5 L -3.2 -1 L -0.9 -1.2 Z"
        fill="#FDE68A"
      />
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

    <path d="M 14.5 10 L 16 10 L 16 52 L 14.5 52 Z" fill="url(#batGloss)" opacity="0.6" />

    <rect x="15" y="80.5" width="6" height="2" rx="0.5" fill="url(#goldTrim)" stroke="#451A03" strokeWidth="0.5" />

    <rect
      x="15.2"
      y="82.5"
      width="5.6"
      height="35.5"
      fill="url(#batGripGradient)"
      stroke="#0F172A"
      strokeWidth="0.6"
    />

    <g stroke="#0F172A" strokeWidth="0.8" strokeLinecap="round" opacity="0.9">
      <line x1="15.2" y1="86" x2="20.8" y2="89" />
      <line x1="15.2" y1="91" x2="20.8" y2="94" />
      <line x1="15.2" y1="96" x2="20.8" y2="99" />
      <line x1="15.2" y1="101" x2="20.8" y2="104" />
      <line x1="15.2" y1="106" x2="20.8" y2="109" />
      <line x1="15.2" y1="111" x2="20.8" y2="114" />
      <line x1="15.2" y1="115" x2="20.8" y2="117.5" />
    </g>

    <g stroke="#94A3B8" strokeWidth="0.4" strokeLinecap="round" opacity="0.45">
      <line x1="15.2" y1="86.8" x2="20.8" y2="89.8" />
      <line x1="15.2" y1="91.8" x2="20.8" y2="94.8" />
      <line x1="15.2" y1="96.8" x2="20.8" y2="99.8" />
      <line x1="15.2" y1="101.8" x2="20.8" y2="104.8" />
      <line x1="15.2" y1="106.8" x2="20.8" y2="109.8" />
      <line x1="15.2" y1="111.8" x2="20.8" y2="114.8" />
    </g>

    <ellipse
      cx="18"
      cy="120"
      rx="6"
      ry="3"
      fill="url(#batWoodGradient)"
      stroke="#451A03"
      strokeWidth="1.1"
    />
    <ellipse cx="18" cy="120.5" rx="3.5" ry="1.4" fill="#92400E" />
  </>
);

const MetalBat = () => (
  <>
    <defs>
      <linearGradient id="batMetalBarrel" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#1E293B" />
        <stop offset="20%" stopColor="#94A3B8" />
        <stop offset="42%" stopColor="#F8FAFC" />
        <stop offset="56%" stopColor="#CBD5E1" />
        <stop offset="78%" stopColor="#475569" />
        <stop offset="100%" stopColor="#0F172A" />
      </linearGradient>

      <linearGradient id="batMetalAccent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#0284C7" />
        <stop offset="45%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#0369A1" />
      </linearGradient>

      <linearGradient id="batMetalShine" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.92" />
        <stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>

      <linearGradient id="batMetalGrip" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#090D16" />
        <stop offset="40%" stopColor="#334155" />
        <stop offset="100%" stopColor="#0F172A" />
      </linearGradient>
    </defs>

    {/* Brushed aluminum alloy body */}
    <path
      d={BAT_BODY_PATH}
      fill="url(#batMetalBarrel)"
      stroke="#0F172A"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />

    {/* Molded composite end cap */}
    <ellipse cx="18" cy="7.5" rx="8" ry="2.3" fill="#0F172A" stroke="#1E293B" strokeWidth="0.8" />
    <ellipse cx="18" cy="7.5" rx="5.2" ry="1.2" fill="#334155" />

    {/* Anodized blue & red pro alloy barrel stripes */}
    <rect x="10.2" y="13" width="15.6" height="2.4" fill="url(#batMetalAccent)" opacity="0.9" />
    <rect x="10.2" y="16.2" width="15.6" height="1.1" fill="#EF4444" opacity="0.9" />
    <rect x="10.4" y="42.5" width="15.2" height="1.1" fill="#EF4444" opacity="0.9" />
    <rect x="10.5" y="44.3" width="15" height="2.2" fill="url(#batMetalAccent)" opacity="0.9" />

    {/* Alloy spec emblem */}
    <g transform="translate(18, 29.5)">
      <rect
        x="-6.2"
        y="-7.5"
        width="12.4"
        height="15"
        rx="2.5"
        fill="#0F172A"
        fillOpacity="0.78"
        stroke="#38BDF8"
        strokeWidth="0.7"
      />
      {/* Lightning bolt icon */}
      <path d="M 0.8 -5.2 L -2.2 -0.5 L 0.2 -0.5 L -1 4.2 L 2.4 -1.2 L 0 -1.2 Z" fill="#FACC15" />
      <text
        x="0"
        y="6.2"
        fontSize="2.7"
        fontWeight="900"
        fontFamily="system-ui, sans-serif"
        fill="#F8FAFC"
        textAnchor="middle"
        letterSpacing="0.4"
      >
        ALLOY
      </text>
    </g>

    {/* Specular chrome reflection */}
    <path d="M 13.8 9.5 L 15.8 9.5 L 15.8 66 L 14.3 66 Z" fill="url(#batMetalShine)" opacity="0.8" />

    {/* Chrome collar ring */}
    <rect x="15" y="80.5" width="6" height="2" rx="0.5" fill="#38BDF8" stroke="#0F172A" strokeWidth="0.6" />

    {/* Perforated pro synthetic grip */}
    <rect
      x="15.2"
      y="82.5"
      width="5.6"
      height="35.5"
      fill="url(#batMetalGrip)"
      stroke="#0F172A"
      strokeWidth="0.7"
    />

    <g stroke="#38BDF8" strokeWidth="0.55" strokeLinecap="round" opacity="0.75">
      <line x1="15.2" y1="86" x2="20.8" y2="89" />
      <line x1="15.2" y1="91" x2="20.8" y2="94" />
      <line x1="15.2" y1="96" x2="20.8" y2="99" />
      <line x1="15.2" y1="101" x2="20.8" y2="104" />
      <line x1="15.2" y1="106" x2="20.8" y2="109" />
      <line x1="15.2" y1="111" x2="20.8" y2="114" />
      <line x1="15.2" y1="115" x2="20.8" y2="117.5" />
    </g>

    {/* Solid steel knob */}
    <ellipse
      cx="18"
      cy="120"
      rx="6"
      ry="3"
      fill="url(#batMetalBarrel)"
      stroke="#0F172A"
      strokeWidth="1.1"
    />
    <ellipse cx="18" cy="120.5" rx="3.4" ry="1.3" fill="#475569" />
  </>
);

const ZombieKillerBat = () => (
  <>
    <defs>
      <linearGradient id="batZombieWood" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#1C0F06" />
        <stop offset="22%" stopColor="#4A2511" />
        <stop offset="48%" stopColor="#854D27" />
        <stop offset="76%" stopColor="#3E1F0D" />
        <stop offset="100%" stopColor="#1A0D04" />
      </linearGradient>

      <linearGradient id="batZombieNail" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#F1F5F9" />
        <stop offset="45%" stopColor="#94A3B8" />
        <stop offset="100%" stopColor="#334155" />
      </linearGradient>

      <linearGradient id="batZombieCloth" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#A8A29E" />
        <stop offset="45%" stopColor="#F5F5F4" />
        <stop offset="80%" stopColor="#D6D3D1" />
        <stop offset="100%" stopColor="#78716C" />
      </linearGradient>
    </defs>

    {/* Left side of the iron nail (Nail Head & Shaft entering the left side of the barrel) */}
    <g>
      {/* Nail shaft entering barrel */}
      <polygon
        points="2.5,27 10.5,23.2 11.5,26.2 3.5,30"
        fill="url(#batZombieNail)"
        stroke="#0F172A"
        strokeWidth="0.85"
        strokeLinejoin="round"
      />
      {/* Flat forged iron nail head */}
      <ellipse
        cx="2.6"
        cy="28.7"
        rx="1.6"
        ry="3.6"
        transform="rotate(-24 2.6 28.7)"
        fill="#64748B"
        stroke="#0F172A"
        strokeWidth="0.9"
      />
    </g>

    {/* Main weathered apocalypse ash wood bat body */}
    <path
      d={BAT_BODY_PATH}
      fill="url(#batZombieWood)"
      stroke="#1C0F06"
      strokeWidth="1.25"
      strokeLinejoin="round"
    />

    {/* Cupped dark top cap */}
    <ellipse cx="18" cy="7.5" rx="8" ry="2.2" fill="#291507" stroke="#1C0F06" strokeWidth="0.8" />
    <ellipse cx="18" cy="7.5" rx="5.5" ry="1.2" fill="#1C0F06" />

    {/* Crimson apocalypse splatter & biohazard stain on upper barrel */}
    <path
      d="M 10.4 10 Q 14 17 16 14 Q 18 20 21 15 Q 23 19 25.6 12 L 25.8 8.5 Q 18 7 10.2 8.5 Z"
      fill="#991B1B"
      opacity="0.72"
    />
    <circle cx="14.5" cy="21" r="1.3" fill="#B91C1C" opacity="0.85" />
    <circle cx="21.5" cy="25" r="1.6" fill="#991B1B" opacity="0.8" />
    <circle cx="19" cy="28.5" r="0.9" fill="#DC2626" opacity="0.75" />

    {/* Wood grain & battle cracks */}
    <path
      d="M 11 24.5 L 15.5 22.5 M 11 25 L 14.5 28.5 M 25 18.5 L 20.5 16 M 25 19.5 L 21.5 23.5"
      stroke="#1C0F06"
      strokeWidth="0.85"
      strokeLinecap="round"
    />

    {/* Entry & Exit puncture shadows on the barrel surface */}
    <ellipse cx="10.8" cy="24.6" rx="1.2" ry="2" fill="#0F172A" />
    <ellipse cx="25.2" cy="18.2" rx="1.3" ry="2.1" fill="#0F172A" />

    {/* Right side of the iron nail: Razor-sharp steel spike piercing out the right side of the barrel! */}
    <g>
      <polygon
        points="24.6,16.5 35.8,12.2 25.6,20.1"
        fill="url(#batZombieNail)"
        stroke="#0F172A"
        strokeWidth="0.85"
        strokeLinejoin="round"
      />
      {/* Bright metallic bevel gleam along the spike */}
      <line x1="25" y1="17.4" x2="34.2" y2="13.1" stroke="#FFFFFF" strokeWidth="0.65" opacity="0.9" />
      {/* Crimson tip on the nail point */}
      <polygon points="31.5,13.8 35.8,12.2 32.1,15.2" fill="#DC2626" />
    </g>

    {/* Secondary smaller nail jutting from lower barrel left */}
    <g>
      <polygon
        points="11.2,36.5 2.2,33.2 10.6,39.4"
        fill="url(#batZombieNail)"
        stroke="#0F172A"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <ellipse cx="11.1" cy="38" rx="1.1" ry="1.6" fill="#1C0F06" />
    </g>

    {/* Criss-cross barbed wire / survival wire around barrel */}
    <g stroke="#CBD5E1" strokeWidth="0.85" strokeLinecap="round">
      <line x1="10.2" y1="43" x2="25.8" y2="48" />
      <line x1="10.4" y1="49" x2="25.6" y2="43.5" />
      {/* Barbs */}
      <line x1="15" y1="43.5" x2="16.8" y2="46.2" stroke="#F8FAFC" strokeWidth="0.9" />
      <line x1="20.5" y1="44.2" x2="22" y2="47" stroke="#F8FAFC" strokeWidth="0.9" />
    </g>

    {/* Red hazard warning band */}
    <rect x="14.8" y="80" width="6.4" height="2.4" rx="0.5" fill="#DC2626" stroke="#1C0F06" strokeWidth="0.6" />

    {/* Tattered survival cloth bandage grip wrap */}
    <rect
      x="15"
      y="82.4"
      width="6"
      height="35.6"
      fill="url(#batZombieCloth)"
      stroke="#292524"
      strokeWidth="0.7"
    />
    <g stroke="#57534E" strokeWidth="0.85" strokeLinecap="round">
      <line x1="15" y1="86" x2="21" y2="88.5" />
      <line x1="15" y1="91" x2="21" y2="89.5" />
      <line x1="15" y1="95.5" x2="21" y2="98" />
      <line x1="15" y1="101" x2="21" y2="103.5" />
      <line x1="15" y1="106.5" x2="21" y2="105" />
      <line x1="15" y1="111.5" x2="21" y2="114" />
      <line x1="15" y1="116" x2="21" y2="117.5" />
    </g>

    {/* Weathered knob */}
    <ellipse
      cx="18"
      cy="120"
      rx="6"
      ry="3"
      fill="url(#batZombieWood)"
      stroke="#1C0F06"
      strokeWidth="1.1"
    />
    <ellipse cx="18" cy="120.5" rx="3.5" ry="1.4" fill="#4A2511" />
  </>
);

const INFLATABLE_CONE_PATH = `
  M 6 14
  C 6 6.5, 11 4.5, 18 4.5
  C 25 4.5, 30 6.5, 30 14
  C 30 36, 26.2 74, 22 108
  L 14 108
  C 9.8 74, 6 36, 6 14
  Z
`;

const InflatableBat = () => (
  <>
    <defs>
      {/* Vibrant glossy red-orange PVC vinyl cylindrical shading matching the reference photo */}
      <linearGradient id="batInflatableBody" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#B91C1C" />
        <stop offset="18%" stopColor="#EF4444" />
        <stop offset="52%" stopColor="#FF3B0F" />
        <stop offset="72%" stopColor="#FF7A59" />
        <stop offset="86%" stopColor="#EF4444" />
        <stop offset="100%" stopColor="#991B1B" />
      </linearGradient>

      {/* Specular vertical plastic reflection running down the right-center of the inflated tube */}
      <linearGradient id="batVinylHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
        <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.65" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>

      {/* Golden yellow comic lettering gradient */}
      <linearGradient id="batPowLetters" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="45%" stopColor="#FACC15" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>

      {/* Clip path matching the conical inflatable body so the handle wrap hugs the contour */}
      <clipPath id="batInflatableClip">
        <path d={INFLATABLE_CONE_PATH} />
      </clipPath>
    </defs>

    {/* Clear translucent plastic inflation nozzle & T-cap at the very bottom tip of the knob */}
    <g>
      {/* Valve stem */}
      <rect
        x="16.6"
        y="117.5"
        width="2.8"
        height="6.2"
        rx="0.6"
        fill="#F1F5F9"
        fillOpacity="0.88"
        stroke="#94A3B8"
        strokeWidth="0.65"
      />
      {/* Inner air channel */}
      <line x1="18" y1="118" x2="18" y2="123.5" stroke="#CBD5E1" strokeWidth="0.8" />
      {/* Valve T-stopper cap */}
      <rect
        x="14.8"
        y="123.2"
        width="6.4"
        height="2"
        rx="0.9"
        fill="#F8FAFC"
        stroke="#94A3B8"
        strokeWidth="0.65"
      />
    </g>

    {/* Wide conical inflatable vinyl body */}
    <path
      d={INFLATABLE_CONE_PATH}
      fill="url(#batInflatableBody)"
      stroke="#991B1B"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />

    {/* Top dome pinched vinyl gather pleats (characteristic of real inflatable bats) */}
    <g stroke="#991B1B" strokeWidth="0.65" strokeLinecap="round" opacity="0.55">
      <path d="M 12 5.4 Q 12.5 8.5 13 11" fill="none" />
      <path d="M 15.5 4.8 Q 15.8 8 16 10.5" fill="none" />
      <path d="M 20.5 4.8 Q 20.2 8 20 10.5" fill="none" />
      <path d="M 24 5.4 Q 23.5 8.5 23 11" fill="none" />
    </g>

    {/* Printed Navy & Multi-Stripe Grip Band near the narrow neck (clipped to cone contour) */}
    <g clipPath="url(#batInflatableClip)">
      {/* Dark navy grip sleeve */}
      <path
        d="M 10 83 Q 18 80.5 26 83 L 26 107.5 L 10 107.5 Z"
        fill="#0F172A"
      />
      {/* Curved diagonal red-orange & yellow wrap stripes matching reference photo */}
      <g fill="none" strokeLinecap="round">
        <path d="M 10 85.5 Q 18 82.5 26 87.5" stroke="#EF4444" strokeWidth="2.1" />
        <path d="M 10 85.5 Q 18 82.5 26 87.5" stroke="#FACC15" strokeWidth="0.95" />

        <path d="M 10 90 Q 18 87 26 92" stroke="#EF4444" strokeWidth="2.1" />
        <path d="M 10 90 Q 18 87 26 92" stroke="#FACC15" strokeWidth="0.95" />

        <path d="M 10 94.5 Q 18 91.5 26 96.5" stroke="#EF4444" strokeWidth="2.1" />
        <path d="M 10 94.5 Q 18 91.5 26 96.5" stroke="#FACC15" strokeWidth="0.95" />

        <path d="M 10 99 Q 18 96 26 101" stroke="#EF4444" strokeWidth="2.1" />
        <path d="M 10 99 Q 18 96 26 101" stroke="#FACC15" strokeWidth="0.95" />

        <path d="M 10 103.5 Q 18 100.5 26 105.5" stroke="#EF4444" strokeWidth="2.1" />
        <path d="M 10 103.5 Q 18 100.5 26 105.5" stroke="#FACC15" strokeWidth="0.95" />
      </g>
      {/* Tall Vertical Spiky Comic Starburst & Vertical "POW!" printed on the barrel */}
      <g>
        {/* Long vertical spiky orange comic burst centered inside the barrel */}
        <polygon
          points="
            18,11
            19.8,19.5
            23.2,14
            21.6,24
            25.2,22.5
            22.8,30.5
            25.6,34
            22.6,39.5
            25.2,45
            22.2,50
            24.4,56.5
            21.2,60
            22.5,68
            19.5,64.5
            18,71.5
            16.5,64.5
            13.5,68
            14.8,60
            11.6,56.5
            13.8,50
            10.8,45
            13.4,39.5
            10.4,34
            13.2,30.5
            10.8,22.5
            14.4,24
            12.8,14
            16.2,19.5
          "
          fill="#FF6B00"
          stroke="#0F172A"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />

        {/* Vertical "POW!" lettering centered at x=18, y=39 along the barrel */}
        {/* 1. Deep 3D block shadow layer */}
        <g transform="translate(17.1, 39.8) rotate(90)">
          <text
            x="0"
            y="4.1"
            fontSize="11.5"
            fontWeight="900"
            fontFamily="Impact, 'Arial Black', system-ui, sans-serif"
            fill="#0F172A"
            stroke="#0F172A"
            strokeWidth="1.9"
            strokeLinejoin="round"
            paintOrder="stroke"
            textAnchor="middle"
            letterSpacing="0.5"
          >
            POW!
          </text>
        </g>

        {/* 2. Bright golden-yellow foreground comic letters */}
        <g transform="translate(18.2, 39) rotate(90)">
          <text
            x="0"
            y="4.1"
            fontSize="11.5"
            fontWeight="900"
            fontFamily="Impact, 'Arial Black', system-ui, sans-serif"
            fill="url(#batPowLetters)"
            stroke="#0F172A"
            strokeWidth="1.05"
            strokeLinejoin="round"
            paintOrder="stroke"
            textAnchor="middle"
            letterSpacing="0.5"
          >
            POW!
          </text>
        </g>

        {/* Comic accent droplet next to the exclamation point */}
        <ellipse
          cx="13.2"
          cy="62"
          rx="1.1"
          ry="1.9"
          fill="#FACC15"
          stroke="#0F172A"
          strokeWidth="0.8"
        />
      </g>
    </g>

    {/* Full-length vertical cylindrical white vinyl shine (gives 3D glossy inflated tube look) */}
    <path
      d="M 21.5 8 C 23.2 8, 23.5 38, 20.4 106 L 18.6 106 C 21.2 38, 20.8 8, 21.5 8 Z"
      fill="url(#batVinylHighlight)"
      opacity="0.7"
    />

    {/* Chubby donut-shaped inflatable vinyl knob matching the body color */}
    <rect
      x="10.2"
      y="108"
      width="15.6"
      height="9.5"
      rx="4.6"
      fill="url(#batInflatableBody)"
      stroke="#991B1B"
      strokeWidth="1.1"
    />
    {/* Heat-sealed horizontal middle seam around the inflatable knob */}
    <line
      x1="10.8"
      y1="112.8"
      x2="25.2"
      y2="112.8"
      stroke="#991B1B"
      strokeWidth="0.65"
      opacity="0.65"
    />
    {/* Glossy vinyl reflection on top of the knob */}
    <ellipse cx="19.5" cy="110.3" rx="4.2" ry="1.1" fill="#FFFFFF" opacity="0.55" />
  </>
);

/**
 * High-definition vector baseball bat supporting all 4 unlockable bat skins:
 * - 'default': Classic Wood
 * - 'metal': Brushed Aluminum Alloy (50 Bases)
 * - 'zombie_killer': Apocalypse Wood Bat with Iron Nail driven through it (100 Bases)
 * - 'inflatable': Carnival Vinyl Bat with "POW!" Starburst & Air Nozzle (200 Bases)
 */
export const BaseballBat = ({ batId = 'default', className = 'w-8 h-24', style }: BaseballBatProps) => {
  return (
    <svg
      viewBox="0 0 36 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      overflow="visible"
      className={`select-none pointer-events-none drop-shadow-md ${className}`}
      style={style}
      aria-hidden="true"
    >
      {batId === 'metal' ? (
        <MetalBat />
      ) : batId === 'zombie_killer' ? (
        <ZombieKillerBat />
      ) : batId === 'inflatable' ? (
        <InflatableBat />
      ) : (
        <ClassicWoodBat />
      )}
    </svg>
  );
};
