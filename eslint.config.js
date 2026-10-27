import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    // eslint-config-prettier goes last: it turns off rules that would fight the formatter.
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended, prettier],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },
]);
