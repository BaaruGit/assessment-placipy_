// @ts-nocheck
import express from 'express';
import * as userController from '../auth/auth.controller';
import { authenticateToken } from '../auth/auth.middleware';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";

const router = express.Router();

const dbClient = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: fromEnv()
});
const dynamodb = DynamoDBDocument.from(dbClient, {
    marshallOptions: {
        removeUndefinedValues: true
    }
});


// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/respond-to-new-password-challenge', userController.respondToNewPasswordChallenge);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// Protected routes
router.get('/profile', authenticateToken, userController.getProfile);

// Profile Management Endpoints
router.put('/profile', authenticateToken, userController.updateProfile);

router.put('/profile/password', authenticateToken, async (req, res) => {
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

router.put('/profile/preferences', authenticateToken, async (req, res) => {
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

        await dynamodb.update(params);

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

router.get('/profile/preferences', authenticateToken, async (req, res) => {
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

router.put('/profile/security', authenticateToken, async (req, res) => {
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

        await dynamodb.update(params);

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

router.get('/profile/security', authenticateToken, async (req, res) => {
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

router.put('/profile/picture', authenticateToken, async (req, res) => {
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

export default router;
