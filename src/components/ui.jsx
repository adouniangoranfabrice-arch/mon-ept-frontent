import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import Icon from "./Icon.jsx";

/* ---------- Boutons ---------- */
const VARIANTS = {
  primary: "bg-accent text-white hover:bg-accent-dark",
  secondary: "bg-white text-ink border border-line hover:bg-ground",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-muted hover:bg-ground hover:text-ink",
};

export function Button({ variant = "primary", icon, className = "", children, ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      type="button"
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </motion.button>
  );
}

export function IconButton({ label, icon, tone = "default", ...props }) {
  const tones = {
    default: "text-muted hover:bg-ground hover:text-ink",
    danger: "text-muted hover:bg-red-50 hover:text-red-600",
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${tones[tone]}`}
      {...props}
    >
      <Icon name={icon} size={17} />
    </button>
  );
}

/* ---------- En-tête de page ---------- */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ className = "", children }) {
  return <div className={`rounded-2xl border border-line bg-white ${className}`}>{children}</div>;
}

/* ---------- Champs ---------- */
export function Field({ label, htmlFor, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorBox({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          role="alert"
          className="overflow-hidden"
        >
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-gray-300"
      }`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={`h-5 w-5 rounded-full bg-white shadow ${checked ? "ml-6" : "ml-1"}`}
      />
    </button>
  );
}

/* ---------- Fenêtre modale ---------- */
export function Modal({ open, onClose, title, children, footer, size = "md" }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    // Focus sur le premier champ (ou le premier bouton du contenu)
    const t = setTimeout(() => {
      const p = panelRef.current;
      (p?.querySelector(".field") ?? p?.querySelector("[data-autofocus]"))?.focus();
    }, 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open]);

  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${widths[size]}`}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-lg font-bold">{title}</h2>
              <IconButton label="Fermer" icon="x" onClick={onClose} />
            </div>
            <div className={`overflow-y-auto px-5 py-5 ${footer ? "" : "pb-[max(1.25rem,env(safe-area-inset-bottom))]"}`}>{children}</div>
            {footer && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] [&>*]:flex-1 sm:[&>*]:flex-none">{footer}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Confirmation de suppression ---------- */
export function ConfirmDialog({ open, title, message, confirmLabel = "Supprimer", onConfirm, onCancel }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
          <Button variant="danger" icon="trash" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[15px] leading-relaxed text-muted">{message}</p>
    </Modal>
  );
}

/* ---------- État vide ---------- */
export function EmptyState({ icon = "list", title, text, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ground text-muted">
        <Icon name={icon} size={22} />
      </div>
      <h3 className="font-semibold">{title}</h3>
      {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      {action}
    </motion.div>
  );
}

/* ---------- Ligne d'information (vue détail) ---------- */
export function InfoRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3 text-[15px] last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

/* ---------- Animation d'apparition des listes ---------- */
export const listItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -20, transition: { duration: 0.18 } },
};
