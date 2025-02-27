import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
  },
  setupFiles: ['<rootDir>/fixtures/setup.ts'],
  globalSetup: '<rootDir>/fixtures/global-setup.ts',
  globalTeardown: '<rootDir>/fixtures/global-teardown.ts',
  coverageDirectory: '../coverage-e2e',
  testTimeout: 30000,
};

export default config;
