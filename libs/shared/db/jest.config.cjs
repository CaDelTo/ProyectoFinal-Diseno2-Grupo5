/** @type {import('jest').Config} */
module.exports = {
  ...require('../../../jest.config.base.cjs'),
  rootDir: '.',
  testMatch: ['**/tests/**/*.spec.ts'],
  testTimeout: 120_000,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  globalSetup: './tests/global-setup.cjs',
  globalTeardown: './tests/global-teardown.cjs',
  collectCoverageFrom: ['index.ts', 'transactions.ts'],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
};
