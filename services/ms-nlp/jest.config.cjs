/** @type {import('jest').Config} */
module.exports = {
  ...require('../../jest.config.base.cjs'),
  rootDir: '.',
  testMatch: ['**/tests/**/*.spec.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: ['lib/**/*.ts', '!lib/**/*.spec.ts'],
};
