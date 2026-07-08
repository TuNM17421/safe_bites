import type { Config } from 'tailwindcss';

/**
 * SafeBite v2 design-token preset (ADDITIVE).
 * Enable by adding to apps/web/tailwind.config.ts:
 *   import safebite from './tailwind.safebite-preset';
 *   const config: Config = { presets: [safebite], content: [...], theme: {...} };
 * Requires src/app/tokens.safebite.css to be imported once (see that file's header).
 * All keys are namespaced 'sb' so nothing collides with existing tokens.
 * "No raw colors" rule: consume via classes like bg-sb-surface / text-sb-status-avoid.
 */
const safebite: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        sb: {
          bg: 'hsl(var(--sb-bg) / <alpha-value>)', surface: 'hsl(var(--sb-surface) / <alpha-value>)',
          'surface-2': 'hsl(var(--sb-surface-2) / <alpha-value>)', 'surface-3': 'hsl(var(--sb-surface-3) / <alpha-value>)',
          overlay: 'hsl(var(--sb-overlay) / <alpha-value>)', border: 'hsl(var(--sb-border) / <alpha-value>)', 'border-strong': 'hsl(var(--sb-border-strong) / <alpha-value>)',
          fg: 'hsl(var(--sb-fg) / <alpha-value>)', muted: 'hsl(var(--sb-muted) / <alpha-value>)', faint: 'hsl(var(--sb-faint) / <alpha-value>)',
          ring: 'hsl(var(--sb-ring) / <alpha-value>)',
          brand: {
            DEFAULT: 'hsl(var(--sb-brand) / <alpha-value>)', ink: 'hsl(var(--sb-brand-ink) / <alpha-value>)', soft: 'hsl(var(--sb-brand-soft) / <alpha-value>)',
            foreground: 'hsl(var(--sb-brand-foreground) / <alpha-value>)',
            50:'hsl(var(--sb-brand-50) / <alpha-value>)',100:'hsl(var(--sb-brand-100) / <alpha-value>)',200:'hsl(var(--sb-brand-200) / <alpha-value>)',300:'hsl(var(--sb-brand-300) / <alpha-value>)',
            400:'hsl(var(--sb-brand-400) / <alpha-value>)',500:'hsl(var(--sb-brand-500) / <alpha-value>)',600:'hsl(var(--sb-brand-600) / <alpha-value>)',700:'hsl(var(--sb-brand-700) / <alpha-value>)',
            800:'hsl(var(--sb-brand-800) / <alpha-value>)',900:'hsl(var(--sb-brand-900) / <alpha-value>)',
          },
          primary: { DEFAULT: 'hsl(var(--sb-primary) / <alpha-value>)', foreground: 'hsl(var(--sb-primary-foreground) / <alpha-value>)' },
          // Coral = FILL/DECORATIVE only. Never inside status/allergen/confidence surfaces.
          appetite: { DEFAULT: 'hsl(var(--sb-appetite) / <alpha-value>)', soft: 'hsl(var(--sb-appetite-soft) / <alpha-value>)', ink: 'hsl(var(--sb-appetite-ink) / <alpha-value>)' },
          status: {
            suitable:  { DEFAULT: 'hsl(var(--sb-status-suitable-fg) / <alpha-value>)', fg: 'hsl(var(--sb-status-suitable-fg) / <alpha-value>)', bg: 'hsl(var(--sb-status-suitable-bg) / <alpha-value>)', border: 'hsl(var(--sb-status-suitable-border) / <alpha-value>)' },
            'ask-first': { DEFAULT: 'hsl(var(--sb-status-ask-first-fg) / <alpha-value>)', fg: 'hsl(var(--sb-status-ask-first-fg) / <alpha-value>)', bg: 'hsl(var(--sb-status-ask-first-bg) / <alpha-value>)', border: 'hsl(var(--sb-status-ask-first-border) / <alpha-value>)' },
            risky:     { DEFAULT: 'hsl(var(--sb-status-risky-fg) / <alpha-value>)', fg: 'hsl(var(--sb-status-risky-fg) / <alpha-value>)', bg: 'hsl(var(--sb-status-risky-bg) / <alpha-value>)', border: 'hsl(var(--sb-status-risky-border) / <alpha-value>)' },
            avoid:     { DEFAULT: 'hsl(var(--sb-status-avoid-fg) / <alpha-value>)', fg: 'hsl(var(--sb-status-avoid-fg) / <alpha-value>)', bg: 'hsl(var(--sb-status-avoid-bg) / <alpha-value>)', border: 'hsl(var(--sb-status-avoid-border) / <alpha-value>)' },
            unknown:   { DEFAULT: 'hsl(var(--sb-status-unknown-fg) / <alpha-value>)', fg: 'hsl(var(--sb-status-unknown-fg) / <alpha-value>)', bg: 'hsl(var(--sb-status-unknown-bg) / <alpha-value>)', border: 'hsl(var(--sb-status-unknown-border) / <alpha-value>)' },
          },
        },
      },
      borderRadius: { 'sb-xs':'8px','sb-sm':'12px','sb-md':'16px','sb-lg':'22px','sb-xl':'28px' },
      boxShadow: {
        'sb-e1':'var(--sb-e1)','sb-e2':'var(--sb-e2)','sb-e3':'var(--sb-e3)','sb-e4':'var(--sb-e4)',
        'sb-focus':'var(--sb-focus)',
      },
      fontFamily: {
        sb: ['"Atkinson Hyperlegible"','-apple-system','BlinkMacSystemFont','"Segoe UI"','Roboto','sans-serif'],
      },
      fontSize: {
        'sb-display': ['28px', { lineHeight:'34px', fontWeight:'700' }],
        'sb-h1':      ['24px', { lineHeight:'30px', fontWeight:'700' }],
        'sb-h2':      ['20px', { lineHeight:'26px', fontWeight:'700' }],
        'sb-title':   ['18px', { lineHeight:'24px', fontWeight:'600' }],
        'sb-body-l':  ['17px', { lineHeight:'24px', fontWeight:'400' }],
        'sb-body':    ['16px', { lineHeight:'24px', fontWeight:'400' }],
        'sb-body-s':  ['14px', { lineHeight:'20px', fontWeight:'400' }],
        'sb-label':   ['13px', { lineHeight:'18px', fontWeight:'600' }],
        'sb-caption': ['12px', { lineHeight:'16px', fontWeight:'400' }],
      },
      // 8pt scale note: use Tailwind defaults (2=8px,3=12px,4=16px,6=24px,8=32px,12=48px,16=64px).
      minHeight: { 'sb-tap':'48px' },
      minWidth:  { 'sb-tap':'48px' },
      transitionDuration: { 'sb-fast':'100ms','sb-std':'200ms','sb-enter':'300ms','sb-exit':'250ms' },
      transitionTimingFunction: {
        'sb-standard':'cubic-bezier(0.2,0,0,1)',
        'sb-emph-decel':'cubic-bezier(0.05,0.7,0.1,1)',
        'sb-emph-accel':'cubic-bezier(0.3,0,0.8,0.15)',
      },
      keyframes: {
        'sb-shimmer': { '100%': { transform: 'translateX(100%)' } },
        'sb-spin': { to: { transform: 'rotate(360deg)' } },
      },
      animation: { 'sb-shimmer':'sb-shimmer 1200ms linear infinite', 'sb-spin':'sb-spin .8s linear infinite' },
    },
  },
};

export default safebite;
