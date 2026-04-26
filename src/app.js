const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Silence dotenvx warnings and tips in test environment
require('dotenv').config({
    quiet: process.env.NODE_ENV === 'test'
});

const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./utils/errorHandler');

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS support
// Disable Morgan request logging during test runs
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev')); // Logger
}
app.use(express.json()); // Body parser

// Capture structured API call data for the custom HTML test report
if (process.env.NODE_ENV === 'test') {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const TRACE_DIR = path.join(os.tmpdir(), 'jest-api-traces');
    if (!fs.existsSync(TRACE_DIR)) {
        try { fs.mkdirSync(TRACE_DIR, { recursive: true }); } catch (e) { }
    }

    app.use((req, res, next) => {
        const callData = {
            method: req.method,
            url: req.url,
            requestBody: (req.body && Object.keys(req.body).length > 0) ? req.body : null,
        };

        const oldSend = res.send;
        res.send = function (data) {
            callData.responseStatus = res.statusCode;
            try {
                callData.responseBody = JSON.parse(data);
            } catch (e) {
                callData.responseBody = data;
            }

            // Write structured trace to temp file
            try {
                const traceFile = path.join(TRACE_DIR, `trace_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
                const currentTest = (global).__CURRENT_TEST_NAME || 'unknown';
                const currentFile = (global).__CURRENT_TEST_FILE || 'unknown';
                fs.writeFileSync(traceFile, JSON.stringify({
                    testName: currentTest,
                    testFile: currentFile,
                    ...callData,
                }));
            } catch (e) { }

            return oldSend.apply(res, arguments);
        };
        next();
    });
}

// Routes
app.use('/api/users', userRoutes);

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
