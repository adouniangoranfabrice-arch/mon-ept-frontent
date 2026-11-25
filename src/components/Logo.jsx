/** Logo de l'application (même dessin que public/logo.svg, l'icône de l'onglet). */
export function LogoIcone({ size = 32, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={`shrink-0 ${className}`}>
      <rect width="64" height="64" rx="16" fill="#3b5bdb" />
      <rect x="13" y="17" width="38" height="34" rx="7" fill="#fff" />
      <rect x="13" y="17" width="38" height="9" rx="4.5" fill="#8EA4FF" />
      <rect x="13" y="22" width="38" height="4" fill="#8EA4FF" />
      <rect x="21" y="11" width="5" height="11" rx="2.5" fill="#16181d" />
      <rect x="38" y="11" width="5" height="11" rx="2.5" fill="#16181d" />
      {[19, 28.5, 38].map((x) => (
        <rect key={`a${x}`} x={x} y="30" width="7" height="7" rx="2" fill="#dfe4fb" />
      ))}
      {[19, 28.5, 38].map((x) => (
        <rect key={`b${x}`} x={x} y="40" width="7" height="7" rx="2" fill={x === 28.5 ? "#3b5bdb" : "#dfe4fb"} />
      ))}
    </svg>
  );
}

/** Logo + nom. `point` : couleur du point final (selon le fond). */
export default function Logo({ size = 32, className = "", point = "text-[#8EA4FF]" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-display font-bold ${className}`}>
      <LogoIcone size={size} />
      <span>
        Mon EDT<span className={point}>.</span>
      </span>
    </span>
  );
}
