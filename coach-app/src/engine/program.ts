import type { Muscle, PlannedExercise, Profile, Program, ProgramDay, Traits } from '../types';
import { analyzeMorphology } from './morphology';
import { INJURY_LABELS, getExercise, type Exercise } from './exercises';

type Role = 'main' | 'secondary' | 'accessory';

interface Slot {
  muscle: Muscle;
  role: Role;
  candidates: string[];
}

const SLOTS: Record<string, Slot> = {
  squat: { muscle: 'quads', role: 'main', candidates: ['back_squat', 'front_squat', 'goblet_squat', 'leg_press', 'hack_squat', 'bodyweight_squat'] },
  hinge: { muscle: 'hamstrings', role: 'main', candidates: ['conventional_deadlift', 'sumo_deadlift', 'rdl', 'db_rdl', 'glute_bridge'] },
  hpush: { muscle: 'chest', role: 'main', candidates: ['bench_press', 'db_bench_press', 'incline_db_press', 'machine_chest_press', 'pushup'] },
  vpush: { muscle: 'shoulders', role: 'secondary', candidates: ['overhead_press', 'db_shoulder_press'] },
  vpull: { muscle: 'back', role: 'secondary', candidates: ['pull_up', 'lat_pulldown'] },
  hpull: { muscle: 'back', role: 'secondary', candidates: ['barbell_row', 'chest_supported_row', 'cable_row', 'one_arm_db_row'] },
  back_acc: { muscle: 'back', role: 'accessory', candidates: ['one_arm_db_row', 'cable_row', 'chest_supported_row', 'lat_pulldown'] },
  chest_acc: { muscle: 'chest', role: 'accessory', candidates: ['incline_db_press', 'cable_fly', 'machine_chest_press', 'db_bench_press', 'pushup'] },
  quad_acc: { muscle: 'quads', role: 'accessory', candidates: ['bulgarian_split_squat', 'leg_extension', 'leg_press', 'walking_lunge', 'goblet_squat'] },
  ham_acc: { muscle: 'hamstrings', role: 'accessory', candidates: ['leg_curl', 'rdl', 'db_rdl', 'glute_bridge'] },
  glute: { muscle: 'glutes', role: 'accessory', candidates: ['hip_thrust', 'glute_bridge'] },
  lat_raise: { muscle: 'shoulders', role: 'accessory', candidates: ['lateral_raise', 'face_pull'] },
  biceps: { muscle: 'biceps', role: 'accessory', candidates: ['barbell_curl', 'db_curl'] },
  triceps: { muscle: 'triceps', role: 'accessory', candidates: ['triceps_pushdown', 'db_overhead_extension', 'bench_dip'] },
  calves: { muscle: 'calves', role: 'accessory', candidates: ['standing_calf_raise', 'bodyweight_calf_raise'] },
  abs: { muscle: 'abs', role: 'accessory', candidates: ['cable_crunch', 'crunch', 'lying_leg_raise'] },
};

/** Slot d'accessoire à ajouter pour cibler un point faible. */
const WEAK_SLOT: Record<Muscle, string> = {
  chest: 'chest_acc', back: 'back_acc', shoulders: 'lat_raise', biceps: 'biceps', triceps: 'triceps',
  quads: 'quad_acc', hamstrings: 'ham_acc', glutes: 'glute', calves: 'calves', abs: 'abs',
};

interface DayTemplate {
  name: string;
  focus: Muscle[];
  slots: string[];
}

const ALL: Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'];
const UPPER: Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps'];
const LOWER: Muscle[] = ['quads', 'hamstrings', 'glutes', 'calves', 'abs'];

const T = {
  fbA: { name: 'Full body A', focus: ALL, slots: ['squat', 'hpush', 'hpull', 'ham_acc', 'lat_raise', 'abs'] },
  fbB: { name: 'Full body B', focus: ALL, slots: ['hinge', 'vpush', 'vpull', 'quad_acc', 'biceps', 'triceps'] },
  fbC: { name: 'Full body C', focus: ALL, slots: ['squat', 'hpush', 'vpull', 'glute', 'calves', 'biceps'] },
  upperA: { name: 'Haut du corps A', focus: UPPER, slots: ['hpush', 'hpull', 'vpush', 'vpull', 'lat_raise', 'triceps', 'biceps'] },
  upperB: { name: 'Haut du corps B', focus: UPPER, slots: ['vpush', 'vpull', 'chest_acc', 'back_acc', 'lat_raise', 'biceps', 'triceps'] },
  lowerA: { name: 'Bas du corps A', focus: LOWER, slots: ['squat', 'ham_acc', 'glute', 'calves', 'abs'] },
  lowerB: { name: 'Bas du corps B', focus: LOWER, slots: ['hinge', 'quad_acc', 'ham_acc', 'calves', 'abs'] },
  push: { name: 'Push (pousser)', focus: ['chest', 'shoulders', 'triceps'], slots: ['hpush', 'vpush', 'chest_acc', 'lat_raise', 'triceps'] },
  pull: { name: 'Pull (tirer)', focus: ['back', 'biceps', 'shoulders'], slots: ['vpull', 'hpull', 'back_acc', 'lat_raise', 'biceps'] },
  legs: { name: 'Jambes', focus: LOWER, slots: ['squat', 'hinge', 'quad_acc', 'ham_acc', 'calves', 'abs'] },
} satisfies Record<string, DayTemplate>;

function templatesFor(days: number): DayTemplate[] {
  switch (days) {
    case 2: return [T.fbA, T.fbB];
    case 3: return [T.fbA, T.fbB, T.fbC];
    case 4: return [T.upperA, T.lowerA, T.upperB, T.lowerB];
    case 5: return [T.push, T.pull, T.legs, T.upperB, T.lowerB];
    default: return [T.push, T.pull, T.legs, T.push, T.pull, T.legs];
  }
}

const TECHNICAL = new Set(['front_squat', 'overhead_press', 'sumo_deadlift', 'bulgarian_split_squat']);

export function maxExercisesFor(minutes: number): number {
  if (minutes <= 40) return 4;
  if (minutes <= 55) return 5;
  if (minutes <= 70) return 6;
  if (minutes <= 90) return 7;
  return 8;
}

function available(e: Exercise, p: Profile): boolean {
  return e.requires.every((r) => p.equipment.includes(r));
}

interface Pick {
  exercise: Exercise;
  note?: string;
}

function pickExercise(slot: Slot, p: Profile, t: Traits, usedInWeek: Set<string>, usedInDay: Set<string>): Pick | null {
  const score = (e: Exercise, idx: number): { value: number; note?: string } => {
    const fit = e.fit?.(t) ?? { score: 0 };
    let value = fit.score + (slot.candidates.length - idx) * 0.1;
    if (slot.role === 'main' && p.goal === 'strength' && e.requires.includes('barbell')) value += 0.5;
    if (p.level === 'beginner' && TECHNICAL.has(e.id)) value -= 1.5;
    if (slot.role !== 'main' && usedInWeek.has(e.id)) value -= 1.5;
    return { value, note: fit.note };
  };

  const ranked = slot.candidates
    .map((id, idx) => ({ e: getExercise(id), idx }))
    .filter(({ e }) => available(e, p) && !usedInDay.has(e.id))
    .map(({ e, idx }) => ({ e, ...score(e, idx) }))
    .sort((a, b) => b.value - a.value);

  const safe = ranked.filter(({ e }) => !e.stress.some((s) => p.injuries.includes(s)));
  const best = safe[0];
  if (!best) return null;

  let note = best.note;
  const top = ranked[0];
  if (top && top.e.id !== best.e.id && top.e.stress.some((s) => p.injuries.includes(s))) {
    const cause = top.e.stress.filter((s) => p.injuries.includes(s)).map((s) => INJURY_LABELS[s].toLowerCase()).join(', ');
    note = `${top.e.name} évité (${cause}). ${note ?? ''}`.trim();
  }
  return { exercise: best.e, note };
}

type Rx = { sets: number; repMin: number; repMax: number; rir: number };

function prescribe(role: Role, e: Exercise, p: Profile): Rx {
  const table: Record<Role, Record<Profile['goal'], Rx>> = {
    main: {
      strength: { sets: 4, repMin: 3, repMax: 6, rir: 2 },
      hypertrophy: { sets: 4, repMin: 6, repMax: 10, rir: 2 },
      recomp: { sets: 3, repMin: 6, repMax: 10, rir: 2 },
    },
    secondary: {
      strength: { sets: 3, repMin: 5, repMax: 8, rir: 2 },
      hypertrophy: { sets: 3, repMin: 8, repMax: 12, rir: 2 },
      recomp: { sets: 3, repMin: 8, repMax: 12, rir: 2 },
    },
    accessory: {
      strength: { sets: 3, repMin: 8, repMax: 12, rir: 1 },
      hypertrophy: { sets: 3, repMin: 10, repMax: 15, rir: 1 },
      recomp: { sets: 3, repMin: 10, repMax: 15, rir: 1 },
    },
  };
  const rx = { ...table[role][p.goal] };

  if (p.level === 'beginner') {
    if (role === 'main') rx.sets = Math.min(rx.sets, 3);
    if (role === 'accessory') rx.sets = 2;
  } else if (p.level === 'advanced' && role === 'secondary') {
    rx.sets += 1;
  }
  if (e.step === 0 && e.startRatio === 0) {
    // Poids du corps : fourchette plus large, progression par répétitions.
    if (e.id === 'pull_up') { rx.repMin = 3; rx.repMax = 10; } else { rx.repMin = 8; rx.repMax = 20; }
  }
  if (p.weakPoints.includes(e.muscle)) rx.sets = Math.min(rx.sets + 1, 5);
  return rx;
}

export function generateProgram(p: Profile, now = new Date()): Program {
  const traits = analyzeMorphology(p);
  const templates = templatesFor(p.daysPerWeek);
  const maxEx = maxExercisesFor(p.sessionMinutes);
  const usedInWeek = new Set<string>();
  const weak = p.weakPoints.slice(0, 2);

  const days: ProgramDay[] = templates.map((tpl, i) => {
    const usedInDay = new Set<string>();
    const entries: { role: Role; pick: Pick }[] = [];

    for (const key of tpl.slots) {
      const slot = SLOTS[key];
      const pick = pickExercise(slot, p, traits, usedInWeek, usedInDay);
      if (!pick) continue;
      usedInDay.add(pick.exercise.id);
      entries.push({ role: slot.role, pick });
    }

    // Point faible : un accessoire dédié s'il n'y a pas déjà d'isolation pour ce muscle ce jour-là.
    const extras: typeof entries = [];
    for (const m of weak) {
      if (!tpl.focus.includes(m)) continue;
      if (entries.some((en) => en.pick.exercise.muscle === m && !en.pick.exercise.compound)) continue;
      const slot = SLOTS[WEAK_SLOT[m]];
      const pick = pickExercise(slot, p, traits, usedInWeek, usedInDay);
      if (!pick) continue;
      usedInDay.add(pick.exercise.id);
      extras.push({ role: 'accessory', pick: { ...pick, note: `Point faible ciblé. ${pick.note ?? ''}`.trim() } });
    }

    const mains = entries.filter((en) => en.role !== 'accessory');
    const accessories = entries.filter((en) => en.role === 'accessory');
    const ordered = [...mains, ...extras, ...accessories].slice(0, maxEx);

    const exercises: PlannedExercise[] = ordered.map(({ role, pick }) => {
      usedInWeek.add(pick.exercise.id);
      return { exerciseId: pick.exercise.id, ...prescribe(role, pick.exercise, p), note: pick.note };
    });

    const suffix = tpl.name === T.push.name || tpl.name === T.pull.name || tpl.name === T.legs.name
      ? (templates.slice(0, i).filter((x) => x.name === tpl.name).length > 0 ? ' (2)' : '')
      : '';
    return { id: `d${i + 1}`, name: `${tpl.name}${suffix}`, exercises };
  });

  return { createdAt: now.toISOString(), days };
}
