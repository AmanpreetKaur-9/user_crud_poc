module.exports = {
    rootDir: '../',
    testMatch: ['<rootDir>/integration-tests/tests/**/*.test.ts'],
    preset: 'ts-jest',
    testEnvironment: 'node',
    maxWorkers: 4, // Control parallelism manually based on CI resources
    setupFilesAfterEnv: ['<rootDir>/integration-tests/helpers/setupTests.ts'],
    reporters: [
        'default',
        [
            'jest-junit',
            {
                outputDirectory: 'integration-tests/reports',
                outputName: 'junit.xml',
            },
        ],
    ],
    // Coverage configurations
    collectCoverage: true,
    coverageDirectory: 'integration-tests/reports/coverage',
    coverageReporters: ['html', 'text-summary'],
};
