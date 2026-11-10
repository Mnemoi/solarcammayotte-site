import type { Traits } from '../types';

/**
 * Squelette de profil, vu de côté, tourné vers la droite.
 * Chaque angle est une direction mesurée depuis la verticale (0° = vers le haut,
 * 90° = vers la droite/avant, 180° = vers le bas, -90° = vers la gauche/arrière).
 */
export interface Point { x: number; y: number }

export interface Angles {
  shin: number; // cheville -> genou
  thigh: number; // genou -> hanche
  torso: number; // hanche -> épaule
  upperArm: number; // épaule -> coude
  forearm: number; // coude -> poignet
}

export type JointName = 'ankle' | 'knee' | 'hip' | 'shoulder' | 'elbow' | 'wrist';

export interface PoseSpec {
  root: JointName;
  at: Point;
  angles: Angles;
}

export interface Skeleton {
  ankle: Point; knee: Point; hip: Point; shoulder: Point; elbow: Point; wrist: Point; head: Point;
}

export const LENGTHS = { shin: 26, thigh: 27, torso: 34, upperArm: 18, forearm: 17, neck: 14 } as const;
export const HEAD_RADIUS = 6;
export const GROUND_Y = 120;
export const VIEWBOX = '0 -26 120 152';
export const BARBELL_RADIUS = 12;
export const DUMBBELL_RADIUS = 5;

const JOINTS: JointName[] = ['ankle', 'knee', 'hip', 'shoulder', 'elbow', 'wrist'];
const SEGMENTS: (keyof Angles)[] = ['shin', 'thigh', 'torso', 'upperArm', 'forearm'];

const rad = (deg: number) => (deg * Math.PI) / 180;
const dir = (deg: number): Point => ({ x: Math.sin(rad(deg)), y: -Math.cos(rad(deg)) });

/** Cinématique directe à partir d'une articulation fixée. */
export function solve(spec: PoseSpec): Skeleton {
  const pts: Point[] = new Array(JOINTS.length);
  const r = JOINTS.indexOf(spec.root);
  pts[r] = spec.at;
  for (let i = r; i < SEGMENTS.length; i++) {
    const d = dir(spec.angles[SEGMENTS[i]]);
    const L = LENGTHS[SEGMENTS[i]];
    pts[i + 1] = { x: pts[i].x + d.x * L, y: pts[i].y + d.y * L };
  }
  for (let i = r - 1; i >= 0; i--) {
    const d = dir(spec.angles[SEGMENTS[i]]);
    const L = LENGTHS[SEGMENTS[i]];
    pts[i] = { x: pts[i + 1].x - d.x * L, y: pts[i + 1].y - d.y * L };
  }
  const n = dir(spec.angles.torso);
  const [ankle, knee, hip, shoulder, elbow, wrist] = pts;
  return { ankle, knee, hip, shoulder, elbow, wrist, head: { x: shoulder.x + n.x * LENGTHS.neck, y: shoulder.y + n.y * LENGTHS.neck } };
}

export function lerpSpec(a: PoseSpec, b: PoseSpec, t: number): PoseSpec {
  const mix = (x: number, y: number) => x + (y - x) * t;
  const angles = {} as Angles;
  for (const k of SEGMENTS) angles[k] = mix(a.angles[k], b.angles[k]);
  return { root: a.root, at: { x: mix(a.at.x, b.at.x), y: mix(a.at.y, b.at.y) }, angles };
}

export type Scene = 'floor' | 'bench' | 'bar';
export type Implement = 'barbell' | 'dumbbell' | 'none';
export type MovementKey = 'squat' | 'deadlift' | 'rdl' | 'bench' | 'ohp' | 'row' | 'pullup' | 'curl' | 'pushup';

export interface Movement {
  key: MovementKey;
  label: string;
  scene: Scene;
  implement: Implement;
  implementAt: 'wrist' | 'shoulder';
  start: PoseSpec;
  end: PoseSpec;
  startLabel: string;
  endLabel: string;
  cues: string[];
}

const ANKLE: Point = { x: 60, y: GROUND_Y - 5 };
const stand = (a: Partial<Angles>): Angles => ({ shin: 0, thigh: 0, torso: 0, upperArm: 172, forearm: 174, ...a });
const at = (root: JointName, p: Point = ANKLE) => ({ root, at: p });

const EXERCISE_MOVEMENT: Record<string, MovementKey> = {
  back_squat: 'squat', front_squat: 'squat', goblet_squat: 'squat', bodyweight_squat: 'squat',
  conventional_deadlift: 'deadlift', sumo_deadlift: 'deadlift',
  rdl: 'rdl', db_rdl: 'rdl',
  bench_press: 'bench', db_bench_press: 'bench',
  overhead_press: 'ohp', db_shoulder_press: 'ohp',
  barbell_row: 'row',
  pull_up: 'pullup',
  barbell_curl: 'curl', db_curl: 'curl',
  pushup: 'pushup',
};

export function movementKeyFor(exerciseId: string): MovementKey | null {
  return EXERCISE_MOVEMENT[exerciseId] ?? null;
}

/** Construit le schéma animé d'un exercice, adapté à la morphologie quand c'est pertinent. */
export function buildMovement(exerciseId: string, traits?: Traits): Movement | null {
  const key = movementKeyFor(exerciseId);
  if (!key) return null;
  const dumbbell = exerciseId.startsWith('db_') || exerciseId === 'goblet_squat';

  switch (key) {
    case 'squat': {
      // Fémurs longs : le buste penche davantage ; fémurs courts : plus vertical.
      const lean = traits?.longFemur ? 50 : traits?.shortFemur ? 28 : 38;
      const arms = { upperArm: 150, forearm: -40 };
      return {
        key, label: 'Squat', scene: 'floor', implement: exerciseId === 'bodyweight_squat' ? 'none' : dumbbell ? 'dumbbell' : 'barbell',
        implementAt: dumbbell ? 'wrist' : 'shoulder',
        start: { ...at('ankle'), angles: stand(arms) },
        end: { ...at('ankle'), angles: stand({ shin: 38, thigh: -84, torso: lean, ...arms }) },
        startLabel: 'Debout', endLabel: 'Cuisses parallèles',
        cues: ['Pieds un peu plus larges que le bassin, pointes légèrement ouvertes.', 'Descends en poussant les genoux dans l\'axe des pieds.', 'Garde le dos neutre et les talons au sol.', 'Remonte en poussant le sol.'],
      };
    }
    case 'deadlift': {
      const sumo = exerciseId === 'sumo_deadlift';
      return {
        key, label: sumo ? 'Soulevé de terre sumo' : 'Soulevé de terre', scene: 'floor', implement: 'barbell', implementAt: 'wrist',
        start: { ...at('ankle'), angles: stand(sumo ? { shin: 18, thigh: -78, torso: 52 } : { shin: 24, thigh: -76, torso: 66 }) },
        end: { ...at('ankle'), angles: stand({}) },
        startLabel: 'Départ', endLabel: 'Verrouillage',
        cues: ['Barre au-dessus du milieu du pied, au contact des jambes.', 'Dos plat, épaules devant la barre, gaine les abdos.', 'Pousse le sol, ne tire pas avec les bras.', 'Hanches et genoux se tendent ensemble.'],
      };
    }
    case 'rdl':
      return {
        key, label: 'Soulevé de terre roumain', scene: 'floor', implement: dumbbell ? 'dumbbell' : 'barbell', implementAt: 'wrist',
        start: { ...at('ankle'), angles: stand({}) },
        end: { ...at('ankle'), angles: stand({ shin: 8, thigh: -20, torso: 80 }) },
        startLabel: 'Debout', endLabel: 'Hanches en arrière',
        cues: ['Genoux légèrement fléchis et fixes.', 'Pousse les hanches vers l\'arrière, barre collée aux jambes.', 'Descends jusqu\'à sentir l\'étirement des ischio-jambiers.', 'Dos plat tout du long.'],
      };
    case 'bench':
      return {
        key, label: 'Développé couché', scene: 'bench', implement: dumbbell ? 'dumbbell' : 'barbell', implementAt: 'wrist',
        start: { ...at('hip', { x: 70, y: 90 }), angles: { shin: 15, thigh: -90, torso: -90, upperArm: 0, forearm: 0 } },
        end: { ...at('hip', { x: 70, y: 90 }), angles: { shin: 15, thigh: -90, torso: -90, upperArm: 115, forearm: 0 } },
        startLabel: 'Bras tendus', endLabel: 'Barre sur la poitrine',
        cues: ['Omoplates serrées, pieds ancrés au sol.', 'Descends la barre en contrôle vers le bas des pectoraux.', 'Avant-bras verticaux en bas du mouvement.', 'Pousse en gardant les poignets alignés.'],
      };
    case 'ohp':
      return {
        key, label: 'Développé militaire', scene: 'floor', implement: dumbbell ? 'dumbbell' : 'barbell', implementAt: 'wrist',
        start: { ...at('ankle'), angles: stand({ upperArm: 150, forearm: -10 }) },
        end: { ...at('ankle'), angles: stand({ upperArm: 5, forearm: 0 }) },
        startLabel: 'Barre aux épaules', endLabel: 'Bras tendus',
        cues: ['Fessiers et abdos serrés, ne cambre pas le bas du dos.', 'Pousse la barre en ligne droite, tête légèrement en arrière puis dessous.', 'Verrouille les bras au-dessus des oreilles.'],
      };
    case 'row':
      return {
        key, label: 'Rowing barre', scene: 'floor', implement: 'barbell', implementAt: 'wrist',
        start: { ...at('ankle'), angles: stand({ shin: 10, thigh: -30, torso: 65 }) },
        end: { ...at('ankle'), angles: stand({ shin: 10, thigh: -30, torso: 65, upperArm: -70, forearm: 170 }) },
        startLabel: 'Bras tendus', endLabel: 'Barre au ventre',
        cues: ['Buste penché, dos plat, regard vers le sol.', 'Tire les coudes vers les hanches.', 'Serre les omoplates en haut sans balancer le buste.'],
      };
    case 'pullup':
      return {
        key, label: 'Tractions', scene: 'bar', implement: 'none', implementAt: 'wrist',
        start: { ...at('wrist', { x: 60, y: 22 }), angles: { shin: 90, thigh: 0, torso: 0, upperArm: 0, forearm: 0 } },
        end: { ...at('wrist', { x: 60, y: 22 }), angles: { shin: 90, thigh: 0, torso: 0, upperArm: 160, forearm: -10 } },
        startLabel: 'Suspension', endLabel: 'Menton au-dessus',
        cues: ['Épaules basses, poitrine vers la barre.', 'Tire les coudes vers les côtés.', 'Descends en contrôle jusqu\'aux bras tendus.'],
      };
    case 'curl':
      return {
        key, label: 'Curl biceps', scene: 'floor', implement: dumbbell ? 'dumbbell' : 'barbell', implementAt: 'wrist',
        start: { ...at('ankle'), angles: stand({}) },
        end: { ...at('ankle'), angles: stand({ forearm: 10 }) },
        startLabel: 'Bras tendus', endLabel: 'Contraction',
        cues: ['Coudes collés au corps.', 'Ne balance pas le buste.', 'Descends lentement, 2 à 3 secondes.'],
      };
    case 'pushup':
      return {
        key, label: 'Pompes', scene: 'floor', implement: 'none', implementAt: 'wrist',
        start: { ...at('ankle', { x: 8, y: GROUND_Y - 5 }), angles: { shin: 70, thigh: 70, torso: 70, upperArm: 180, forearm: 180 } },
        end: { ...at('ankle', { x: 8, y: GROUND_Y - 5 }), angles: { shin: 82, thigh: 82, torso: 82, upperArm: -90, forearm: 180 } },
        startLabel: 'Bras tendus', endLabel: 'Poitrine près du sol',
        cues: ['Corps en planche, fessiers et abdos serrés.', 'Coudes à environ 45° du buste.', 'Descends jusqu\'à frôler le sol, puis pousse.'],
      };
  }
}
