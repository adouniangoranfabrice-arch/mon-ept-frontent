import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "../store/StoreContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { Button, Card, ConfirmDialog, EmptyState, ErrorBox, Field, IconButton, Modal, PageHeader, listItem } from "../components/ui.jsx";
import Icon from "../components/Icon.jsx";
import { cleNom, indexBy, parNiveau, tint } from "../utils.js";

/* ---------- Ajouter / modifier un élève ---------- */
function EleveForm({ initial, classes, onCancel, onSaved }) {
  const { save } = useStore();
  const [form, setForm] = useState({ nom_prenoms: "", classe_id: "", ...initial });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const res = await save("eleves", form);
    if (!res.ok) return setError(res.error);
    onSaved(res);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nom et prénoms" htmlFor="e-nom">
        <input id="e-nom" className="field" value={form.nom_prenoms} onChange={set("nom_prenoms")} placeholder="Ex. KOUASSI Aya Marie" required />
      </Field>
      <Field label="Classe" htmlFor="e-classe">
        <select id="e-classe" className="field" value={form.classe_id} onChange={set("classe_id")} required>
          <option value="">— Choisir —</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
      </Field>
      <ErrorBox message={error} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" icon="check">{form.id ? "Enregistrer" : "Ajouter l'élève"}</Button>
      </div>
    </form>
  );
}

/* ---------- Import d'un fichier Excel : classe → fichier → aperçu → import ---------- */
function ImportEleves({ classes, classeParDefaut, onCancel, onDone }) {
  const { data, lireFichierEleves, importerEleves } = useStore();
  const fileRef = useRef(null);
  const [classeId, setClasseId] = useState(classeParDefaut ?? "");
  const [fichier, setFichier] = useState(null);
  const [apercu, setApercu] = useState(null); // { noms, doublons_fichier }
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  // Élèves déjà inscrits dans la classe choisie : ils seront ignorés
  const dejaInscrits = useMemo(
    () => new Set(data.eleves.filter((e) => e.classe_id === classeId).map((e) => cleNom(e.nom_prenoms))),
    [data.eleves, classeId]
  );
  const nouveaux = apercu ? apercu.noms.filter((n) => !dejaInscrits.has(cleNom(n))) : [];
  const classe = classes.find((c) => c.id === classeId);

  const choisirFichier = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setFichier(f);
    setApercu(null);
    setErreur(null);
    setEnCours(true);
    const r = await lireFichierEleves(f);
    setEnCours(false);
    if (r.ok) setApercu(r.apercu);
    else setErreur(r.error);
  };

  const importer = async () => {
    if (!classeId) return setErreur("Choisissez la classe des élèves.");
    setEnCours(true);
    const r = await importerEleves(classeId, nouveaux);
    setEnCours(false);
    if (!r.ok) return setErreur(r.error);
    onDone(r.resultat, classe);
  };

  return (
    <div className="space-y-4">
      <Field label="1. Classe des élèves" htmlFor="i-classe">
        <select id="i-classe" className="field" value={classeId} onChange={(e) => setClasseId(e.target.value)}>
          <option value="">— Choisir —</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">2. Fichier Excel</span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-3 rounded-xl border-2 border-dashed border-line bg-ground/50 px-4 py-4 text-left transition hover:border-accent hover:bg-accent/5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-accent shadow-sm">
            <Icon name="file" size={20} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold">{fichier ? fichier.name : "Choisir un fichier…"}</span>
            <span className="block text-xs text-muted">
              Format .xlsx ou .csv, avec une colonne <strong>Nom_prenoms</strong>
            </span>
          </span>
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="hidden" onChange={choisirFichier} />
      </div>

      {enCours && !apercu && <p className="text-sm text-muted">Lecture du fichier…</p>}

      {apercu && (
        <div>
          <div className="mb-2 text-sm font-semibold">3. Vérifiez la liste</div>
          <div className="rounded-xl border border-line">
            <div className="border-b border-line bg-ground/60 px-4 py-2.5 text-sm">
              <strong>{apercu.noms.length}</strong> élève(s) trouvé(s)
              {apercu.doublons_fichier > 0 && <span className="text-muted"> · {apercu.doublons_fichier} doublon(s) du fichier ignoré(s)</span>}
              {classeId && apercu.noms.length > nouveaux.length && (
                <span className="text-muted"> · {apercu.noms.length - nouveaux.length} déjà inscrit(s) en {classe?.nom}</span>
              )}
            </div>
            <ol className="max-h-60 overflow-y-auto py-1 text-sm">
              {apercu.noms.map((n, i) => {
                const deja = dejaInscrits.has(cleNom(n));
                return (
                  <li key={n} className={`flex items-center gap-3 px-4 py-1.5 ${deja ? "text-muted" : ""}`}>
                    <span className="w-7 shrink-0 text-right text-xs tabular-nums text-muted">{i + 1}</span>
                    <span className={`truncate ${deja ? "line-through" : ""}`}>{n}</span>
                    {deja && <span className="ml-auto shrink-0 rounded-full bg-ground px-2 py-0.5 text-[11px]">déjà inscrit</span>}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      <ErrorBox message={erreur} />

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button icon="upload" disabled={!apercu || !classeId || nouveaux.length === 0 || enCours} onClick={importer}>
          {apercu && classeId ? `Importer ${nouveaux.length} élève(s)` : "Importer"}
        </Button>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function Eleves({ goTo }) {
  const { data, remove } = useStore();
  const toast = useToast();
  const [state, setState] = useState({ mode: null, item: null });
  const [fClasse, setFClasse] = useState("");
  const [recherche, setRecherche] = useState("");
  const close = () => setState({ mode: null, item: null });

  const classes = useMemo(() => [...data.classes].sort(parNiveau), [data.classes]);
  const C = indexBy(data.classes);
  const it = state.item;

  // Élèves regroupés par classe (6e → Tle), triés par nom, filtrés
  const groupes = useMemo(() => {
    const q = cleNom(recherche);
    return classes
      .filter((c) => !fClasse || c.id === fClasse)
      .map((c) => ({
        classe: c,
        total: data.eleves.filter((e) => e.classe_id === c.id).length,
        eleves: data.eleves
          .filter((e) => e.classe_id === c.id && (!q || cleNom(e.nom_prenoms).includes(q)))
          .sort((a, b) => cleNom(a.nom_prenoms).localeCompare(cleNom(b.nom_prenoms), "fr")),
      }))
      .filter((g) => g.eleves.length > 0);
  }, [classes, data.eleves, fClasse, recherche]);

  const nbAffiches = groupes.reduce((t, g) => t + g.eleves.length, 0);

  if (classes.length === 0) {
    return (
      <>
        <PageHeader title="Élèves" />
        <EmptyState
          icon="student"
          title="Créez d'abord une classe"
          text="Les élèves sont inscrits dans une classe. Ajoutez vos classes, puis revenez importer vos listes."
          action={<Button onClick={() => goTo("classes")}>Gérer les classes</Button>}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Élèves"
        subtitle={`${data.eleves.length} élève(s) inscrit(s)`}
        actions={
          <>
            <Button variant="secondary" icon="upload" onClick={() => setState({ mode: "import", item: null })}>
              Importer (Excel)
            </Button>
            <Button icon="plus" onClick={() => setState({ mode: "form", item: { classe_id: fClasse } })}>
              Nouvel élève
            </Button>
          </>
        }
      />

      {data.eleves.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
          <label className="sr-only" htmlFor="f-eleve-classe">Filtrer par classe</label>
          <select id="f-eleve-classe" className="field sm:w-auto! sm:min-w-44" value={fClasse} onChange={(e) => setFClasse(e.target.value)}>
            <option value="">Toutes les classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom} ({data.eleves.filter((e) => e.classe_id === c.id).length})
              </option>
            ))}
          </select>
          <div className="relative sm:min-w-64">
            <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <label className="sr-only" htmlFor="f-eleve-nom">Rechercher un élève</label>
            <input id="f-eleve-nom" className="field pl-9!" placeholder="Rechercher un nom…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </div>
        </div>
      )}

      {data.eleves.length === 0 ? (
        <EmptyState
          icon="student"
          title="Aucun élève pour l'instant"
          text="Importez la liste Excel d'une classe (colonne Nom_prenoms) ou ajoutez les élèves un par un."
          action={<Button icon="upload" onClick={() => setState({ mode: "import", item: null })}>Importer un fichier Excel</Button>}
        />
      ) : nbAffiches === 0 ? (
        <EmptyState icon="search" title="Aucun élève trouvé" text="Modifiez la recherche ou le filtre de classe." />
      ) : (
        <div className="space-y-5">
          {groupes.map(({ classe: c, total, eleves }) => (
            <Card key={c.id} className="overflow-hidden">
              <div className="flex items-center gap-3 border-b border-line px-4 py-3" style={{ background: tint(c.couleur, 0.08) }}>
                <span className="h-3 w-3 shrink-0 rounded" style={{ background: c.couleur }} />
                <h2 className="font-display text-lg font-bold">{c.nom}</h2>
                <span className="text-sm text-muted">
                  {eleves.length < total ? `${eleves.length} / ${total}` : total} élève(s)
                </span>
                <button
                  type="button"
                  onClick={() => setState({ mode: "import", item: { classe_id: c.id } })}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted hover:bg-white hover:text-ink"
                >
                  <Icon name="upload" size={15} />
                  <span className="hidden sm:inline">Importer</span>
                </button>
              </div>
              <ol>
                <AnimatePresence initial={false}>
                  {eleves.map((e, i) => (
                    <motion.li key={e.id} layout {...listItem} className="flex items-center gap-3 border-b border-gray-100 px-4 py-2 last:border-0">
                      <span className="w-7 shrink-0 text-right text-xs tabular-nums text-muted">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-[15px]">{e.nom_prenoms}</span>
                      <div className="-mr-2 flex shrink-0">
                        <IconButton label="Modifier" icon="edit" onClick={() => setState({ mode: "form", item: e })} />
                        <IconButton label="Supprimer" icon="trash" tone="danger" onClick={() => setState({ mode: "delete", item: e })} />
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ol>
            </Card>
          ))}
        </div>
      )}

      <Modal open={state.mode === "form"} onClose={close} title={it?.id ? "Modifier l'élève" : "Nouvel élève"} size="sm">
        {state.mode === "form" && (
          <EleveForm
            key={it?.id ?? "new"}
            initial={it}
            classes={classes}
            onCancel={close}
            onSaved={(r) => { toast(r.isNew ? "Élève ajouté" : "Élève modifié"); close(); }}
          />
        )}
      </Modal>

      <Modal open={state.mode === "import"} onClose={close} title="Importer des élèves (Excel)">
        {state.mode === "import" && (
          <ImportEleves
            classes={classes}
            classeParDefaut={it?.classe_id ?? fClasse}
            onCancel={close}
            onDone={({ ajoutes, ignores }, classe) => {
              toast(`${ajoutes.length} élève(s) ajouté(s) en ${classe.nom}${ignores.length ? ` · ${ignores.length} déjà inscrit(s)` : ""}`);
              setFClasse(classe.id);
              close();
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={state.mode === "delete"}
        title="Supprimer l'élève ?"
        message={`« ${it?.nom_prenoms} » sera retiré(e) de la classe ${C[it?.classe_id]?.nom ?? ""}.`}
        onCancel={close}
        onConfirm={async () => {
          const r = await remove("eleves", it.id);
          toast(r.ok ? "Élève supprimé" : r.error, r.ok ? "success" : "error");
          close();
        }}
      />
    </>
  );
}
