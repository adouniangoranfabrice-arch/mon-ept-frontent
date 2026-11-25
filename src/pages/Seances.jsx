import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "../store/StoreContext.jsx";
import { useSeanceDialogs } from "../components/SeanceDialogs.jsx";
import { Button, Card, EmptyState, IconButton, PageHeader, listItem } from "../components/ui.jsx";
import { byOrdre, indexBy } from "../utils.js";

export default function Seances() {
  const { data } = useStore();
  const { openCreate, openEdit, openView, askDelete, dialogs } = useSeanceDialogs();
  const [fJour, setFJour] = useState("");
  const [fClasse, setFClasse] = useState("");

  const J = indexBy(data.jours);
  const H = indexBy(data.heures);
  const C = indexBy(data.classes);

  const rows = useMemo(
    () =>
      data.seances
        .filter((s) => (!fJour || s.jour_id === fJour) && (!fClasse || s.classe_id === fClasse))
        .filter((s) => J[s.jour_id] && H[s.heure_id] && C[s.classe_id])
        .sort(
          (a, b) =>
            J[a.jour_id].ordre - J[b.jour_id].ordre ||
            H[a.heure_id].heure_debut.localeCompare(H[b.heure_id].heure_debut)
        ),
    [data, fJour, fClasse, J, H, C]
  );

  return (
    <>
      <PageHeader
        title="Séances"
        subtitle={`${data.seances.length} séance(s) enregistrée(s)`}
        actions={
          <Button icon="plus" onClick={() => openCreate()}>
            Nouvelle séance
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        <label className="sr-only" htmlFor="f-jour">Filtrer par jour</label>
        <select id="f-jour" className="field sm:w-auto! sm:min-w-44" value={fJour} onChange={(e) => setFJour(e.target.value)}>
          <option value="">Tous les jours</option>
          {[...data.jours].sort(byOrdre).map((j) => (
            <option key={j.id} value={j.id}>
              {j.libelle}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="f-classe">Filtrer par classe</label>
        <select id="f-classe" className="field sm:w-auto! sm:min-w-44" value={fClasse} onChange={(e) => setFClasse(e.target.value)}>
          <option value="">Toutes les classes</option>
          {data.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="list"
          title={data.seances.length ? "Aucune séance pour ce filtre" : "Aucune séance pour l'instant"}
          text="Ajoutez vos cours ici ou directement depuis la grille de la semaine."
          action={<Button icon="plus" onClick={() => openCreate()}>Ajouter une séance</Button>}
        />
      ) : (
        <>
          {/* Mobile : cartes */}
          <ul className="space-y-3 md:hidden">
            <AnimatePresence initial={false}>
              {rows.map((s) => (
                <motion.li key={s.id} layout {...listItem} className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4">
                  <span className="mt-1.5 h-3 w-3 shrink-0 rounded" style={{ background: C[s.classe_id].couleur }} />
                  <button type="button" onClick={() => openView(s)} className="min-w-0 flex-1 text-left">
                    <div className="font-semibold">{C[s.classe_id].nom}</div>
                    <div className="mt-0.5 text-sm tabular-nums text-muted">
                      {J[s.jour_id].libelle} · {H[s.heure_id].heure_debut} – {H[s.heure_id].heure_fin}
                    </div>
                    <div className="truncate text-sm text-muted">
                      {s.salle || "Salle non précisée"}
                      {s.recurrente ? " · chaque semaine" : ""}
                    </div>
                  </button>
                  <div className="-mr-2 -mt-1 flex shrink-0">
                    <IconButton label="Modifier" icon="edit" onClick={() => openEdit(s)} />
                    <IconButton label="Supprimer" icon="trash" tone="danger" onClick={() => askDelete(s)} />
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {/* Tablette et ordinateur : tableau */}
        <Card className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] text-[15px]">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold text-muted">
                <th className="px-4 py-3">JOUR</th>
                <th className="px-4 py-3">HEURE</th>
                <th className="px-4 py-3">CLASSE</th>
                <th className="px-4 py-3">SALLE</th>
                <th className="px-4 py-3">RÉCURRENTE</th>
                <th className="px-4 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {rows.map((s) => (
                  <motion.tr key={s.id} layout {...listItem} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium">{J[s.jour_id].libelle}</td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className="text-muted">{H[s.heure_id].code}</span> {H[s.heure_id].heure_debut} – {H[s.heure_id].heure_fin}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 font-semibold">
                        <span className="h-3 w-3 rounded" style={{ background: C[s.classe_id].couleur }} />
                        {C[s.classe_id].nom}
                      </span>
                    </td>
                    <td className="px-4 py-3">{s.salle || "—"}</td>
                    <td className="px-4 py-3">{s.recurrente ? "Oui" : "Non"}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <IconButton label="Voir" icon="eye" onClick={() => openView(s)} />
                      <IconButton label="Modifier" icon="edit" onClick={() => openEdit(s)} />
                      <IconButton label="Supprimer" icon="trash" tone="danger" onClick={() => askDelete(s)} />
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </Card>
        </>
      )}

      {dialogs}
    </>
  );
}
