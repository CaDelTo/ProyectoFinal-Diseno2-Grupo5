/** @type {import('jest').Config} */
module.exports = {
  ...require('../../jest.config.base.cjs'),
  rootDir: '.',
  testMatch: ['**/tests/**/*.spec.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@shared/db$': '<rootDir>/../../libs/shared/db/generated/index.js',
    '^@shared/errors$': '<rootDir>/../../libs/shared/errors/src/index.ts',
    '^@shared/health$': '<rootDir>/../../libs/shared/health/src/index.ts',
    '^@shared/logger$': '<rootDir>/../../libs/shared/logger/src/index.ts',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/index.ts', '!src/main.ts'],
};
