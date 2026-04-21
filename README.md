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

1. Create a `.env` file in the root directory (or copy `.env.example` if available):
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
After tests are completed, an execution report is automatically generated as an HTML file inside a daily folder in `integration-tests/reports`.
- **HTML Report:** `integration-tests/reports/YYYY-MM-DD/report_YYYY-MM-DD_HH-MM-SS.html`

**Testing Pipeline Lifecycle (How Parallel Isolation Works):**
1. **Container Start**: `run-integration-tests.js` starts a dedicated MySQL container via Docker Compose.
2. **Dynamic Provisioning**: Jest spawns tests in parallel (up to 4 workers). Inside `BaseTestCase.ts`'s setup, each test file connects to MySQL and creates a uniquely named database block (e.g., `test_db_<uuid>`).
3. **Migrations**: The file-specific worker runs the `sql/setup.sql` migration script directly on the newly created isolated database.
4. **App Initialization**: The Express app is started on an ephemeral, randomly available system port (`PORT=0`) to avoid port collisions between parallel runners.
5. **Execution**: Tests run directly against this completely isolated database and API instance.
6. **Self-Cleanup**: After the file completes, `BaseTestCase.ts` drops its unique database and closes the app server.
7. **Infrastructure Teardown**: Finally, the Node script tears down the main Docker container.

## Folder Structure

```
user_crud_poc/
├── integration-tests/  # Dockerized integration testing framework
├── node_modules/
├── sql/
│   └── setup.sql       # Database creation script
├── src/
│   ├── config/
│   │   └── db.js       # Database connection pool
│   ├── controllers/
│   │   └── userController.js # Request handling logic
│   ├── models/
│   │   └── userModel.js      # Data access layer
│   ├── routes/
│   │   └── userRoutes.js     # API route definitions
│   ├── utils/
│   │   ├── errorHandler.js   # Validation schemas
│   │   └── validation.js     # Global error handler
│   └── app.js          # App entry point
├── .env                # Environment variables
├── .gitignore
├── package.json
└── README.md
```
