import type {
  AppState, ExerciseLog, PlannedExercise, Profile, Program, SessionLog,
} from '../types';
import { MUSCLE_LABELS, getExercise } from './exercises';

const DAY_MS = 86_400_000;

/** Estimation du 1RM (formule d'Epley). */
export function estimate1RM(load: number, reps: number): number {
  if (load <= 0 || reps <= 0) return 0;
  return reps === 1 ? load : load * (1 + reps / 30);
}

export function bestE1RM(log: ExerciseLog): number {
  return Math.max(0, ...log.sets.map((s) => estimate1RM(s.load, s.reps)));
}

export function roundToStep(value: number, step: number): number {
  return step > 0 ? Math.round(value / step) * step : value;
}

/** Charge de départ conseillée selon le poids de corps et le niveau. */
export function startingLoad(exerciseId: string, p: Profile): number {
  const e = getExercise(exerciseId);
  if (e.step === 0) return 0;
  const level = p.level === 'beginner' ? 1 : p.level === 'intermediate' ? 1.3 : 1.6;
  const sex = p.sex === 'female' ? 0.7 : 1;
  return Math.max(e.step, roundToStep(e.startRatio * p.weightKg * level * sex, e.step));
}

export function currentLoad(state: Pick<AppState, 'loads' | 'profile'>, exerciseId: string): number {
  const stored = state.loads[exerciseId];
  if (stored !== undefined) return stored;
  return state.profile ? startingLoad(exerciseId, state.profile) : 0;
}

export type ProgressKind = 'up' | 'hold' | 'down';

export interface Progression {
  exerciseId: string;
  kind: ProgressKind;
  load: number;
  message: string;
}

/** Double progression : on monte les reps, puis la charge quand le haut de fourchette est atteint. */
export function nextProgression(planned: PlannedExercise, log: ExerciseLog, load: number): Progression {
  const e = getExercise(planned.exerciseId);
  const done = log.sets.filter((s) => s.reps > 0);
  const base = { exerciseId: planned.exerciseId, load };

  if (done.length === 0) return { ...base, kind: 'hold', message: 'Aucune série saisie.' };
  if (done.length < planned.sets) {
    return { ...base, kind: 'hold', message: `Il restait ${planned.sets - done.length} série(s) : on garde la même charge.` };
  }

  const avgReps = done.reduce((a, s) => a + s.reps, 0) / done.length;
  const allTop = done.every((s) => s.reps >= planned.repMax);

  if (avgReps < planned.repMin) {
    if (e.step === 0) return { ...base, kind: 'hold', message: 'Reste au poids du corps et vise plus de répétitions propres.' };
    const next = Math.max(e.step, roundToStep(load * 0.92, e.step));
    return { ...base, kind: 'down', load: next, message: `Trop lourd (${avgReps.toFixed(1)} reps en moyenne) : on passe à ${next} kg.` };
  }

  if (allTop && log.rir >= 1) {
    if (e.step === 0) {
      return { ...base, kind: 'up', message: 'Fourchette maximale atteinte : ralentis la descente (3 s) ou ajoute du lest.' };
    }
    const jump = log.rir >= 3 ? e.step * 2 : e.step;
    const next = load + jump;
    return { ...base, kind: 'up', load: next, message: `Toutes les séries à ${planned.repMax} reps : passe à ${next} kg.` };
  }

  const target = Math.min(planned.repMax, Math.ceil(avgReps) + 1);
  return { ...base, kind: 'hold', message: `Même charge, vise ${target} reps par série.` };
}

export interface DeloadAdvice {
  recommend: boolean;
  reason?: string;
}

/** Détecte le besoin d'une semaine allégée selon la fatigue et le temps écoulé. */
export function deloadAdvice(sessions: SessionLog[]): DeloadAdvice {
  const work = sessions.filter((s) => !s.deload);
  if (work.length < 3) return { recommend: false };

  const lastDeload = [...sessions].reverse().find((s) => s.deload);
  const since = lastDeload ? sessions.slice(sessions.indexOf(lastDeload) + 1) : sessions;
  const sinceWork = since.filter((s) => !s.deload);

  if (sinceWork.length >= 3) {
    const recent = sinceWork.slice(-3);
    const readiness = recent.reduce((a, s) => a + s.readiness, 0) / recent.length;
    const rirs = recent.flatMap((s) => s.exercises.map((x) => x.rir));
    const avgRir = rirs.length ? rirs.reduce((a, b) => a + b, 0) / rirs.length : 2;
    if (readiness <= 2.5) return { recommend: true, reason: `Forme moyenne de ${readiness.toFixed(1)}/5 sur les 3 dernières séances.` };
    if (avgRir <= 0.5) return { recommend: true, reason: 'Tu termines tes séries à l\'échec depuis 3 séances : la fatigue s\'accumule.' };
  }

  const first = since[0] ? new Date(since[0].date).getTime() : Date.now();
  const last = since[since.length - 1] ? new Date(since[since.length - 1].date).getTime() : first;
  if (sinceWork.length >= 12 || (last - first) / DAY_MS >= 42) {
    return { recommend: true, reason: 'Cela fait environ 6 semaines sans semaine allégée.' };
  }
  return { recommend: false };
}

/** Séance de décharge : moins de séries, charges réduites. */
export function applyDeload(planned: PlannedExercise): PlannedExercise {
  return { ...planned, sets: Math.max(2, Math.ceil(planned.sets * 0.6)), rir: Math.max(planned.rir, 3) };
}

export const DELOAD_LOAD_FACTOR = 0.9;

export interface VolumeAdjustment {
  exerciseId: string;
  change: 1 | -1;
  message: string;
}

/**
 * Ajuste le volume d'un exercice après au moins 3 séances depuis le dernier réglage :
 * trop facile partout → +1 série ; fatigue ou échec répétés → -1 série.
 */
export function adaptVolume(program: Program, sessions: SessionLog[]): { program: Program; adjustments: VolumeAdjustment[] } {
  const adjustments: VolumeAdjustment[] = [];
  const work = sessions.filter((s) => !s.deload);

  const days = program.days.map((day) => ({
    ...day,
    exercises: day.exercises.map((pe) => {
      const logs = work
        .filter((s) => !pe.adjustedAt || s.date > pe.adjustedAt)
        .map((s) => ({ s, l: s.exercises.find((x) => x.exerciseId === pe.exerciseId) }))
        .filter((x): x is { s: SessionLog; l: ExerciseLog } => Boolean(x.l))
        .slice(-3);
      if (logs.length < 3) return pe;

      const name = getExercise(pe.exerciseId).name;
      const tooEasy = logs.every(({ l }) => l.rir >= 3 && l.sets.length >= pe.sets);
      const tooHard = logs.every(({ l }) => l.rir === 0) || logs.filter(({ s }) => s.readiness <= 2).length >= 2;
      const now = new Date().toISOString();

      if (tooEasy && pe.sets < 5) {
        adjustments.push({ exerciseId: pe.exerciseId, change: 1, message: `${name} : trop facile 3 séances de suite, +1 série.` });
        return { ...pe, sets: pe.sets + 1, adjustedAt: now };
      }
      if (tooHard && pe.sets > 2) {
        adjustments.push({ exerciseId: pe.exerciseId, change: -1, message: `${name} : fatigue élevée, -1 série pour mieux récupérer.` });
        return { ...pe, sets: pe.sets - 1, adjustedAt: now };
      }
      return pe;
    }),
  }));
  return { program: { ...program, days }, adjustments };
}

export interface SessionFeedback {
  volumeKg: number;
  totalSets: number;
  prs: string[];
  progressions: Progression[];
  tips: string[];
}

/** Bilan de séance : volume, records, charges de la prochaine fois et conseils. */
export function sessionFeedback(
  session: SessionLog,
  planned: PlannedExercise[],
  history: SessionLog[],
  loads: Record<string, number>,
): SessionFeedback {
  const volumeKg = session.exercises.reduce((a, x) => a + x.sets.reduce((b, s) => b + s.load * s.reps, 0), 0);
  const totalSets = session.exercises.reduce((a, x) => a + x.sets.filter((s) => s.reps > 0).length, 0);

  const prs: string[] = [];
  for (const log of session.exercises) {
    const prev = Math.max(0, ...history.filter((h) => h.id !== session.id).flatMap((h) => h.exercises.filter((x) => x.exerciseId === log.exerciseId).map(bestE1RM)));
    const now = bestE1RM(log);
    if (now > 0 && prev > 0 && now > prev * 1.005) {
      prs.push(`${getExercise(log.exerciseId).name} : 1RM estimé ${now.toFixed(1)} kg (avant ${prev.toFixed(1)} kg)`);
    }
  }

  const progressions = session.deload
    ? []
    : session.exercises.flatMap((log) => {
        const pe = planned.find((p) => p.exerciseId === log.exerciseId);
        return pe ? [nextProgression(pe, log, log.sets.find((x) => x.reps > 0)?.load ?? loads[log.exerciseId] ?? 0)] : [];
      });

  const tips: string[] = [];
  if (session.deload) tips.push('Séance de décharge terminée. Reprends tes charges habituelles la semaine suivante.');
  if (session.readiness <= 2) tips.push('Tu étais fatigué : sommeil, repas et hydratation sont tes priorités ce soir.');
  const failures = session.exercises.filter((x) => x.rir === 0).length;
  if (failures >= 3) tips.push("Plusieurs exercices menés à l'échec : garde 1-2 reps en réserve pour mieux récupérer.");
  const easy = session.exercises.filter((x) => x.rir >= 3).length;
  if (!session.deload && easy >= Math.ceil(session.exercises.length / 2)) {
    tips.push("C'était assez facile : n'hésite pas à te rapprocher de l'échec (1-2 reps en réserve).");
  }
  if (tips.length === 0) tips.push('Bonne séance, régulière et propre. Continue comme ça.');

  return { volumeKg, totalSets, prs, progressions, tips };
}

/** Séries par groupe musculaire sur les 7 derniers jours. */
export function weeklyVolume(sessions: SessionLog[], now = Date.now()): { muscle: string; sets: number }[] {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    if (now - new Date(s.date).getTime() > 7 * DAY_MS) continue;
    for (const x of s.exercises) {
      const m = MUSCLE_LABELS[getExercise(x.exerciseId).muscle];
      counts.set(m, (counts.get(m) ?? 0) + x.sets.filter((st) => st.reps > 0).length);
    }
  }
  return [...counts].map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets);
}
