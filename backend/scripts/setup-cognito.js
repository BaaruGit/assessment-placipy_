#!/usr/bin/env node

/**
 * Script to setup AWS Cognito User Pool and App Client
 * This script should be run once to initialize the Cognito resources
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: process.env.COGNITO_REGION});

const cognito = new AWS.CognitoIdentityServiceProvider();

async function createCognitoResources() {
    try {
        // Create User Pool
        const userPoolParams = {
            PoolName: 'placipy-user-pool',
            Policies: {
                PasswordPolicy: {
                    MinimumLength: 8,
                    RequireUppercase: true,
                    RequireLowercase: true,
                    RequireNumbers: true,
                    RequireSymbols: true,
                }
            },
            AutoVerifiedAttributes: ['email'],
            AliasAttributes: ['email'],
            VerificationMessageTemplate: {
                DefaultEmailOption: 'CONFIRM_WITH_CODE'
            },
            AccountRecoverySetting: {
                RecoveryMechanisms: [
                    {
                        Name: 'verified_email',
                        Priority: 1
                    }
                ]
            }
        };

        console.log('Creating User Pool...');
        const userPoolResult = await cognito.createUserPool(userPoolParams).promise();
        const userPoolId = userPoolResult.UserPool.Id;
        console.log('User Pool created:', userPoolId);

        // Create User Pool Client
        const clientParams = {
            ClientName: 'placipy-client',
            UserPoolId: userPoolId,
            GenerateSecret: false,
            ExplicitAuthFlows: [
                'ALLOW_USER_PASSWORD_AUTH',
                'ALLOW_REFRESH_TOKEN_AUTH'
            ]
        };

        console.log('Creating User Pool Client...');
        const clientResult = await cognito.createUserPoolClient(clientParams).promise();
        const clientId = clientResult.UserPoolClient.ClientId;
        console.log('User Pool Client created:', clientId);

        // Create Groups
        const groups = ['admin', 'instructor', 'student'];

        for (const groupName of groups) {
            const groupParams = {
                GroupName: groupName,
                UserPoolId: userPoolId,
                Description: `Group for ${groupName}s`
            };

            console.log(`Creating group: ${groupName}`);
            await cognito.createGroup(groupParams).promise();
            console.log(`Group ${groupName} created`);
        }

        console.log('\nSetup completed successfully!');
        console.log('Update your .env file with the following values:');
        console.log(`COGNITO_USER_POOL_ID=${userPoolId}`);
        console.log(`COGNITO_CLIENT_ID=${clientId}`);
        console.log(`COGNITO_JWKS_URL=https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${userPoolId}/.well-known/jwks.json`);

    } catch (error) {
        console.error('Error setting up Cognito resources:', error);
    }
}

// Run the setup
createCognitoResources();