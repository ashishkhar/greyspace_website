import type { IconName } from "@/lib/siteSchema";

const PATHS: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6 10v9h12v-9" />
      <path d="M10 19v-5h4v5" />
    </>
  ),
  layers: (
    <>
      <path d="m12 4 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4" />
      <path d="m4 16 8 4 8-4" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m15 9-2 4-4 2 2-4 4-2Z" />
    </>
  ),
  ruler: (
    <>
      <path d="M4 16 16 4l4 4L8 20l-4-4Z" />
      <path d="m8 12 2 2M11 9l2 2M14 6l2 2" />
    </>
  ),
  sofa: (
    <>
      <path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
      <path d="M3 12a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3v-5Z" />
      <path d="M5 17v2M19 17v2" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14" />
      <path d="M5 19 13 11" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </>
  ),
  column: (
    <>
      <path d="M4 8h16M5 8l1-3h12l1 3" />
      <path d="M7 8v10M12 8v10M17 8v10" />
      <path d="M4 20h16" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="16" height="16" />
      <path d="M4 12h16M12 4v16M8 12v8" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="12" r="3.5" />
      <path d="M11.5 12H20M17 12v3M14.5 12v2" />
    </>
  ),
};

export function Icon({ name, className = "h-8 w-8" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.home}
    </svg>
  );
}

/** Minimal line drawing used until the admin uploads a real image. */
export function ArchPlaceholder({ variant = 0, label }: { variant?: number; label?: string }) {
  const v = variant % 4;
  const hues = ["#2a2622", "#23262a", "#28241f", "#1f2326"];
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: `linear-gradient(160deg, ${hues[v]} 0%, #121212 100%)` }}>
      <svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g fill="none" stroke="rgba(220,200,170,0.28)" strokeWidth="1">
          {v === 0 && (
            <>
              <path d="M40 330h320M70 330V250h260v80M50 250h300" />
              <path d="M120 330v-80M200 330v-80M280 330v-80" />
              <path d="M90 250l-20-30h260l-20 30" />
            </>
          )}
          {v === 1 && (
            <>
              <path d="M60 360h280M100 360V180h120v180M220 240h100v120" />
              <path d="M150 180v-40h30v40M100 230h120M100 290h120" />
            </>
          )}
          {v === 2 && (
            <>
              <path d="M40 360h320M80 360c0-110 70-170 160-170s120 80 120 170" />
              <path d="M140 360c0-70 40-110 100-110s80 50 80 110" />
            </>
          )}
          {v === 3 && (
            <>
              <path d="M50 360h300M80 360V200l120-60 120 60v160" />
              <path d="M200 140v220M80 280h240" />
            </>
          )}
        </g>
      </svg>
      {label ? (
        <span className="absolute bottom-4 left-4 text-[10px] uppercase tracking-[0.25em] text-white/30">{label}</span>
      ) : null}
    </div>
  );
}
