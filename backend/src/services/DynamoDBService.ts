// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";

// Configure AWS DynamoDB
const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: fromEnv()
});

const dynamodb = DynamoDBDocument.from(client, {
    marshallOptions: {
        removeUndefinedValues: true
    }
});

export class DynamoDBService {
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

                const adminResult = await dynamodb.get(adminParams);
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
                    const result = await dynamodb.get(params);
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

            const scanResult = await dynamodb.scan(scanParams);
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

    /**
     * Update an existing user record in DynamoDB by email.
     * Finds the existing item (to discover PK/SK) and applies the provided updates.
     * @param email User email
     * @param updates Object with fields to set on the item
     */
    async updateUserByEmail(email: string, updates: Record<string, any>): Promise<any> {
        try {
            // First, locate the existing item (and its PK/SK)
            const existing = await this.getUserByEmail(email);
            if (!existing) {
                throw new Error('User not found');
            }

            const PK = existing.PK;
            const SK = existing.SK;

            // Build UpdateExpression dynamically
            const expressionParts: string[] = [];
            const expressionNames: Record<string, string> = {};
            const expressionValues: Record<string, any> = {};

            let idx = 0;
            for (const key of Object.keys(updates)) {
                const attrName = `#a${idx}`;
                const attrValue = `:v${idx}`;
                expressionParts.push(`${attrName} = ${attrValue}`);
                expressionNames[attrName] = key;
                expressionValues[attrValue] = updates[key];
                idx++;
            }

            // Always update the updatedAt timestamp
            const timeAttrName = `#a${idx}`;
            const timeAttrValue = `:v${idx}`;
            expressionParts.push(`${timeAttrName} = ${timeAttrValue}`);
            expressionNames[timeAttrName] = 'updatedAt';
            expressionValues[timeAttrValue] = new Date().toISOString();

            const params = {
                TableName: this.tableName,
                Key: { PK, SK },
                UpdateExpression: 'SET ' + expressionParts.join(', '),
                ExpressionAttributeNames: expressionNames,
                ExpressionAttributeValues: expressionValues,
                ReturnValues: 'ALL_NEW'
            };

            const result = await dynamodb.update(params);
            return result.Attributes;
        } catch (error) {
            if (error.code === 'CredentialsError' || error.message.includes('credentials')) {
                throw new Error('AWS credentials not configured. Please check your AWS configuration.');
            }
            throw new Error('Failed to update user in DynamoDB: ' + error.message);
        }
    }

    // Additional methods for AdminService
    async scanTable(params: any): Promise<any> {
        try {
            const scanParams = {
                TableName: this.tableName,
                ...params
            };
            return await dynamodb.scan(scanParams);
        } catch (error) {
            console.error('Error scanning table:', error);
            throw error;
        }
    }

    async queryTable(params: any): Promise<any> {
        try {
            const queryParams = {
                TableName: this.tableName,
                ...params
            };
            return await dynamodb.query(queryParams);
        } catch (error) {
            console.error('Error querying table:', error);
            throw error;
        }
    }

    async putItem(item: any): Promise<any> {
        try {
            const params = {
                TableName: this.tableName,
                Item: item
            };
            return await dynamodb.put(params);
        } catch (error) {
            console.error('Error putting item:', error);
            throw error;
        }
    }

    async getItem(params: any): Promise<any> {
        try {
            const getParams = {
                TableName: this.tableName,
                ...params
            };
            return await dynamodb.get(getParams);
        } catch (error) {
            console.error('Error getting item:', error);
            throw error;
        }
    }

    async updateItem(params: any): Promise<any> {
        try {
            const updateParams = {
                TableName: this.tableName,
                ...params
            };
            return await dynamodb.update(updateParams);
        } catch (error) {
            console.error('Error updating item:', error);
            throw error;
        }
    }

    async deleteItem(params: any): Promise<any> {
        try {
            const deleteParams = {
                TableName: this.tableName,
                ...params
            };
            return await dynamodb.delete(deleteParams);
        } catch (error) {
            console.error('Error deleting item:', error);
            throw error;
        }
    }

    async batchWrite(items: any[]): Promise<any> {
        try {
            // Split items into chunks of 25 (DynamoDB limit)
            const chunks = [];
            for (let i = 0; i < items.length; i += 25) {
                chunks.push(items.slice(i, i + 25));
            }

            const results = [];
            for (const chunk of chunks) {
                const params = {
                    RequestItems: {
                        [this.tableName]: chunk
                    }
                };
                const result = await dynamodb.batchWrite(params);
                results.push(result);
            }
            return results;
        } catch (error) {
            console.error('Error batch writing:', error);
            throw error;
        }
    }
}

// Export both the class and a singleton instance
// Export both the class and a singleton instance
export default DynamoDBService;
export const instance = new DynamoDBService(process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy');