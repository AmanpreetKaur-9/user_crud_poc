const now = new Date();
const pad = (n) => n.toString().padStart(2, '0');
const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
const timestamp = `${dateStr}_${timeStr}`;

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
            'jest-html-reporters',
            {
                publicPath: `integration-tests/reports/${dateStr}`,
                filename: `report_${timestamp}.html`,
                expand: true,
                pageTitle: 'Integration Test Report',
                includeConsoleLog: true,
                inlineSource: true,
            },
        ],
    ],
    collectCoverage: false,
};
