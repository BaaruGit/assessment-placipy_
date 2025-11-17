// @ts-nocheck
const { registerUser, loginUser, addUserToGroup, getUserAttributes } = require('./cognito');
const dynamoDBService = require('../services/DynamoDBService').instance;

/**
 * Register a new user
 * @param req 
 * @param res 
 * @returns 
 */
const register = async (req, res) => {
    try {
        const { username, password, email, role } = req.body;

        // Validate required fields
        if (!username || !password || !email) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Username, password, and email are required'
            });
        }

        // Register user in Cognito
        const user = await registerUser(username, password, email);

        // Assign role if provided
        if (role) {
            await addUserToGroup(username, role);
        }

        // Return success response without exposing sensitive information
        return res.status(201).json({
            message: 'User registered successfully',
            userId: user.Username
        });
    } catch (error) {
        // Handle different types of errors
        if (error.code === 'UsernameExistsException') {
            return res.status(409).json({
                error: 'Conflict',
                message: 'Username already exists'
            });
        }

        if (error.code === 'InvalidPasswordException') {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Password does not meet security requirements'
            });
        }

        // Generic error response
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Registration failed: ' + error.message
        });
    }
};

/**
 * Login user
 * @param req 
 * @param res 
 * @returns 
 */
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate required fields
        if (!username || !password) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Username and password are required'
            });
        }

        // Login user with Cognito
        const result = await loginUser(username, password);

        // Return success response
        return res.status(200).json({
            message: 'Login successful',
            ...result
        });
    } catch (error) {
        // Handle different types of errors
        if (error.code === 'UserNotFoundException' || error.code === 'NotAuthorizedException') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid username or password'
            });
        }

        if (error.code === 'PasswordResetRequiredException') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Password reset required',
                resetRequired: true
            });
        }

        if (error.code === 'UserNotConfirmedException') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not confirmed',
                confirmationRequired: true
            });
        }

        // Generic error response
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Login failed: ' + error.message
        });
    }
};

/**
 * Respond to NEW_PASSWORD_REQUIRED challenge
 * @param req 
 * @param res 
 * @returns 
 */
const respondToNewPasswordChallenge = async (req, res) => {
    try {
        const { username, password, newPassword, session } = req.body;

        // Validate required fields
        if (!username || !password || !newPassword || !session) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Username, password, newPassword, and session are required'
            });
        }

        // Respond to challenge
        const result = await loginUser(username, password, newPassword, session);

        // Return success response
        return res.status(200).json({
            message: 'Password updated successfully',
            ...result
        });
    } catch (error) {
        // Handle session expired errors specifically
        if (error.message && (error.message.includes('session has expired') || error.message.includes('Invalid session for the user'))) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'The session has expired. Please log in again to get a new session.',
                sessionExpired: true
            });
        }

        // Generic error response
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to set new password: ' + error.message
        });
    }
};

/**
 * Get user profile with role information
 * @param req 
 * @param res 
 * @returns 
 */
const getProfile = async (req, res) => {
    try {
        // Get email from the validated token - try multiple possible fields
        let email = null;
        let userId = null;

        // Try different possible fields for email
        if (req.user.email) {
            email = req.user.email;
        } else if (req.user['cognito:username'] && req.user['cognito:username'].includes('@')) {
            email = req.user['cognito:username'];
        } else if (req.user.username && req.user.username.includes('@')) {
            email = req.user.username;
        } else if (req.user.sub && req.user.sub.includes('@')) {
            // For some tokens, the subject might be the email
            email = req.user.sub;
        } else {
            // If we don't have an email-like field, store the user ID for lookup
            if (req.user['cognito:username']) {
                userId = req.user['cognito:username'];
            } else if (req.user.username) {
                userId = req.user.username;
            } else if (req.user.sub) {
                userId = req.user.sub;
            }
        }

        // If we don't have an email, try to get it from Cognito
        if (!email && userId) {
            try {
                const userInfo = await getUserAttributes(userId);
                if (userInfo.attributes && userInfo.attributes.email) {
                    email = userInfo.attributes.email;
                }
            } catch (cognitoError) {
                // Continue without email from Cognito
            }
        }

        if (!email) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Email not found in token or Cognito'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid email format'
            });
        }

        // Get user data from DynamoDB
        const userData = await dynamoDBService.getUserDataByEmail(email);

        if (!userData) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'User not found in database'
            });
        }

        // Return user profile with role information
        return res.status(200).json({
            message: 'User profile retrieved successfully',
            user: {
                email: userData.email,
                name: userData.name,
                role: userData.role,
                department: userData.department,
                year: userData.year,
                joiningDate: userData.joiningDate
            }
        });
    } catch (error) {
        // Handle DynamoDB specific errors
        if (error.message && error.message.includes('Invalid email format')) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid email format: ' + error.message
            });
        }

        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Unable to retrieve user profile: ' + error.message
        });
    }
};

/**
 * Initiate password reset
 * @param req 
 * @param res 
 * @returns 
 */
const forgotPassword = async (req, res) => {
    try {
        // In a real implementation, you would integrate with Cognito's forgot password flow
        // This is a placeholder to demonstrate the endpoint structure

        return res.status(200).json({
            message: 'Password reset initiated. Check your email for instructions.'
        });
    } catch (error) {
        // Generic error message
        return res.status(500).json({
            error: 'Operation Failed',
            message: 'Unable to process password reset request'
        });
    }
};

/**
 * Confirm password reset
 * @param req 
 * @param res 
 * @returns 
 */
const resetPassword = async (req, res) => {
    try {
        // In a real implementation, you would integrate with Cognito's confirm password reset flow
        // This is a placeholder to demonstrate the endpoint structure

        return res.status(200).json({
            message: 'Password reset successfully'
        });
    } catch (error) {
        // Generic error message
        return res.status(500).json({
            error: 'Operation Failed',
            message: 'Unable to reset password'
        });
    }
};

module.exports = {
    register,
    login,
    respondToNewPasswordChallenge,
    getProfile,
    forgotPassword,
    resetPassword
};