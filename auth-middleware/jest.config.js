// jest.config.js
module.exports = {
  clearMocks: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/libs/__mocks__/prisma.singleton.ts']
};