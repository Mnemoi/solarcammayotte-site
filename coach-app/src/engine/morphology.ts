import type { Insight, Profile, Traits } from '../types';

// Seuils indicatifs issus de la pratique en force athlétique, pas de normes médicales.
const APE_LONG = 1.03;
const APE_SHORT = 0.99;
const FEMUR_TORSO_LONG = 0.85;
const FEMUR_TORSO_SHORT = 0.75;

export function analyzeMorphology(p: Profile): Traits {
  const apeIndex = p.armSpanCm && p.heightCm ? p.armSpanCm / p.heightCm : 1;
  const femurTorso = p.femurCm && p.torsoCm ? p.femurCm / p.torsoCm : 0.8;
  return {
    apeIndex,
    femurTorso,
    longArms: apeIndex >= APE_LONG,
    shortArms: apeIndex <= APE_SHORT,
    longFemur: femurTorso >= FEMUR_TORSO_LONG,
    shortFemur: femurTorso <= FEMUR_TORSO_SHORT,
  };
}

export function morphologyInsights(p: Profile, t: Traits): Insight[] {
  const out: Insight[] = [];
  const hasArms = Boolean(p.armSpanCm);
  const hasLegs = Boolean(p.femurCm && p.torsoCm);

  if (!hasArms && !hasLegs) {
    out.push({
      title: 'Mesures manquantes',
      text: "Ajoute ton envergure, la longueur de ton fémur et de ton buste dans ton profil pour affiner le choix des exercices.",
    });
  }
  if (hasArms) {
    if (t.longArms) {
      out.push({
        title: `Bras longs (ratio ${t.apeIndex.toFixed(2)})`,
        text: "Le soulevé de terre conventionnel est avantageux (barre plus proche du sol à tirer moins loin). Au développé couché, l'amplitude est plus grande : privilégie l'incliné, les haltères ou la presse pectorale, et garde les omoplates serrées.",
      });
    } else if (t.shortArms) {
      out.push({
        title: `Bras courts (ratio ${t.apeIndex.toFixed(2)})`,
        text: "Le développé couché te convient bien (amplitude réduite). Au soulevé de terre, le sumo ou le conventionnel avec un départ plus haut aide à compenser.",
      });
    } else {
      out.push({ title: 'Envergure standard', text: "Pas de contrainte particulière sur les tirages et poussées." });
    }
  }
  if (hasLegs) {
    if (t.longFemur) {
      out.push({
        title: `Fémurs longs (ratio ${t.femurTorso.toFixed(2)})`,
        text: "Tu auras tendance à pencher le buste au squat. Squat avant, presse, hack squat ou squat avec talons surélevés gardent le dos plus vertical. Pieds un peu plus écartés et pointes ouvertes.",
      });
    } else if (t.shortFemur) {
      out.push({
        title: `Fémurs courts (ratio ${t.femurTorso.toFixed(2)})`,
        text: "Tu es bien placé pour le squat barre arrière avec un buste vertical et une grande profondeur.",
      });
    } else {
      out.push({ title: 'Proportions jambes/buste standard', text: "Le squat classique fonctionne bien, ajuste la largeur de stance selon tes sensations." });
    }
  }
  return out;
}

/** Indice de masse corporelle, utile uniquement comme repère grossier. */
export function bmi(p: Profile): number {
  const m = p.heightCm / 100;
  return p.weightKg / (m * m);
}
