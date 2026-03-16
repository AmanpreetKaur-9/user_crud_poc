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
