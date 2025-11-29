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
    AdminGetUserCommand,  // Add this for getting user attributes
    AdminCreateUserCommand,  // Add this for admin user creation
    AdminSetUserPasswordCommand  // Add this for setting permanent password
} = require("@aws-sdk/client-cognito-identity-provider");
const { fromEnv } = require("@aws-sdk/credential-providers");

// Configure AWS Cognito client with proper error handling
let cognitoClient;
let cognitoRegion;

function initializeCognitoClient() {
    try {
        // Validate required environment variables
        if (!process.env.COGNITO_USER_POOL_ID) {
            console.error('ERROR: COGNITO_USER_POOL_ID is not set in environment variables');
            console.error('Please set COGNITO_USER_POOL_ID in your .env file');
        }
        
        if (!process.env.COGNITO_CLIENT_ID) {
            console.error('ERROR: COGNITO_CLIENT_ID is not set in environment variables');
            console.error('Please set COGNITO_CLIENT_ID in your .env file');
        }

        cognitoRegion = process.env.COGNITO_REGION || process.env.AWS_REGION;
        
        console.log(`Initializing Cognito client for region: ${cognitoRegion}`);
        
        cognitoClient = new CognitoIdentityProviderClient({
            region: cognitoRegion,
            credentials: fromEnv()
        });
        
        console.log('Cognito client initialized successfully');
        return true;
    } catch (error) {
        console.error('ERROR: Failed to initialize Cognito client:', error.message);
        console.error('Please check your AWS credentials and region configuration');
        console.error('Make sure you have:');
        console.error('1. AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY set in your environment');
        console.error('2. COGNITO_REGION or AWS_REGION set correctly');
        console.error('3. A valid Cognito User Pool in the specified region');
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
        // Validate Cognito client is initialized
        if (!cognitoClient) {
            throw new Error('Cognito client is not initialized. Please check your AWS configuration and environment variables.');
        }

        // Validate required environment variables
        if (!process.env.COGNITO_CLIENT_ID) {
            throw new Error('COGNITO_CLIENT_ID is not configured. Please set it in your .env file.');
        }

        // Validate inputs
        if (!username || !password) {
            throw new Error('Username and password are required');
        }

        // Handle NEW_PASSWORD_REQUIRED challenge
        if (newPassword && session) {
            // Use RespondToAuthChallengeCommand for challenge responses
            const params = {
                ClientId: process.env.COGNITO_CLIENT_ID,
                ChallengeName: 'NEW_PASSWORD_REQUIRED',
                Session: session,
                ChallengeResponses: {
                    USERNAME: username,
                    NEW_PASSWORD: newPassword
                }
            };

            // Add SECRET_HASH to challenge responses if client secret is configured
            if (process.env.COGNITO_CLIENT_SECRET) {
                params.ChallengeResponses.SECRET_HASH = calculateSecretHash(username, process.env.COGNITO_CLIENT_ID, process.env.COGNITO_CLIENT_SECRET);
            }

            // Execute challenge response command
            const command = new RespondToAuthChallengeCommand(params);
            const result = await cognitoClient.send(command);

            return {
                accessToken: result.AuthenticationResult?.AccessToken,
                refreshToken: result.AuthenticationResult?.RefreshToken,
                expiresIn: result.AuthenticationResult?.ExpiresIn,
                tokenType: result.AuthenticationResult?.TokenType,
                challenge: result.ChallengeName,
                session: result.Session
            };
        } else {
            // Prepare authentication parameters for initial login
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

            // Execute authentication command
            const command = new InitiateAuthCommand(params);
            const result = await cognitoClient.send(command);

            return {
                accessToken: result.AuthenticationResult?.AccessToken,
                refreshToken: result.AuthenticationResult?.RefreshToken,
                expiresIn: result.AuthenticationResult?.ExpiresIn,
                tokenType: result.AuthenticationResult?.TokenType,
                challenge: result.ChallengeName,
                session: result.Session
            };
        }
    } catch (error) {
        // Provide more helpful error messages
        if (error.name === 'UnknownEndpoint' || error.message?.includes('ENOTFOUND') || error.message?.includes('getaddrinfo')) {
            const region = cognitoRegion || process.env.COGNITO_REGION || process.env.AWS_REGION || 'ap-south-1';
            const errorMsg = `Failed to connect to AWS Cognito in region: ${region}. `;
            const suggestions = [
                `1. Verify that COGNITO_REGION in your .env file matches the region where your Cognito User Pool exists.`,
                `2. Check your AWS credentials (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY) are set correctly.`,
                `3. Verify you have internet connectivity and can reach AWS services.`,
                `4. Check if your Cognito User Pool exists in the ${region} region.`,
                `5. If using a different region, update COGNITO_REGION in your .env file to match your User Pool region.`
            ].join('\n');
            throw new Error(errorMsg + '\n' + suggestions + '\n\nOriginal error: ' + error.message);
        }
        
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

/**
 * Create user using Admin API (for cases where SignUp is disabled)
 * @param {string} username 
 * @param {string} password 
 * @param {string} email 
 * @param {boolean} temporary Whether the password is temporary (default: false)
 * @returns {Promise<Object>} User creation result
 */
async function adminCreateUser(username, password, email, temporary = false) {
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
                Value: 'true'  // Admin created users can have verified email
            }
        ];

        // Prepare admin create user parameters
        const params = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: username,
            UserAttributes: userAttributes,
            TemporaryPassword: temporary ? password : undefined,
            MessageAction: 'SUPPRESS', // Don't send welcome email
            ForceAliasCreation: false
        };

        // Execute admin create user command
        const command = new AdminCreateUserCommand(params);
        const result = await cognitoClient.send(command);

        // If not temporary, set as permanent password
        if (!temporary) {
            const setPasswordParams = {
                UserPoolId: process.env.COGNITO_USER_POOL_ID,
                Username: username,
                Password: password,
                Permanent: true
            };
            
            const setPasswordCommand = new AdminSetUserPasswordCommand(setPasswordParams);
            await cognitoClient.send(setPasswordCommand);
        }

        return result.User;
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
    getUserGroups,
    adminCreateUser
};
