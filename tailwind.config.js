/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan the src directory (App Router + components) for Tailwind class usage.
  content: ['./src/**/*.{js,jsx,ts,tsx,mdx}'],

  // Keep Tailwind from clashing with the existing custom design system.
  // - preflight: disabled (project already has a full CSS reset)
  // - container: disabled (project already defines a .container class)
  corePlugins: {
    preflight: false,
    container: false,
  },

  theme: {
    extend: {},
  },
  plugins: [],
};
