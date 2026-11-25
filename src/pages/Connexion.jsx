import { useState } from "react";
import { motion } from "motion/react";
import { COMPTES_DEMO, useAuth } from "../store/AuthContext.jsx";
import { Button, ErrorBox, Field } from "../components/ui.jsx";
import Icon from "../components/Icon.jsx";

export default function Connexion() {
  const { connecter } = useAuth();
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [voir, setVoir] = useState(false);
  const [souvenir, setSouvenir] = useState(true);
  const [erreur, setErreur] = useState("");

  const valider = (e) => {
    e.preventDefault();
    if (!identifiant.trim() || !motDePasse) return setErreur("Renseignez l'identifiant et le mot de passe.");
    const r = connecter(identifiant, motDePasse, souvenir);
    if (!r.ok) setErreur(r.error);
  };

  const remplir = (c) => {
    setIdentifiant(c.identifiant);
    setMotDePasse(c.motDePasse);
    setErreur("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-50 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div className="font-display text-3xl font-bold text-black">
            Mon EDT<span className="text-black">.</span>
          </div>
          <p className="mt-2 text-sm text-gray-400">Emploi du temps, élèves et notes</p>
        </div>

        <form onSubmit={valider} className="space-y-4 rounded-2xl bg-white p-6 shadow-2xl sm:p-7" noValidate>
          <h1 className="font-display text-xl font-bold">Connexion</h1>

          <Field label="Identifiant" htmlFor="c-id">
            <div className="relative">
              {/* <Icon name="user" size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" /> */}
              <input
                id="c-id"
                className="field pl-10"
                autoComplete="username"
                autoCapitalize="none"
                autoFocus
                value={identifiant}
                onChange={(e) => (setIdentifiant(e.target.value), setErreur(""))}
              />
            </div>
          </Field>

          <Field label="Mot de passe" htmlFor="c-mdp">
            <div className="relative">
              {/* <Icon name="lock" size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" /> */}
              <input
                id="c-mdp"
                type={voir ? "text" : "password"}
                className="field pr-11 pl-10"
                autoComplete="current-password"
                value={motDePasse}
                onChange={(e) => (setMotDePasse(e.target.value), setErreur(""))}
              />
              <button
                type="button"
                onClick={() => setVoir((v) => !v)}
                aria-label={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                title={voir ? "Masquer" : "Afficher"}
                className="absolute top-1/2 right-1.5 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-ground hover:text-ink"
              >
                <Icon name="eye" size={17} />
              </button>
            </div>
          </Field>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="h-4 w-4 accent-accent" checked={souvenir} onChange={(e) => setSouvenir(e.target.checked)} />
            Rester connecté
          </label>

          <ErrorBox message={erreur} />

          <Button type="submit" className="w-full">
            Se connecter
          </Button>
        </form>

        {/* <div className="mt-5 rounded-2xl border border-white/10 bg-white p-4 text-sm text-gray-300">
          <div className="mb-2 text-[11px] font-semibold tracking-wider text-gray-500">ACCÈS DE DÉMONSTRATION</div>
          <ul className="space-y-1.5">
            {COMPTES_DEMO.map((c) => (
              <li key={c.identifiant}>
                <button
                  type="button"
                  onClick={() => remplir(c)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
                >
                  <span>
                    <span className="font-semibold text-black">{c.identifiant}</span>
                    <span className="text-gray-500"> / </span>
                    <span className="font-mono">{c.motDePasse}</span>
                  </span>
                  <span className="text-xs text-gray-500">{c.role}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 px-3 text-xs text-gray-500">Cliquez sur un compte pour remplir le formulaire.</p>
        </div> */}
      </motion.div>
    </div>
  );
}
