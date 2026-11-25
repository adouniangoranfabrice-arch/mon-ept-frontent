import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const TABLES = ["jours", "heures", "classes", "seances"];

/** Clé étrangère des séances pour chaque table de référence */
const FK = { jours: "jour_id", heures: "heure_id", classes: "classe_id" };

const isValidData = (d) => d && TABLES.every((t) => Array.isArray(d[t]));

/** Complète les listes ajoutées au fil des versions (élèves, évaluations, notes). */
const completer = (d) => ({ ...d, eleves: d.eleves ?? [], evaluations: d.evaluations ?? [], notes: d.notes ?? [] });

const StoreContext = createContext(null);

function Ecran({ children }) {
  return <div className="flex min-h-screen items-center justify-center p-6 text-center">{children}</div>;
}

export function StoreProvider({ children }) {
  const [data, setData] = useState(null);
  const [etat, setEtat] = useState({ statut: "chargement", erreur: null });
  const [stockage, setStockage] = useState(null); // "mongodb" ou "sqlite", fourni par /api/health

  const charger = useCallback(async () => {
    setEtat({ statut: "chargement", erreur: null });
    try {
      const [donnees, sante] = await Promise.all([api.get("/data"), api.get("/health")]);
      setStockage(sante?.stockage ?? null);
      setData(completer(donnees));
      setEtat({ statut: "pret", erreur: null });
    } catch (e) {
      setEtat({ statut: "erreur", erreur: e.message });
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  /** Créer (sans id) ou modifier (avec id). Renvoie { ok, error, item, isNew } */
  const save = useCallback(async (table, raw) => {
    const isNew = !raw.id;
    try {
      const item = isNew ? await api.post(`/${table}`, raw) : await api.put(`/${table}/${raw.id}`, raw);
      setData((d) => {
        const next = { ...d, [table]: isNew ? [...d[table], item] : d[table].map((x) => (x.id === item.id ? item : x)) };
        const avant = !isNew && table === "eleves" && d.eleves.find((e) => e.id === item.id);
        if (avant && avant.classe_id !== item.classe_id) next.notes = d.notes.filter((n) => n.eleve_id !== item.id);
        return next;
      });
      return { ok: true, item, isNew };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  /** Supprimer (le serveur supprime aussi les séances liées). Renvoie { ok, error } */
  const remove = useCallback(async (table, id) => {
    try {
      await api.del(`/${table}/${id}`);
      setData((d) => {
        const next = { ...d, [table]: d[table].filter((x) => x.id !== id) };
        const fk = FK[table];
        if (fk) next.seances = d.seances.filter((s) => s[fk] !== id);
        if (table === "classes") {
          const evals = new Set(d.evaluations.filter((v) => v.classe_id === id).map((v) => v.id));
          next.eleves = d.eleves.filter((e) => e.classe_id !== id);
          next.evaluations = d.evaluations.filter((v) => v.classe_id !== id);
          next.notes = d.notes.filter((n) => !evals.has(n.evaluation_id));
        }
        if (table === "eleves") next.notes = d.notes.filter((n) => n.eleve_id !== id);
        if (table === "evaluations") next.notes = d.notes.filter((n) => n.evaluation_id !== id);
        return next;
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  /** Nombre de séances qui dépendent d'un jour / d'une heure / d'une classe */
  const dependants = useCallback(
    (table, id) => {
      const fk = FK[table];
      return fk ? data.seances.filter((s) => s[fk] === id).length : 0;
    },
    [data]
  );

  /** Lit un fichier Excel d'élèves sur le serveur (aperçu, rien n'est enregistré). Renvoie { ok, apercu, error } */
  const lireFichierEleves = useCallback(async (fichier) => {
    try {
      return { ok: true, apercu: await api.upload("/eleves/lecture", fichier) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  /** Inscrit une liste de noms dans une classe. Renvoie { ok, resultat: { ajoutes, ignores }, error } */
  const importerEleves = useCallback(async (classe_id, noms) => {
    try {
      const resultat = await api.post("/eleves/import", { classe_id, noms });
      setData((d) => ({ ...d, eleves: [...d.eleves, ...resultat.ajoutes] }));
      return { ok: true, resultat };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  /** Enregistre les notes d'une évaluation : [{ eleve_id, valeur | null }]. Renvoie { ok, notes, error } */
  const enregistrerNotes = useCallback(async (evaluation_id, saisies) => {
    try {
      const notes = await api.put(`/evaluations/${evaluation_id}/notes`, { notes: saisies });
      setData((d) => ({ ...d, notes: [...d.notes.filter((n) => n.evaluation_id !== evaluation_id), ...notes] }));
      return { ok: true, notes };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  /** Import d'une sauvegarde. Renvoie { ok, error } */
  const replaceAll = useCallback(async (d) => {
    if (!isValidData(d)) return { ok: false, error: "Fichier invalide." };
    try {
      setData(completer(await api.put("/data", d)));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  const reset = useCallback(async () => {
    try {
      setData(completer(await api.post("/reset")));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  const value = useMemo(
    () => ({ data, stockage, save, remove, dependants, lireFichierEleves, importerEleves, enregistrerNotes, replaceAll, reset }),
    [data, stockage, save, remove, dependants, lireFichierEleves, importerEleves, enregistrerNotes, replaceAll, reset]
  );

  if (etat.statut === "chargement") {
    return <Ecran><p className="text-muted">Chargement de l'emploi du temps…</p></Ecran>;
  }
  if (etat.statut === "erreur") {
    return (
      <Ecran>
        <div className="max-w-md space-y-3">
          <h1 className="font-display text-2xl font-bold">Impossible de charger les données</h1>
          <p className="text-muted">{etat.erreur}</p>
          <p className="text-sm text-muted">
            Dans le dossier <code>backend</code>, lancez : <code>.venv\Scripts\python -m uvicorn app.main:app --reload</code>
          </p>
          <button type="button" onClick={charger} className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-dark">
            Réessayer
          </button>
        </div>
      </Ecran>
    );
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore doit être utilisé dans <StoreProvider>");
  return ctx;
}
