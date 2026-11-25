import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Connexion from "./pages/Connexion.jsx";
import { AuthProvider, useAuth } from "./store/AuthContext.jsx";
import { StoreProvider } from "./store/StoreContext.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import InstallerApp from "./components/InstallerApp.jsx";
import "./index.css";

/** Page de connexion tant que personne n'est connecté ; les données ne sont chargées qu'après. */
function Porte() {
  const { utilisateur } = useAuth();
  if (!utilisateur) return <Connexion />;
  return (
    <StoreProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </StoreProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <Porte />
      {/* Proposée quelques secondes après l'ouverture, dès la page de connexion */}
      <InstallerApp />
    </AuthProvider>
  </StrictMode>
);
