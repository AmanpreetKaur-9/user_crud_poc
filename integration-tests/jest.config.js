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
    setupFilesAfterEnv: ['<rootDir>/integration-tests/helpers/setupTests.ts'],
    reporters: [
        'default',
        [
            '<rootDir>/integration-tests/reporters/custom-html-reporter.js',
            {
                publicPath: `integration-tests/reports/${dateStr}`,
                filename: `report_${timestamp}.html`,
                pageTitle: 'Integration Test Report',
            },
        ],
    ],
    collectCoverage: false,
};
