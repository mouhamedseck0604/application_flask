tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sora: ['Sora', 'sans-serif'],
            display: ['Playfair Display', 'serif'],
          },
          colors: {
            gold: { 300: '#fde68a', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
            senGreen: { 400: '#34d399', 500: '#10b981', 600: '#059669' },
            senRed: { 400: '#f87171', 500: '#ef4444', 600: '#dc2626' },
            ink: {
              900: '#080d1a',
              800: '#0d1424',
              700: '#111b30',
              600: '#1a2540',
              500: '#243050',
            }
          },
          animation: {
            'fade-up': 'fadeUp 0.4s ease forwards',
            'pulse-dot': 'pulseDot 2s ease-in-out infinite',
            'shimmer': 'shimmer 2.5s linear infinite',
            'glow': 'glow 3s ease-in-out infinite alternate',
          },
          keyframes: {
            fadeUp: {
              from: { opacity: 0, transform: 'translateY(10px)' },
              to: { opacity: 1, transform: 'translateY(0)' }
            },
            pulseDot: {
              '0%, 100%': { transform: 'scale(1)', opacity: 1 },
              '50%': { transform: 'scale(1.4)', opacity: 0.6 }
            },
            shimmer: {
              '0%': { backgroundPosition: '-200% center' },
              '100%': { backgroundPosition: '200% center' }
            },
            glow: {
              from: { boxShadow: '0 0 20px rgba(245,158,11,0.15)' },
              to: { boxShadow: '0 0 50px rgba(245,158,11,0.35)' }
            }
          }
        }
      }
    }