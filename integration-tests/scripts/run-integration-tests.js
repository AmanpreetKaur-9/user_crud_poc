const { execSync } = require('child_process');
const path = require('path');

// Suppress dotenv logging to clean up test output
process.env.DOTENVX_LOG_LEVEL = 'none';
// Load the dedicated integration test environment file
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });

const runCommand = (command, silent = false) => {
    try {
        if (!silent) console.log(`> ${command}`);
        return execSync(command, { stdio: silent ? 'pipe' : 'inherit', encoding: 'utf-8' });
    } catch (error) {
        if (!silent) console.error(`Command failed: ${command}`);
        throw error;
    }
};

console.log("🚀 Starting Integration Testing Pipeline");

try {
    // 1. Cleanup previous dangling containers/networks
    runCommand('docker compose -f integration-tests/docker/docker-compose.yml down -v --remove-orphans');

    // 2. Spin up the Database
    console.log("📦 Starting MySQL Container...");
    runCommand('docker compose -f integration-tests/docker/docker-compose.yml up -d integration_test_mysql');

    // 3. Wait for MySQL to be fully ready
    console.log("⏳ Waiting for MySQL to be ready...");

    let isReady = false;
    let retries = 30;
    while (!isReady && retries > 0) {
        try {
            const logs = execSync('docker logs integration_test_mysql', { encoding: 'utf-8', stdio: 'pipe' });
            if (logs.includes('MySQL init process done')) {
                isReady = true;
                break;
            }
        } catch (e) { }
        console.log("MySQL is initializing - sleeping...");
        execSync('node -e "setTimeout(()=>{}, 2000)"'); // synchronous sleep
        retries--;
    }

    if (!isReady) {
        console.error("❌ MySQL failed to start in time.");
        process.exit(1);
    }

    execSync('node -e "setTimeout(()=>{}, 2000)"');

    // Check final connection
    isReady = false;
    retries = 30;
    while (!isReady && retries > 0) {
        try {
            execSync('docker exec integration_test_mysql mysql -h 127.0.0.1 -uroot -proot -e "SELECT 1;"', { stdio: 'pipe' });
            isReady = true;
        } catch (e) {
            console.log("Waiting for final connection...");
            execSync('node -e "setTimeout(()=>{}, 1000)"');
            retries--;
        }
    }

    console.log("✅ MySQL is ready!");

    // 4. Create Template DB and Grant Permissions
    console.log("🛠️ Creating test template and running migrations...");
    process.env.DB_PORT = process.env.TEST_DB_PORT || '33066';
    process.env.DB_HOST = process.env.TEST_DB_HOST || '127.0.0.1';
    process.env.DB_USER = process.env.TEST_DB_USER || 'root';
    process.env.DB_PASS = process.env.TEST_DB_PASSWORD || 'root';
    process.env.DB_NAME = process.env.TEST_DB_NAME || 'test_db_template';

    const dbUser = process.env.TEST_DB_USER || 'root';
    const dbPass = process.env.TEST_DB_PASSWORD || 'root';
    const dbName = process.env.TEST_DB_NAME || 'test_db_template';
    const sql = `CREATE DATABASE IF NOT EXISTS ${dbName}; GRANT ALL PRIVILEGES ON \\\`test_db_%\\\`.* TO '${dbUser}'@'%'; FLUSH PRIVILEGES;`;

    // Pass password safely via environment to suppress the "Using a password on the command line..." warning
    runCommand(`docker exec -e MYSQL_PWD="${dbPass}" integration_test_mysql mysql -h 127.0.0.1 -u ${dbUser} -e "${sql}"`);

    // 5. Execute Tests configured to use the Worker Manager
    console.log("⚡ Running Jest Workers...");
    const args = process.argv.slice(2).join(' ');
    let testResult = 0;
    try {
        runCommand(`NODE_ENV=test npx jest --config=integration-tests/jest.config.js ${args}`);
        console.log("✅ Tests passed.");
    } catch (e) {
        testResult = 1;
        console.log("❌ Tests failed.");
    }

    // 6. Teardown
    console.log("🧹 Tearing down infrastructure...");
    runCommand('docker compose -f integration-tests/docker/docker-compose.yml down -v');

    process.exit(testResult);
} catch (error) {
    console.error("Pipeline failed.");
    try { runCommand('docker compose -f integration-tests/docker/docker-compose.yml down -v'); } catch (e) { }
    process.exit(1);
}
