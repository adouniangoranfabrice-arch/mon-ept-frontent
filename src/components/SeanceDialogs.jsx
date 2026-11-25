import { useCallback, useMemo, useState } from "react";
import { useStore } from "../store/StoreContext.jsx";
import { useToast } from "./Toast.jsx";
import { Button, ConfirmDialog, ErrorBox, Field, InfoRow, Modal } from "./ui.jsx";
import { byDebut, byOrdre, dureeHeure, fmtDuree, indexBy } from "../utils.js";

const EMPTY = { jour_id: "", heure_id: "", classe_id: "", salle: "", recurrente: true };

/* ---------- Formulaire Créer / Modifier ---------- */
function SeanceForm({ initial, onCancel, onSaved }) {
  const { data, save } = useStore();
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  // Jours actifs (+ le jour actuel de la séance s'il a été désactivé depuis)
  const jours = data.jours.filter((j) => j.actif || j.id === form.jour_id).sort(byOrdre);
  const heures = [...data.heures].sort(byDebut);
  const classes = [...data.classes].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const classeById = indexBy(data.classes);

  // Créneaux déjà occupés ce jour-là (hors séance en cours d'édition)
  const occupes = useMemo(() => {
    const m = {};
    data.seances
      .filter((s) => s.jour_id === form.jour_id && s.id !== form.id)
      .forEach((s) => (m[s.heure_id] = classeById[s.classe_id]?.nom ?? "?"));
    return m;
  }, [data.seances, form.jour_id, form.id, classeById]);

  const submit = async (e) => {
    e.preventDefault();
    const res = await save("seances", form);
    if (!res.ok) return setError(res.error);
    onSaved(res);
  };

  if (classes.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-[15px] text-muted">
          Vous n'avez encore aucune classe. Créez d'abord une classe dans l'onglet « Classes ».
        </p>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Fermer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Jour" htmlFor="s-jour">
        <select id="s-jour" className="field" value={form.jour_id} onChange={set("jour_id")} required>
          <option value="">— Choisir —</option>
          {jours.map((j) => (
            <option key={j.id} value={j.id}>
              {j.libelle}
              {!j.actif ? " (inactif)" : ""}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Heure" htmlFor="s-heure" hint={!form.jour_id ? "Choisissez d'abord un jour pour voir les créneaux libres." : null}>
        <select id="s-heure" className="field" value={form.heure_id} onChange={set("heure_id")} required>
          <option value="">— Choisir —</option>
          {heures.map((h) => (
            <option key={h.id} value={h.id} disabled={!!occupes[h.id]}>
              {h.code} · {h.heure_debut} – {h.heure_fin}
              {occupes[h.id] ? `  (occupé : ${occupes[h.id]})` : ""}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Classe" htmlFor="s-classe">
        <select id="s-classe" className="field" value={form.classe_id} onChange={set("classe_id")} required>
          <option value="">— Choisir —</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom} {c.niveau ? `· ${c.niveau}` : ""}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Salle" htmlFor="s-salle">
        <input id="s-salle" className="field" value={form.salle} onChange={set("salle")} placeholder="Ex. Salle info 1" />
      </Field>

      <label className="flex cursor-pointer items-center gap-3 text-[15px]">
        <input type="checkbox" checked={form.recurrente} onChange={set("recurrente")} className="h-5 w-5 accent-accent" />
        Répéter chaque semaine
      </label>

      <ErrorBox message={error} />

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" icon="check">
          {form.id ? "Enregistrer" : "Créer la séance"}
        </Button>
      </div>
    </form>
  );
}

/* ---------- Hook réutilisable : Voir / Créer / Modifier / Supprimer une séance ---------- */
export function useSeanceDialogs() {
  const { data, remove } = useStore();
  const toast = useToast();
  const [state, setState] = useState({ mode: null, item: null });

  const close = useCallback(() => setState({ mode: null, item: null }), []);
  const openCreate = useCallback((prefill = {}) => setState({ mode: "create", item: prefill }), []);
  const openEdit = useCallback((s) => setState({ mode: "edit", item: s }), []);
  const openView = useCallback((s) => setState({ mode: "view", item: s }), []);
  const askDelete = useCallback((s) => setState({ mode: "delete", item: s }), []);

  const J = indexBy(data.jours);
  const H = indexBy(data.heures);
  const C = indexBy(data.classes);
  const s = state.item;

  const label = s && s.id ? `${C[s.classe_id]?.nom ?? "?"} · ${J[s.jour_id]?.libelle ?? "?"} ${H[s.heure_id]?.heure_debut ?? ""}` : "";

  const dialogs = (
    <>
      <Modal
        open={state.mode === "create" || state.mode === "edit"}
        onClose={close}
        title={state.mode === "edit" ? "Modifier la séance" : "Nouvelle séance"}
      >
        {(state.mode === "create" || state.mode === "edit") && (
          <SeanceForm
            key={s?.id ?? "new"}
            initial={s}
            onCancel={close}
            onSaved={(res) => {
              toast(res.isNew ? "Séance créée" : "Séance modifiée");
              close();
            }}
          />
        )}
      </Modal>

      <Modal
        open={state.mode === "view"}
        onClose={close}
        title="Détail de la séance"
        footer={
          s && (
            <>
              <Button variant="secondary" icon="trash" className="!text-red-600" onClick={() => askDelete(s)}>
                Supprimer
              </Button>
              <Button icon="edit" data-autofocus onClick={() => openEdit(s)}>
                Modifier
              </Button>
            </>
          )
        }
      >
        {s && state.mode === "view" && (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-4 w-4 rounded" style={{ background: C[s.classe_id]?.couleur }} />
              <span className="font-display text-2xl font-bold">{C[s.classe_id]?.nom}</span>
            </div>
            <InfoRow label="Jour">{J[s.jour_id]?.libelle}</InfoRow>
            <InfoRow label="Heure">
              {H[s.heure_id]?.code} · {H[s.heure_id]?.heure_debut} – {H[s.heure_id]?.heure_fin}
            </InfoRow>
            <InfoRow label="Durée">{fmtDuree(dureeHeure(H[s.heure_id]))}</InfoRow>
            <InfoRow label="Niveau">{C[s.classe_id]?.niveau || "—"}</InfoRow>
            <InfoRow label="Effectif">{C[s.classe_id]?.effectif ?? "—"}</InfoRow>
            <InfoRow label="Salle">{s.salle || "—"}</InfoRow>
            <InfoRow label="Récurrente">{s.recurrente ? "Oui, chaque semaine" : "Non"}</InfoRow>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={state.mode === "delete"}
        title="Supprimer la séance ?"
        message={`La séance « ${label} » sera définitivement supprimée.`}
        onCancel={close}
        onConfirm={async () => {
          const r = await remove("seances", s.id);
          toast(r.ok ? "Séance supprimée" : r.error, r.ok ? "success" : "error");
          close();
        }}
      />
    </>
  );

  return { openCreate, openEdit, openView, askDelete, dialogs };
}
