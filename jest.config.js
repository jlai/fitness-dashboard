/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

const nextJest = require("next/jest");

/** @type {import('jest').Config} */
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  testPathIgnorePatterns: ['/node_modules/', 'e2e'],

  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8",

  // The test environment that will be used for testing
  testEnvironment: "jsdom",

  moduleDirectories: ["node_modules", "src"],
  moduleNameMapper: {
    "^@/(.*)$": ['<rootDir>/src/$1'],

    // https://github.com/jestjs/jest/issues/12036
    '^d3-(.+)$': '<rootDir>/node_modules/d3-$1/dist/d3-$1.js',
    
    // Mock ES modules that cause issues
    'mui-sonner': '<rootDir>/src/__mocks__/mui-sonner.js',
    'camelcase-keys': '<rootDir>/src/__mocks__/camelcase-keys.js',
  },

  setupFiles: ['<rootDir>/setup-jest.ts'],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  },
  preset: 'ts-jest',

  // Ignore node_modules, EXCEPT the ESM packages listed here.
  transformIgnorePatterns: [
    "[\\\\/]node_modules[\\\\/](?!(p-queue|p-timeout|mui-sonner|d3-scale|@mui/material-nextjs|@mui/x-date-pickers|camelcase-keys|map-obj|jose)[\\\\/])",
  ],
};

// next/jest adds its own node_modules ignore patterns, which would otherwise
// keep ESM packages like jose from being transformed.
function createModifiedJestConfig(jestConfig) {
  return async () => {
    const nextConfig = await createJestConfig(jestConfig)();

    nextConfig.transformIgnorePatterns =
      nextConfig.transformIgnorePatterns.filter(
        (pattern) => !pattern.includes("node_modules"),
      );
    nextConfig.transformIgnorePatterns.push(
      ...jestConfig.transformIgnorePatterns,
    );

    return nextConfig;
  };
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createModifiedJestConfig(config);
