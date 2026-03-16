const errorHandler = (err, req, res, next) => {
    // Check if Joi error
    if (err.isJoi) {
        // We might want to skip console.error for expected 400 Validation Errors in testing
        if (process.env.NODE_ENV !== 'test') {
            console.error(err.stack);
        }
        return res.status(400).json({ error: err.details[0].message });
    }

    // Always log genuine Server/Database Errors
    if (process.env.NODE_ENV !== 'test') {
        console.error(err.stack);
    }

    // Check for MySQL specific errors
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Duplicate entry' });
    }

    res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
};

module.exports = errorHandler;
