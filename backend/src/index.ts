// @ts-nocheck
const dotenv = require('dotenv');

// Load environment variables first
dotenv.config();



const app = require('./app');

// Use port from environment or default to 3005
const PORT = process.env.PORT || 3005;

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Provide a clearer error message for common startup errors
server.on('error', (err: any) => {
    if (err && err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Choose a different PORT or stop the process using it.`);
        process.exit(1);
    }
    console.error('Server error:', err);
    process.exit(1);
});