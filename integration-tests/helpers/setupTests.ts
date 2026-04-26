// Global setup executed after env per test file

// Track the current test name and file globally so the API trace middleware
// can associate each HTTP call with the correct test case
beforeEach(() => {
    const state = expect.getState();
    (global as any).__CURRENT_TEST_NAME = state.currentTestName || 'unknown';
    (global as any).__CURRENT_TEST_FILE = state.testPath || 'unknown';
});

beforeAll(() => {
    // Any global test setup like modifying global objects can go here
});

afterAll(() => {
    // Ensure anything started globally is cleaned up
});
