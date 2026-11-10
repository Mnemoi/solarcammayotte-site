/** Identifiant unique ; crypto.randomUUID n'existe pas hors contexte sécurisé (http sur le réseau local). */
export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
