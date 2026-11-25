import { Fragment, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "../store/StoreContext.jsx";
import { useSeanceDialogs } from "../components/SeanceDialogs.jsx";
import { Button, Card, EmptyState, PageHeader } from "../components/ui.jsx";
import Icon from "../components/Icon.jsx";
import { byDebut, byOrdre, dureeHeure, fmtDuree, indexBy, tint, toMin } from "../utils.js";

/** Jour de la semaine actuel au format ordre (1 = lundi … 7 = dimanche) */
const ordreAujourdhui = () => {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
};

function prochainCours(data, H, C) {
  const now = new Date();
  const today = ordreAujourdhui();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const actifs = data.jours.filter((j) => j.actif);

  for (let off = 0; off < 7; off++) {
    const ordre = ((today - 1 + off) % 7) + 1;
    const jour = actifs.find((j) => j.ordre === ordre);
    if (!jour) continue;
    const list = data.seances
      .filter((s) => s.jour_id === jour.id && H[s.heure_id] && C[s.classe_id])
      .sort((a, b) => byDebut(H[a.heure_id], H[b.heure_id]));
    const found = list.find((s) => off > 0 || toMin(H[s.heure_id].heure_fin) > nowMin);
    if (found) {
      const enCours = off === 0 && toMin(H[found.heure_id].heure_debut) <= nowMin;
      return { seance: found, jour, enCours, aujourdHui: off === 0 };
    }
  }
  return null;
}

function Stat({ label, value, sub }) {
  return (
    <Card className="p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </Card>
  );
}

export default function Semaine({ goTo }) {
  const { data } = useStore();
  const { openCreate, openView, dialogs } = useSeanceDialogs();

  const jours = useMemo(() => data.jours.filter((j) => j.actif).sort(byOrdre), [data.jours]);
  const heures = useMemo(() => [...data.heures].sort(byDebut), [data.heures]);
  const H = indexBy(data.heures);
  const C = indexBy(data.classes);
  const J = indexBy(data.jours);
  const today = ordreAujourdhui();
  const [jourChoisi, setJourChoisi] = useState(null);
  const jourMobile = jours.find((j) => j.id === jourChoisi) ?? jours.find((j) => j.ordre === today) ?? jours[0];

  // Séances des jours actifs, indexées par "jour|heure"
  const grille = useMemo(() => {
    const m = {};
    data.seances.forEach((s) => (m[`${s.jour_id}|${s.heure_id}`] = s));
    return m;
  }, [data.seances]);

  const seancesActives = data.seances.filter((s) => J[s.jour_id]?.actif && H[s.heure_id] && C[s.classe_id]);
  const totalMin = seancesActives.reduce((t, s) => t + dureeHeure(H[s.heure_id]), 0);
  const libres = jours.length * heures.length - seancesActives.length;
  const next = prochainCours(data, H, C);

  if (jours.length === 0 || heures.length === 0) {
    return (
      <>
        <PageHeader title="Ma semaine" />
        <EmptyState
          icon="calendar"
          title={jours.length === 0 ? "Aucun jour de cours actif" : "Aucun créneau horaire"}
          text="Configurez vos jours de cours et vos heures pour afficher la grille."
          action={
            <Button onClick={() => goTo(jours.length === 0 ? "jours" : "heures")}>
              {jours.length === 0 ? "Gérer les jours" : "Gérer les heures"}
            </Button>
          }
        />
      </>
    );
  }

  const cols = `92px repeat(${jours.length}, minmax(150px, 1fr))`;

  return (
    <>
      <PageHeader
        title="Ma semaine"
        subtitle={`Cours le ${jours.map((j) => j.libelle.toLowerCase()).join(", ")}`}
        actions={
          <Button icon="plus" onClick={() => openCreate({ jour_id: jours[0].id })}>
            Nouvelle séance
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Heures de cours" value={fmtDuree(totalMin)} sub="par semaine" />
        <Stat label="Séances" value={seancesActives.length} sub={`${data.classes.length} classe(s)`} />
        <Stat label="Créneaux libres" value={libres} sub={`sur ${jours.length * heures.length}`} />
        <Stat
          label={next?.enCours ? "En ce moment" : "Prochain cours"}
          value={next ? C[next.seance.classe_id].nom : "—"}
          sub={
            next
              ? `${next.aujourdHui ? "Aujourd'hui" : next.jour.libelle} · ${H[next.seance.heure_id].heure_debut}`
              : "Aucune séance"
          }
        />
      </div>

      {/* Mobile : un jour à la fois */}
      <div className="md:hidden">
        <div role="tablist" aria-label="Jour affiché" className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {jours.map((j) => {
            const actif = j.id === jourMobile.id;
            return (
              <button
                key={j.id}
                type="button"
                role="tab"
                aria-selected={actif}
                onClick={() => setJourChoisi(j.id)}
                className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  actif ? "bg-ink text-white" : "border border-line bg-white text-muted"
                }`}
              >
                {j.libelle}
                {j.ordre === today && (
                  <span className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${actif ? "bg-white" : "bg-accent"}`} />
                )}
              </button>
            );
          })}
        </div>

        <Card>
          {heures.map((h, i) => {
            const s = grille[`${jourMobile.id}|${h.id}`];
            const c = s && C[s.classe_id];
            const suivante = heures[i + 1];
            const pause = suivante ? toMin(suivante.heure_debut) - toMin(h.heure_fin) : 0;
            return (
              <Fragment key={h.id}>
                <div className="flex items-stretch gap-3 border-b border-gray-100 p-2 last:border-0">
                  <div className="w-14 shrink-0 py-1.5 pl-1 text-xs tabular-nums text-muted">
                    <div className="font-semibold text-ink">{h.code}</div>
                    {h.heure_debut}
                    <br />
                    {h.heure_fin}
                  </div>
                  {c ? (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openView(s)}
                      className="flex min-h-[58px] flex-1 flex-col justify-center rounded-lg px-3 py-2 text-left"
                      style={{ background: tint(c.couleur, 0.14), boxShadow: `inset 3px 0 0 ${c.couleur}` }}
                    >
                      <span className="font-semibold">{c.nom}</span>
                      <span className="truncate text-xs text-muted">{s.salle || c.niveau || " "}</span>
                    </motion.button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openCreate({ jour_id: jourMobile.id, heure_id: h.id })}
                      aria-label={`Ajouter une séance ${jourMobile.libelle} ${h.heure_debut}`}
                      className="flex min-h-[58px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-200 text-sm text-muted active:bg-ground"
                    >
                      <Icon name="plus" size={16} />
                      Libre
                    </button>
                  )}
                </div>
                {pause >= 10 && (
                  <div className="border-b border-gray-100 bg-ground/60 px-3 py-1 text-center text-[11px] text-muted">
                    Pause · {fmtDuree(pause)}
                  </div>
                )}
              </Fragment>
            );
          })}
        </Card>
      </div>

      {/* Tablette et ordinateur : grille de la semaine */}
      <Card className="hidden overflow-x-auto md:block">
        <div className="grid min-w-fit" style={{ gridTemplateColumns: cols }}>
          {/* En-tête des jours */}
          <div className="sticky left-0 z-10 border-b border-line bg-white px-3 py-3 text-xs font-semibold text-muted">
            HEURES
          </div>
          {jours.map((j) => (
            <div
              key={j.id}
              className={`border-b border-line px-3 py-3 text-center text-sm font-semibold ${
                j.ordre === today ? "text-accent" : ""
              }`}
            >
              {j.libelle}
              {j.ordre === today && (
                <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[11px]">Aujourd'hui</span>
              )}
            </div>
          ))}

          {/* Lignes des créneaux */}
          {heures.map((h, i) => {
            const suivante = heures[i + 1];
            const pause = suivante ? toMin(suivante.heure_debut) - toMin(h.heure_fin) : 0;
            return (
              <Fragment key={h.id}>
                <div className="sticky left-0 z-10 border-b border-gray-100 bg-white px-3 py-2 text-xs tabular-nums text-muted">
                  <div className="font-semibold text-ink">{h.code}</div>
                  {h.heure_debut}
                  <br />
                  {h.heure_fin}
                </div>
                {jours.map((j) => {
                  const s = grille[`${j.id}|${h.id}`];
                  const c = s && C[s.classe_id];
                  return (
                    <div
                      key={j.id}
                      className={`border-b border-gray-100 p-1.5 ${j.ordre === today ? "bg-accent/[0.03]" : ""}`}
                    >
                      <AnimatePresence mode="popLayout">
                        {c ? (
                          <motion.button
                            key={s.id}
                            type="button"
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => openView(s)}
                            className="flex h-full min-h-[58px] w-full flex-col justify-center rounded-lg px-3 py-2 text-left"
                            style={{ background: tint(c.couleur, 0.14), boxShadow: `inset 3px 0 0 ${c.couleur}` }}
                          >
                            <span className="text-sm font-semibold">{c.nom}</span>
                            <span className="truncate text-xs text-muted">{s.salle || c.niveau || " "}</span>
                          </motion.button>
                        ) : (
                          <motion.button
                            key="vide"
                            type="button"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => openCreate({ jour_id: j.id, heure_id: h.id })}
                            aria-label={`Ajouter une séance ${j.libelle} ${h.heure_debut}`}
                            className="group flex h-full min-h-[58px] w-full items-center justify-center rounded-lg border border-dashed border-transparent text-transparent transition hover:border-gray-300 hover:text-muted focus-visible:border-gray-300 focus-visible:text-muted"
                          >
                            <Icon name="plus" size={18} />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
                {pause >= 10 && (
                  <div className="col-span-full border-b border-gray-100 bg-ground/60 px-3 py-1 text-center text-[11px] text-muted">
                    Pause · {fmtDuree(pause)}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </Card>

      {data.classes.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {data.classes.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-2 text-muted">
              <span className="h-3 w-3 rounded" style={{ background: c.couleur }} />
              {c.nom}
            </span>
          ))}
        </div>
      )}

      {dialogs}
    </>
  );
}
