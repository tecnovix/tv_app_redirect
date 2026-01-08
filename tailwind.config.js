/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Tecnovix - Roxo + Amarelo/Ouro
        tecnovix: {
          // Roxos (tema principal)
          'purple-dark': '#1a0033',
          'purple': '#2d1b4e',
          'purple-medium': '#5a2d82',
          'purple-light': '#8b5cf6',

          // Amarelo/Ouro (CTA/destaque)
          'gold': '#FFD700',
          'gold-dark': '#E6C200',
          'gold-light': '#FFE44D',

          // Neutras
          'dark': '#0f0f0f',
          'gray-dark': '#1a1a1a',
          'gray': '#2a2a2a',
          'gray-light': '#f5f5f7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-purple': 'linear-gradient(135deg, #1a0033 0%, #5a2d82 100%)',
        'gradient-purple-dark': 'linear-gradient(180deg, #1a0033 0%, #2d1b4e 100%)',
      },
      boxShadow: {
        'purple': '0 4px 20px rgba(90, 45, 130, 0.3)',
        'gold': '0 4px 20px rgba(255, 215, 0, 0.3)',
      },
    },
  },
  plugins: [],
}
