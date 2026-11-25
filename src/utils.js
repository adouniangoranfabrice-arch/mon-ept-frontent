export const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);

/** "07:30" -> 450 */
export const toMin = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** 90 -> "1 h 30" */
export const fmtDuree = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (min === 0) return "0 h";
  if (h === 0) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
};

export const byOrdre = (a, b) => a.ordre - b.ordre;
export const byDebut = (a, b) => a.heure_debut.localeCompare(b.heure_debut);

export const COULEURS = [
  "#4C6EF5",
  "#12B886",
  "#F08C00",
  "#D6336C",
  "#1C7ED6",
  "#7048E8",
  "#2F9E44",
  "#E8590C",
  "#0C8599",
  "#AE3EC9",
];

/** Couleur semi-transparente à partir d'un hex */
export const tint = (hex, alpha = 0.12) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/** Index { id: objet } */
export const indexBy = (list) => Object.fromEntries(list.map((x) => [x.id, x]));

/** Durée d'une séance en minutes */
export const dureeHeure = (h) => (h ? toMin(h.heure_fin) - toMin(h.heure_debut) : 0);

/* ---------- Classes : ordre de la 6e à la Terminale ---------- */
export const NIVEAUX = ["Sixième", "Cinquième", "Quatrième", "Troisième", "Seconde", "Première", "Terminale"];

// Rang d'une classe (6e = 0 … Tle = 6), d'après le début de son nom, sinon son niveau.
const PREFIXES = [/^6/, /^5/, /^4/, /^3/, /^(2|sec)/i, /^(1|pre|pré)/i, /^(t)/i];
export const rangClasse = (c) => {
  const i = PREFIXES.findIndex((re) => re.test(c.nom.trim()));
  if (i !== -1) return i;
  const j = NIVEAUX.indexOf(c.niveau);
  return j !== -1 ? j : NIVEAUX.length;
};
export const parNiveau = (a, b) =>
  rangClasse(a) - rangClasse(b) || a.nom.localeCompare(b.nom, "fr", { numeric: true, sensitivity: "base" });

/** Clé de comparaison d'un nom : sans accents, sans majuscules, espaces normalisés. */
export const cleNom = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/* ---------- Notes et moyennes ---------- */
export const TRIMESTRES = { 1: "1er trimestre", 2: "2e trimestre", 3: "3e trimestre" };

/** Note affichée à la française : 12,5 */
export const fmtNote = (n) => (n == null ? "—" : n.toLocaleString("fr-FR", { maximumFractionDigits: 2 }));

/** « 12,5 » ou « 12.5 » → 12.5 ; « » → null ; invalide → NaN */
export const lireNote = (texte) => {
  const t = String(texte ?? "").trim().replace(",", ".");
  if (t === "") return null;
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
};

/** Moyenne sur 20 pondérée par les coefficients ; null sans note. notes : [{ valeur, evaluation }] */
export const moyenne = (notes) => {
  let total = 0;
  let poids = 0;
  for (const { valeur, evaluation } of notes) {
    total += (valeur / evaluation.bareme) * 20 * evaluation.coefficient;
    poids += evaluation.coefficient;
  }
  return poids ? Math.round((total / poids) * 100) / 100 : null;
};

/** Moyenne des valeurs non nulles */
export const moyenneSimple = (valeurs) => {
  const v = valeurs.filter((x) => x != null);
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : null;
};

/** Rangs (ex æquo partagés) : { id: rang } à partir de [{ id, valeur }] */
export const rangs = (lignes) => {
  const tries = lignes.filter((l) => l.valeur != null).sort((a, b) => b.valeur - a.valeur);
  const r = {};
  tries.forEach((l, i) => (r[l.id] = i > 0 && l.valeur === tries[i - 1].valeur ? r[tries[i - 1].id] : i + 1));
  return r;
};
