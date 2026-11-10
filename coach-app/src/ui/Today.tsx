import { useMemo, useState } from 'react';
import type { AppState, ExerciseLog, PlannedExercise, SessionLog } from '../types';
import { getExercise, isPerDumbbell } from '../engine/exercises';
import { DELOAD_LOAD_FACTOR, applyDeload, currentLoad, deloadAdvice, roundToStep } from '../engine/coach';
import type { CompletionResult } from '../App';

interface Props {
  state: AppState;
  onComplete: (s: SessionLog) => CompletionResult;
}

interface SetInput {
  reps: string;
  load: string;
}

export function Today({ state, onComplete }: Props) {
  const program = state.program!;
  const [dayIdx, setDayIdx] = useState(state.sessions.length % program.days.length);
  const [result, setResult] = useState<CompletionResult | null>(null);
  const advice = useMemo(() => deloadAdvice(state.sessions), [state.sessions]);
  const [deload, setDeload] = useState(false);
  const [readiness, setReadiness] = useState(3);
  const day = program.days[dayIdx];

  if (result) {
    return <Feedback result={result} onClose={() => { setResult(null); setDayIdx((state.sessions.length) % program.days.length); }} />;
  }

  const planned = day.exercises.map((pe) => (deload ? applyDeload(pe) : pe));

  return (
    <div className="stack">
      <header>
        <h1>Séance du jour</h1>
        <p className="muted">
          {state.sessions.length === 0 ? 'Première séance : commence léger, tu ajusteras les charges.' : `${state.sessions.length} séance(s) déjà faites.`}
        </p>
      </header>

      {advice.recommend && !deload && (
        <div className="notice warn">
          <strong>Le coach te conseille une séance allégée.</strong>
          <p>{advice.reason}</p>
          <button onClick={() => setDeload(true)}>Faire une décharge</button>
        </div>
      )}

      <section className="card stack">
        <label>Séance
          <select value={dayIdx} onChange={(e) => setDayIdx(Number(e.target.value))}>
            {program.days.map((d, i) => <option key={d.id} value={i}>{d.name}</option>)}
          </select>
        </label>
        <fieldset>
          <legend>Comment te sens-tu ? (1 épuisé, 5 en pleine forme)</legend>
          <div className="chips">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className={`chip ${readiness === n ? 'on' : ''}`}>
                <input type="radio" name="readiness" checked={readiness === n} onChange={() => setReadiness(n)} />{n}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="inline">
          <input type="checkbox" checked={deload} onChange={(e) => setDeload(e.target.checked)} /> Séance de décharge (−40 % de séries, −10 % de charge)
        </label>
      </section>

      <Workout
        key={`${day.id}-${deload}`}
        planned={planned}
        state={state}
        deload={deload}
        onFinish={(exercises) => {
          const session: SessionLog = {
            id: crypto.randomUUID(), date: new Date().toISOString(), dayId: day.id, dayName: day.name,
            readiness, deload, exercises,
          };
          setResult(onComplete(session));
          setDeload(false);
        }}
      />
    </div>
  );
}

function Workout({ planned, state, deload, onFinish }: {
  planned: PlannedExercise[];
  state: AppState;
  deload: boolean;
  onFinish: (logs: ExerciseLog[]) => void;
}) {
  const [inputs, setInputs] = useState<Record<string, SetInput[]>>(() => {
    const init: Record<string, SetInput[]> = {};
    for (const pe of planned) {
      const base = currentLoad(state, pe.exerciseId);
      const load = deload ? roundToStep(base * DELOAD_LOAD_FACTOR, getExercise(pe.exerciseId).step) : base;
      init[pe.exerciseId] = Array.from({ length: pe.sets }, () => ({ reps: '', load: String(load) }));
    }
    return init;
  });
  const [rir, setRir] = useState<Record<string, number>>({});

  const update = (id: string, i: number, patch: Partial<SetInput>) =>
    setInputs((s) => ({ ...s, [id]: s[id].map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  const anyDone = planned.some((pe) => inputs[pe.exerciseId].some((s) => Number(s.reps) > 0));

  const finish = () => {
    const logs: ExerciseLog[] = planned
      .map((pe) => ({
        exerciseId: pe.exerciseId,
        rir: rir[pe.exerciseId] ?? 2,
        sets: inputs[pe.exerciseId]
          .map((s) => ({ reps: Math.max(0, Math.floor(Number(s.reps) || 0)), load: Math.max(0, Number(s.load) || 0) }))
          .filter((s) => s.reps > 0),
      }))
      .filter((l) => l.sets.length > 0);
    onFinish(logs);
  };

  return (
    <>
      {planned.map((pe) => {
        const e = getExercise(pe.exerciseId);
        const unit = isPerDumbbell(e) ? 'kg / haltère' : 'kg';
        return (
          <section key={pe.exerciseId} className="card stack">
            <h2>{e.name}</h2>
            <p className="muted">
              {pe.sets} × {pe.repMin}-{pe.repMax} reps · garder {pe.rir} rep(s) en réserve
            </p>
            {pe.note && <p className="note">{pe.note}</p>}
            {inputs[pe.exerciseId].map((s, i) => (
              <div key={i} className="setrow">
                <span>Série {i + 1}</span>
                <input aria-label={`Répétitions série ${i + 1}`} type="number" inputMode="numeric" min={0} placeholder="reps"
                  value={s.reps} onChange={(ev) => update(pe.exerciseId, i, { reps: ev.target.value })} />
                {e.step > 0 || Number(s.load) > 0 ? (
                  <label className="loadfield">
                    <input aria-label={`Charge série ${i + 1}`} type="number" inputMode="decimal" min={0} step={e.step || 1}
                      value={s.load} onChange={(ev) => update(pe.exerciseId, i, { load: ev.target.value })} />
                    <small>{unit}</small>
                  </label>
                ) : <small>poids du corps</small>}
              </div>
            ))}
            <label>Effort sur la dernière série
              <select value={rir[pe.exerciseId] ?? 2} onChange={(ev) => setRir((r) => ({ ...r, [pe.exerciseId]: Number(ev.target.value) }))}>
                <option value={0}>Échec (0 rep en réserve)</option>
                <option value={1}>Dur (1 rep en réserve)</option>
                <option value={2}>Soutenu (2 reps en réserve)</option>
                <option value={3}>Facile (3 reps ou plus)</option>
              </select>
            </label>
          </section>
        );
      })}
      <button className="primary" disabled={!anyDone} onClick={finish}>Terminer la séance</button>
    </>
  );
}

function Feedback({ result, onClose }: { result: CompletionResult; onClose: () => void }) {
  const { feedback: f, adjustments } = result;
  return (
    <div className="stack">
      <header><h1>Bilan de séance</h1></header>
      <section className="card stack">
        <p><strong>{f.totalSets}</strong> séries · <strong>{Math.round(f.volumeKg)}</strong> kg de volume total</p>
        {f.prs.length > 0 && (
          <div className="notice good"><strong>Nouveaux records</strong><ul>{f.prs.map((p) => <li key={p}>{p}</li>)}</ul></div>
        )}
      </section>
      {f.progressions.length > 0 && (
        <section className="card stack">
          <h2>Prochaine séance</h2>
          <ul className="plain">
            {f.progressions.map((p) => (
              <li key={p.exerciseId}><strong>{getExercise(p.exerciseId).name}</strong><br /><span className={`kind ${p.kind}`}>{p.message}</span></li>
            ))}
          </ul>
        </section>
      )}
      {adjustments.length > 0 && (
        <section className="card stack"><h2>Ajustements du programme</h2><ul>{adjustments.map((a) => <li key={a.message}>{a.message}</li>)}</ul></section>
      )}
      <section className="card stack"><h2>Conseils du coach</h2><ul>{f.tips.map((t) => <li key={t}>{t}</li>)}</ul></section>
      <button className="primary" onClick={onClose}>Fermer</button>
    </div>
  );
}
