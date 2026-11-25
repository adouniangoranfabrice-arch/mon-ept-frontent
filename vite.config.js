import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

/** Application installable (PWA) : manifeste + service worker générés à chaque build. */
const pwa = VitePWA({
  registerType: "autoUpdate", // une nouvelle version publiée remplace l'ancienne toute seule
  includeAssets: ["logo.svg", "apple-touch-icon.png"],
  manifest: {
    name: "Mon Emploi du Temps",
    short_name: "MON EDT",
    description: "Emploi du temps, élèves et notes",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    theme_color: "#16181d",
    background_color: "#eff6ff",
    icons: [
      { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
      { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
      { src: "pwa-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
    navigateFallback: "/index.html",
    navigateFallbackDenylist: [/^\/api\//], // l'API n'est jamais remplacée par la page
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        // Données : le réseau d'abord ; sans réponse (hors ligne, serveur en veille) → dernière copie reçue
        urlPattern: ({ url, request }) => url.pathname === "/api/data" && request.method === "GET",
        handler: "NetworkFirst",
        options: {
          cacheName: "edt-donnees",
          networkTimeoutSeconds: 12,
          expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 30 },
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        // Polices Google : gardées un an
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "edt-polices",
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

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
    plugins: [react(), tailwindcss(), pwa],
    server: {
      // Les appels /api sont transmis au backend FastAPI.
      // changeOrigin : indispensable pour un backend en ligne (https://….onrender.com)
      proxy: { "/api": { target: backend, changeOrigin: true } },
    },
  };
});
