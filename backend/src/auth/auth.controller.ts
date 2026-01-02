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
        // Log the full error for debugging
        console.error('=== Login Error Details ===');
        console.error('Error name:', error.name);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Full error:', error);
        console.error('==========================');

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

        // Check for Cognito client initialization errors
        if (error.message && error.message.includes('Cognito client is not initialized')) {
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Authentication service is not properly configured. Please contact the administrator.'
            });
        }

        // Check for missing environment variables
        if (error.message && error.message.includes('COGNITO_CLIENT_ID is not configured')) {
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Authentication service configuration error. Please contact the administrator.'
            });
        }

        // Check for AWS connection errors
        if (error.name === 'UnknownEndpoint' || error.message?.includes('ENOTFOUND') || error.message?.includes('getaddrinfo')) {
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Unable to connect to authentication service. Please check your network connection and try again.'
            });
        }

        // Generic error response
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Login failed: ' + (error.message || 'Unknown error occurred')
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

        // Get user data from DynamoDB - first try the regular user data
        let userData = await dynamoDBService.getUserDataByEmail(email);
        
        // If not found, try looking for staff data created by PTO
        if (!userData) {
            // Extract domain from email to determine the client partition
            const domain = email.split('@')[1];
            const clientPK = `CLIENT#${domain}`;
            
            // Try to find user as staff (PTS) - check both PTS# and STAFF# prefixes
            try {
                const ptsUserData = await dynamoDBService.getItem({
                    Key: { PK: clientPK, SK: `PTS#${email}` }
                });
                
                if (ptsUserData && ptsUserData.Item) {
                    userData = ptsUserData.Item;
                } else {
                    const staffUserData = await dynamoDBService.getItem({
                        Key: { PK: clientPK, SK: `STAFF#${email}` }
                    });
                    
                    if (staffUserData && staffUserData.Item) {
                        userData = staffUserData.Item;
                    }
                }
            } catch (error) {
                console.log('Error looking up staff data:', error.message);
            }
        }

        if (!userData) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'User not found in database'
            });
        }

        // Split name into first and last name for response
        let firstName = '';
        let lastName = '';
        if (userData.name) {
            const nameParts = userData.name.trim().split(' ');
            if (nameParts.length > 0) {
                firstName = nameParts[0];
                lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
            }
        }
        
        // Return user profile with role information
        return res.status(200).json({
            message: 'User profile retrieved successfully',
            user: {
                email: userData.email,
                name: userData.name,
                firstName: userData.firstName || firstName,
                lastName: userData.lastName || lastName,
                role: userData.role,
                department: userData.department,
                year: userData.year,
                joiningDate: userData.joiningDate,
                phone: userData.phone || userData.mobile || '',
                regNo: userData.regNo || userData.rollNumber || userData.registrationNumber || '',
                rollNumber: userData.rollNumber || userData.regNo || '',
                collegeName: userData.collegeName || userData.college || ''
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

const updateProfile = async (req, res) => {
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

        // Get user data from DynamoDB to check if user exists - first try the regular user data
        let existingUserData = await dynamoDBService.getUserDataByEmail(email);
        
        // If not found, try looking for staff data created by PTO
        if (!existingUserData) {
            // Extract domain from email to determine the client partition
            const domain = email.split('@')[1];
            const clientPK = `CLIENT#${domain}`;
            
            // Try to find user as staff (PTS) - check both PTS# and STAFF# prefixes
            try {
                const ptsUserData = await dynamoDBService.getItem({
                    Key: { PK: clientPK, SK: `PTS#${email}` }
                });
                
                if (ptsUserData && ptsUserData.Item) {
                    existingUserData = ptsUserData.Item;
                } else {
                    const staffUserData = await dynamoDBService.getItem({
                        Key: { PK: clientPK, SK: `STAFF#${email}` }
                    });
                    
                    if (staffUserData && staffUserData.Item) {
                        existingUserData = staffUserData.Item;
                    }
                }
            } catch (error) {
                console.log('Error looking up staff data:', error.message);
            }
        }

        if (!existingUserData) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'User not found in database'
            });
        }

        // Validate and sanitize incoming fields
        const allowedFields = ['name', 'firstName', 'lastName', 'phone', 'department', 'year', 'joiningDate', 'mobile', 'regNo', 'rollNumber', 'registrationNumber', 'collegeName', 'college'];
        const updates = {};

        for (const field in req.body) {
            if (allowedFields.includes(field)) {
                // Basic validation for each field
                if (field === 'email') {
                    // Don't allow email to be updated for security reasons
                    continue;
                } else if ((field === 'name' || field === 'firstName' || field === 'lastName') && req.body[field]) {
                    // Handle name fields - if both firstName and lastName are provided, combine them
                    if (field === 'firstName' || field === 'lastName') {
                        if (typeof req.body[field] === 'string' && req.body[field].trim().length > 0) {
                            // Check if we have both firstName and lastName in the request
                            const firstName = req.body.firstName || existingUserData.firstName || '';
                            const lastName = req.body.lastName || existingUserData.lastName || '';
                            
                            if (req.body.firstName && req.body.lastName) {
                                // Both are provided in the request, combine them
                                updates['name'] = `${req.body.firstName.trim()} ${req.body.lastName.trim()}`.trim();
                                updates['firstName'] = req.body.firstName.trim();
                                updates['lastName'] = req.body.lastName.trim();
                            } else if (req.body.firstName) {
                                // Only firstName is provided, combine with existing lastName
                                updates['name'] = `${req.body.firstName.trim()} ${existingUserData.lastName || ''}`.trim();
                                updates['firstName'] = req.body.firstName.trim();
                            } else if (req.body.lastName) {
                                // Only lastName is provided, combine with existing firstName
                                updates['name'] = `${existingUserData.firstName || ''} ${req.body.lastName.trim()}`.trim();
                                updates['lastName'] = req.body.lastName.trim();
                            }
                        }
                    } else if (field === 'name' && typeof req.body[field] === 'string' && req.body[field].trim().length >= 2) {
                        // Handle direct name field
                        updates[field] = req.body[field].trim();
                    }
                } else if (field === 'phone' && req.body[field]) {
                    // Validate phone number (allow digits, spaces, hyphens, parentheses, plus)
                    const phoneRegex = /^[0-9+\-\s()]+$/;
                    if (typeof req.body[field] === 'string' && phoneRegex.test(req.body[field]) && req.body[field].length <= 15) {
                        updates[field] = req.body[field].trim();
                    }
                } else if (field === 'mobile' && req.body[field]) {
                    // Validate mobile number
                    const mobileRegex = /^[0-9+\-\s()]+$/;
                    if (typeof req.body[field] === 'string' && mobileRegex.test(req.body[field]) && req.body[field].length <= 15) {
                        updates[field] = req.body[field].trim();
                    }
                } else if (field === 'department' && req.body[field]) {
                    // Validate department (alphanumeric and spaces)
                    if (typeof req.body[field] === 'string' && req.body[field].trim().length > 0) {
                        updates[field] = req.body[field].trim();
                    }
                } else if (field === 'year' && req.body[field]) {
                    // Validate year (alphanumeric)
                    if (typeof req.body[field] === 'string' && req.body[field].trim().length > 0) {
                        updates[field] = req.body[field].trim();
                    }
                } else if (field === 'joiningDate' && req.body[field]) {
                    // Validate date
                    const date = new Date(req.body[field]);
                    if (!isNaN(date.getTime())) {
                        updates[field] = req.body[field];
                    }
                } else if ((field === 'regNo' || field === 'rollNumber' || field === 'registrationNumber') && req.body[field]) {
                    // Validate registration numbers
                    if (typeof req.body[field] === 'string' && req.body[field].trim().length > 0) {
                        updates[field] = req.body[field].trim();
                    }
                } else if ((field === 'collegeName' || field === 'college') && req.body[field]) {
                    // Validate college name
                    if (typeof req.body[field] === 'string' && req.body[field].trim().length > 0) {
                        updates[field] = req.body[field].trim();
                    }
                }
            }
        }

        // If no valid updates provided
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'No valid fields to update provided'
            });
        }

        // Update user data in DynamoDB - check if this is a regular user or staff member
        let updatedUserData;
        
        // Check if the original user was a staff member (PTS/STAFF) or regular user
        const domain = email.split('@')[1];
        const clientPK = `CLIENT#${domain}`;
        
        if (existingUserData.SK && (existingUserData.SK.startsWith('PTS#') || existingUserData.SK.startsWith('STAFF#'))) {
            // This is a staff member created by PTO, update using the specific key
            try {
                const updateParams = {
                    Key: { PK: clientPK, SK: existingUserData.SK },
                    UpdateExpression: 'SET',
                    ExpressionAttributeNames: {},
                    ExpressionAttributeValues: {},
                    ReturnValues: 'ALL_NEW'
                };
                
                const updateExpressionParts = [];
                for (const [key, value] of Object.entries(updates)) {
                    updateExpressionParts.push(`#${key} = :${key}`);
                    updateParams.ExpressionAttributeNames[`#${key}`] = key;
                    updateParams.ExpressionAttributeValues[`:${key}`] = value;
                }
                updateParams.UpdateExpression += ` ${updateExpressionParts.join(', ')}`;
                
                const result = await dynamoDBService.updateItem(updateParams);
                updatedUserData = result.Attributes;
            } catch (error) {
                console.error('Error updating staff member:', error);
                return res.status(500).json({
                    error: 'Internal Server Error',
                    message: 'Failed to update staff profile: ' + error.message
                });
            }
        } else {
            // This is a regular user, use the existing method
            updatedUserData = await dynamoDBService.updateUserByEmail(email, updates);
        }

        // Split name into first and last name for response
        let firstName = '';
        let lastName = '';
        if (updatedUserData.name) {
            const nameParts = updatedUserData.name.trim().split(' ');
            if (nameParts.length > 0) {
                firstName = nameParts[0];
                lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
            }
        }
        
        // Return updated user profile
        return res.status(200).json({
            message: 'User profile updated successfully',
            user: {
                email: updatedUserData.email,
                name: updatedUserData.name,
                firstName: updatedUserData.firstName || firstName,
                lastName: updatedUserData.lastName || lastName,
                role: updatedUserData.role,
                department: updatedUserData.department,
                year: updatedUserData.year,
                joiningDate: updatedUserData.joiningDate,
                phone: updatedUserData.phone || updatedUserData.mobile || '',
                regNo: updatedUserData.regNo || updatedUserData.rollNumber || updatedUserData.registrationNumber || '',
                rollNumber: updatedUserData.rollNumber || updatedUserData.regNo || '',
                collegeName: updatedUserData.collegeName || updatedUserData.college || ''
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
            message: 'Unable to update user profile: ' + error.message
        });
    }
};

module.exports = {
    register,
    login,
    respondToNewPasswordChallenge,
    getProfile,
    updateProfile,
    forgotPassword,
    resetPassword
};
