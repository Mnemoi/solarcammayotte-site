import type { AppState } from '../types';
import { analyzeMorphology, morphologyInsights } from '../engine/morphology';
import { MUSCLE_LABELS, getExercise } from '../engine/exercises';
import { currentLoad } from '../engine/coach';

export function Plan({ state }: { state: AppState }) {
  const { profile, program } = state;
  if (!profile || !program) return null;
  const insights = morphologyInsights(profile, analyzeMorphology(profile));

  return (
    <div className="stack">
      <header><h1>Ton programme</h1><p className="muted">{program.days.length} séances par semaine, adaptées à ta morphologie et à ton matériel.</p></header>
      {insights.length > 0 && (
        <section className="card stack">
          <h2>Analyse morphologique</h2>
          {insights.map((i) => <div key={i.title} className="insight"><strong>{i.title}</strong><p>{i.text}</p></div>)}
        </section>
      )}
      {program.days.map((d) => (
        <section key={d.id} className="card stack">
          <h2>{d.name}</h2>
          <ul className="plain">
            {d.exercises.map((pe) => {
              const e = getExercise(pe.exerciseId);
              const load = currentLoad(state, pe.exerciseId);
              return (
                <li key={pe.exerciseId}>
                  <strong>{e.name}</strong> <span className="muted">· {MUSCLE_LABELS[e.muscle]}</span><br />
                  {pe.sets} × {pe.repMin}-{pe.repMax}{load > 0 ? ` · ${load} kg` : ''}
                  {pe.note && <p className="note">{pe.note}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
