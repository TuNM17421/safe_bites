import type { Config } from 'tailwindcss';

// Semantic tokens only — components consume `bg-status-avoid`, `text-muted-foreground`,
// etc. Never raw hex/rgb. Values are HSL channel triplets defined in globals.css.
const config: Config = {
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
