import { useMemo, useState } from 'react';
import type { Equipment, Goal, Injury, Level, Muscle, Profile, Sex } from '../types';
import { EQUIPMENT_LABELS, INJURY_LABELS, MUSCLE_LABELS } from '../engine/exercises';
import { analyzeMorphology, morphologyInsights } from '../engine/morphology';

const DEFAULT: Profile = {
  name: '', sex: 'male', age: 30, heightCm: 175, weightKg: 75,
  level: 'beginner', goal: 'hypertrophy', daysPerWeek: 3, sessionMinutes: 60,
  equipment: ['barbell', 'rack', 'bench', 'dumbbell', 'machines', 'cables', 'pullup_bar'],
  injuries: [], weakPoints: [],
};

const PRESETS: { label: string; equipment: Equipment[] }[] = [
  { label: 'Salle complète', equipment: ['barbell', 'rack', 'bench', 'dumbbell', 'machines', 'cables', 'pullup_bar'] },
  { label: 'Maison (haltères + banc)', equipment: ['dumbbell', 'bench'] },
  { label: 'Poids du corps', equipment: [] },
];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

interface Props {
  initial: Profile | null;
  onSave: (p: Profile) => void;
  submitLabel: string;
}

export function ProfileForm({ initial, onSave, submitLabel }: Props) {
  const [p, setP] = useState<Profile>(initial ?? DEFAULT);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));
  const num = (k: 'age' | 'heightCm' | 'weightKg' | 'daysPerWeek' | 'sessionMinutes') => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, Number(e.target.value));
  const opt = (k: 'armSpanCm' | 'femurCm' | 'torsoCm') => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, e.target.value === '' ? undefined : Number(e.target.value));

  const insights = useMemo(() => morphologyInsights(p, analyzeMorphology(p)), [p]);
  const valid = p.heightCm >= 120 && p.heightCm <= 230 && p.weightKg >= 30 && p.weightKg <= 250 && p.age >= 14;

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave(p);
      }}
    >
      <section className="card stack">
        <h2>Toi</h2>
        <label>Prénom<input value={p.name} onChange={(e) => set('name', e.target.value)} /></label>
        <div className="grid">
          <label>Sexe
            <select value={p.sex} onChange={(e) => set('sex', e.target.value as Sex)}>
              <option value="male">Homme</option><option value="female">Femme</option><option value="other">Autre</option>
            </select>
          </label>
          <label>Âge<input type="number" min={14} max={90} value={p.age} onChange={num('age')} /></label>
          <label>Taille (cm)<input type="number" min={120} max={230} value={p.heightCm} onChange={num('heightCm')} /></label>
          <label>Poids (kg)<input type="number" min={30} max={250} value={p.weightKg} onChange={num('weightKg')} /></label>
        </div>
      </section>

      <section className="card stack">
        <h2>Morphologie</h2>
        <p className="muted">Optionnel mais recommandé. Mesure-toi debout, relâché, avec un mètre ruban.</p>
        <div className="grid">
          <label>Envergure (cm)<small>Bout des doigts à bout des doigts, bras écartés</small>
            <input type="number" value={p.armSpanCm ?? ''} onChange={opt('armSpanCm')} /></label>
          <label>Fémur (cm)<small>De la pointe de la hanche au milieu du genou</small>
            <input type="number" value={p.femurCm ?? ''} onChange={opt('femurCm')} /></label>
          <label>Buste (cm)<small>De la pointe de la hanche à l'épaule</small>
            <input type="number" value={p.torsoCm ?? ''} onChange={opt('torsoCm')} /></label>
        </div>
        {insights.map((i) => (
          <div key={i.title} className="insight"><strong>{i.title}</strong><p>{i.text}</p></div>
        ))}
      </section>

      <section className="card stack">
        <h2>Objectif</h2>
        <div className="grid">
          <label>Niveau
            <select value={p.level} onChange={(e) => set('level', e.target.value as Level)}>
              <option value="beginner">Débutant (moins d'1 an)</option>
              <option value="intermediate">Intermédiaire (1 à 3 ans)</option>
              <option value="advanced">Avancé (3 ans et +)</option>
            </select>
          </label>
          <label>But
            <select value={p.goal} onChange={(e) => set('goal', e.target.value as Goal)}>
              <option value="hypertrophy">Prendre du muscle</option>
              <option value="strength">Gagner en force</option>
              <option value="recomp">Recomposition / forme</option>
            </select>
          </label>
          <label>Séances par semaine
            <select value={p.daysPerWeek} onChange={(e) => set('daysPerWeek', Number(e.target.value))}>
              {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>Durée max (min)<input type="number" min={20} max={150} step={5} value={p.sessionMinutes} onChange={num('sessionMinutes')} /></label>
        </div>
        <fieldset>
          <legend>Points faibles (2 max)</legend>
          <div className="chips">
            {(Object.keys(MUSCLE_LABELS) as Muscle[]).map((m) => (
              <label key={m} className={`chip ${p.weakPoints.includes(m) ? 'on' : ''}`}>
                <input type="checkbox" checked={p.weakPoints.includes(m)}
                  disabled={!p.weakPoints.includes(m) && p.weakPoints.length >= 2}
                  onChange={() => set('weakPoints', toggle(p.weakPoints, m))} />
                {MUSCLE_LABELS[m]}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="card stack">
        <h2>Matériel et blessures</h2>
        <div className="chips">
          {PRESETS.map((pr) => (
            <button type="button" key={pr.label} className="chip" onClick={() => set('equipment', pr.equipment)}>{pr.label}</button>
          ))}
        </div>
        <div className="chips">
          {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((eq) => (
            <label key={eq} className={`chip ${p.equipment.includes(eq) ? 'on' : ''}`}>
              <input type="checkbox" checked={p.equipment.includes(eq)} onChange={() => set('equipment', toggle(p.equipment, eq))} />
              {EQUIPMENT_LABELS[eq]}
            </label>
          ))}
        </div>
        <fieldset>
          <legend>Gênes ou blessures (les exercices à risque seront évités)</legend>
          <div className="chips">
            {(Object.keys(INJURY_LABELS) as Injury[]).map((i) => (
              <label key={i} className={`chip ${p.injuries.includes(i) ? 'on' : ''}`}>
                <input type="checkbox" checked={p.injuries.includes(i)} onChange={() => set('injuries', toggle(p.injuries, i))} />
                {INJURY_LABELS[i]}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="muted small">Cette app ne remplace pas un avis médical. En cas de douleur persistante, consulte un professionnel de santé.</p>
      </section>

      <button type="submit" className="primary" disabled={!valid}>{submitLabel}</button>
    </form>
  );
}
