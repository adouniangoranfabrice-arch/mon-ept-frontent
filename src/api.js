/** Client HTTP du backend FastAPI. En dev, Vite redirige /api vers http://localhost:8000. */
const BASE = import.meta.env.VITE_API_URL ?? "/api";
const INJOIGNABLE = "Serveur injoignable. Vérifiez que le backend est lancé.";

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      // FormData (fichier) : le navigateur fixe lui-même l'en-tête multipart
      headers: body !== undefined && !(body instanceof FormData) ? { "Content-Type": "application/json" } : undefined,
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(INJOIGNABLE);
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* réponse vide ou non JSON */
  }
  if (!res.ok) {
    if (typeof json?.detail === "string") throw new Error(json.detail);
    throw new Error(res.status >= 500 ? INJOIGNABLE : `Erreur ${res.status}`);
  }
  return json;
}

export const api = {
  get: (p) => request("GET", p),
  post: (p, b = {}) => request("POST", p, b),
  put: (p, b) => request("PUT", p, b),
  del: (p) => request("DELETE", p),
  /** Envoie un fichier dans le champ `champ` (multipart/form-data). */
  upload: (p, fichier, champ = "fichier") => {
    const fd = new FormData();
    fd.append(champ, fichier);
    return request("POST", p, fd);
  },
};
