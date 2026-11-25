import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "../store/StoreContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { Button, Card, ConfirmDialog, EmptyState, ErrorBox, Field, IconButton, InfoRow, Modal, PageHeader, Switch, listItem } from "../components/ui.jsx";
import { byOrdre } from "../utils.js";

function JourForm({ initial, onCancel, onSaved, ordreLibre }) {
  const { save } = useStore();
  const [form, setForm] = useState({ libelle: "", ordre: ordreLibre, actif: true, ...initial });
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const res = await save("jours", form);
    if (!res.ok) return setError(res.error);
    onSaved(res);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Libellé" htmlFor="j-lib">
        <input id="j-lib" className="field" value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} placeholder="Ex. Lundi" required />
      </Field>
      <Field label="Ordre" htmlFor="j-ord" hint="1 = lundi … 7 = dimanche (sert au tri et à repérer « aujourd'hui »)">
        <input id="j-ord" type="number" min="1" max="7" className="field" value={form.ordre} onChange={(e) => setForm({ ...form, ordre: e.target.value })} required />
      </Field>
      <div className="flex items-center justify-between rounded-lg bg-ground px-4 py-3">
        <span className="text-[15px] font-medium">J'ai cours ce jour-là</span>
        <Switch checked={form.actif} onChange={(v) => setForm({ ...form, actif: v })} label="Jour actif" />
      </div>
      <ErrorBox message={error} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" icon="check">{form.id ? "Enregistrer" : "Créer le jour"}</Button>
      </div>
    </form>
  );
}

export default function Jours() {
  const { data, save, remove, dependants } = useStore();
  const toast = useToast();
  const [state, setState] = useState({ mode: null, item: null });
  const close = () => setState({ mode: null, item: null });

  const jours = [...data.jours].sort(byOrdre);
  const it = state.item;
  const nbDep = it?.id ? dependants("jours", it.id) : 0;
  const ordreLibre = [1, 2, 3, 4, 5, 6, 7].find((o) => !data.jours.some((j) => j.ordre === o)) ?? 1;

  const toggle = async (j) => {
    const r = await save("jours", { ...j, actif: !j.actif });
    toast(r.ok ? `${j.libelle} : ${!j.actif ? "jour de cours" : "jour sans cours"}` : r.error, r.ok ? "success" : "error");
  };

  return (
    <>
      <PageHeader
        title="Jours"
        subtitle={`${jours.filter((j) => j.actif).length} jour(s) de cours par semaine`}
        actions={
          <Button icon="plus" disabled={data.jours.length >= 7} onClick={() => setState({ mode: "form", item: {} })}>
            Nouveau jour
          </Button>
        }
      />

      {jours.length === 0 ? (
        <EmptyState icon="calendar" title="Aucun jour" text="Ajoutez les jours de la semaine." />
      ) : (
        <Card>
          <ul>
            <AnimatePresence initial={false}>
              {jours.map((j) => (
                <motion.li key={j.id} layout {...listItem} className="flex items-center gap-3 border-b border-gray-100 px-3 py-3 last:border-0 sm:gap-4 sm:px-4">
                  <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ground text-sm font-semibold text-muted sm:flex">{j.ordre}</span>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate font-semibold ${j.actif ? "" : "text-muted"}`}>{j.libelle}</div>
                    <div className="text-xs text-muted">
                      {j.actif ? `${dependants("jours", j.id)} séance(s)` : "Pas de cours"}
                    </div>
                  </div>
                  <Switch checked={j.actif} onChange={() => toggle(j)} label={`${j.libelle} actif`} />
                  <div className="-mr-1 flex shrink-0">
                    <span className="hidden sm:contents"><IconButton label="Voir" icon="eye" onClick={() => setState({ mode: "view", item: j })} /></span>
                    <IconButton label="Modifier" icon="edit" onClick={() => setState({ mode: "form", item: j })} />
                    <IconButton label="Supprimer" icon="trash" tone="danger" onClick={() => setState({ mode: "delete", item: j })} />
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </Card>
      )}

      <Modal open={state.mode === "form"} onClose={close} title={it?.id ? "Modifier le jour" : "Nouveau jour"} size="sm">
        {state.mode === "form" && (
          <JourForm
            key={it?.id ?? "new"}
            initial={it}
            ordreLibre={ordreLibre}
            onCancel={close}
            onSaved={(r) => { toast(r.isNew ? "Jour créé" : "Jour modifié"); close(); }}
          />
        )}
      </Modal>

      <Modal
        open={state.mode === "view"}
        onClose={close}
        title="Détail du jour"
        size="sm"
        footer={<Button icon="edit" data-autofocus onClick={() => setState({ mode: "form", item: it })}>Modifier</Button>}
      >
        {state.mode === "view" && it && (
          <>
            <InfoRow label="Libellé">{it.libelle}</InfoRow>
            <InfoRow label="Ordre">{it.ordre}</InfoRow>
            <InfoRow label="Actif">{it.actif ? "Oui, j'ai cours" : "Non"}</InfoRow>
            <InfoRow label="Séances">{dependants("jours", it.id)}</InfoRow>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={state.mode === "delete"}
        title="Supprimer le jour ?"
        message={
          nbDep
            ? `« ${it?.libelle} » et ses ${nbDep} séance(s) seront supprimés. Pour simplement ne plus avoir cours ce jour-là, désactivez-le plutôt.`
            : `« ${it?.libelle} » sera supprimé.`
        }
        onCancel={close}
        onConfirm={async () => { const r = await remove("jours", it.id); toast(r.ok ? "Jour supprimé" : r.error, r.ok ? "success" : "error"); close(); }}
      />
    </>
  );
}
