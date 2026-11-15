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
    extend: {
      // Tokens live in globals.css / premium.css; Tailwind just references them.
      colors: {
        accent: 'var(--accent-primary)',
        'accent-2': 'var(--accent-secondary)',
        surface: 'var(--bg-secondary)',
        'surface-2': 'var(--bg-tertiary)',
        ink: 'var(--text-primary)',
        'ink-muted': 'var(--text-muted)',
        line: 'var(--border-color)',
      },
    },
  },
  plugins: [],
};
