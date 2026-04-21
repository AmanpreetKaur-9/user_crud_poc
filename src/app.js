const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Silence dotenvx warnings and tips in test environment
if (process.env.NODE_ENV === 'test') {
    process.env.DOTENVX_LOG_LEVEL = 'none';
}
require('dotenv').config();

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

// Automatically trace all incoming Test API Calls to the Jest Console
// The jest-html-reporters plugin intercepts these contextual logs and attaches them to the generated HTML
if (process.env.NODE_ENV === 'test') {
    app.use((req, res, next) => {
        let trace = `➡️  [API CALL] ${req.method} ${req.url}\n`;
        if (req.body && Object.keys(req.body).length > 0) {
            trace += `📦 [PAYLOAD SENT]\n${JSON.stringify(req.body, null, 2)}\n`;
        }

        const oldSend = res.send;
        res.send = function (data) {
            trace += `⬅️  [API RESPONSE] Status: ${res.statusCode}\n`;
            try {
                trace += `📝 [BODY RECEIVED]\n${JSON.stringify(JSON.parse(data), null, 2)}\n`;
            } catch (e) {
                trace += `📝 [BODY RECEIVED]\n${data}\n`;
            }

            // Print to standard isolated file console
            console.log(trace);

            // Dynamically inject trace payload directly onto the test method row's info block!
            try {
                const { addMsg } = require('jest-html-reporters/helper');
                addMsg({ message: trace }).catch(() => { });
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
