import { useEffect, useRef, useState } from 'react';
import { HOME_RUN_ROUND_COUNT } from '../../../shared/homeRun/engine';
import type { HomeRunOutcome } from '../../../shared/types/homeRun';
import { GameButton } from '../../components/GameButton';
import { playSound, preloadSounds, unlockAudio, type SoundHandle } from '../sounds';
import { BaseballBat } from './BaseballBat';
import { FullBodySnoo } from './FullBodySnoo';
import { HurlingBall } from './HurlingBall';
import { RoundPips } from './RoundPips';
import { SnooAvatar } from './SnooAvatar';
import { SoundToggleButton } from './SoundToggleButton';

type IntroPanelProps = {
  ladderTitle: string;
  puzzleNumber: number;
  timeLimitMs: number;
  outcomes: readonly HomeRunOutcome[];
  snoovatarUrl?: string | undefined;
  onPlay: () => void;
};

type SwingStage = 'idle' | 'contact' | 'running' | 'phasing';

/**
 * Starting screen:
 * - Bat aims and follows the player's cursor before swinging.
 * - The baseball is continually hurling and spinning in front of the batter.
 * - Clicking "SWING" disables the button, drops the ball into the strike zone,
 *   connects with a solid hit (CRACK!), and transitions smoothly into Round 1.
 * - Colors match the stadium turf, sky, and clay infield.
 */
export const IntroPanel = ({
  timeLimitMs,
  outcomes,
  snoovatarUrl,
  onPlay,
}: IntroPanelProps) => {
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [stage, setStage] = useState<SwingStage>('idle');
  const [ballState, setBallState] = useState<'rising' | 'hurling' | 'hit'>('rising');
  const [isPitching, setIsPitching] = useState(true);
  const [isSwinging, setIsSwinging] = useState(false);
  const [batAngle, setBatAngle] = useState(-30);

  const fieldRef = useRef<HTMLDivElement>(null);
  const batAnchorRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<number[]>([]);
  const runSoundRef = useRef<SoundHandle | null>(null);
  const hasTriggeredPlayRef = useRef(false);

  const resuming = outcomes.length > 0;
  const seconds = Math.round(timeLimitMs / 1000);

  // Initial pitcher delivery animation: Snoo throws ball upwards into the strike zone with wind lines
  useEffect(() => {
    preloadSounds();
    // Play original throw sound when pitcher releases the ball (~180ms into windup)
    const throwTimer = window.setTimeout(() => {
      playSound('throw');
    }, 180);

    const riseTimer = window.setTimeout(() => {
      setBallState('hurling');
      setIsPitching(false);
    }, 880);

    return () => {
      window.clearTimeout(throwTimer);
      window.clearTimeout(riseTimer);
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      runSoundRef.current?.stop();
    };
  }, []);

  // Track cursor position anywhere across the window and point the bat directly at the pointer
  useEffect(() => {
    if (stage !== 'idle' || isSwinging) return;

    const handleWindowPointerMove = (e: globalThis.PointerEvent) => {
      const anchor = batAnchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();

      // Pivot point is at the bat's handle knob
      const pivotX = rect.left + rect.width / 2;
      const pivotY = rect.top + rect.height * 0.9;

      const dx = e.clientX - pivotX;
      const dy = e.clientY - pivotY;

      // In screen coords, dy < 0 is upwards.
      // The bat SVG at 0 deg points straight UP (barrel at top, knob at bottom).
      // Math.atan2(dy, dx) returns -90 deg when pointer is directly UP.
      // Adding +90 deg gives 0 deg (pointing straight at the pointer).
      let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      while (deg > 180) deg -= 360;
      while (deg < -180) deg += 360;

      // Natural batting arc across the interactive field
      deg = Math.max(-110, Math.min(80, deg));
      setBatAngle(deg);
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
    };
  }, [stage, isSwinging]);

  const handleSwing = () => {
    if (isSwinging) return;
    unlockAudio();
    setIsSwinging(true);

    if (resuming) {
      onPlay();
      return;
    }

    // Step 1: Drop ball into strike zone & bat whip (play throw sound as pitch darts in)
    setBallState('hit');
    setStage('contact');
    playSound('throw', { volume: 0.7 });

    // Bat hitting the ball at the moment of contact (~280ms)
    const tHit = window.setTimeout(() => {
      playSound('batHit');
    }, 280);

    // Step 2: Contact hit occurs at ~400ms -> start running sprint & dirt scuffling sound
    const t1 = window.setTimeout(() => {
      setStage('running');
      runSoundRef.current = playSound('snooRun', { loop: true });
    }, 450);

    // Step 3: Phase out container & stop running scuffle
    const t2 = window.setTimeout(() => {
      runSoundRef.current?.stop();
      setStage('phasing');
    }, 1450);

    // Step 4: Complete transition and enter live game
    const t3 = window.setTimeout(() => {
      if (!hasTriggeredPlayRef.current) {
        hasTriggeredPlayRef.current = true;
        onPlay();
      }
    }, 1750);

    timeoutsRef.current = [tHit, t1, t2, t3];
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-between text-center py-1 max-h-full h-full overflow-hidden select-none ${
        stage === 'phasing' ? 'phase-fade-out' : ''
      }`}
    >
      {/* Top Bar with How to Play button on left & Sound Effects Toggle on right */}
      <div className="w-full flex items-center justify-between shrink-0 mb-1 z-30">
        <button
          type="button"
          onClick={() => setShowHowToPlay(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-yellow-200 border-2 border-indigo-950 text-indigo-950 font-black text-xs uppercase tracking-wide cursor-pointer transition-all active:translate-y-0.5 shadow-xs"
          aria-label="How to play"
        >
          <span className="text-sm">❓</span>
          <span>How to play</span>
        </button>

        <SoundToggleButton />
      </div>

      {/* Main Stadium Field Arena: Colors match the outer stadium turf, sky & infield */}
      <div
        ref={fieldRef}
        className="relative w-full flex-1 min-h-[14rem] sm:min-h-[16rem] flex flex-col items-center justify-end my-1 overflow-hidden rounded-2xl border-3 border-indigo-950 select-none touch-none"
      >
        {/* Sky: Sunny blue sky matching Gimme A Ballpark theme */}
        <div className="absolute inset-x-0 top-0 h-[10%] bg-linear-to-b from-[#0A7CD5] to-[#1399FF]" />

        {/* Stadium Bleachers: Distant bleachers with tiny cheering Snoos on the horizon */}
        <div className="absolute top-[2%] inset-x-0 h-[8%] bg-[#0B1E36] border-b border-emerald-950 overflow-hidden pointer-events-none z-5">
          <div className="absolute inset-x-1 bottom-1 flex items-end justify-around">
            {Array.from({ length: 16 }, (_, i) => (
              <FullBodySnoo
                key={i}
                seed={i * 3}
                height={12}
                animation={i % 3 === 0 ? 'bounce' : i % 3 === 1 ? 'sway' : 'wave'}
              />
            ))}
          </div>
          {/* Distant outfield wall line */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-950 border-t border-yellow-400/80" />
        </div>

        {/* Grass: Fills the entire field down from the distant stadium bleachers */}
        <div className="absolute inset-x-0 top-[10%] bottom-0 bg-linear-to-b from-[#1c7e2f] via-[#167027] to-[#0f541c]">
          {/* Mower grass stripes */}
          <div className="absolute inset-0 opacity-15 flex">
            {Array.from({ length: 14 }, (_, i) => (
              <div
                key={i}
                className={`flex-1 h-full ${i % 2 === 0 ? 'bg-black/25' : 'bg-white/25'}`}
              />
            ))}
          </div>
        </div>

        {/* Full Baseball Diamond: Infield Dirt Basepaths, Baselines, and Flat Bases */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Wide Clay Infield Basepath Track connecting all 4 bases */}
          <polygon
            points="50,88 84,50 50,19 16,50"
            fill="none"
            stroke="#b46332"
            strokeWidth="9"
            strokeLinejoin="round"
          />
          {/* Dirt cutouts at Home Plate and Bases */}
          <ellipse cx="50" cy="88" rx="14" ry="8.5" fill="#b46332" />
          <ellipse cx="50" cy="19" rx="6" ry="4" fill="#b46332" />
          <ellipse cx="16" cy="50" rx="6" ry="4" fill="#b46332" />
          <ellipse cx="84" cy="50" rx="6" ry="4" fill="#b46332" />

          {/* Center Infield Grass inside the basepaths */}
          <polygon
            points="50,81 77,50 50,25.5 23,50"
            fill="#167027"
            opacity="0.95"
          />

          {/* Crisp White Chalk Foul Lines extending to the fence & Basepath Lines */}
          <line x1="50" y1="88" x2="2" y2="34" stroke="#ffffff" strokeWidth="1.1" opacity="0.92" />
          <line x1="50" y1="88" x2="98" y2="34" stroke="#ffffff" strokeWidth="1.1" opacity="0.92" />
          <polygon
            points="50,88 84,50 50,19 16,50"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.2"
            opacity="0.95"
          />

          {/* 2nd Base: Flat diamond bag aligned with field perspective */}
          <polygon
            points="50,16.5 52.5,19 50,21.5 47.5,19"
            fill="#ffffff"
            stroke="#1E1B4B"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          <text
            x="50"
            y="19.2"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="2.8"
            fontWeight="900"
            fill="#1E1B4B"
          >
            2
          </text>

          {/* 3rd Base: Flat diamond bag aligned with field perspective */}
          <polygon
            points="16,47.5 18.5,50 16,52.5 13.5,50"
            fill="#ffffff"
            stroke="#1E1B4B"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          <text
            x="16"
            y="50.2"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="2.8"
            fontWeight="900"
            fill="#1E1B4B"
          >
            3
          </text>

          {/* 1st Base: Flat diamond bag aligned with field perspective */}
          <polygon
            points="84,47.5 86.5,50 84,52.5 81.5,50"
            fill="#ffffff"
            stroke="#1E1B4B"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          <text
            x="84"
            y="50.2"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="2.8"
            fontWeight="900"
            fill="#1E1B4B"
          >
            1
          </text>

          {/* Home Base Plate: Regulation pentagon flat on the clay */}
          <polygon
            points="47,85.5 53,85.5 53,88 50,90.5 47,88"
            fill="#ffffff"
            stroke="#1E1B4B"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          <text
            x="50"
            y="87.6"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="2.8"
            fontWeight="900"
            fill="#1E1B4B"
          >
            4
          </text>
        </svg>

        {/* Pitcher's Mound & Snoo Pitcher (In front of 2nd base, centered between Home and 2nd) */}
        <div className="absolute top-[36%] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-15">
          {/* Pitching dirt mound circle (no hovering shadow) */}
          <div className="relative w-22 h-10 rounded-[50%] bg-[#a2542a] border-2 border-[#8d4925] flex items-center justify-center">
            {/* White pitching rubber */}
            <div className="w-5 h-1.5 bg-white rounded-xs border border-slate-400" />
          </div>

          {/* Snoo Pitcher with mitt on hand & windup throwing delivery */}
          <div className={`absolute bottom-3 ${isPitching ? 'pitcher-windup' : ''}`}>
            <SnooAvatar src={undefined} size={44} withMitt={true} />
          </div>
        </div>

        {/* Home plate clay dirt infield crescent: Matches outer stadium clay */}
        <div className="absolute bottom-0 w-80 sm:w-96 h-36 sm:h-40 rounded-[50%] bg-[#a2542a] border-4 border-[#8d4925] pointer-events-none" />

        {/* --- DYNAMIC BASEBALL HURL & HIT (Clickable to swing and start game) --- */}
        <button
          type="button"
          onClick={handleSwing}
          disabled={isSwinging}
          aria-label="Click the pitch to swing and start game"
          title="Click the ball to swing!"
          className={`absolute bottom-[50%] left-[62%] -translate-x-1/2 z-30 p-0 m-0 bg-transparent border-0 outline-none select-none appearance-none transition-transform ${
            isSwinging
              ? 'pointer-events-none cursor-default'
              : 'pointer-events-auto cursor-pointer hover:scale-105 active:scale-95'
          } ${
            ballState === 'rising'
              ? 'ball-hurl-rise'
              : ballState === 'hurling'
              ? 'ball-hurling'
              : 'pitch-and-hit'
          }`}
        >
          <HurlingBall
            size={40}
            windAngle={104}
            showWind={true}
            intensity={ballState === 'hit' ? 'intense' : 'normal'}
            spinning={true}
            spinMode="3d"
            wobble={ballState === 'hurling'}
          />
        </button>

        {/* 2. Contact Hit Explosions (Impact flash + CRACK!! badge timed to moment of contact) */}
        {stage !== 'idle' && (
          <div className="absolute bottom-16 left-[46%] z-40 pointer-events-none -translate-x-1/2 impact-delayed">
            <div className="impact-flash w-24 h-24 rounded-full bg-yellow-300/85 blur-xs" />
            <div className="crack-pop absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black italic text-red-600 bg-yellow-300 px-2.5 py-0.5 rounded-lg border-2 border-white shadow-[0_4px_0_#991b1b] -rotate-6">
                CRACK!!
              </span>
            </div>
          </div>
        )}

        {/* 4. Snoo at Home Plate with Bat (follows cursor when idle) */}
        <div className="relative z-20 pointer-events-none pb-2">
          {stage === 'idle' || stage === 'contact' ? (
            /* Batting Stance: Bat angles smoothly toward mouse cursor */
            <div className="relative w-36 h-36">
              <SnooAvatar
                src={snoovatarUrl}
                size={110}
                className="absolute left-2 bottom-0 drop-shadow-xl"
              />

              {/* Baseball Bat: Pivots around Snoo's hands and tracks the cursor directly */}
              <div
                ref={batAnchorRef}
                className="absolute left-16 bottom-10 w-9 h-26 pointer-events-none"
              >
                <div
                  className={`w-full h-full origin-[18px_104px] ${stage === 'contact' ? 'bat-swing' : ''}`}
                  style={{
                    transform: stage === 'idle' ? `rotate(${batAngle}deg)` : undefined,
                    ['--bat-start' as string]: `${batAngle}deg`,
                  }}
                >
                  <BaseballBat className="w-full h-full drop-shadow-md" />
                </div>
              </div>
            </div>
          ) : (
            /* Running Sprint after dropping the Bat */
            <div className="relative w-48 h-36 intro-sprint">
              {/* Dropped Bat on dirt */}
              <div className="absolute left-2 bottom-2 origin-center bat-drop">
                <BaseballBat className="w-8 h-22 opacity-80" />
              </div>

              {/* Trailing dust clouds */}
              <div className="absolute left-12 bottom-2 dust-cloud text-lg">💨</div>
              <div className="absolute left-10 bottom-4 dust-cloud text-base" style={{ animationDelay: '0.12s' }}>
                💨
              </div>

              {/* Snoo sprinting forward */}
              <div className="absolute left-14 bottom-0 snoo-run">
                <SnooAvatar
                  src={snoovatarUrl}
                  size={110}
                  className="drop-shadow-xl"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA & progress indicator */}
      <div className="flex flex-col items-center gap-2 shrink-0 w-full z-30 mt-1">
        <RoundPips total={HOME_RUN_ROUND_COUNT} outcomes={outcomes} activeRound={outcomes.length} />

        <GameButton
          onClick={handleSwing}
          disabled={isSwinging && !resuming}
          color={isSwinging ? 'yellow' : 'green'}
          className={`py-3.5 px-12 text-xl font-black uppercase tracking-wider w-full max-w-xs shadow-lg transition-all ${
            isSwinging ? 'pointer-events-none opacity-60 cursor-not-allowed scale-95' : 'hover:scale-105 active:scale-95'
          }`}
        >
          {resuming ? 'Resume ⚾' : isSwinging ? 'CRACK! RUN! 💨' : 'SWING! ⚾'}
        </GameButton>

        {resuming && (
          <p className="text-[11px] font-bold text-slate-500">
            Your timer for round {outcomes.length + 1} is still running.
          </p>
        )}
      </div>

      {/* How to Play Modal Overlay */}
      {showHowToPlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-950/60 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="how-to-play-title"
          onClick={() => setShowHowToPlay(false)}
        >
          <div
            className="bg-white rounded-2xl border-3 border-indigo-950 p-5 max-w-sm w-full shadow-2xl flex flex-col gap-3 animate-card-enter text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <SnooAvatar src={snoovatarUrl} size={36} />
                <h2 id="how-to-play-title" className="text-lg font-black uppercase text-indigo-950">
                  How to Play
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowHowToPlay(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-400 font-black text-slate-700 flex items-center justify-center cursor-pointer text-xs"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <ul className="text-xs sm:text-sm font-semibold text-slate-700 space-y-2 py-1">
              <li className="flex items-start gap-2">
                <span className="text-base shrink-0">⚾</span>
                <span>
                  <b>4 rounds of matchups:</b> Choose which of the two numbers is bigger.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-base shrink-0">🎯</span>
                <span>
                  <b>Your cursor is the ball:</b> Move to your pick and click to smash through the glass!
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-base shrink-0">⏱️</span>
                <span>
                  <b>{seconds} seconds per question:</b> If time runs out, the ball falls flat and you strike out.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-base shrink-0">🧠</span>
                <span>
                  <b>Razor-thin margins:</b> Every round gets progressively closer. One wrong answer and you are stranded on base!
                </span>
              </li>
            </ul>

            <button
              type="button"
              onClick={() => setShowHowToPlay(false)}
              className="mt-1 w-full py-2 bg-yellow-400 hover:bg-yellow-300 border-2 border-indigo-950 text-indigo-950 font-black text-sm uppercase rounded-full cursor-pointer transition-transform active:translate-y-0.5"
            >
              Got it, let&apos;s play!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
