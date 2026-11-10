import type { Equipment, Injury, Muscle, Traits } from '../types';

export interface Fit {
  score: number;
  note?: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle: Muscle;
  compound: boolean;
  requires: Equipment[];
  /** Blessures pour lesquelles l'exercice est déconseillé. */
  stress: Injury[];
  /** Charge de départ conseillée, en multiple du poids de corps (niveau débutant). */
  startRatio: number;
  /** Plus petit incrément de charge (kg). 0 = poids du corps. */
  step: number;
  fit?: (t: Traits) => Fit;
}

const ex = (e: Exercise): Exercise => e;

export const EXERCISES: Exercise[] = [
  // Quadriceps
  ex({ id: 'back_squat', name: 'Squat barre arrière', muscle: 'quads', compound: true, requires: ['barbell', 'rack'], stress: ['knee', 'lower_back'], startRatio: 0.6, step: 2.5,
    fit: (t) => (t.shortFemur ? { score: 2, note: 'Fémurs courts : buste vertical, squat profond naturel.' } : t.longFemur ? { score: -1, note: 'Fémurs longs : le buste penche, surveille ton dos.' } : { score: 0 }) }),
  ex({ id: 'front_squat', name: 'Squat avant', muscle: 'quads', compound: true, requires: ['barbell', 'rack'], stress: ['knee', 'wrist'], startRatio: 0.45, step: 2.5,
    fit: (t) => (t.longFemur ? { score: 2, note: 'Fémurs longs : garde le buste vertical.' } : { score: 0 }) }),
  ex({ id: 'goblet_squat', name: 'Squat goblet', muscle: 'quads', compound: true, requires: ['dumbbell'], stress: ['knee'], startRatio: 0.25, step: 2,
    fit: (t) => (t.longFemur ? { score: 1, note: 'Le poids devant aide à rester droit avec des fémurs longs.' } : { score: 0 }) }),
  ex({ id: 'leg_press', name: 'Presse à cuisses', muscle: 'quads', compound: true, requires: ['machines'], stress: ['knee'], startRatio: 1.0, step: 5,
    fit: (t) => (t.longFemur ? { score: 1, note: 'Pas de charge sur le dos malgré des fémurs longs.' } : { score: 0 }) }),
  ex({ id: 'hack_squat', name: 'Hack squat', muscle: 'quads', compound: true, requires: ['machines'], stress: ['knee'], startRatio: 0.7, step: 5,
    fit: (t) => (t.longFemur ? { score: 1, note: 'Dos soutenu, idéal avec des fémurs longs.' } : { score: 0 }) }),
  ex({ id: 'bulgarian_split_squat', name: 'Squat bulgare', muscle: 'quads', compound: true, requires: ['dumbbell', 'bench'], stress: ['knee'], startRatio: 0.15, step: 2 }),
  ex({ id: 'leg_extension', name: 'Leg extension', muscle: 'quads', compound: false, requires: ['machines'], stress: ['knee'], startRatio: 0.35, step: 2.5 }),
  ex({ id: 'bodyweight_squat', name: 'Squat au poids du corps', muscle: 'quads', compound: true, requires: [], stress: [], startRatio: 0, step: 0 }),
  ex({ id: 'walking_lunge', name: 'Fentes marchées', muscle: 'quads', compound: true, requires: [], stress: ['knee'], startRatio: 0, step: 0 }),

  // Ischio / fessiers
  ex({ id: 'conventional_deadlift', name: 'Soulevé de terre', muscle: 'hamstrings', compound: true, requires: ['barbell'], stress: ['lower_back'], startRatio: 0.8, step: 2.5,
    fit: (t) => (t.longArms ? { score: 2, note: 'Bras longs : la barre voyage peu, position favorable.' } : t.shortArms ? { score: -1, note: 'Bras courts : départ plus bas, le sumo peut être plus confortable.' } : { score: 0 }) }),
  ex({ id: 'sumo_deadlift', name: 'Soulevé de terre sumo', muscle: 'hamstrings', compound: true, requires: ['barbell'], stress: ['lower_back'], startRatio: 0.8, step: 2.5,
    fit: (t) => (t.shortArms ? { score: 2, note: 'Bras courts : le sumo réduit la distance à tirer.' } : t.longFemur ? { score: 1, note: 'Fémurs longs : stance large, buste plus vertical.' } : t.longArms ? { score: -1 } : { score: 0 }) }),
  ex({ id: 'rdl', name: 'Soulevé de terre roumain', muscle: 'hamstrings', compound: true, requires: ['barbell'], stress: ['lower_back'], startRatio: 0.6, step: 2.5 }),
  ex({ id: 'db_rdl', name: 'Soulevé de terre roumain haltères', muscle: 'hamstrings', compound: true, requires: ['dumbbell'], stress: ['lower_back'], startRatio: 0.25, step: 2 }),
  ex({ id: 'leg_curl', name: 'Leg curl', muscle: 'hamstrings', compound: false, requires: ['machines'], stress: [], startRatio: 0.3, step: 2.5 }),
  ex({ id: 'glute_bridge', name: 'Pont fessier', muscle: 'glutes', compound: false, requires: [], stress: [], startRatio: 0, step: 0 }),
  ex({ id: 'hip_thrust', name: 'Hip thrust', muscle: 'glutes', compound: true, requires: ['barbell', 'bench'], stress: [], startRatio: 0.8, step: 2.5,
    fit: (t) => (t.longFemur ? { score: 1, note: 'Fémurs longs : bon levier pour les fessiers.' } : { score: 0 }) }),

  // Pecs
  ex({ id: 'bench_press', name: 'Développé couché', muscle: 'chest', compound: true, requires: ['barbell', 'bench', 'rack'], stress: ['shoulder', 'wrist'], startRatio: 0.6, step: 2.5,
    fit: (t) => (t.shortArms ? { score: 2, note: 'Bras courts : amplitude réduite, très favorable.' } : t.longArms ? { score: -1, note: 'Bras longs : grande amplitude, préfère aussi l\'incliné ou les haltères.' } : { score: 0 }) }),
  ex({ id: 'db_bench_press', name: 'Développé couché haltères', muscle: 'chest', compound: true, requires: ['dumbbell', 'bench'], stress: ['shoulder'], startRatio: 0.22, step: 2 }),
  ex({ id: 'incline_db_press', name: 'Développé incliné haltères', muscle: 'chest', compound: true, requires: ['dumbbell', 'bench'], stress: ['shoulder'], startRatio: 0.2, step: 2,
    fit: (t) => (t.longArms ? { score: 1, note: 'Bras longs : amplitude confortable et épaules protégées.' } : { score: 0 }) }),
  ex({ id: 'machine_chest_press', name: 'Presse pectorale', muscle: 'chest', compound: true, requires: ['machines'], stress: ['shoulder'], startRatio: 0.5, step: 5,
    fit: (t) => (t.longArms ? { score: 1, note: 'Amplitude guidée avec des bras longs.' } : { score: 0 }) }),
  ex({ id: 'pushup', name: 'Pompes', muscle: 'chest', compound: true, requires: [], stress: ['wrist', 'shoulder'], startRatio: 0, step: 0 }),
  ex({ id: 'cable_fly', name: 'Écarté poulie', muscle: 'chest', compound: false, requires: ['cables'], stress: ['shoulder'], startRatio: 0.12, step: 2.5 }),

  // Dos
  ex({ id: 'pull_up', name: 'Tractions', muscle: 'back', compound: true, requires: ['pullup_bar'], stress: ['elbow', 'shoulder'], startRatio: 0, step: 0 }),
  ex({ id: 'lat_pulldown', name: 'Tirage vertical poulie', muscle: 'back', compound: true, requires: ['cables'], stress: [], startRatio: 0.5, step: 2.5 }),
  ex({ id: 'barbell_row', name: 'Rowing barre', muscle: 'back', compound: true, requires: ['barbell'], stress: ['lower_back'], startRatio: 0.5, step: 2.5 }),
  ex({ id: 'chest_supported_row', name: 'Rowing buste appuyé', muscle: 'back', compound: true, requires: ['machines'], stress: [], startRatio: 0.5, step: 2.5,
    fit: () => ({ score: 1, note: 'Buste soutenu : zéro stress sur le bas du dos.' }) }),
  ex({ id: 'cable_row', name: 'Rowing poulie basse', muscle: 'back', compound: true, requires: ['cables'], stress: [], startRatio: 0.5, step: 2.5 }),
  ex({ id: 'one_arm_db_row', name: 'Rowing un bras haltère', muscle: 'back', compound: true, requires: ['dumbbell'], stress: [], startRatio: 0.3, step: 2 }),

  // Épaules
  ex({ id: 'overhead_press', name: 'Développé militaire', muscle: 'shoulders', compound: true, requires: ['barbell'], stress: ['shoulder'], startRatio: 0.4, step: 2.5 }),
  ex({ id: 'db_shoulder_press', name: 'Développé épaules haltères', muscle: 'shoulders', compound: true, requires: ['dumbbell'], stress: ['shoulder'], startRatio: 0.17, step: 2 }),
  ex({ id: 'lateral_raise', name: 'Élévations latérales', muscle: 'shoulders', compound: false, requires: ['dumbbell'], stress: [], startRatio: 0.07, step: 1 }),
  ex({ id: 'face_pull', name: 'Face pull', muscle: 'shoulders', compound: false, requires: ['cables'], stress: [], startRatio: 0.2, step: 2.5 }),

  // Bras
  ex({ id: 'barbell_curl', name: 'Curl barre', muscle: 'biceps', compound: false, requires: ['barbell'], stress: ['elbow', 'wrist'], startRatio: 0.3, step: 2.5 }),
  ex({ id: 'db_curl', name: 'Curl haltères', muscle: 'biceps', compound: false, requires: ['dumbbell'], stress: [], startRatio: 0.12, step: 1 }),
  ex({ id: 'triceps_pushdown', name: 'Extension triceps poulie', muscle: 'triceps', compound: false, requires: ['cables'], stress: ['elbow'], startRatio: 0.25, step: 2.5 }),
  ex({ id: 'db_overhead_extension', name: 'Extension triceps haltère', muscle: 'triceps', compound: false, requires: ['dumbbell'], stress: ['elbow'], startRatio: 0.15, step: 1 }),
  ex({ id: 'bench_dip', name: 'Dips sur banc', muscle: 'triceps', compound: false, requires: ['bench'], stress: ['shoulder', 'wrist'], startRatio: 0, step: 0 }),

  // Mollets / abdos
  ex({ id: 'standing_calf_raise', name: 'Mollets debout machine', muscle: 'calves', compound: false, requires: ['machines'], stress: [], startRatio: 0.8, step: 5 }),
  ex({ id: 'bodyweight_calf_raise', name: 'Mollets au poids du corps', muscle: 'calves', compound: false, requires: [], stress: [], startRatio: 0, step: 0 }),
  ex({ id: 'cable_crunch', name: 'Crunch poulie', muscle: 'abs', compound: false, requires: ['cables'], stress: [], startRatio: 0.3, step: 2.5 }),
  ex({ id: 'crunch', name: 'Crunch', muscle: 'abs', compound: false, requires: [], stress: [], startRatio: 0, step: 0 }),
  ex({ id: 'lying_leg_raise', name: 'Relevés de jambes', muscle: 'abs', compound: false, requires: [], stress: ['lower_back'], startRatio: 0, step: 0 }),
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`Exercice inconnu : ${id}`);
  return e;
}

/** Les exercices avec haltères sont chargés « par haltère ». */
export function isPerDumbbell(e: Exercise): boolean {
  return e.requires.includes('dumbbell') && !e.requires.includes('barbell');
}

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: 'Pectoraux', back: 'Dos', shoulders: 'Épaules', biceps: 'Biceps', triceps: 'Triceps',
  quads: 'Quadriceps', hamstrings: 'Ischio-jambiers', glutes: 'Fessiers', calves: 'Mollets', abs: 'Abdominaux',
};

export const INJURY_LABELS: Record<Injury, string> = {
  knee: 'Genou', shoulder: 'Épaule', lower_back: 'Bas du dos', elbow: 'Coude', wrist: 'Poignet',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barre', rack: 'Rack / cage', bench: 'Banc', dumbbell: 'Haltères',
  machines: 'Machines', cables: 'Poulies', pullup_bar: 'Barre de traction',
};
