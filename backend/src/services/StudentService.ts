// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import {
    CognitoIdentityProviderClient,
    AdminCreateUserCommand,
    AdminAddUserToGroupCommand,
    AdminSetUserPasswordCommand,
    AdminGetUserCommand,
    AdminDeleteUserCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { fromEnv } from "@aws-sdk/credential-providers";

const dbClient = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: fromEnv()
});

const dynamodb = DynamoDBDocument.from(dbClient, {
    marshallOptions: {
        removeUndefinedValues: true
    }
});

// Initialize Cognito Identity Provider
const cognito = new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION || process.env.AWS_REGION,
    credentials: fromEnv()
});

export class StudentService {
    private tableName: string;
    private clientPK: string;
    private userPoolId: string;

    constructor(tableName: string) {
        this.tableName = tableName;
        // We'll set clientPK dynamically based on email domain
        this.clientPK = 'CLIENT#ksrce.ac.in'; // Default value, will be updated dynamically
        this.userPoolId = process.env.COGNITO_USER_POOL_ID;
    }

    /**
     * Extract domain from email address
     */
    private getDomainFromEmail(email: string): string {
        if (!email || !email.includes('@')) {
            return 'ksrce.ac.in'; // Default domain
        }
        return email.split('@')[1];
    }

    /**
     * Set client PK based on email domain
     */
    private setClientPK(email: string): void {
        const domain = this.getDomainFromEmail(email);
        this.clientPK = `CLIENT#${domain}`;
    }

    /**
     * Validate student email domain
     */
    private validateEmail(email) {
        const domain = email.split('@')[1];
        // Allow any valid domain, not just ksrce.ac.in
        return domain && domain.length > 0;
    }

    /**
     * Create Cognito user with default password
     */
    private async createCognitoUser(email, name) {
        try {
            console.log('=== COGNITO USER CREATION STARTED ===');
            console.log('Creating Cognito user for:', email);
            console.log('User name:', name);

            // Default password for all students - meets Cognito requirements
            // Must have uppercase, lowercase, numbers, and special characters
            const defaultPassword = 'Pyplaci#25Student';
            console.log('Using default password: Pyplaci#25Student');

            // Create user with temporary password first
            const params = {
                UserPoolId: this.userPoolId,
                Username: email,
                TemporaryPassword: defaultPassword,
                MessageAction: 'SUPPRESS', // Don't send welcome email
                UserAttributes: [
                    {
                        Name: 'email',
                        Value: email
                    },
                    {
                        Name: 'name',
                        Value: name
                    },
                    {
                        Name: 'email_verified',
                        Value: 'true'
                    }
                ]
            };

            console.log('AdminCreateUser params:', JSON.stringify(params, null, 2));

            const command = new AdminCreateUserCommand(params);
            const result = await cognito.send(command);
            console.log('AdminCreateUser result:', JSON.stringify(result, null, 2));

            // Add user to 'student' group
            try {
                console.log('Adding user to student group...');
                const groupCommand = new AdminAddUserToGroupCommand({
                    UserPoolId: this.userPoolId,
                    Username: email,
                    GroupName: 'student'
                });
                await cognito.send(groupCommand);
                console.log('Successfully added user to student group');
            } catch (groupError) {
                console.warn('Warning: Could not add user to student group:', groupError.message);
                // Continue even if group assignment fails
            }

            // Set permanent password (this makes the password permanent)
            console.log('Setting permanent password...');
            const passwordCommand = new AdminSetUserPasswordCommand({
                UserPoolId: this.userPoolId,
                Username: email,
                Password: defaultPassword,
                Permanent: true
            });
            await cognito.send(passwordCommand);
            console.log('Successfully set permanent password');

            // Verify user state
            console.log('Verifying user state...');
            const getUserCommand = new AdminGetUserCommand({
                UserPoolId: this.userPoolId,
                Username: email
            });
            const userStatus = await cognito.send(getUserCommand);
            console.log('User status:', JSON.stringify(userStatus, null, 2));

            console.log('=== COGNITO USER CREATION COMPLETED ===');
            return result.User;
        } catch (error) {
            console.error('=== COGNITO USER CREATION FAILED ===');
            console.error('Error creating Cognito user:', error);
            // Log detailed error information
            if (error.code) {
                console.error('Error code:', error.code);
            }
            if (error.message) {
                console.error('Error message:', error.message);
            }
            if (error.statusCode) {
                console.error('Status code:', error.statusCode);
            }
            console.error('=== END COGNITO ERROR ===');
            throw new Error('Failed to create user in authentication system: ' + error.message);
        }
    }

    /**
     * Get all students
     */
    async getAllStudents(email: string) {
        try {
            // Set client PK based on email domain
            this.setClientPK(email);

            const params = {
                TableName: this.tableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
                ExpressionAttributeValues: {
                    ':pk': this.clientPK,
                    ':skPrefix': 'STUDENT#'
                }
            };

            const result = await dynamodb.query(params);
            return result.Items || [];
        } catch (error) {
            throw new Error('Failed to fetch students: ' + error.message);
        }
    }

    /**
     * Get student by email
     */
    async getStudentByEmail(email: string) {
        try {
            // Always use student's domain
            this.setClientPK(email);

            const params = {
                TableName: this.tableName,
                Key: {
                    PK: this.clientPK,
                    SK: `STUDENT#${email}`
                }
            };

            const result = await dynamodb.get(params);
            return result.Item || null;

        } catch (error) {
            throw new Error('Failed to fetch student: ' + error.message);
        }
    }

    /**
     * Create or update student (Upsert)
     */
    async upsertStudent(studentData, createdByEmail) {
        try {
            // Extract domains from emails
            const studentDomain = this.getDomainFromEmail(studentData.email);
            const creatorDomain = this.getDomainFromEmail(createdByEmail);

            // Restrict PTS users to only add students from their own domain
            if (studentDomain !== creatorDomain) {
                throw new Error(`You can only add students from your own domain (${creatorDomain}). Cannot add student from domain ${studentDomain}.`);
            }

            // Set client PK based on student's email domain
            this.setClientPK(studentData.email);

            // Validate email domain
            if (!this.validateEmail(studentData.email)) {
                throw new Error('Email must be from a valid domain');
            }

            // Check if student exists (use student's domain for lookup)
            const existingStudent = await this.getStudentByEmail(studentData.email, studentData.email);
            const now = new Date().toISOString();

            const student = {
                PK: this.clientPK,
                SK: `STUDENT#${studentData.email}`,
                email: studentData.email,
                rollNumber: studentData.rollNumber,
                name: studentData.name,
                department: studentData.department,
                phone: studentData.phone || '',
                status: studentData.status || 'Active',
                role: 'Student', // Add role field for authentication
                createdAt: existingStudent ? existingStudent.createdAt : now,
                createdBy: existingStudent ? existingStudent.createdBy : createdByEmail,
                updatedAt: now,
                updatedBy: createdByEmail
            };

            const params = {
                TableName: this.tableName,
                Item: student
            };

            await dynamodb.put(params);

            // If this is a new student, create Cognito user
            if (!existingStudent) {
                try {
                    await this.createCognitoUser(studentData.email, studentData.name);
                } catch (cognitoError) {
                    // If Cognito creation fails, we should rollback the DynamoDB entry
                    console.error('Cognito user creation failed, rolling back DynamoDB entry');
                    try {
                        await this.deleteStudent(studentData.email, studentData.email);
                    } catch (deleteError) {
                        console.error('Failed to rollback DynamoDB entry:', deleteError.message);
                    }
                    throw new Error('Failed to create user in authentication system: ' + cognitoError.message);
                }
            }

            return student;
        } catch (error) {
            console.error('Error in upsertStudent:', error);
            throw new Error('Failed to create/update student: ' + error.message);
        }
    }

    /**
     * Update student status
     */
    async updateStudentStatus(email, status, updatedByEmail) {
        try {
            // Extract domains from emails
            const studentDomain = this.getDomainFromEmail(email);
            const updaterDomain = this.getDomainFromEmail(updatedByEmail);

            // Restrict PTS users to only update students from their own domain
            if (studentDomain !== updaterDomain) {
                throw new Error(`You can only update students from your own domain (${updaterDomain}). Cannot update student from domain ${studentDomain}.`);
            }

            // Set client PK based on updater's email domain
            this.setClientPK(updatedByEmail);

            const student = await this.getStudentByEmail(email, updatedByEmail);
            if (!student) {
                throw new Error('Student not found');
            }

            const params = {
                TableName: this.tableName,
                Key: {
                    PK: this.clientPK,
                    SK: `STUDENT#${email}`
                },
                UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt, #updatedBy = :updatedBy',
                ExpressionAttributeNames: {
                    '#status': 'status',
                    '#updatedAt': 'updatedAt',
                    '#updatedBy': 'updatedBy'
                },
                ExpressionAttributeValues: {
                    ':status': status,
                    ':updatedAt': new Date().toISOString(),
                    ':updatedBy': updatedByEmail
                },
                ReturnValues: 'ALL_NEW'
            };

            const result = await dynamodb.update(params);
            return result.Attributes;
        } catch (error) {
            console.error('Error in updateStudentStatus:', error);
            throw new Error('Failed to update student status: ' + error.message);
        }
    }

    /**
     * Delete student by email
     */
    async deleteStudent(email: string, requesterEmail: string) {
        try {
            // Extract domains from emails
            const studentDomain = this.getDomainFromEmail(email);
            const requesterDomain = this.getDomainFromEmail(requesterEmail);

            // Restrict PTS users to only delete students from their own domain
            if (studentDomain !== requesterDomain) {
                throw new Error(`You can only delete students from your own domain (${requesterDomain}). Cannot delete student from domain ${studentDomain}.`);
            }

            // Set client PK based on requester's email domain
            this.setClientPK(requesterEmail);

            const params = {
                TableName: this.tableName,
                Key: {
                    PK: this.clientPK,
                    SK: `STUDENT#${email}`
                }
            };

            await dynamodb.delete(params);

            // Delete from Cognito as well
            try {
                const deleteUserCommand = new AdminDeleteUserCommand({
                    UserPoolId: this.userPoolId,
                    Username: email
                });
                await cognito.send(deleteUserCommand);
                console.log(`Successfully deleted user ${email} from Cognito`);
            } catch (cognitoError) {
                console.error(`Error deleting user ${email} from Cognito:`, cognitoError.message);
                // Don't throw error here as DynamoDB deletion was successful
                // The user may not exist in Cognito but still be in DynamoDB
            }

            return { message: 'Student deleted successfully' };
        } catch (error) {
            throw new Error('Failed to delete student: ' + error.message);
        }
    }
}

export default new StudentService(process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy');