import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    ignores: [
      'build/',
      'dev-dist/',
      'stage-plot-app/',
      'supabase/functions/',
      'node_modules/',
      'public/',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Burn-down debt (tracked in docs/development/coding-guide.md):
      // - no-explicit-any: the codebase predates strict typing (~500 `any`s);
      //   tighten to 'error' as services/components are refactored (Phase 7)
      // - the react-hooks v6 compiler rules (set-state-in-effect, immutability,
      //   refs, purity, …) flag real but Phase-7-sized refactors in the large
      //   screen components; re-enable as those components are split
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      // Unused function params are idiomatic (callbacks, destructured props);
      // unused locals/imports remain errors
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'none', varsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true },
      ],
    },
  }
);
