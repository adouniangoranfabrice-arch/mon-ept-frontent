import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const PAR_DEFAUT = "http://localhost:8000";

/** « a ?? b » ou « a, b » → ["a", "b"] (sans « / » final). */
const adresses = (valeur) =>
  (valeur || PAR_DEFAUT)
    .split(/\?\?|,/)
    .map((a) => a.trim().replace(/\/+$/, ""))
    .filter(Boolean);

/** Le backend répond-il sur /api/health ? (Render gratuit peut mettre ~1 min à se réveiller) */
async function repond(url, delai = 8000) {
  try {
    const r = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(delai) });
    return r.ok;
  } catch {
    return false;
  }
}

/** Première adresse qui répond ; sinon la première de la liste. */
async function choisirBackend(liste) {
  if (liste.length === 1) return liste[0];
  for (const url of liste) {
    if (await repond(url)) return url;
    console.warn(`  ⚠ Backend injoignable : ${url}`);
  }
  console.warn(`  ⚠ Aucun backend ne répond, utilisation de ${liste[0]}`);
  return liste[0];
}

export default defineConfig(async ({ command, mode }) => {
  // Lit frontend/.env (préfixe "" : BACKEND_URL reste côté Vite, il n'est pas envoyé au navigateur)
  const env = loadEnv(mode, process.cwd(), "");
  const liste = adresses(env.BACKEND_URL);
  const backend = command === "serve" ? await choisirBackend(liste) : liste[0];
  if (command === "serve") console.log(`  ➜ Backend : ${backend}`);

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Les appels /api sont transmis au backend FastAPI.
      // changeOrigin : indispensable pour un backend en ligne (https://….onrender.com)
      proxy: { "/api": { target: backend, changeOrigin: true } },
    },
  };
});
