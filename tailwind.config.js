/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      screens: {
        // Touch-first devices (phones, tablets): bigger tap targets via
        // `touch:` without changing the dense desktop layout.
        touch: { raw: "(pointer: coarse)" },
      },
      colors: {
        brand: {
          pink: "#E8195E",
          // Signal Pink nudged darker so white text on it — and pink text
          // on white — clears WCAG AA (5.1:1 vs 4.4:1). Use for filled
          // controls with labels and for small pink text.
          "pink-deep": "#D71656",
          "pink-deeper": "#C21350",
          dark: "#1B0E1E",
          cream: "#F7E7E2",
        },
        // Status colors: only for success / warning / danger feedback,
        // never decoration. Warm, slightly desaturated so they sit with the
        // brand palette; danger is a deep brick red so it never reads as
        // brand pink. DEFAULT is the ink (≥4.5:1 on white and on `soft`),
        // `soft` the tinted fill.
        success: { DEFAULT: "#1F7A4D", soft: "#E6F3EB" },
        warning: { DEFAULT: "#8F5300", soft: "#FCF0DC" },
        danger: { DEFAULT: "#B42318", soft: "#FCEBE8" },
        // Categorical colors for telling class types apart (ClassChips).
        // Soft fill + dark ink pairs at matched lightness; data only.
        category: {
          rose: { DEFAULT: "#8A1538", soft: "#FBE3EA" },
          plum: { DEFAULT: "#5B2A6B", soft: "#F0E4F4" },
          indigo: { DEFAULT: "#2F3A80", soft: "#E4E7F7" },
          teal: { DEFAULT: "#1D5E58", soft: "#DDF0EE" },
          olive: { DEFAULT: "#3E5E1E", soft: "#E7F0DD" },
          ochre: { DEFAULT: "#7A4E0B", soft: "#F8EDD7" },
          clay: { DEFAULT: "#8A3A1C", soft: "#F8E3D9" },
          slate: { DEFAULT: "#3D2F40", soft: "#EAE5EB" },
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
      },
    },
  },
  plugins: [],
};
