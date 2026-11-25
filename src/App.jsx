import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "./store/StoreContext.jsx";
import { useAuth } from "./store/AuthContext.jsx";
import { useToast } from "./components/Toast.jsx";
import { ConfirmDialog, Modal } from "./components/ui.jsx";
import Icon from "./components/Icon.jsx";
import Semaine from "./pages/Semaine.jsx";
import Seances from "./pages/Seances.jsx";
import Classes from "./pages/Classes.jsx";
import Eleves from "./pages/Eleves.jsx";
import Notes from "./pages/Notes.jsx";
import Heures from "./pages/Heures.jsx";
import Jours from "./pages/Jours.jsx";

const NOMS_STOCKAGE = { mongodb: "MongoDB Atlas", sqlite: "SQLite (local)" };

/** Indique au-dessus de quel stockage tourne l'application. */
function StatutConnexion({ className = "" }) {
  const { stockage } = useStore();
  if (!stockage) return null;
  return (
    <div className={`flex items-center gap-2 text-xs ${className}`} title="Les données sont enregistrées par le serveur">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      Connecté · {NOMS_STOCKAGE[stockage] ?? stockage}
    </div>
  );
}

/** Utilisateur connecté + bouton de déconnexion. */
function Utilisateur({ variant = "sombre", onAction }) {
  const { utilisateur, deconnecter } = useAuth();
  const sombre = variant === "sombre";
  const quitter = () => {
    onAction?.();
    deconnecter();
  };
  return (
    <div className={sombre ? "mt-auto flex items-center gap-3 border-t border-white/10 px-3 pt-4" : "mb-4 flex items-center gap-3 rounded-xl bg-ground p-3"}>
      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${sombre ? "bg-white/10 text-white" : "bg-white text-ink"}`}>
        <Icon name="user" size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-semibold ${sombre ? "text-white" : "text-ink"}`}>{utilisateur.nom}</div>
        <div className={`truncate text-xs ${sombre ? "text-gray-500" : "text-muted"}`}>{utilisateur.role}</div>
      </div>
      <button
        type="button"
        onClick={quitter}
        aria-label="Se déconnecter"
        title="Se déconnecter"
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
          sombre ? "text-gray-400 hover:bg-white/10 hover:text-white" : "text-muted hover:bg-white hover:text-red-600"
        }`}
      >
        <Icon name="logout" size={17} />
      </button>
    </div>
  );
}

const PAGES = [
  { id: "semaine", label: "Ma semaine", court: "Semaine", icon: "calendar", Comp: Semaine },
  { id: "seances", label: "Séances", icon: "list", Comp: Seances },
  { id: "classes", label: "Classes", icon: "users", Comp: Classes },
  { id: "eleves", label: "Élèves", icon: "student", Comp: Eleves },
  { id: "notes", label: "Notes", icon: "grade", Comp: Notes },
  { id: "heures", label: "Heures", icon: "clock", Comp: Heures },
  { id: "jours", label: "Jours", icon: "sun", Comp: Jours },
];

/** Actions de sauvegarde (export, import, réinitialisation), affichées selon le contexte. */
function Sauvegarde({ variant = "sombre", onAction }) {
  const { data, replaceAll, reset } = useStore();
  const toast = useToast();
  const fileRef = useRef(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const exporter = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `emploi-du-temps-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Sauvegarde exportée");
    onAction?.();
  };

  const importer = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let contenu;
    try {
      contenu = JSON.parse(await file.text());
    } catch {
      return toast("Fichier illisible", "error");
    }
    const r = await replaceAll(contenu);
    toast(r.ok ? "Données importées" : r.error, r.ok ? "success" : "error");
    if (r.ok) onAction?.();
  };

  const sombre = variant === "sombre";
  const btn = sombre
    ? "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition hover:bg-white/5 hover:text-white"
    : "flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium text-ink transition hover:bg-ground active:bg-ground";

  return (
    <div className={sombre ? "mt-auto border-t border-white/10 pt-4" : "-mx-2 space-y-1"}>
      {sombre && <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-gray-500">SAUVEGARDE</div>}
      <button type="button" className={btn} onClick={exporter}><Icon name="download" size={sombre ? 16 : 18} />Exporter (.json)</button>
      <button type="button" className={btn} onClick={() => fileRef.current?.click()}><Icon name="upload" size={sombre ? 16 : 18} />Importer</button>
      <button type="button" className={`${btn} ${sombre ? "" : "text-red-600!"}`} onClick={() => setConfirmReset(true)}><Icon name="refresh" size={sombre ? 16 : 18} />Réinitialiser</button>
      <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importer} />
      <ConfirmDialog
        open={confirmReset}
        title="Réinitialiser les données ?"
        message="Toutes vos classes et séances seront effacées et les jours/heures remis par défaut. Pensez à exporter une sauvegarde avant."
        confirmLabel="Réinitialiser"
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          const r = await reset();
          setConfirmReset(false);
          toast(r.ok ? "Données réinitialisées" : r.error, r.ok ? "success" : "error");
          if (r.ok) onAction?.();
        }}
      />
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("semaine");
  const [menuSauvegarde, setMenuSauvegarde] = useState(false);
  const changerPage = (id) => {
    setPage(id);
    window.scrollTo({ top: 0 });
  };
  const current = PAGES.find((p) => p.id === page) ?? PAGES[0];
  const Comp = current.Comp;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Menu latéral (ordinateur) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-1 bg-ink p-5 text-gray-300 lg:flex">
        <div className="mb-6 px-3">
          <div className="font-display text-xl font-bold text-white">
            Mon EDT<span className="text-[#8EA4FF]">.</span>
          </div>
          <StatutConnexion className="mt-1.5 text-gray-400" />
        </div>
        <nav aria-label="Menu principal" className="flex flex-col gap-1">
          {PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => changerPage(p.id)}
              aria-current={page === p.id ? "page" : undefined}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors ${
                page === p.id ? "text-white" : "hover:text-white"
              }`}
            >
              {page === p.id && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-lg bg-white/10"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative flex items-center gap-3">
                <Icon name={p.icon} />
                {p.label}
              </span>
            </button>
          ))}
        </nav>
        {/* <Sauvegarde /> */}
        <Utilisateur />
      </aside>

      {/* En-tête (mobile / tablette) */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-gray-300 lg:hidden">
        <div className="font-display text-lg font-bold text-white">
          Mon EDT<span className="text-[#8EA4FF]">.</span>
        </div>
        <button
          type="button"
          onClick={() => setMenuSauvegarde(true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-white/10 hover:text-white"
        >
          <Icon name="user" size={16} />
          Compte
        </button>
      </header>

      {/* Barre d'onglets en bas (mobile / tablette) */}
      <nav
        aria-label="Menu principal"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-7 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {PAGES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => changerPage(p.id)}
            aria-current={page === p.id ? "page" : undefined}
            className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
              page === p.id ? "text-accent" : "text-muted"
            }`}
          >
            {page === p.id && (
              <motion.span layoutId="nav-active-m" className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent" />
            )}
            <Icon name={p.icon} size={22} />
            {p.court ?? p.label}
          </button>
        ))}
      </nav>

      <Modal open={menuSauvegarde} onClose={() => setMenuSauvegarde(false)} title="Compte" size="sm">
        <Utilisateur variant="clair" onAction={() => setMenuSauvegarde(false)} />
        <StatutConnexion className="mb-4 text-muted" />
        <Sauvegarde variant="clair" onAction={() => setMenuSauvegarde(false)} />
      </Modal>

      <main className="min-w-0 flex-1 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-8 sm:pt-8 lg:pb-8">
        <div className="mx-auto max-w-6xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Comp goTo={changerPage} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
