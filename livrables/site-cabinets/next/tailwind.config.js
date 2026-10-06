/** Tailwind sert aux nouveaux composants animés ; la mise en page éditoriale reste dans globals.css. */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: { paper: '#E9E5D8', navy: '#0F1E3D', ink: '#111111', accent: '#C8200E',
      },
    },
  },
  plugins: [],
};
