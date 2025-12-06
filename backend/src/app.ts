// @ts-nocheck
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

console.log('Loading routes...');

// Import routes
const userRoutes = require('./routes/user.routes');
const assessmentRoutes = require('./routes/assessment.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const studentRoutes = require('./routes/student.routes');
const adminRoutes = require('./routes/admin.routes');
const ptoRoutes = require('./routes/pto.routes');
const codeEvaluationRoutes = require('./routes/codeEvaluation.routes');
const resultsRoutes = require('./routes/results.routes');
const studentAssessmentRoutes = require('./routes/student.assessment.routes');
const studentSubmissionRoutes = require('./routes/student.submission.routes');

console.log('Routes loaded successfully');

// Import middleware
const { authenticateToken, authorizeRole } = require('./auth/auth.middleware');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// Security middleware
app.use(helmet());
// CORS configuration
app.use(cors({
    origin:process.env.CLIENT_URL ,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Rate limiting (disabled in development to avoid local 429 errors)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// Explicitly disable rate limiting in development environment
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     process.env.NODE_ENV === 'dev' || 
                     !process.env.NODE_ENV;

if (!isDevelopment) {
    app.use(limiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
console.log('Registering routes...');
app.use('/api/users', userRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pto', ptoRoutes);
app.use('/api/code-evaluation', codeEvaluationRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/student-assessments', studentAssessmentRoutes);
app.use('/api/student', studentSubmissionRoutes);
console.log('Routes registered successfully');

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    // Log error details in development only
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }

    // Send generic error response
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
    });
});

// 404 handler
app.use((req, res) => {
    console.log('404 - Route not found:', req.method, req.url);
    res.status(404).json({
        error: 'Not Found',
        message: 'Route not found: ' + req.url
    });
});

module.exports = app;
