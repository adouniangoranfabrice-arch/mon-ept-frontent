import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "../store/StoreContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { Button, Card, ConfirmDialog, EmptyState, ErrorBox, Field, IconButton, InfoRow, Modal, PageHeader, listItem } from "../components/ui.jsx";
import { byDebut, dureeHeure, fmtDuree } from "../utils.js";

function HeureForm({ initial, suggestion, onCancel, onSaved }) {
  const { save } = useStore();
  const [form, setForm] = useState({ code: "", heure_debut: "", heure_fin: "", ...suggestion, ...initial });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const res = await save("heures", form);
    if (!res.ok) return setError(res.error);
    onSaved(res);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Code" htmlFor="h-code" hint="Identifiant court du créneau, ex. H1">
        <input id="h-code" className="field" value={form.code} onChange={set("code")} required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Début" htmlFor="h-deb">
          <input id="h-deb" type="time" className="field" value={form.heure_debut} onChange={set("heure_debut")} required />
        </Field>
        <Field label="Fin" htmlFor="h-fin">
          <input id="h-fin" type="time" className="field" value={form.heure_fin} onChange={set("heure_fin")} required />
        </Field>
      </div>
      <ErrorBox message={error} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" icon="check">{form.id ? "Enregistrer" : "Créer le créneau"}</Button>
      </div>
    </form>
  );
}

export default function Heures() {
  const { data, remove, dependants } = useStore();
  const toast = useToast();
  const [state, setState] = useState({ mode: null, item: null });
  const close = () => setState({ mode: null, item: null });

  const heures = [...data.heures].sort(byDebut);
  const it = state.item;
  const nbDep = it?.id ? dependants("heures", it.id) : 0;

  // Suggestion pour un nouveau créneau : à la suite du dernier, même durée
  const last = heures[heures.length - 1];
  const suggestion = last
    ? (() => {
        const n = Number(String(last.code).replace(/\D/g, "")) || heures.length;
        return { code: `H${n + 1}`, heure_debut: last.heure_fin };
      })()
    : { code: "H1" };

  return (
    <>
      <PageHeader
        title="Heures"
        subtitle="Les créneaux horaires de vos journées"
        actions={<Button icon="plus" onClick={() => setState({ mode: "form", item: {} })}>Nouveau créneau</Button>}
      />

      {heures.length === 0 ? (
        <EmptyState icon="clock" title="Aucun créneau" text="Ajoutez vos heures de cours (début et fin)." />
      ) : (
        <>
          {/* Mobile : cartes */}
          <ul className="space-y-3 md:hidden">
            <AnimatePresence initial={false}>
              {heures.map((h) => (
                <motion.li key={h.id} layout {...listItem} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ground font-display text-sm font-bold">{h.code}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold tabular-nums">{h.heure_debut} – {h.heure_fin}</div>
                    <div className="text-sm text-muted">
                      {fmtDuree(dureeHeure(h))} · {dependants("heures", h.id)} séance(s)
                    </div>
                  </div>
                  <div className="-mr-2 flex shrink-0">
                    <IconButton label="Modifier" icon="edit" onClick={() => setState({ mode: "form", item: h })} />
                    <IconButton label="Supprimer" icon="trash" tone="danger" onClick={() => setState({ mode: "delete", item: h })} />
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {/* Tablette et ordinateur : tableau */}
        <Card className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[520px] text-[15px]">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold text-muted">
                <th className="px-4 py-3">CODE</th>
                <th className="px-4 py-3">DÉBUT</th>
                <th className="px-4 py-3">FIN</th>
                <th className="px-4 py-3">DURÉE</th>
                <th className="px-4 py-3">SÉANCES</th>
                <th className="px-4 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {heures.map((h) => (
                  <motion.tr key={h.id} layout {...listItem} className="border-b border-gray-100 last:border-0 tabular-nums">
                    <td className="px-4 py-3 font-semibold">{h.code}</td>
                    <td className="px-4 py-3">{h.heure_debut}</td>
                    <td className="px-4 py-3">{h.heure_fin}</td>
                    <td className="px-4 py-3 text-muted">{fmtDuree(dureeHeure(h))}</td>
                    <td className="px-4 py-3">{dependants("heures", h.id)}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <IconButton label="Voir" icon="eye" onClick={() => setState({ mode: "view", item: h })} />
                      <IconButton label="Modifier" icon="edit" onClick={() => setState({ mode: "form", item: h })} />
                      <IconButton label="Supprimer" icon="trash" tone="danger" onClick={() => setState({ mode: "delete", item: h })} />
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </Card>
        </>
      )}

      <Modal open={state.mode === "form"} onClose={close} title={it?.id ? "Modifier le créneau" : "Nouveau créneau"} size="sm">
        {state.mode === "form" && (
          <HeureForm
            key={it?.id ?? "new"}
            initial={it}
            suggestion={it?.id ? {} : suggestion}
            onCancel={close}
            onSaved={(r) => { toast(r.isNew ? "Créneau créé" : "Créneau modifié"); close(); }}
          />
        )}
      </Modal>

      <Modal
        open={state.mode === "view"}
        onClose={close}
        title="Détail du créneau"
        size="sm"
        footer={<Button icon="edit" data-autofocus onClick={() => setState({ mode: "form", item: it })}>Modifier</Button>}
      >
        {state.mode === "view" && it && (
          <>
            <InfoRow label="Code">{it.code}</InfoRow>
            <InfoRow label="Début">{it.heure_debut}</InfoRow>
            <InfoRow label="Fin">{it.heure_fin}</InfoRow>
            <InfoRow label="Durée">{fmtDuree(dureeHeure(it))}</InfoRow>
            <InfoRow label="Séances sur ce créneau">{dependants("heures", it.id)}</InfoRow>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={state.mode === "delete"}
        title="Supprimer le créneau ?"
        message={
          nbDep
            ? `Le créneau ${it?.code} et ses ${nbDep} séance(s) seront supprimés.`
            : `Le créneau ${it?.code} sera supprimé.`
        }
        onCancel={close}
        onConfirm={async () => { const r = await remove("heures", it.id); toast(r.ok ? "Créneau supprimé" : r.error, r.ok ? "success" : "error"); close(); }}
      />
    </>
  );
}
