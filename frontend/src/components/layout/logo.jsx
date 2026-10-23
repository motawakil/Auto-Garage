export function LogoMark({ className = 'size-9' }) {
  return (
    <div className={`relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-900/40 ${className}`}>
      <svg viewBox="0 0 24 24" className="size-[58%] text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17h-1a1 1 0 0 1-1-1v-3.6a2 2 0 0 1 .4-1.2L6 8h9l3.5 3.2a2 2 0 0 1 .5 1.3V16a1 1 0 0 1-1 1h-1" />
        <circle cx="7.5" cy="17" r="2" />
        <circle cx="16.5" cy="17" r="2" />
        <path d="M9.5 17h5" />
      </svg>
      <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-sidebar bg-amber-400" />
    </div>
  )
}
