/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['./index.js'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
  },
};
