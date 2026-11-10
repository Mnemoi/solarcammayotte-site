import { useMemo, useState } from 'react';
import type { AppState } from '../types';
import { getExercise } from '../engine/exercises';
import { bestE1RM, weeklyVolume } from '../engine/coach';

export function History({ state }: { state: AppState }) {
  const { sessions } = state;
  const trained = useMemo(() => [...new Set(sessions.flatMap((s) => s.exercises.map((x) => x.exerciseId)))], [sessions]);
  const [exId, setExId] = useState<string>(trained[0] ?? '');
  const volume = useMemo(() => weeklyVolume(sessions), [sessions]);

  if (sessions.length === 0) {
    return <div className="stack"><header><h1>Progrès</h1></header><p className="muted">Termine ta première séance pour voir tes courbes.</p></div>;
  }

  const points = sessions
    .filter((s) => !s.deload)
    .map((s) => ({ date: s.date, v: Math.max(0, ...s.exercises.filter((x) => x.exerciseId === exId).map(bestE1RM)) }))
    .filter((p) => p.v > 0);

  return (
    <div className="stack">
      <header><h1>Progrès</h1></header>
      <section className="card stack">
        <h2>Force estimée (1RM)</h2>
        <label>Exercice
          <select value={exId} onChange={(e) => setExId(e.target.value)}>
            {trained.map((id) => <option key={id} value={id}>{getExercise(id).name}</option>)}
          </select>
        </label>
        {points.length >= 2 ? <Chart points={points} /> : <p className="muted">Il faut au moins 2 séances avec charge sur cet exercice.</p>}
      </section>
      <section className="card stack">
        <h2>Volume des 7 derniers jours</h2>
        {volume.length === 0 ? <p className="muted">Rien cette semaine.</p> : (
          <ul className="plain">
            {volume.map((v) => (
              <li key={v.muscle} className="bar">
                <span>{v.muscle}</span>
                <div className="barfill" style={{ width: `${Math.min(100, (v.sets / 20) * 100)}%` }} />
                <span>{v.sets} séries</span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">Repère : 10 à 20 séries par muscle et par semaine pour progresser en volume.</p>
      </section>
      <section className="card stack">
        <h2>Historique</h2>
        <ul className="plain">
          {[...sessions].reverse().map((s) => (
            <li key={s.id}>
              <strong>{s.dayName}</strong>{s.deload ? ' (décharge)' : ''}<br />
              <span className="muted">{new Date(s.date).toLocaleDateString('fr-FR')} · forme {s.readiness}/5 · {s.exercises.length} exercices</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Chart({ points }: { points: { date: string; v: number }[] }) {
  const W = 320, H = 140, pad = 24;
  const min = Math.min(...points.map((p) => p.v));
  const max = Math.max(...points.map((p) => p.v));
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Courbe du 1RM estimé" className="chart">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      {points.map((p, i) => <circle key={p.date} cx={x(i)} cy={y(p.v)} r="3" fill="currentColor" />)}
      <text x={pad} y={12} fontSize="11" fill="currentColor">{max.toFixed(1)} kg</text>
      <text x={pad} y={H - 6} fontSize="11" fill="currentColor">{min.toFixed(1)} kg</text>
    </svg>
  );
}
