import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { useStore } from "../store/StoreContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { Button, Card, ConfirmDialog, EmptyState, ErrorBox, Field, IconButton, Modal, PageHeader } from "../components/ui.jsx";
import Icon from "../components/Icon.jsx";
import { TRIMESTRES, cleNom, fmtNote, lireNote, moyenne, moyenneSimple, parNiveau, rangs } from "../utils.js";

const ONGLETS = [
  { id: "1", label: "1er trimestre", court: "T1" },
  { id: "2", label: "2e trimestre", court: "T2" },
  { id: "3", label: "3e trimestre", court: "T3" },
  { id: "annee", label: "Année", court: "Année" },
];

/** Date du jour au format AAAA-MM-JJ (heure locale) */
const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtDate = (d) => (d ? new Date(d + "T00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "");
const fmtRang = (r) => (r == null ? "—" : r === 1 ? "1er" : `${r}e`);
// Couleur d'une moyenne sur 20
const tonMoyenne = (m) => (m == null ? "text-muted" : m < 10 ? "text-red-600" : m >= 14 ? "text-emerald-700" : "");

/* ---------- Créer / modifier une évaluation ---------- */
function EvaluationForm({ initial, onCancel, onSaved }) {
  const { save } = useStore();
  const [form, setForm] = useState({ libelle: "", date: aujourdhui(), bareme: 20, coefficient: 1, ...initial });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const res = await save("evaluations", {
      ...form,
      trimestre: Number(form.trimestre),
      bareme: lireNote(form.bareme),
      coefficient: lireNote(form.coefficient),
    });
    if (!res.ok) return setError(res.error);
    onSaved(res);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Libellé" htmlFor="v-lib">
        <input id="v-lib" className="field" value={form.libelle} onChange={set("libelle")} placeholder="Ex. Interrogation 1, Devoir 1…" required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Trimestre" htmlFor="v-tri">
          <select id="v-tri" className="field" value={form.trimestre} onChange={set("trimestre")}>
            {Object.entries(TRIMESTRES).map(([n, l]) => (
              <option key={n} value={n}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Date" htmlFor="v-date">
          <input id="v-date" type="date" className="field" value={form.date} onChange={set("date")} />
        </Field>
        <Field label="Barème (noté sur)" htmlFor="v-bar">
          <input id="v-bar" className="field" inputMode="decimal" value={form.bareme} onChange={set("bareme")} required />
        </Field>
        <Field label="Coefficient" htmlFor="v-coef">
          <input id="v-coef" className="field" inputMode="decimal" value={form.coefficient} onChange={set("coefficient")} required />
        </Field>
      </div>
      <ErrorBox message={error} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" icon="check">{form.id ? "Enregistrer" : "Créer l'évaluation"}</Button>
      </div>
    </form>
  );
}

/* ---------- Saisie des notes d'une évaluation ---------- */
function SaisieNotes({ evaluation, eleves, notes, focusEleve, onCancel, onSaved }) {
  const { enregistrerNotes } = useStore();
  const [valeurs, setValeurs] = useState(() =>
    Object.fromEntries(eleves.map((e) => [e.id, notes[e.id] != null ? String(notes[e.id]).replace(".", ",") : ""]))
  );
  const [error, setError] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const refs = useRef({});

  useEffect(() => {
    const id = focusEleve ?? eleves[0]?.id;
    const t = setTimeout(() => refs.current[id]?.select(), 120);
    return () => clearTimeout(t);
  }, [focusEleve, eleves]);

  const erreurDe = (texte) => {
    const v = lireNote(texte);
    if (v === null) return null;
    if (Number.isNaN(v)) return "Nombre invalide";
    if (v > evaluation.bareme) return `Max ${fmtNote(evaluation.bareme)}`;
    return null;
  };
  const erreurs = eleves.filter((e) => erreurDe(valeurs[e.id]));
  const saisies = eleves.filter((e) => lireNote(valeurs[e.id]) != null).length;

  const suivant = (i) => (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      const prochain = eleves[i + 1];
      if (prochain) refs.current[prochain.id]?.select();
    }
  };

  const enregistrer = async () => {
    setEnCours(true);
    const r = await enregistrerNotes(
      evaluation.id,
      eleves.map((e) => ({ eleve_id: e.id, valeur: lireNote(valeurs[e.id]) }))
    );
    setEnCours(false);
    if (!r.ok) return setError(r.error);
    onSaved(r.notes.length);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Notes sur <strong className="text-ink">{fmtNote(evaluation.bareme)}</strong> · coefficient {fmtNote(evaluation.coefficient)} · laissez vide
        un élève absent ou non noté. <kbd className="rounded border border-line px-1 text-xs">Entrée</kbd> passe à l'élève suivant.
      </p>
      <ol className="max-h-[55vh] overflow-y-auto rounded-xl border border-line">
        {eleves.map((e, i) => {
          const err = erreurDe(valeurs[e.id]);
          return (
            <li key={e.id} className="flex items-center gap-3 border-b border-gray-100 px-3 py-1.5 last:border-0">
              <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted">{i + 1}</span>
              <label htmlFor={`n-${e.id}`} className="min-w-0 flex-1 truncate text-[15px]">{e.nom_prenoms}</label>
              {err && <span className="shrink-0 text-xs text-red-600">{err}</span>}
              <input
                id={`n-${e.id}`}
                ref={(el) => (refs.current[e.id] = el)}
                inputMode="decimal"
                autoComplete="off"
                value={valeurs[e.id]}
                onChange={(ev) => setValeurs((v) => ({ ...v, [e.id]: ev.target.value }))}
                onKeyDown={suivant(i)}
                onFocus={(ev) => ev.target.select()}
                className={`h-10 w-20 shrink-0 rounded-lg border bg-white px-2 text-center text-base tabular-nums outline-none transition focus:ring-4 sm:text-[15px] ${
                  err ? "border-red-400 focus:ring-red-100" : "border-line focus:border-accent focus:ring-accent/15"
                }`}
              />
            </li>
          );
        })}
      </ol>
      <ErrorBox message={error} />
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="text-sm text-muted">{saisies} / {eleves.length} note(s) saisie(s)</span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel}>Annuler</Button>
          <Button icon="check" disabled={erreurs.length > 0 || enCours} onClick={enregistrer}>Enregistrer les notes</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function Notes({ goTo }) {
  const { data, remove } = useStore();
  const toast = useToast();
  const classes = useMemo(() => [...data.classes].sort(parNiveau), [data.classes]);
  const [classeId, setClasseId] = useState(
    () => classes.find((c) => data.eleves.some((e) => e.classe_id === c.id))?.id ?? classes[0]?.id ?? ""
  );
  const [onglet, setOnglet] = useState("1");
  const [state, setState] = useState({ mode: null, item: null, focus: null });
  const close = () => setState({ mode: null, item: null, focus: null });

  const classe = classes.find((c) => c.id === classeId);
  const eleves = useMemo(
    () =>
      data.eleves
        .filter((e) => e.classe_id === classeId)
        .sort((a, b) => cleNom(a.nom_prenoms).localeCompare(cleNom(b.nom_prenoms), "fr")),
    [data.eleves, classeId]
  );
  const evaluationsDe = (t) =>
    data.evaluations
      .filter((v) => v.classe_id === classeId && v.trimestre === t)
      .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999") || a.libelle.localeCompare(b.libelle, "fr"));

  // Notes indexées : « evaluation|eleve » → valeur
  const noteDe = useMemo(() => {
    const m = new Map();
    data.notes.forEach((n) => m.set(`${n.evaluation_id}|${n.eleve_id}`, n.valeur));
    return (evaluationId, eleveId) => m.get(`${evaluationId}|${eleveId}`);
  }, [data.notes]);

  const moyenneTrimestre = (eleveId, t) =>
    moyenne(
      evaluationsDe(t)
        .map((evaluation) => ({ valeur: noteDe(evaluation.id, eleveId), evaluation }))
        .filter((x) => x.valeur != null)
    );

  const it = state.item;

  if (classes.length === 0) {
    return (
      <>
        <PageHeader title="Notes" />
        <EmptyState icon="grade" title="Créez d'abord une classe" text="Les notes sont saisies par classe et par trimestre." action={<Button onClick={() => goTo("classes")}>Gérer les classes</Button>} />
      </>
    );
  }

  const trimestre = onglet === "annee" ? null : Number(onglet);
  const evaluations = trimestre ? evaluationsDe(trimestre) : [];

  // Moyennes et rangs de l'onglet courant
  const lignes = eleves.map((e) => {
    if (trimestre) return { eleve: e, moyenne: moyenneTrimestre(e.id, trimestre) };
    const parTrimestre = [1, 2, 3].map((t) => moyenneTrimestre(e.id, t));
    return { eleve: e, parTrimestre, moyenne: moyenneSimple(parTrimestre) };
  });
  const rang = rangs(lignes.map((l) => ({ id: l.eleve.id, valeur: l.moyenne })));
  const moyenneClasse = moyenneSimple(lignes.map((l) => l.moyenne));

  const ouvrirSaisie = (evaluation, focus = null) => setState({ mode: "saisie", item: evaluation, focus });
  const notesDe = (evaluation) => Object.fromEntries(eleves.map((e) => [e.id, noteDe(evaluation.id, e.id)]));
  const nbNotes = (evaluation) => data.notes.filter((n) => n.evaluation_id === evaluation?.id).length;

  const th = "sticky top-0 bg-white px-3 py-2 text-left text-xs font-semibold text-muted";
  const colNom = "sticky left-0 z-10 bg-white";

  return (
    <>
      <PageHeader
        title="Notes"
        subtitle={classe ? `${classe.nom} · ${eleves.length} élève(s)` : ""}
        actions={
          trimestre && (
            <Button icon="plus" disabled={!classe} onClick={() => setState({ mode: "evaluation", item: { classe_id: classeId, trimestre } })}>
              Nouvelle évaluation
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="n-classe">Classe</label>
        <select id="n-classe" className="field sm:w-auto! sm:min-w-44" value={classeId} onChange={(e) => setClasseId(e.target.value)}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
        <div role="tablist" aria-label="Période" className="grid grid-cols-4 gap-1 rounded-xl bg-white p-1 ring-1 ring-line sm:inline-grid">
          {ONGLETS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={onglet === o.id}
              onClick={() => setOnglet(o.id)}
              className={`relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${onglet === o.id ? "text-white" : "text-muted hover:text-ink"}`}
            >
              {onglet === o.id && <motion.span layoutId="onglet-notes" className="absolute inset-0 rounded-lg bg-ink" transition={{ type: "spring", stiffness: 450, damping: 35 }} />}
              <span className="relative">
                <span className="sm:hidden">{o.court}</span>
                <span className="hidden sm:inline">{o.label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {eleves.length === 0 ? (
        <EmptyState
          icon="student"
          title={`Aucun élève en ${classe?.nom ?? ""}`}
          text="Importez d'abord la liste des élèves de cette classe."
          action={<Button onClick={() => goTo("eleves")}>Aller aux élèves</Button>}
        />
      ) : trimestre && evaluations.length === 0 ? (
        <EmptyState
          icon="grade"
          title={`Aucune évaluation au ${TRIMESTRES[trimestre]}`}
          text="Créez une évaluation (interrogation, devoir…), puis saisissez les notes de la classe."
          action={<Button icon="plus" onClick={() => setState({ mode: "evaluation", item: { classe_id: classeId, trimestre } })}>Créer une évaluation</Button>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-max border-separate border-spacing-0 text-[15px]">
            <thead>
              <tr>
                <th className={`${th} ${colNom} z-20 border-b border-line`}>ÉLÈVE</th>
                {trimestre
                  ? evaluations.map((v) => (
                      <th key={v.id} className={`${th} border-b border-line text-center`}>
                        <button type="button" onClick={() => ouvrirSaisie(v)} className="rounded px-1 font-semibold text-ink hover:text-accent" title="Saisir les notes">
                          {v.libelle}
                        </button>
                        <div className="font-normal normal-case">
                          /{fmtNote(v.bareme)}
                          {v.coefficient !== 1 && ` · coef ${fmtNote(v.coefficient)}`}
                          {v.date && ` · ${fmtDate(v.date)}`}
                        </div>
                        <div className="mt-0.5 flex justify-center">
                          <IconButton label={`Modifier ${v.libelle}`} icon="edit" onClick={() => setState({ mode: "evaluation", item: v })} />
                          <IconButton label={`Supprimer ${v.libelle}`} icon="trash" tone="danger" onClick={() => setState({ mode: "supprimer", item: v })} />
                        </div>
                      </th>
                    ))
                  : [1, 2, 3].map((t) => (
                      <th key={t} className={`${th} border-b border-line text-center`}>{TRIMESTRES[t].toUpperCase()}</th>
                    ))}
                <th className={`${th} border-b border-line bg-ground! text-center text-ink`}>{trimestre ? "MOYENNE /20" : "MOY. ANNUELLE"}</th>
                <th className={`${th} border-b border-line bg-ground! text-center`}>RANG</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map(({ eleve: e, moyenne: m, parTrimestre }, i) => (
                <tr key={e.id} className="group">
                  <td className={`${colNom} border-b border-gray-100 px-3 py-2 group-hover:bg-ground`}>
                    <span className="mr-2 inline-block w-5 text-right text-xs tabular-nums text-muted">{i + 1}</span>
                    {e.nom_prenoms}
                  </td>
                  {trimestre
                    ? evaluations.map((v) => {
                        const n = noteDe(v.id, e.id);
                        return (
                          <td key={v.id} className="border-b border-gray-100 p-0 text-center group-hover:bg-ground/60">
                            <button
                              type="button"
                              onClick={() => ouvrirSaisie(v, e.id)}
                              className={`h-full w-full px-3 py-2 tabular-nums hover:bg-accent/10 ${n == null ? "text-gray-300" : n / v.bareme < 0.5 ? "text-red-600" : ""}`}
                              aria-label={`Note de ${e.nom_prenoms} en ${v.libelle}`}
                            >
                              {fmtNote(n)}
                            </button>
                          </td>
                        );
                      })
                    : parTrimestre.map((mt, t) => (
                        <td key={t} className={`border-b border-gray-100 px-3 py-2 text-center tabular-nums group-hover:bg-ground/60 ${tonMoyenne(mt)}`}>{fmtNote(mt)}</td>
                      ))}
                  <td className={`border-b border-gray-100 bg-ground/60 px-3 py-2 text-center font-semibold tabular-nums ${tonMoyenne(m)}`}>{fmtNote(m)}</td>
                  <td className="border-b border-gray-100 bg-ground/60 px-3 py-2 text-center tabular-nums text-muted">{fmtRang(rang[e.id])}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className={`${colNom} px-3 py-2.5 text-sm`}>Moyenne de la classe</td>
                {trimestre
                  ? evaluations.map((v) => (
                      <td key={v.id} className="px-3 py-2.5 text-center text-sm tabular-nums">
                        {fmtNote(moyenneSimple(eleves.map((e) => noteDe(v.id, e.id))))}
                      </td>
                    ))
                  : [1, 2, 3].map((t) => (
                      <td key={t} className="px-3 py-2.5 text-center text-sm tabular-nums">
                        {fmtNote(moyenneSimple(lignes.map((l) => l.parTrimestre[t - 1])))}
                      </td>
                    ))}
                <td className={`bg-ground px-3 py-2.5 text-center tabular-nums ${tonMoyenne(moyenneClasse)}`}>{fmtNote(moyenneClasse)}</td>
                <td className="bg-ground" />
              </tr>
            </tfoot>
          </table>
        </Card>
      )}

      {trimestre && evaluations.length > 0 && eleves.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
          <Icon name="edit" size={14} />
          Cliquez sur une note ou sur le nom d'une évaluation pour saisir les notes.
        </p>
      )}

      <Modal open={state.mode === "evaluation"} onClose={close} title={it?.id ? "Modifier l'évaluation" : "Nouvelle évaluation"} size="sm">
        {state.mode === "evaluation" && (
          <EvaluationForm
            key={it?.id ?? "new"}
            initial={it}
            onCancel={close}
            onSaved={(r) => {
              toast(r.isNew ? "Évaluation créée" : "Évaluation modifiée");
              if (r.isNew) {
                setOnglet(String(r.item.trimestre));
                ouvrirSaisie(r.item); // enchaîne directement sur la saisie des notes
              } else close();
            }}
          />
        )}
      </Modal>

      <Modal open={state.mode === "saisie"} onClose={close} title={it ? `${it.libelle} · ${classe?.nom ?? ""}` : "Notes"}>
        {state.mode === "saisie" && it && (
          <SaisieNotes
            key={it.id}
            evaluation={it}
            eleves={eleves}
            notes={notesDe(it)}
            focusEleve={state.focus}
            onCancel={close}
            onSaved={(n) => { toast(`${n} note(s) enregistrée(s)`); close(); }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={state.mode === "supprimer"}
        title="Supprimer l'évaluation ?"
        message={`« ${it?.libelle} »${nbNotes(it) ? ` et ses ${nbNotes(it)} note(s)` : ""} seront supprimées.`}
        onCancel={close}
        onConfirm={async () => {
          const r = await remove("evaluations", it.id);
          toast(r.ok ? "Évaluation supprimée" : r.error, r.ok ? "success" : "error");
          close();
        }}
      />
    </>
  );
}
