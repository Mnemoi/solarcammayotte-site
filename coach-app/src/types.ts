export type Sex = 'male' | 'female' | 'other';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'hypertrophy' | 'strength' | 'recomp';
export type Equipment = 'barbell' | 'rack' | 'bench' | 'dumbbell' | 'machines' | 'cables' | 'pullup_bar';
export type Muscle =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'abs';
export type Injury = 'knee' | 'shoulder' | 'lower_back' | 'elbow' | 'wrist';

export interface Profile {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  /** Mesures optionnelles (cm) pour l'analyse morphologique. */
  armSpanCm?: number; // envergure, bout des doigts à bout des doigts
  femurCm?: number; // hanche -> genou
  torsoCm?: number; // hanche -> épaule
  level: Level;
  goal: Goal;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: Equipment[];
  injuries: Injury[];
  weakPoints: Muscle[];
}

export interface Traits {
  apeIndex: number;
  femurTorso: number;
  longArms: boolean;
  shortArms: boolean;
  longFemur: boolean;
  shortFemur: boolean;
}

export interface Insight {
  title: string;
  text: string;
}

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  /** Répétitions en réserve visées sur la dernière série. */
  rir: number;
  /** Pourquoi cet exercice pour toi (morphologie, blessures). */
  note?: string;
  /** Date ISO du dernier ajustement automatique de volume. */
  adjustedAt?: string;
}

export interface ProgramDay {
  id: string;
  name: string;
  exercises: PlannedExercise[];
}

export interface Program {
  createdAt: string;
  days: ProgramDay[];
}

export interface SetLog {
  reps: number;
  load: number;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
  /** Répétitions en réserve ressenties sur la dernière série (0 = échec). */
  rir: number;
}

export interface SessionLog {
  id: string;
  date: string;
  dayId: string;
  dayName: string;
  readiness: number; // 1 (épuisé) à 5 (en forme)
  deload: boolean;
  exercises: ExerciseLog[];
}

export interface AppState {
  profile: Profile | null;
  program: Program | null;
  sessions: SessionLog[];
  /** Charge de travail courante par exercice (kg, par haltère pour les haltères). */
  loads: Record<string, number>;
}
