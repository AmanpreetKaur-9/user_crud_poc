# User CRUD API

A RESTful API for managing users, built with Node.js, Express, and MySQL.

## Project Overview

This project implements a backend service for User management with full CRUD operations. It follows the MVC architecture and includes comprehensive error handling, input validation, and logging.

## Tech Stack

- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MySQL 8**: Database
- **mysql2**: MySQL client (using connection pooling)
- **Joi**: Input validation
- **dotenv**: Environment variable management
- **Helmet**: Security headers
- **Morgan**: HTTP request logger
- **Cors**: Cross-Origin Resource Sharing

## Prerequisites

- **Node.js** (v14 or higher)
- **MySQL** (v8.0) installed and running
- **Docker** and **Docker Compose** (Required for isolated integration tests)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AmanpreetKaur-9/user_crud_poc.git
   cd user_crud_poc
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

### Application Environment

1. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your database credentials:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=user_crud_db
   NODE_ENV=development
   ```

### Integration Test Environment

The integration tests use a **separate environment file** to keep test configuration isolated from the application.

1. Create the test env file:
   ```bash
   cp integration-tests/.env.test.example integration-tests/.env.test
   ```

2. The default values work out-of-the-box with the Docker Compose setup:
   ```env
   NODE_ENV=test
   TEST_DB_HOST=127.0.0.1
   TEST_DB_PORT=33066
   TEST_DB_USER=root
   TEST_DB_PASSWORD=root
   TEST_DB_NAME=test_db_template
   ```

> **Note:** Both `.env` and `integration-tests/.env.test` are git-ignored. Only the `.example` templates are committed to the repository.

## Database Setup (For Local Development)

> **Note:** If you are only looking to run the automated **Integration Tests**, you can safely skip this step! The testing framework spins up Docker and provisions its own isolated databases automatically.

1. Log in to your MySQL server:
   ```bash
   mysql -u root -p
   ```

2. Run the provided SQL script to create the database and table:
   ```sql
   source sql/setup.sql;
   ```
   
   *Alternatively, you can copy the contents of `sql/setup.sql` and run them manually in your SQL client.*

## Running the Project

- **Development Mode** (with hot reloading):
  ```bash
  npm run dev
  ```

- **Production Mode**:
  ```bash
  npm start
  ```

The server will start on plain HTTP at `http://localhost:3000` (or your configured PORT).

## API Endpoints

| Method | Endpoint | Description | Request Body |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/users` | Get all users | None |
| **GET** | `/api/users/:id` | Get user by ID | None |
| **POST** | `/api/users` | Create a new user | `{ "name": "John", "email": "john@example.com", "age": 30 }` |
| **PUT** | `/api/users/:id` | Update a user | `{ "name": "John Doe", "email": "john@example.com", "age": 31 }` |
| **DELETE** | `/api/users/:id` | Delete a user | None |

### Sample Request (Create User)
**POST** `/api/users`
```json
{
  "name": "Alice Smith",
  "email": "alice@example.com",
  "age": 25
}
```

### Sample Response
```json
{
  "id": 1,
  "name": "Alice Smith",
  "email": "alice@example.com",
  "age": 25
}
```

## Error Handling

The API uses a centralized error handling mechanism.
- **400 Bad Request**: Validation errors (e.g., missing fields, invalid email format).
- **404 Not Found**: Resource not found.
- **409 Conflict**: Duplicate email address.
- **500 Internal Server Error**: Unexpected server errors.

## Integration Testing

The project includes an automated, isolated integration testing framework that uses Docker to spin up a fresh database. This allows tests to run without interfering with your local development database. Tests run safely in parallel with full isolation (each test file gets its own dynamically cloned database).

### Setup

Before running tests for the first time, ensure the test environment file exists:
```bash
cp integration-tests/.env.test.example integration-tests/.env.test
```

### Running Tests

You can run your testing suite using raw shell scripts or their equivalent predefined `npm` scripts in `package.json`.

**1. All tests, 2 workers (safe default)**
- **Shell:** `./run.sh integration-tests/tests/`
- **NPM:** `npm run test:integration:all`

**2. Specific folder**
- **Shell:** `./run.sh integration-tests/tests/users/`
- **NPM:** `npm run test:integration:users`

**3. Single file**
- **Shell:** `./run.sh integration-tests/tests/users/getUser.test.ts`
- **NPM:** `npm run test:integration:get-user`

**4. Custom parallelism (2–20, depends on machine RAM)**
- **Shell:** `./run.sh --parallel 5 integration-tests/tests/`
- **NPM:** `npm run test:integration:parallel`

### Test Reports
After tests are completed, an HTML execution report is automatically generated inside a daily folder in `integration-tests/reports/`.

- **Report Path:** `integration-tests/reports/YYYY-MM-DD/report_YYYY-MM-DD_HH-MM-SS.html`
- **Contents:** Summary cards (Total Tests, Passed, Failed, Pass Rate, Duration), filter buttons, expandable test file rows with individual test case details including HTTP request/response data.

### Test Coverage

| Test File | Test Cases | Scenarios Covered |
| :--- | :--- | :--- |
| `createUser.test.ts` | 8 | Success, invalid email, missing name, short name, missing age, non-integer age, empty body, duplicate email |
| `getUser.test.ts` | 5 | List all, empty list, get by ID, 404 not found, response field verification |
| `updateUser.test.ts` | 8 | Success, 404 not found, malformed payload, short name, missing age, empty body, duplicate email, data preservation on validation failure |
| `deleteUser.test.ts` | 5 | Success, 404 not found, double-delete, isolation check, response body verification |

**Testing Pipeline Lifecycle (How Parallel Isolation Works):**
1. **Environment Load**: `run-integration-tests.js` loads `integration-tests/.env.test` for test-specific configuration.
2. **Container Start**: A dedicated MySQL container is started via Docker Compose.
3. **Dynamic Provisioning**: Jest spawns tests in parallel (up to 4 workers). Inside `BaseTestCase.ts`'s setup, each test file connects to MySQL and creates a uniquely named database block (e.g., `test_db_<uuid>`).
4. **Migrations**: The file-specific worker runs the `sql/setup.sql` migration script directly on the newly created isolated database.
5. **App Initialization**: The Express app is started on an ephemeral, randomly available system port (`PORT=0`) to avoid port collisions between parallel runners.
6. **API Tracing**: All HTTP requests/responses are captured and written to trace files, which are later embedded in the HTML report.
7. **Execution**: Tests run directly against this completely isolated database and API instance.
8. **Self-Cleanup**: After the file completes, `BaseTestCase.ts` drops its unique database and closes the app server.
9. **Report Generation**: A custom HTML reporter reads the API trace data and generates a styled execution report.
10. **Infrastructure Teardown**: Finally, the Node script tears down the main Docker container.

## Folder Structure

```
user_crud_poc/
├── integration-tests/              # Dockerized integration testing framework
│   ├── .env.test                   # Test environment variables (git-ignored)
│   ├── .env.test.example           # Template for test env setup
│   ├── docker/
│   │   └── docker-compose.yml      # Test MySQL container config
│   ├── factories/
│   │   └── UserFactory.ts          # Test data factory
│   ├── helpers/
│   │   ├── BaseTestCase.ts         # Test isolation orchestrator
│   │   ├── dbManager.ts            # Database provisioning/cleanup
│   │   └── setupTests.ts           # Global test hooks
│   ├── reporters/
│   │   └── custom-html-reporter.js # Custom HTML report generator
│   ├── reports/                    # Generated HTML reports (git-ignored)
│   ├── scripts/
│   │   └── run-integration-tests.js # Test pipeline orchestrator
│   ├── tests/
│   │   └── users/                  # User CRUD test files
│   ├── workers/
│   │   └── portAllocator.ts        # Ephemeral port allocation
│   └── jest.config.js              # Jest configuration
├── sql/
│   └── setup.sql                   # Database creation script
├── src/
│   ├── config/
│   │   └── db.js                   # Database connection pool
│   ├── controllers/
│   │   └── userController.js       # Request handling logic
│   ├── models/
│   │   └── userModel.js            # Data access layer
│   ├── routes/
│   │   └── userRoutes.js           # API route definitions
│   ├── utils/
│   │   ├── errorHandler.js         # Global error handler
│   │   └── validation.js           # Joi validation schemas
│   └── app.js                      # App entry point
├── .env                            # App environment variables (git-ignored)
├── .env.example                    # Template for app env setup
├── .gitignore
├── package.json
├── run.sh                          # Test runner shell script
└── README.md
```
