import type { AppState } from './types';

const KEY = 'coach-muscu-v1';

export const EMPTY_STATE: AppState = { profile: null, program: null, sessions: [], loads: {} };

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY_STATE, ...JSON.parse(raw) } : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Stockage plein ou désactivé : l'app reste utilisable pour la session en cours.
  }
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}
