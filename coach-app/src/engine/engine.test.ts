import { describe, expect, it } from 'vitest';
import type { ExerciseLog, PlannedExercise, Profile, SessionLog } from '../types';
import { analyzeMorphology } from './morphology';
import { generateProgram } from './program';
import { getExercise } from './exercises';
import { adaptVolume, applyDeload, deloadAdvice, estimate1RM, nextProgression, startingLoad, weeklyVolume } from './coach';

const gym: Profile['equipment'] = ['barbell', 'rack', 'bench', 'dumbbell', 'machines', 'cables', 'pullup_bar'];
const base: Profile = {
  name: 'T', sex: 'male', age: 30, heightCm: 180, weightKg: 80, level: 'intermediate', goal: 'hypertrophy',
  daysPerWeek: 4, sessionMinutes: 60, equipment: gym, injuries: [], weakPoints: [],
};

const ids = (p: Profile) => generateProgram(p).days.flatMap((d) => d.exercises.map((e) => e.exerciseId));

describe('morphologie', () => {
  it('détecte bras longs et fémurs longs', () => {
    const t = analyzeMorphology({ ...base, armSpanCm: 190, femurCm: 48, torsoCm: 52 });
    expect(t.longArms).toBe(true);
    expect(t.longFemur).toBe(true);
  });
  it('reste neutre sans mesures', () => {
    const t = analyzeMorphology(base);
    expect(t.longArms || t.shortArms || t.longFemur || t.shortFemur).toBe(false);
  });
});

describe('programme', () => {
  it('fémurs longs : squat avant ou machine plutôt que squat arrière', () => {
    const all = ids({ ...base, femurCm: 48, torsoCm: 52 });
    expect(all).not.toContain('back_squat');
  });
  it('fémurs courts : squat arrière', () => {
    expect(ids({ ...base, femurCm: 36, torsoCm: 52 })).toContain('back_squat');
  });
  it('bras courts : développé couché + sumo ; bras longs : soulevé conventionnel', () => {
    const short = ids({ ...base, armSpanCm: 172 });
    expect(short).toContain('bench_press');
    expect(short).toContain('sumo_deadlift');
    const long = ids({ ...base, armSpanCm: 190 });
    expect(long).toContain('conventional_deadlift');
  });
  it('respecte le matériel : poids du corps uniquement', () => {
    const all = ids({ ...base, equipment: [] });
    for (const id of all) expect(getExercise(id).requires).toEqual([]);
    expect(all.length).toBeGreaterThan(0);
  });
  it('évite les exercices qui chargent une blessure', () => {
    const all = ids({ ...base, injuries: ['knee', 'shoulder', 'lower_back'] });
    for (const id of all) {
      const e = getExercise(id);
      expect(e.stress.filter((s) => ['knee', 'shoulder', 'lower_back'].includes(s))).toEqual([]);
    }
  });
  it('limite le nombre d’exercices selon la durée', () => {
    const p = generateProgram({ ...base, sessionMinutes: 40 });
    for (const d of p.days) expect(d.exercises.length).toBeLessThanOrEqual(4);
  });
  it('génère le bon nombre de jours et ajoute un travail pour le point faible', () => {
    for (const n of [2, 3, 4, 5, 6]) expect(generateProgram({ ...base, daysPerWeek: n }).days).toHaveLength(n);
    const withWeak = generateProgram({ ...base, weakPoints: ['calves'] });
    expect(withWeak.days.some((d) => d.exercises.some((e) => getExercise(e.exerciseId).muscle === 'calves'))).toBe(true);
  });
});

const planned: PlannedExercise = { exerciseId: 'bench_press', sets: 3, repMin: 6, repMax: 10, rir: 2 };
const log = (reps: number[], rir: number, load = 60): ExerciseLog => ({ exerciseId: 'bench_press', rir, sets: reps.map((r) => ({ reps: r, load })) });

describe('progression', () => {
  it('monte la charge quand le haut de fourchette est atteint', () => {
    const r = nextProgression(planned, log([10, 10, 10], 1), 60);
    expect(r.kind).toBe('up');
    expect(r.load).toBe(62.5);
  });
  it('double saut si trop facile', () => {
    expect(nextProgression(planned, log([10, 10, 10], 3), 60).load).toBe(65);
  });
  it('garde la charge si on est dans la fourchette', () => {
    const r = nextProgression(planned, log([8, 7, 7], 1), 60);
    expect(r.kind).toBe('hold');
    expect(r.load).toBe(60);
  });
  it('baisse si sous le minimum', () => {
    const r = nextProgression(planned, log([4, 4, 3], 0), 60);
    expect(r.kind).toBe('down');
    expect(r.load).toBeLessThan(60);
  });
  it('ne monte pas si séries incomplètes', () => {
    expect(nextProgression(planned, log([10, 10], 2), 60).kind).toBe('hold');
  });
  it('estime le 1RM', () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 10)).toBeCloseTo(133.3, 1);
  });
  it('charge de départ arrondie au pas', () => {
    expect(startingLoad('bench_press', base) % 2.5).toBe(0);
    expect(startingLoad('pushup', base)).toBe(0);
  });
});

const session = (i: number, readiness: number, rir: number, deload = false): SessionLog => ({
  id: String(i), date: new Date(2026, 0, 1 + i * 2).toISOString(), dayId: 'd1', dayName: 'A', readiness, deload,
  exercises: [log([10, 10, 10], rir)],
});

describe('décharge et volume', () => {
  it('recommande une décharge si forme basse', () => {
    expect(deloadAdvice([session(0, 2, 2), session(1, 2, 2), session(2, 2, 2)]).recommend).toBe(true);
  });
  it('pas de décharge si tout va bien', () => {
    expect(deloadAdvice([session(0, 4, 2), session(1, 4, 2), session(2, 4, 2)]).recommend).toBe(false);
  });
  it('réduit les séries en décharge', () => {
    expect(applyDeload({ ...planned, sets: 4 }).sets).toBe(3);
    expect(applyDeload({ ...planned, sets: 2 }).sets).toBe(2);
  });
  it('ajoute une série si trop facile 3 fois', () => {
    const program = { createdAt: '', days: [{ id: 'd1', name: 'A', exercises: [planned] }] };
    const r = adaptVolume(program, [session(0, 4, 3), session(1, 4, 3), session(2, 4, 3)]);
    expect(r.program.days[0].exercises[0].sets).toBe(4);
    expect(r.adjustments).toHaveLength(1);
  });
  it('retire une série si échec répété', () => {
    const program = { createdAt: '', days: [{ id: 'd1', name: 'A', exercises: [planned] }] };
    const r = adaptVolume(program, [session(0, 3, 0), session(1, 3, 0), session(2, 3, 0)]);
    expect(r.program.days[0].exercises[0].sets).toBe(2);
  });
  it('compte le volume hebdomadaire par muscle', () => {
    const now = new Date(2026, 0, 6).getTime();
    expect(weeklyVolume([session(0, 4, 2), session(1, 4, 2)], now)).toEqual([{ muscle: 'Pectoraux', sets: 6 }]);
  });
});
