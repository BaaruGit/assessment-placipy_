// @ts-nocheck
const AWS = require('aws-sdk');

// Configure AWS DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION
});

class DynamoDBService {
    private tableName: string;

    constructor(tableName: string) {
        this.tableName = tableName;
    }

    /**
     * Get user by email from DynamoDB based on your specific table structure
     * @param email User's email
     * @returns User data or null if not found
     */
    async getUserByEmail(email: string): Promise<any | null> {
        try {
            // Extract domain from email
            const domain = email.split('@')[1];
            if (!domain) {
                throw new Error('Invalid email format');
            }

            // For admin users, check the special GLOBAL#ADMIN PK first
            if (email === 'admin@praskla.com') {
                const adminParams = {
                    TableName: this.tableName,
                    Key: {
                        PK: 'GLOBAL#ADMIN',
                        SK: `ADMIN#${email}`
                    }
                };

                const adminResult = await dynamodb.get(adminParams).promise();
                if (adminResult.Item) {
                    return adminResult.Item;
                }
            }

            // For regular users, use CLIENT#{domain} as PK
            const clientPK = `CLIENT#${domain}`;

            // Try to find the user with different role patterns
            const roles = [
                { prefix: 'STUDENT', identifier: email },
                { prefix: 'PTO', identifier: email },
                { prefix: 'PTS', identifier: email }
            ];

            for (const role of roles) {
                const params = {
                    TableName: this.tableName,
                    Key: {
                        PK: clientPK,
                        SK: `${role.prefix}#${role.identifier}`
                    }
                };

                try {
                    const result = await dynamodb.get(params).promise();
                    if (result.Item) {
                        return result.Item;
                    }
                } catch (error) {
                    // Continue to next role if this one fails
                }
            }

            // If not found with exact email, try scanning for email (less efficient but for demo)
            const scanParams = {
                TableName: this.tableName,
                FilterExpression: "#email = :email AND begins_with(PK, :clientPrefix)",
                ExpressionAttributeNames: {
                    "#email": "email"
                },
                ExpressionAttributeValues: {
                    ":email": email,
                    ":clientPrefix": "CLIENT#"
                }
            };

            const scanResult = await dynamodb.scan(scanParams).promise();
            if (scanResult.Items && scanResult.Items.length > 0) {
                return scanResult.Items[0];
            }

            return null;
        } catch (error) {
            // If it's a credentials error, provide a more helpful message
            if (error.code === 'CredentialsError' || error.message.includes('credentials')) {
                throw new Error('AWS credentials not configured. Please check your AWS configuration.');
            }
            throw new Error('Failed to retrieve user data from DynamoDB: ' + error.message);
        }
    }

    /**
     * Get user role by email from DynamoDB
     * @param email User's email
     * @returns User role or null if not found
     */
    async getUserRoleByEmail(email: string): Promise<string | null> {
        try {
            const user = await this.getUserByEmail(email);
            const role = user ? user.role : null;
            return role;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get all user data by email from DynamoDB
     * @param email User's email
     * @returns Complete user data or null if not found
     */
    async getUserDataByEmail(email: string): Promise<any | null> {
        try {
            const user = await this.getUserByEmail(email);
            return user;
        } catch (error) {
            throw error;
        }
    }
}

// Export a singleton instance
module.exports = new DynamoDBService(process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy');