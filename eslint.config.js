// Convert to CommonJS so Node won't reparse this file as an ES module when package.json
// doesn't specify "type": "module". This avoids the MODULE_TYPELESS_PACKAGE_JSON warning.
const js = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const prettierConfig = require('eslint-config-prettier');
const pluginJest = require('eslint-plugin-jest');

// ESLint v9 uses a flat config format exported as an array of configuration objects
module.exports = [
  // First config object: Specify files to ignore during linting
  {
    ignores: ['eslint.config.js'], // Ignore the ESLint config file itself
  },

  // Second config object: Apply ESLint's recommended JavaScript rules as a base
  js.configs.recommended,

  // Third config object: Main configuration for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],

    languageOptions: {
      // Use TypeScript parser to understand TypeScript syntax
      parser: tsParser,

      parserOptions: {
        project: './tsconfig.json', // Path to TypeScript config for type-aware linting
        tsconfigRootDir: __dirname, // Root directory for parser (CommonJS)
        sourceType: 'module', // Use ES module syntax (import/export) in project files
      },

      // Define global variables available in the environment to avoid `no-undef`
      globals: {
        // Jest globals used widely in test files
        ...pluginJest.environments.globals.globals,

        // Node globals
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        Buffer: 'readonly',
        require: 'readonly',
        NodeJS: 'readonly',

        // Browser / runtime globals used (e.g. fetch in some services)
        fetch: 'readonly',
      },
    },

    plugins: {
      '@typescript-eslint': tsPlugin,
      jest: pluginJest,
    },

    rules: {
      // Spread recommended TypeScript rules from the plugin
      ...tsPlugin.configs.recommended.rules,
      // Spread Prettier config to disable conflicting ESLint rules
      ...prettierConfig.rules,

      // Spread Jest plugin rules
      ...pluginJest.configs.recommended.rules,

      // Custom rule overrides
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',

      // Relax unused vars handling so common patterns (like unused `error` param)
      // don't fail linting. We still keep the rule enabled but ignore args/vars
      // named `error` (common in catch handlers) and ignore underscore-prefixed args.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_|^error$',
          varsIgnorePattern: '^error$',
        },
      ],
    },
  },
]