module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { esModuleInterop: true } }],
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/__tests__/**',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 80,
      lines: 90,
      statements: 90,
    },
  },
};
