#!/usr/bin/env bash

# Default safe configuration
WORKERS=2
TARGET_PATH=""

# Parse arguments from the command line
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --parallel)
            WORKERS="$2"
            shift 2
            ;;
        *)
            TARGET_PATH="$1"
            shift
            ;;
    esac
done

# Check if a target path was provided
if [ -z "$TARGET_PATH" ]; then
    echo "Usage: ./run.sh [--parallel <workers>] <test_path>"
    echo "Examples:"
    echo "  ./run.sh integration-tests/tests/users"
    echo "  ./run.sh integration-tests/tests/users/getUser.test.ts"
    echo "  ./run.sh --parallel 5 integration-tests/tests/users"
    exit 1
fi

echo "[run.sh RUNNER] Target: ${TARGET_PATH}"
echo "[run.sh RUNNER] Parallelism: ${WORKERS} workers"

# Forward the path and mapped parallel flag to the JS execution pipeline
node integration-tests/scripts/run-integration-tests.js "${TARGET_PATH}" --maxWorkers="${WORKERS}"
