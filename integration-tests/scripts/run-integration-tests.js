const { execSync } = require('child_process');

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
    process.env.DB_PORT = '33066';
    process.env.DB_HOST = '127.0.0.1';
    process.env.DB_USER = 'root';
    process.env.DB_PASS = 'root';
    process.env.DB_NAME = 'test_db_template';

    const sql = `CREATE DATABASE IF NOT EXISTS test_db_template; GRANT ALL PRIVILEGES ON \\\`test_db_%\\\`.* TO 'root'@'%'; FLUSH PRIVILEGES;`;
    runCommand(`docker exec integration_test_mysql mysql -h 127.0.0.1 -u root -proot -e "${sql}"`);

    // 5. Execute Tests configured to use the Worker Manager
    console.log("⚡ Running Jest Workers...");
    const args = process.argv.slice(2).join(' ');
    let testResult = 0;
    try {
        runCommand(`npx jest --config=integration-tests/jest.config.js ${args}`);
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
