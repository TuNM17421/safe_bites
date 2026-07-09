import type { ReactNode } from 'react';

// Next re-mounts a template on every navigation, so the page content replays a gentle enter
// transition (fade + slight rise) while the persistent shell (AppHeader / BottomNav in the
// layout) stays put — smoothing the previously abrupt tab-to-tab swap. The animation is
// auto-frozen under prefers-reduced-motion by the global rule in tokens.safebite.css.
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <div className="animate-sb-page-enter">{children}</div>;
}
