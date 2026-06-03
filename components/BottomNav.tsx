export default function BottomNav() {
  return (
    <nav
        aria-label="Main navigation"
        className="fixed bottom-0 inset-x-0 z-40 flex h-16 items-end bg-white border-t border-zinc-100 pb-2"
      >
        {/* Home */}
        <button className="flex flex-1 flex-col items-center gap-1 py-1 text-zinc-400 hover:text-zinc-900 transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>
            <path d="M9 21V12h6v9"/>
          </svg>
          <span className="text-[10px] font-medium">Home</span>
        </button>

        {/* Progress */}
        <button className="flex flex-1 flex-col items-center gap-1 py-1 text-zinc-400 hover:text-zinc-900 transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="12" width="4" height="8" rx="1"/>
            <rect x="10" y="7" width="4" height="13" rx="1"/>
            <rect x="17" y="3" width="4" height="17" rx="1"/>
          </svg>
          <span className="text-[10px] font-medium">Progress</span>
        </button>

        {/* Plus — center, raised (UI placeholder) */}
        <div className="flex flex-1 flex-col items-center">
          <button
            aria-label="Add"
            className="flex -translate-y-5 h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>

        {/* History */}
        <button className="flex flex-1 flex-col items-center gap-1 py-1 text-zinc-400 hover:text-zinc-900 transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 7v5l3 3"/>
          </svg>
          <span className="text-[10px] font-medium">History</span>
        </button>

        {/* Profile */}
        <button className="flex flex-1 flex-col items-center gap-1 py-1 text-zinc-400 hover:text-zinc-900 transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7"/>
          </svg>
          <span className="text-[10px] font-medium">Profile</span>
        </button>
    </nav>
  )
}
