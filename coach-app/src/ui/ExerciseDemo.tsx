import { useEffect, useMemo, useRef, useState } from 'react';
import type { Traits } from '../types';
import {
  BARBELL_RADIUS, DUMBBELL_RADIUS, GROUND_Y, HEAD_RADIUS, VIEWBOX,
  buildMovement, lerpSpec, solve, type Movement, type Skeleton,
} from '../engine/poses';

const CYCLE_MS = 3200;
const smooth = (x: number) => x * x * (3 - 2 * x);

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

function Figure({ m, k }: { m: Movement; k: Skeleton }) {
  const line = (a: { x: number; y: number }, b: { x: number; y: number }, w = 5) => (
    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={w} strokeLinecap="round" />
  );
  const imp = m.implementAt === 'shoulder' ? k.shoulder : k.wrist;
  return (
    <g stroke="currentColor" fill="none">
      {line(k.ankle, k.knee, 6)}{line(k.knee, k.hip, 6)}{line(k.hip, k.shoulder, 7)}
      {line(k.shoulder, k.head, 3)}{line(k.shoulder, k.elbow, 4.5)}{line(k.elbow, k.wrist, 4)}
      <circle cx={k.head.x} cy={k.head.y} r={HEAD_RADIUS} fill="currentColor" stroke="none" />
      {m.implement !== 'none' && (
        <circle cx={imp.x} cy={imp.y} r={m.implement === 'barbell' ? BARBELL_RADIUS : DUMBBELL_RADIUS}
          className="implement" strokeWidth={3} />
      )}
    </g>
  );
}

function Scene({ m, children }: { m: Movement; children: React.ReactNode }) {
  return (
    <svg viewBox={VIEWBOX} className="demo" role="img" aria-label={`Schéma du mouvement : ${m.label}`}>
      <line x1="0" y1={GROUND_Y} x2="120" y2={GROUND_Y} className="ground" strokeWidth={2} />
      {m.scene === 'bench' && <rect x="14" y="96" width="86" height="7" rx="2" className="prop" />}
      {m.scene === 'bar' && <line x1="30" y1="22" x2="90" y2="22" className="prop-line" strokeWidth={4} strokeLinecap="round" />}
      {children}
    </svg>
  );
}

interface Props {
  exerciseId: string;
  traits?: Traits;
}

/** Schéma animé généré par l'app : bonhomme filaire en vue de profil. */
export function ExerciseDemo({ exerciseId, traits }: Props) {
  const m = useMemo(() => buildMovement(exerciseId, traits), [exerciseId, traits]);
  const reduced = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const [t, setT] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!m || reduced || paused) return;
    let raf = 0;
    startRef.current = performance.now();
    const tick = (now: number) => {
      const phase = ((now - startRef.current) % CYCLE_MS) / CYCLE_MS;
      setT(smooth(phase < 0.5 ? phase * 2 : 2 - phase * 2));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [m, reduced, paused]);

  if (!m) return null;

  return (
    <div className="demo-box">
      {reduced ? (
        <div className="demo-pair">
          {[{ s: m.start, l: m.startLabel }, { s: m.end, l: m.endLabel }].map(({ s, l }) => (
            <figure key={l}>
              <Scene m={m}><Figure m={m} k={solve(s)} /></Scene>
              <figcaption>{l}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <>
          <Scene m={m}><Figure m={m} k={solve(lerpSpec(m.start, m.end, t))} /></Scene>
          <button type="button" className="demo-toggle" onClick={() => setPaused((p) => !p)}>
            {paused ? 'Lecture' : 'Pause'}
          </button>
        </>
      )}
      <ul className="cues">{m.cues.map((c) => <li key={c}>{c}</li>)}</ul>
    </div>
  );
}

export function hasDemo(exerciseId: string): boolean {
  return buildMovement(exerciseId) !== null;
}
