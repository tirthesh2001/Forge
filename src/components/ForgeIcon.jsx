export default function ForgeIcon({ size = 24, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 56" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="12" y="44" width="40" height="6" rx="2" fill="var(--text-muted)" opacity="0.4" />
      <rect x="16" y="38" width="32" height="8" rx="2" fill="var(--surface-hover, #2a2a3a)" stroke="var(--text-muted)" strokeWidth="1" opacity="0.8" />
      <path d="M8 36 L18 30 L46 30 L46 36 Z" fill="var(--surface-hover, #2a2a3a)" stroke="var(--text-muted)" strokeWidth="1" />
      <rect x="18" y="28" width="28" height="4" rx="1" fill="var(--text-muted)" opacity="0.6" />
      <rect x="34" y="8" width="8" height="14" rx="2" fill="var(--text-muted)" opacity="0.7" transform="rotate(15 38 15)" />
      <rect x="36" y="18" width="3" height="14" rx="1" fill="#CA8A04" transform="rotate(15 37.5 25)" />
      <circle cx="28" cy="24" r="1.5" fill="#EAB308" opacity="0.9" />
      <circle cx="32" cy="20" r="1" fill="#F59E0B" opacity="0.8" />
      <circle cx="24" cy="22" r="1" fill="#EAB308" opacity="0.7" />
      <line x1="28" y1="24" x2="25" y2="19" stroke="#EAB308" strokeWidth="1" opacity="0.6" />
      <line x1="28" y1="24" x2="31" y2="18" stroke="#F59E0B" strokeWidth="1" opacity="0.5" />
      <line x1="28" y1="24" x2="23" y2="21" stroke="#EAB308" strokeWidth="1" opacity="0.5" />
      <rect x="18" y="52" width="28" height="1.5" rx="0.75" fill="var(--accent)" />
    </svg>
  )
}
