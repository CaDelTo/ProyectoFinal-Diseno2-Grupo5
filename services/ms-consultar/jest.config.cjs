/** @type {import('jest').Config} */
module.exports = {
  ...require('../../jest.config.base.cjs'),
  rootDir: '.',
  testMatch: ['**/tests/**/*.spec.ts'],
  testTimeout: 120_000,
  globalSetup: './tests/global-setup.cjs',
  globalTeardown: './tests/global-teardown.cjs',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@shared/db$': '<rootDir>/../../libs/shared/db/generated/index.js',
    '^@shared/errors$': '<rootDir>/../../libs/shared/errors/src/index.ts',
    '^@shared/health$': '<rootDir>/../../libs/shared/health/src/index.ts',
    '^@shared/logger$': '<rootDir>/../../libs/shared/logger/src/index.ts',
    '^@shared/validators$': '<rootDir>/../../libs/shared/validators/src/index.ts',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/index.ts',
    '!src/main.ts',
  ],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
};
