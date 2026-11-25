import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Connexion de démonstration : les comptes sont FICTIFS et vérifiés dans le navigateur.
 * Cela ne protège pas les données (l'API reste accessible) : à remplacer par une vraie
 * authentification côté backend avant d'ouvrir l'application à d'autres personnes.
 */
export const COMPTES_DEMO = [
  { identifiant: "prof", motDePasse: "prof2026", nom: "Professeur d'informatique", role: "Enseignant" },
  { identifiant: "admin", motDePasse: "admin2026", nom: "Administrateur", role: "Administration" },
];

const CLE = "edt-session";
const AuthContext = createContext(null);

const lireSession = () => {
  try {
    return JSON.parse(localStorage.getItem(CLE) ?? sessionStorage.getItem(CLE) ?? "null");
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(lireSession);

  /** Renvoie { ok, error }. « souvenir » : reste connecté après fermeture du navigateur. */
  const connecter = useCallback((identifiant, motDePasse, souvenir) => {
    const compte = COMPTES_DEMO.find((c) => c.identifiant === identifiant.trim().toLowerCase());
    if (!compte || compte.motDePasse !== motDePasse) {
      return { ok: false, error: "Identifiant ou mot de passe incorrect." };
    }
    const session = { identifiant: compte.identifiant, nom: compte.nom, role: compte.role };
    (souvenir ? localStorage : sessionStorage).setItem(CLE, JSON.stringify(session));
    setUtilisateur(session);
    return { ok: true };
  }, []);

  const deconnecter = useCallback(() => {
    localStorage.removeItem(CLE);
    sessionStorage.removeItem(CLE);
    setUtilisateur(null);
  }, []);

  const value = useMemo(() => ({ utilisateur, connecter, deconnecter }), [utilisateur, connecter, deconnecter]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
