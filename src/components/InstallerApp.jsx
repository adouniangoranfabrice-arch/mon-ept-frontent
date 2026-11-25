import { useEffect, useState } from "react";
import { Button, Modal } from "./ui.jsx";
import { LogoIcone } from "./Logo.jsx";
import Icon from "./Icon.jsx";

const DELAI = 3000; // la fenêtre s'affiche 3 s après l'ouverture du lien
const CLE_REFUS = "edt-installation-refusee";
const PAUSE_APRES_REFUS = 7 * 24 * 60 * 60 * 1000; // « Plus tard » : on redemande dans 7 jours

/*
 * Chrome / Edge / Android envoient « beforeinstallprompt » quand l'appli est installable,
 * parfois avant que React soit prêt : on l'écoute dès le chargement de ce fichier.
 */
let invitation = null;
const abonnes = new Set();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // on affiche notre propre fenêtre à la place de celle du navigateur
    invitation = e;
    abonnes.forEach((f) => f(e));
  });
  window.addEventListener("appinstalled", () => {
    invitation = null;
    abonnes.forEach((f) => f(null));
  });
}

const dejaInstallee = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

/** iPhone / iPad (Safari) : pas d'installation automatique, il faut passer par « Partager ». */
const estIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const refuseRecemment = () => Date.now() - Number(localStorage.getItem(CLE_REFUS) ?? 0) < PAUSE_APRES_REFUS;

export default function InstallerApp() {
  const [evt, setEvt] = useState(invitation);
  const [ouvert, setOuvert] = useState(false);
  const ios = estIOS();

  useEffect(() => {
    abonnes.add(setEvt);
    return () => abonnes.delete(setEvt);
  }, []);

  // Affiche la fenêtre quelques secondes après l'ouverture, si l'installation est possible
  useEffect(() => {
    if (dejaInstallee() || refuseRecemment() || (!evt && !ios)) return;
    const t = setTimeout(() => setOuvert(true), DELAI);
    return () => clearTimeout(t);
  }, [evt, ios]);

  const plusTard = () => {
    localStorage.setItem(CLE_REFUS, String(Date.now()));
    setOuvert(false);
  };

  const installer = async () => {
    if (!evt) return;
    evt.prompt(); // fenêtre officielle du navigateur
    const { outcome } = await evt.userChoice;
    if (outcome === "dismissed") localStorage.setItem(CLE_REFUS, String(Date.now()));
    invitation = null;
    setEvt(null);
    setOuvert(false);
  };

  return (
    <Modal
      open={ouvert}
      onClose={plusTard}
      title="Installer l'application"
      size="sm"
      footer={
        ios ? (
          <Button onClick={plusTard} data-autofocus>J'ai compris</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={plusTard}>Plus tard</Button>
            <Button icon="download" onClick={installer} data-autofocus>Installer</Button>
          </>
        )
      }
    >
      <div className="flex items-start gap-4">
        <LogoIcone size={56} />
        <div>
          <div className="font-display text-lg font-bold">Mon EDT</div>
          <p className="mt-1 text-sm text-muted">
            Ajoutez l'application à votre écran d'accueil : elle s'ouvre en plein écran, démarre plus vite
            et reste consultable sans réseau.
          </p>
        </div>
      </div>

      {ios && (
        <ol className="mt-5 space-y-3 rounded-xl bg-ground p-4 text-sm">
          <li className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">1</span>
            <span>
              Touchez <Icon name="share" size={16} className="inline -mt-1 text-accent" /> <strong>Partager</strong> en bas de Safari
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">2</span>
            <span>Choisissez <strong>Sur l'écran d'accueil</strong></span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">3</span>
            <span>Touchez <strong>Ajouter</strong></span>
          </li>
        </ol>
      )}
    </Modal>
  );
}
