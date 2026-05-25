export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0B0B10',
          secondary: '#13131A',
          tertiary: '#1C1C28',
          elevated: '#262638',
        },
        accent: {
          DEFAULT: '#E8590C',
          hover: '#F0652E',
          teal: '#2DD4BF',
          gold: '#F5B041',
        },
        success: '#34D399',
        error: '#EF4444',
        warning: '#F59E0B',
        text: {
          primary: '#EDEDF2',
          secondary: '#A0A0B2',
          tertiary: '#6B6B80',
        },
      },
      fontFamily: {
        display: ['Tektur', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
