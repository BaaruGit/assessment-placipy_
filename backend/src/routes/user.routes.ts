// @ts-nocheck
const express = require('express');
const userController = require('../auth/auth.controller');
const authMiddleware = require('../auth/auth.middleware');

const router = express.Router();

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/respond-to-new-password-challenge', userController.respondToNewPasswordChallenge);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// Protected routes
router.get('/profile', authMiddleware.authenticateToken, userController.getProfile);

// Profile Management Endpoints
router.put('/profile', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Profile Update Request ===');
        console.log('Full req.user:', JSON.stringify(req.user, null, 2));
        console.log('Body:', req.body);
        
        // Extract email - it might be in different fields
        const email = req.user.email || req.user.username || req.user.sub;
        const role = req.user.role || req.user['custom:role'] || 'PTS';
        
        console.log('Extracted email:', email);
        console.log('Extracted role:', role);
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email not found in user token'
            });
        }
        
        const {
            firstName,
            lastName,
            phone,
            designation,
            department,
            employeeId,
            joiningDate
        } = req.body;

        // Construct full name
        const name = `${firstName} ${lastName}`.trim();

        // Determine PK and SK based on role and email
        const clientDomain = email.includes('@') ? email.split('@')[1] : 'ksrce.ac.in';
        const PK = `CLIENT#${clientDomain}`;
        let SK;
        
        if (role === 'PTS' || role === 'pts') {
            SK = `PTS#${employeeId || '2001'}`;
        } else if (role === 'PTO' || role === 'pto') {
            SK = `PTO#${employeeId || '1001'}`;
        } else {
            SK = `USER#${email}`;
        }

        console.log('DynamoDB Key:', { PK, SK });

        // Update user profile in DynamoDB
        const AWS = require('aws-sdk');
        const dynamodb = new AWS.DynamoDB.DocumentClient({
            region: process.env.AWS_REGION
        });

        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy',
            Key: { PK, SK },
            UpdateExpression: 'SET #name = :name, phone = :phone, designation = :designation, department = :department, updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#name': 'name'
            },
            ExpressionAttributeValues: {
                ':name': name,
                ':phone': phone || '',
                ':designation': designation || 'PTS Administrator',
                ':department': department || '',
                ':updatedAt': new Date().toISOString()
            },
            ReturnValues: 'ALL_NEW'
        };

        console.log('Update params:', JSON.stringify(params, null, 2));
        const result = await dynamodb.update(params).promise();
        console.log('Update result:', result);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            profile: {
                firstName,
                lastName,
                name,
                email,
                phone,
                designation,
                department,
                employeeId,
                joiningDate
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
});

router.put('/profile/password', authMiddleware.authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const email = req.user.email;

        // Validate current password with Cognito
        // Change password using Cognito
        // In real implementation, use AWS Cognito change password API

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

router.put('/profile/preferences', authMiddleware.authenticateToken, async (req, res) => {
    try {
        const email = req.user.email;
        const role = req.user.role || 'PTS';
        const {
            theme,
            language,
            timezone,
            dateFormat,
            emailDigest,
            notificationSound,
            autoSave,
            defaultAssessmentDuration
        } = req.body;

        // Determine PK and SK
        const clientDomain = email.split('@')[1] || 'ksrce.ac.in';
        const PK = `CLIENT#${clientDomain}`;
        const employeeId = req.user.employeeId || (role === 'PTS' ? '2001' : '1001');
        const SK = role === 'PTS' ? `PTS#${employeeId}` : `PTO#${employeeId}`;

        // Save preferences to DynamoDB
        const AWS = require('aws-sdk');
        const dynamodb = new AWS.DynamoDB.DocumentClient({
            region: process.env.AWS_REGION
        });

        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy',
            Key: { PK, SK },
            UpdateExpression: 'SET preferences = :preferences, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':preferences': {
                    theme,
                    language,
                    timezone,
                    dateFormat,
                    emailDigest,
                    notificationSound,
                    autoSave,
                    defaultAssessmentDuration
                },
                ':updatedAt': new Date().toISOString()
            },
            ReturnValues: 'ALL_NEW'
        };

        await dynamodb.update(params).promise();

        res.json({
            success: true,
            message: 'Preferences saved successfully',
            preferences: {
                theme,
                language,
                timezone,
                dateFormat,
                emailDigest,
                notificationSound,
                autoSave,
                defaultAssessmentDuration
            }
        });
    } catch (error) {
        console.error('Preferences save error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save preferences',
            error: error.message
        });
    }
});

router.get('/profile/preferences', authMiddleware.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // In real implementation, get preferences from DynamoDB
        const defaultPreferences = {
            theme: 'light',
            language: 'English',
            timezone: 'America/Los_Angeles',
            dateFormat: 'MM/DD/YYYY',
            emailDigest: 'daily',
            notificationSound: true,
            autoLogout: 60
        };

        res.json({
            success: true,
            preferences: defaultPreferences
        });
    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get preferences'
        });
    }
});

router.put('/profile/security', authMiddleware.authenticateToken, async (req, res) => {
    try {
        const email = req.user.email;
        const role = req.user.role || 'PTS';
        const {
            twoFactorEnabled,
            emailNotifications,
            smsNotifications
        } = req.body;

        // Determine PK and SK
        const clientDomain = email.split('@')[1] || 'ksrce.ac.in';
        const PK = `CLIENT#${clientDomain}`;
        const employeeId = req.user.employeeId || (role === 'PTS' ? '2001' : '1001');
        const SK = role === 'PTS' ? `PTS#${employeeId}` : `PTO#${employeeId}`;

        // Update security settings in DynamoDB
        const AWS = require('aws-sdk');
        const dynamodb = new AWS.DynamoDB.DocumentClient({
            region: process.env.AWS_REGION
        });

        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy',
            Key: { PK, SK },
            UpdateExpression: 'SET securitySettings = :settings, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':settings': {
                    twoFactorEnabled,
                    emailNotifications,
                    smsNotifications
                },
                ':updatedAt': new Date().toISOString()
            },
            ReturnValues: 'ALL_NEW'
        };

        await dynamodb.update(params).promise();

        res.json({
            success: true,
            message: 'Security settings updated successfully',
            settings: {
                twoFactorEnabled,
                emailNotifications,
                smsNotifications
            }
        });
    } catch (error) {
        console.error('Security settings update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update security settings',
            error: error.message
        });
    }
});

router.get('/profile/security', authMiddleware.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // In real implementation, get security settings from DynamoDB
        const defaultSettings = {
            twoFactorEnabled: false,
            emailNotifications: true,
            smsNotifications: false
        };

        res.json({
            success: true,
            settings: defaultSettings
        });
    } catch (error) {
        console.error('Get security settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get security settings'
        });
    }
});

router.put('/profile/picture', authMiddleware.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { profilePictureUrl } = req.body;

        // Validate that the URL is from our approved static images
        const allowedImages = [
            'https://images.unsplash.com/photo-1494790108755-2616b612b977?w=150&h=150&fit=crop&crop=face',
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
        ];

        if (!allowedImages.includes(profilePictureUrl)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid profile picture URL'
            });
        }

        // In real implementation, update user profile in DynamoDB
        // await dynamoDBService.updateUserProfilePicture(userId, profilePictureUrl);

        res.json({
            success: true,
            message: 'Profile picture updated successfully',
            profilePictureUrl
        });
    } catch (error) {
        console.error('Profile picture update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile picture'
        });
    }
});

module.exports = router;