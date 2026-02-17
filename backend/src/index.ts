// @ts-nocheck
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Check for required environment variables and log warnings
console.log('=== Backend Startup Check ===');
console.log('PORT:', process.env.PORT || '3005 (default)');
console.log('COGNITO_USER_POOL_ID:', process.env.COGNITO_USER_POOL_ID ? 'Set' : '⚠️ MISSING');
console.log('COGNITO_CLIENT_ID:', process.env.COGNITO_CLIENT_ID ? 'Set' : '⚠️ MISSING');
console.log('COGNITO_REGION:', process.env.COGNITO_REGION || process.env.AWS_REGION || 'us-east-1 (default)');
console.log('AWS_REGION:', process.env.AWS_REGION ? 'Set' : '⚠️ MISSING');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'Set' : '⚠️ MISSING');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : '⚠️ MISSING');
console.log('DYNAMODB_TABLE_NAME:', process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy (default)');
console.log('==========================');

import app from './app';

// Use port from environment or default to 3005
const PORT = process.env.PORT || 3005;

const server = app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID) {
        console.warn('⚠️  WARNING: Cognito configuration is missing. Login will fail.');
        console.warn('   Please set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID in your .env file');
    }
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
