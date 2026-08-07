/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#F3F5EF',
        surface: '#FFFFFF',
        'surface-muted': '#E8ECE4',
        ink: '#17231D',
        muted: '#5E6D64',
        border: '#D4DBD2',
        leaf: '#2F6B4F',
        'leaf-dark': '#1D4D37',
        'leaf-soft': '#DCEADF',
        amber: '#9A5B10',
        'amber-soft': '#F6E8CF',
        danger: '#A33737',
        'danger-soft': '#F5DEDE',
      },
      borderRadius: {
        sm: '10px',
        md: '16px',
        lg: '24px',
        pill: '999px',
      },
      boxShadow: {
        card: '0px 2px 8px rgba(23, 35, 29, 0.06)',
      },
    },
  },
  plugins: [],
};
