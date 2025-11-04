// @ts-nocheck
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const axios = require('axios');
const crypto = require('crypto');
const {
    CognitoIdentityProviderClient,
    SignUpCommand,
    InitiateAuthCommand,
    RespondToAuthChallengeCommand, // Add this for handling challenges
    AdminAddUserToGroupCommand,
    AdminListGroupsForUserCommand,
    AdminGetUserCommand  // Add this for getting user attributes
} = require("@aws-sdk/client-cognito-identity-provider");
const { fromEnv } = require("@aws-sdk/credential-providers");

// Configure AWS Cognito client with proper error handling
let cognitoClient;

function initializeCognitoClient() {
    try {
        const region = process.env.COGNITO_REGION || process.env.AWS_REGION || 'us-east-1';
        cognitoClient = new CognitoIdentityProviderClient({
            region: region,
            credentials: fromEnv()
        });
        return true;
    } catch (error) {
        return false;
    }
}

// Initialize the client
initializeCognitoClient();

/**
 * Calculates the SECRET_HASH required for Cognito authentication
 * @param {string} username 
 * @param {string} clientId 
 * @param {string} clientSecret 
 * @returns {string} SECRET_HASH
 */
function calculateSecretHash(username, clientId, clientSecret) {
    const message = username + clientId;
    const hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(message);
    return hmac.digest('base64');
}

/**
 * Register a new user in Cognito
 * @param {string} username 
 * @param {string} password 
 * @param {string} email 
 * @returns {Promise<Object>} User registration result
 */
async function registerUser(username, password, email) {
    try {
        // Validate inputs
        if (!username || !password || !email) {
            throw new Error('Username, password, and email are required');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }

        // Prepare user attributes
        const userAttributes = [
            {
                Name: 'email',
                Value: email
            },
            {
                Name: 'email_verified',
                Value: 'false'
            }
        ];

        // Prepare registration parameters
        const params = {
            ClientId: process.env.COGNITO_CLIENT_ID,
            Username: username,
            Password: password,
            UserAttributes: userAttributes
        };

        // Add SECRET_HASH if client secret is configured
        if (process.env.COGNITO_CLIENT_SECRET) {
            params.SecretHash = calculateSecretHash(username, process.env.COGNITO_CLIENT_ID, process.env.COGNITO_CLIENT_SECRET);
        }

        // Execute registration command
        const command = new SignUpCommand(params);
        const result = await cognitoClient.send(command);

        return result.User;
    } catch (error) {
        // Re-throw the error to be handled by the calling function
        throw error;
    }
}

/**
 * Login user with Cognito
 * @param {string} username 
 * @param {string} password 
 * @param {string} newPassword (optional) For NEW_PASSWORD_REQUIRED challenge
 * @param {string} session (optional) For NEW_PASSWORD_REQUIRED challenge
 * @returns {Promise<Object>} Login result
 */
async function loginUser(username, password, newPassword = null, session = null) {
    try {
        // Validate inputs
        if (!username || !password) {
            throw new Error('Username and password are required');
        }

        // Prepare authentication parameters
        const params = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: process.env.COGNITO_CLIENT_ID,
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password
            }
        };

        // Add SECRET_HASH if client secret is configured
        if (process.env.COGNITO_CLIENT_SECRET) {
            params.AuthParameters.SECRET_HASH = calculateSecretHash(username, process.env.COGNITO_CLIENT_ID, process.env.COGNITO_CLIENT_SECRET);
        }

        // Handle NEW_PASSWORD_REQUIRED challenge
        if (newPassword && session) {
            params.AuthFlow = 'NEW_PASSWORD_AUTH';
            params.ChallengeName = 'NEW_PASSWORD_REQUIRED';
            params.ChallengeResponses = {
                USERNAME: username,
                NEW_PASSWORD: newPassword
            };
            params.Session = session;

            // Add SECRET_HASH to challenge responses if client secret is configured
            if (process.env.COGNITO_CLIENT_SECRET) {
                params.ChallengeResponses.SECRET_HASH = calculateSecretHash(username, process.env.COGNITO_CLIENT_ID, process.env.COGNITO_CLIENT_SECRET);
            }
        }

        // Execute authentication command
        const command = new InitiateAuthCommand(params);
        const result = await cognitoClient.send(command);

        // Return relevant information
        return {
            accessToken: result.AuthenticationResult?.AccessToken,
            refreshToken: result.AuthenticationResult?.RefreshToken,
            expiresIn: result.AuthenticationResult?.ExpiresIn,
            tokenType: result.AuthenticationResult?.TokenType,
            challenge: result.ChallengeName,
            session: result.Session
        };
    } catch (error) {
        // Re-throw the error to be handled by the calling function
        throw error;
    }
}

/**
 * Add user to a Cognito group
 * @param {string} username 
 * @param {string} groupName 
 * @returns {Promise<Object>} Result of adding user to group
 */
async function addUserToGroup(username, groupName) {
    try {
        // Validate inputs
        if (!username || !groupName) {
            throw new Error('Username and group name are required');
        }

        // Prepare parameters
        const params = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: username,
            GroupName: groupName
        };

        // Execute command
        const command = new AdminAddUserToGroupCommand(params);
        const result = await cognitoClient.send(command);

        return result;
    } catch (error) {
        // Re-throw the error to be handled by the calling function
        throw error;
    }
}

/**
 * Get user attributes from Cognito
 * @param {string} username 
 * @returns {Promise<Object>} User attributes
 */
async function getUserAttributes(username) {
    try {
        // Validate inputs
        if (!username) {
            throw new Error('Username is required');
        }

        // Prepare parameters
        const params = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: username
        };

        // Execute command
        const command = new AdminGetUserCommand(params);
        const result = await cognitoClient.send(command);

        // Return user information
        return {
            username: result.Username,
            attributes: result.UserAttributes?.reduce((acc, attr) => {
                acc[attr.Name] = attr.Value;
                return acc;
            }, {}),
            enabled: result.Enabled,
            userStatus: result.UserStatus
        };
    } catch (error) {
        // Re-throw the error to be handled by the calling function
        throw error;
    }
}

/**
 * Get user groups from Cognito
 * @param {string} username 
 * @returns {Promise<Array>} User groups
 */
async function getUserGroups(username) {
    try {
        // Validate inputs
        if (!username) {
            throw new Error('Username is required');
        }

        // Prepare parameters
        const params = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: username
        };

        // Execute command
        const command = new AdminListGroupsForUserCommand(params);
        const result = await cognitoClient.send(command);

        // Return group names
        return result.Groups?.map(group => group.GroupName) || [];
    } catch (error) {
        // Re-throw the error to be handled by the calling function
        throw error;
    }
}

module.exports = {
    registerUser,
    loginUser,
    addUserToGroup,
    getUserAttributes,
    getUserGroups
};