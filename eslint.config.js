import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * Vite + Vercel: only VITE_* vars are inlined at build time; set them in Vercel → Settings → Env.
 * framer-motion uses JSX like <motion.div>; ESLint does not count that as using `motion` — allow the name.
 * React Compiler rules in recommended are strict; this project builds with Vite (no compiler) — relax rules that are noise here.
 */
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]|^motion$', argsIgnorePattern: '^_' }],
      // Without React Compiler, these fight normal Vite SPA patterns (effects, Date.now(), manual memo deps).
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      // TanStack Virtual useVirtualizer is compatible; recommended rule is tuned for React Compiler.
      'react-hooks/incompatible-library': 'off',
      'react-refresh/only-export-components': 'warn',
    },
  },
])
