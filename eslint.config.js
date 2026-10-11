/**
 * Configuración de ESLint (formato plano). Corre en la integración continua.
 */
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', '_site/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.browser } },
  },
  {
    files: ['scripts/**/*.js', 'tests/**/*.js', 'eslint.config.js', 'playwright.config.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
  },
  {
    rules: {
      'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'max-lines': ['error', { max: 400, skipBlankLines: false, skipComments: false }],
    },
  },
];
