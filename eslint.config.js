// Verificador de código (lint): pega erros comuns (variável não usada, nome que não existe) antes de chegarem ao app.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'docs/'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  { files: ['sw.js'], languageOptions: { globals: { ...globals.serviceworker } } },
];
