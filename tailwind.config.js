/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1200px' } },
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'JetBrains Mono', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // 5-step type scale only
        caption: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        body: ['0.875rem', { lineHeight: '1.35rem' }],
        label: ['1rem', { lineHeight: '1.5rem' }],
        section: ['1.125rem', { lineHeight: '1.6rem', letterSpacing: '-0.01em' }],
        page: ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
      },
      colors: {
        border: {
          DEFAULT: 'hsl(var(--border))',
          strong: 'hsl(var(--border-strong))',
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          hover: 'hsl(var(--primary-hover))',
          foreground: 'hsl(var(--primary-foreground))',
          soft: 'hsl(var(--primary-soft))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
          subtle: 'hsl(var(--muted-subtle))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        positive: {
          DEFAULT: 'hsl(var(--positive))',
          soft: 'hsl(var(--positive-soft))',
        },
        negative: {
          DEFAULT: 'hsl(var(--negative))',
          soft: 'hsl(var(--negative-soft))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--negative))',
          foreground: '0 0% 100%',
        },
      },
      /**
       * Section 6 asks for 4-6px throughout. The old scale was built around a
       * 12px base, so subtracting from it now would land on 0 and 2px. These
       * keep the existing rounded-sm/md/lg/xl/2xl usages meaningful while
       * holding the whole app inside a sharp 4-8px band.
       */
      borderRadius: {
        sm: 'calc(var(--radius) - 2px)',
        md: 'calc(var(--radius) - 1px)',
        lg: 'var(--radius)',
        xl: 'var(--radius)',
        '2xl': 'calc(var(--radius) + 2px)',
      },
      /**
       * Very soft only. The resting value is the one Section 6 specifies; the
       * larger steps exist for dialogs and hover lift and stay deliberately
       * close to it, so nothing in the app reads as a drop shadow.
       */
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
        DEFAULT: '0 1px 2px rgba(0, 0, 0, 0.04)',
        md: '0 2px 6px rgba(0, 0, 0, 0.06)',
        lg: '0 8px 24px rgba(0, 0, 0, 0.08)',
        none: 'none',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
