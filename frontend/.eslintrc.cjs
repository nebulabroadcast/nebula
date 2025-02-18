module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier', // This makes sure prettier overrides conflicting rules
  ],
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  rules: {
    // Add your custom rules here if needed. For example:
    'no-unused-vars': 'warn', // Or 'error'
    '@typescript-eslint/explicit-function-return-type': 'off', // Example: Often useful during development
    'react/jsx-no-useless-fragment': 'warn',
    'react/self-closing-comp': 'warn',
  },
};
