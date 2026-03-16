#!/usr/bin/env bash
set -e

echo "🚀 Starting Integration Testing Pipeline"

# 1. Cleanup previous dangling containers/networks
docker compose -f integration-tests/docker/docker-compose.yml down -v --remove-orphans

# 2. Spin up the Database
echo "📦 Starting MySQL Container..."
docker compose -f integration-tests/docker/docker-compose.yml up -d integration_test_mysql

# 3. Wait for MySQL to be fully ready
echo "⏳ Waiting for MySQL to be ready..."
sleep 5 # Initial delay for container to start
MAX_RETRIES=30
RETRY_COUNT=0
while ! docker logs integration_test_mysql 2>&1 | grep -q "MySQL init process done"; do
    echo "MySQL is initializing - sleeping..."
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ MySQL failed to start in time."
        docker logs integration_test_mysql
        exit 1
    fi
done

# We still wait an extra 2 seconds for the actual final server to bind its port and become responsive
sleep 2

while ! docker exec integration_test_mysql mysql -h 127.0.0.1 -uroot -proot -e "SELECT 1;" > /dev/null 2>&1; do
    echo "Waiting for final connection..."
    sleep 1
done

echo "✅ MySQL is ready!"

# 4. Create Template DB and Grant Permissions
echo "🛠️ Creating test template and running migrations..."
export DB_PORT=33066
export DB_HOST=127.0.0.1
export DB_USER=root
export DB_PASS=root
export DB_NAME=test_db_template

# Make sure template DB exists and grant wildcards for clones
docker exec integration_test_mysql mysql -h 127.0.0.1 -u root -proot -e "
CREATE DATABASE IF NOT EXISTS test_db_template;
GRANT ALL PRIVILEGES ON \`test_db_%\`.* TO 'root'@'%';
FLUSH PRIVILEGES;
"

# Run tool-specific migrations (e.g., Prisma / Sequelize)
# Example for Prisma: npx prisma migrate deploy
# Example for Seeds: npm run db:seed:baseline

echo "⚡ Running Jest Workers..."
# 5. Execute Tests configured to use the Worker Manager
if npx jest --config=integration-tests/jest.config.js "$@"; then
    TEST_RESULT=0
    echo "✅ Tests passed."
else
    TEST_RESULT=1
    echo "❌ Tests failed."
fi

# 6. Teardown
echo "🧹 Tearing down infrastructure..."
docker compose -f integration-tests/docker/docker-compose.yml down -v

# Exit with Jest's exit code for CI compatibility
exit $TEST_RESULT
