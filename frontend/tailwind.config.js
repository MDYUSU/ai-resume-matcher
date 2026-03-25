/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Enable class-based dark mode for the glassmorphism look
  darkMode: "class", 
  theme: {
    extend: {
      colors: {
        // Neon Cyan Primary from Stitch
        "primary": "#0dccf2",
        // Deep background colors for the gradient
        "background-dark": "#050a1a",
        "background-light": "#f5f8f8",
        // Translucent card background
        "card-dark": "rgba(16, 31, 34, 0.6)",
        // Neon Red for alerts/missing keywords
        "neon-red": "#ff3131",
      },
      fontFamily: {
        // Matching the futuristic Space Grotesk font from the design
        "display": ["Space Grotesk", "sans-serif"],
      },
      // Adding extra blur and radius scales for the glass effect
      borderRadius: {
        "xl": "0.75rem",
        "2xl": "1rem",
      },
      backdropBlur: {
        "xs": "2px",
      }
    },
  },
  plugins: [],
}