/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm, low-glare neutral ramp — soft linen canvas, never stark white.
        bg: {
          base: '#F2F1EC',
          raised: '#FBFAF6',
          overlay: '#EAE8E1',
          terminal: '#141419',
        },
        border: {
          subtle: '#E6E3DA',
          DEFAULT: '#DAD6CB',
          strong: '#C6C1B4',
        },
        fg: {
          DEFAULT: '#1B1A17',
          muted: '#57554D',
          subtle: '#8A877C',
        },
        // Single accent used for action + brand emphasis (deep editorial indigo).
        accent: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
          press: '#3730A3',
          fg: '#FFFFFF',
        },
        // Positive/verified state — kept green so it never reads as brand.
        success: '#15A34A',
        danger: '#DC2626',
        warn: '#B45309',
        info: '#2563EB',
        // Fixed semantic difficulty scale — independent from the indigo accent.
        difficulty: {
          easy: '#15A34A',
          medium: '#B45309',
          hard: '#DC2626',
          insane: '#C026D3',
        },

        // Back-compat aliases so pages still authored against the legacy dark
        // token names now resolve to the same light editorial palette. Class
        // strings are unchanged (keeps styling tests green) while every screen
        // re-skins from these tokens.
        paper: '#F2F1EC',
        surface: '#FBFAF6',
        ink: '#1B1A17',
        muted: '#57554D',
        dim: '#8A877C',
        error: '#DC2626',
        warning: '#B45309',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'Times New Roman', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.375rem' }], // app default is 14px, not 16px
        lg: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
        '3xl': ['2rem', { lineHeight: '2.375rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        '5xl': ['3.25rem', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        '6xl': ['4rem', { lineHeight: '1', letterSpacing: '-0.03em' }],
        '7xl': ['5rem', { lineHeight: '0.95', letterSpacing: '-0.035em' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,20,26,.05), 0 1px 3px rgba(20,20,26,.05)',
        pop: '0 16px 40px -16px rgba(20,20,26,.18), 0 4px 12px -4px rgba(20,20,26,.06)',
      },
      transitionTimingFunction: {
        tactical: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      maxWidth: {
        content: '1280px',
      },
      zIndex: {
        topbar: '40',
        sidebar: '45',
        dropdown: '50',
        sessionbar: '35',
        overlay: '90',
        modal: '100',
        toast: '110',
        palette: '120',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms cubic-bezier(0.2,0.8,0.2,1) both',
        'fade-up': 'fade-up 180ms cubic-bezier(0.2,0.8,0.2,1) both',
      },
    },
  },
  plugins: [],
};
