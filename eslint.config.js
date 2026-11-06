
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/coverage/**'
        ]
    },

    js.configs.recommended,
    ...tseslint.configs.recommended,

    {
        files: ['eslint.config.js'],
        languageOptions: {
            globals: {
                require: 'readonly',
                module: 'readonly'
            }
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off'
        }
    },

    {
        files: ['**/*.ts'],

        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_'
                }
            ]
        }
    }
);
