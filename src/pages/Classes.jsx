import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "../store/StoreContext.jsx";
import Icon from "../components/Icon.jsx";
import { useToast } from "../components/Toast.jsx";
import { Button, ConfirmDialog, EmptyState, ErrorBox, Field, IconButton, InfoRow, Modal, PageHeader, listItem } from "../components/ui.jsx";
import { COULEURS, NIVEAUX, byOrdre, cleNom, dureeHeure, fmtDuree, indexBy, parNiveau, tint } from "../utils.js";

function ClasseForm({ initial, onCancel, onSaved, prochaineCouleur }) {
  const { save } = useStore();
  const [form, setForm] = useState({ nom: "", niveau: "", effectif: "", couleur: prochaineCouleur, ...initial });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const res = await save("classes", form);
    if (!res.ok) return setError(res.error);
    onSaved(res);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom de la classe" htmlFor="c-nom">
          <input id="c-nom" className="field" value={form.nom} onChange={set("nom")} placeholder="Ex. Tle D" required />
        </Field>
        <Field label="Niveau" htmlFor="c-niveau">
          <select id="c-niveau" className="field" value={form.niveau ?? ""} onChange={set("niveau")}>
            <option value="">— Choisir —</option>
            {NIVEAUX.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
            {form.niveau && !NIVEAUX.includes(form.niveau) && <option value={form.niveau}>{form.niveau}</option>}
          </select>
        </Field>
      </div>
      <Field label="Effectif" htmlFor="c-eff" hint="Nombre d'élèves (facultatif)">
        <input id="c-eff" type="number" min="0" step="1" className="field" value={form.effectif ?? ""} onChange={set("effectif")} />
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Couleur</legend>
        <div className="flex flex-wrap items-center gap-2">
          {COULEURS.map((c) => (
            <motion.button
              key={c}
              type="button"
              whileTap={{ scale: 0.9 }}
              aria-label={`Couleur ${c}`}
              aria-pressed={form.couleur === c}
              onClick={() => setForm((f) => ({ ...f, couleur: c }))}
              className="h-9 w-9 rounded-full ring-offset-2 transition"
              style={{ background: c, boxShadow: form.couleur === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : "none" }}
            />
          ))}
          <label className="ml-1 inline-flex items-center gap-2 text-sm text-muted">
            Autre
            <input type="color" value={form.couleur} onChange={set("couleur")} className="h-9 w-12 cursor-pointer rounded border border-line" />
          </label>
        </div>
      </fieldset>
      <ErrorBox message={error} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" icon="check">{form.id ? "Enregistrer" : "Créer la classe"}</Button>
      </div>
    </form>
  );
}

export default function Classes({ goTo }) {
  const { data, remove, dependants } = useStore();
  const toast = useToast();
  const [state, setState] = useState({ mode: null, item: null });
  const close = () => setState({ mode: null, item: null });

  const H = indexBy(data.heures);
  const J = indexBy(data.jours);
  const classes = [...data.classes].sort(parNiveau);
  const seancesDe = (id) =>
    data.seances
      .filter((s) => s.classe_id === id && J[s.jour_id] && H[s.heure_id])
      .sort((a, b) => byOrdre(J[a.jour_id], J[b.jour_id]) || H[a.heure_id].heure_debut.localeCompare(H[b.heure_id].heure_debut));
  const minutesDe = (id) => seancesDe(id).reduce((t, s) => t + dureeHeure(H[s.heure_id]), 0);
  const prochaineCouleur = COULEURS.find((c) => !data.classes.some((k) => k.couleur === c)) ?? COULEURS[0];
  const it = state.item;
  const nbDep = it?.id ? dependants("classes", it.id) : 0;
  const elevesDe = (id) => data.eleves.filter((e) => e.classe_id === id).length;
  const nbEleves = it?.id ? elevesDe(it.id) : 0;
  const listeEleves = (id) =>
    data.eleves
      .filter((e) => e.classe_id === id)
      .sort((a, b) => cleNom(a.nom_prenoms).localeCompare(cleNom(b.nom_prenoms), "fr"));

  return (
    <>
      <PageHeader
        title="Classes"
        subtitle={`${data.classes.length} classe(s)`}
        actions={<Button icon="plus" onClick={() => setState({ mode: "form", item: {} })}>Nouvelle classe</Button>}
      />

      {classes.length === 0 ? (
        <EmptyState icon="users" title="Aucune classe" text="Ajoutez les classes que vous suivez cette année." />
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {classes.map((c) => (
              <motion.div key={c.id} layout {...listItem} className="rounded-2xl border border-line bg-white p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold"
                      style={{ background: tint(c.couleur, 0.15), color: c.couleur }}
                    >
                      {c.nom.replace(/\s+/g, "").slice(0, 4)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-display text-lg font-bold">{c.nom}</div>
                      <div className="truncate text-sm text-muted">{c.niveau || "Niveau non précisé"}</div>
                    </div>
                  </div>
                  <div className="-mr-2 flex shrink-0">
                    <IconButton label="Voir" icon="eye" onClick={() => setState({ mode: "view", item: c })} />
                    <IconButton label="Modifier" icon="edit" onClick={() => setState({ mode: "form", item: c })} />
                    <IconButton label="Supprimer" icon="trash" tone="danger" onClick={() => setState({ mode: "delete", item: c })} />
                  </div>
                </div>
                <div className="mt-4 flex gap-6 text-sm">
                  <div>
                    <span className="font-semibold">{elevesDe(c.id) || c.effectif || "—"}</span>{" "}
                    <span className="text-muted">{elevesDe(c.id) ? "élèves inscrits" : "élèves"}</span>
                  </div>
                  <div><span className="font-semibold">{fmtDuree(minutesDe(c.id))}</span> <span className="text-muted">/ semaine</span></div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <Modal open={state.mode === "form"} onClose={close} title={it?.id ? "Modifier la classe" : "Nouvelle classe"}>
        {state.mode === "form" && (
          <ClasseForm
            key={it?.id ?? "new"}
            initial={it}
            prochaineCouleur={prochaineCouleur}
            onCancel={close}
            onSaved={(r) => { toast(r.isNew ? "Classe créée" : "Classe modifiée"); close(); }}
          />
        )}
      </Modal>

      <Modal
        open={state.mode === "view"}
        onClose={close}
        title="Détail de la classe"
        footer={<Button icon="edit" data-autofocus onClick={() => setState({ mode: "form", item: it })}>Modifier</Button>}
      >
        {state.mode === "view" && it && (
          <>
            <div className="mb-3 flex items-center gap-3">
              <span className="h-4 w-4 rounded" style={{ background: it.couleur }} />
              <span className="font-display text-2xl font-bold">{it.nom}</span>
            </div>
            <InfoRow label="Niveau">{it.niveau || "—"}</InfoRow>
            <InfoRow label="Effectif">{it.effectif ?? "—"}</InfoRow>
            <InfoRow label="Élèves inscrits">{elevesDe(it.id)}</InfoRow>
            <InfoRow label="Volume horaire">{fmtDuree(minutesDe(it.id))} / semaine</InfoRow>

            <div className="mt-5 mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                Élèves <span className="font-normal text-muted">({nbEleves})</span>
              </h3>
              <button
                type="button"
                onClick={() => goTo("eleves")}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-accent hover:bg-accent/10"
              >
                <Icon name="student" size={15} />
                Gérer les élèves
              </button>
            </div>
            {nbEleves === 0 ? (
              <p className="text-sm text-muted">Aucun élève inscrit. Importez la liste depuis la page Élèves.</p>
            ) : (
              <ol className="max-h-72 overflow-y-auto rounded-lg border border-line">
                {listeEleves(it.id).map((e, i) => (
                  <li key={e.id} className="flex items-center gap-3 border-b border-gray-100 px-3 py-1.5 text-sm last:border-0">
                    <span className="w-7 shrink-0 text-right text-xs tabular-nums text-muted">{i + 1}</span>
                    <span className="truncate">{e.nom_prenoms}</span>
                  </li>
                ))}
              </ol>
            )}

            <h3 className="mt-5 mb-2 text-sm font-semibold">Séances</h3>
            {seancesDe(it.id).length === 0 ? (
              <p className="text-sm text-muted">Aucune séance programmée.</p>
            ) : (
              <ul className="space-y-1.5">
                {seancesDe(it.id).map((s) => (
                  <li key={s.id} className="flex justify-between rounded-lg bg-ground px-3 py-2 text-sm">
                    <span className="font-medium">{J[s.jour_id].libelle}</span>
                    <span className="tabular-nums text-muted">
                      {H[s.heure_id].heure_debut} – {H[s.heure_id].heure_fin} {s.salle ? `· ${s.salle}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={state.mode === "delete"}
        title="Supprimer la classe ?"
        message={
          [
            `La classe « ${it?.nom} » sera supprimée`,
            nbDep ? `avec ses ${nbDep} séance(s)` : "",
            nbEleves ? `${nbDep ? "et" : "avec"} ses ${nbEleves} élève(s)` : "",
          ].filter(Boolean).join(" ") + "."
        }
        onCancel={close}
        onConfirm={async () => { const r = await remove("classes", it.id); toast(r.ok ? "Classe supprimée" : r.error, r.ok ? "success" : "error"); close(); }}
      />
    </>
  );
}
