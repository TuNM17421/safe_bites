import type { Config } from 'tailwindcss';
import safebite from './tailwind.safebite-preset';

// Semantic tokens only — components consume `bg-status-avoid`, `text-muted-foreground`,
// etc. Never raw hex/rgb. Values are HSL channel triplets defined in globals.css.
const config: Config = {
  // ADR-UI-01: SafeBite v2 design-token preset (sb-* colours, elevation, radius, type, motion).
  // Deep-merges with the extend below; existing tokens are untouched.
  presets: [safebite],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        border: 'hsl(var(--border))',
        safety: 'hsl(var(--safety))',
        'safety-foreground': 'hsl(var(--safety-foreground))',
        status: {
          suitable: 'hsl(var(--status-suitable))',
          'ask-first': 'hsl(var(--status-ask-first))',
          risky: 'hsl(var(--status-risky))',
          avoid: 'hsl(var(--status-avoid))',
          unknown: 'hsl(var(--status-unknown))',
        },
      },
    },
  },
  plugins: [],
};

export default config;
