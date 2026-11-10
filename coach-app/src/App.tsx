import { useEffect, useState } from 'react';
import type { AppState, Profile, SessionLog } from './types';
import { loadState, saveState, EMPTY_STATE } from './storage';
import { generateProgram } from './engine/program';
import { DELOAD_LOAD_FACTOR, adaptVolume, sessionFeedback, type SessionFeedback, type VolumeAdjustment } from './engine/coach';
import { ProfileForm } from './ui/ProfileForm';
import { Today } from './ui/Today';
import { Plan } from './ui/Plan';
import { History } from './ui/History';

type Tab = 'today' | 'plan' | 'history' | 'profile';

export interface CompletionResult {
  feedback: SessionFeedback;
  adjustments: VolumeAdjustment[];
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: "Aujourd'hui" },
  { id: 'plan', label: 'Programme' },
  { id: 'history', label: 'Progrès' },
  { id: 'profile', label: 'Profil' },
];

export function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [tab, setTab] = useState<Tab>('today');

  useEffect(() => saveState(state), [state]);

  const saveProfile = (profile: Profile) => {
    const regenerate = !state.program || JSON.stringify(profile) !== JSON.stringify(state.profile);
    setState((s) => ({ ...s, profile, program: regenerate ? generateProgram(profile) : s.program }));
    setTab('today');
  };

  const completeSession = (session: SessionLog): CompletionResult => {
    const program = state.program!;
    const day = program.days.find((d) => d.id === session.dayId);
    const history = [...state.sessions, session];
    const feedback = sessionFeedback(session, day?.exercises ?? [], history, state.loads);

    const loads = { ...state.loads };
    if (!session.deload) {
      for (const p of feedback.progressions) loads[p.exerciseId] = p.load;
    } else {
      // Une décharge ne doit pas faire reculer la charge de travail.
      for (const log of session.exercises) {
        const used = log.sets.find((x) => x.reps > 0)?.load;
        if (used !== undefined && loads[log.exerciseId] === undefined) loads[log.exerciseId] = Math.round(used / DELOAD_LOAD_FACTOR);
      }
    }
    const adapted = adaptVolume(program, history);
    setState((s) => ({ ...s, sessions: history, loads, program: adapted.program }));
    return { feedback, adjustments: adapted.adjustments };
  };

  const reset = () => {
    if (confirm('Effacer toutes tes données (profil, programme, historique) ?')) {
      setState(EMPTY_STATE);
      setTab('today');
    }
  };

  if (!state.profile || !state.program) {
    return (
      <main className="page">
        <header><h1>Coach Muscu</h1><p className="muted">Dis-moi qui tu es, je construis ton programme sur mesure.</p></header>
        <ProfileForm initial={state.profile} onSave={saveProfile} submitLabel="Créer mon programme" />
      </main>
    );
  }

  return (
    <div className="shell">
      <main className="page">
        {tab === 'today' && <Today state={state} onComplete={completeSession} />}
        {tab === 'plan' && <Plan state={state} />}
        {tab === 'history' && <History state={state} />}
        {tab === 'profile' && (
          <>
            <ProfileForm initial={state.profile} onSave={saveProfile} submitLabel="Mettre à jour (régénère le programme)" />
            <button className="danger" onClick={reset}>Effacer mes données</button>
          </>
        )}
      </main>
      <nav className="tabs" aria-label="Navigation principale">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} aria-current={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
