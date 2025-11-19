// @ts-nocheck
const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION
});

// Initialize Cognito Identity Provider
const cognito = new AWS.CognitoIdentityServiceProvider({
    region: process.env.COGNITO_REGION
});

class StudentService {
    private tableName: string;
    private clientPK: string;
    private userPoolId: string;

    constructor(tableName: string) {
        this.tableName = tableName;
        this.clientPK = 'CLIENT#ksrce.ac.in'; // Multi-tenant partition key
        this.userPoolId = process.env.COGNITO_USER_POOL_ID;
    }

    /**
     * Validate student email domain
     */
    private validateEmail(email) {
        const domain = email.split('@')[1];
        return domain === 'ksrce.ac.in';
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
            
            const result = await cognito.adminCreateUser(params).promise();
            console.log('AdminCreateUser result:', JSON.stringify(result, null, 2));
            
            // Add user to 'student' group
            try {
                console.log('Adding user to student group...');
                await cognito.adminAddUserToGroup({
                    UserPoolId: this.userPoolId,
                    Username: email,
                    GroupName: 'student'
                }).promise();
                console.log('Successfully added user to student group');
            } catch (groupError) {
                console.warn('Warning: Could not add user to student group:', groupError.message);
                // Continue even if group assignment fails
            }

            // Set permanent password (this makes the password permanent)
            console.log('Setting permanent password...');
            await cognito.adminSetUserPassword({
                UserPoolId: this.userPoolId,
                Username: email,
                Password: defaultPassword,
                Permanent: true
            }).promise();
            console.log('Successfully set permanent password');
            
            // Verify user state
            console.log('Verifying user state...');
            const userStatus = await cognito.adminGetUser({
                UserPoolId: this.userPoolId,
                Username: email
            }).promise();
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
    async getAllStudents() {
        try {
            const params = {
                TableName: this.tableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
                ExpressionAttributeValues: {
                    ':pk': this.clientPK,
                    ':skPrefix': 'STUDENT#'
                }
            };

            const result = await dynamodb.query(params).promise();
            return result.Items || [];
        } catch (error) {
            throw new Error('Failed to fetch students: ' + error.message);
        }
    }

    /**
     * Get student by email
     */
    async getStudentByEmail(email) {
        try {
            const params = {
                TableName: this.tableName,
                Key: {
                    PK: this.clientPK,
                    SK: `STUDENT#${email}`
                }
            };

            const result = await dynamodb.get(params).promise();
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
            // Validate email domain
            if (!this.validateEmail(studentData.email)) {
                throw new Error('Email must be from @ksrce.ac.in domain');
            }

            // Check if student exists
            const existingStudent = await this.getStudentByEmail(studentData.email);
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

            await dynamodb.put(params).promise();
            
            // If this is a new student, create Cognito user
            if (!existingStudent) {
                try {
                    await this.createCognitoUser(studentData.email, studentData.name);
                } catch (cognitoError) {
                    // If Cognito creation fails, we should rollback the DynamoDB entry
                    console.error('Cognito user creation failed, rolling back DynamoDB entry');
                    try {
                        await this.deleteStudent(studentData.email);
                    } catch (deleteError) {
                        console.error('Failed to rollback DynamoDB entry:', deleteError.message);
                    }
                    throw cognitoError;
                }
            }

            return student;
        } catch (error) {
            throw new Error('Failed to save student: ' + error.message);
        }
    }

    /**
     * Update student status
     */
    async updateStudentStatus(email, status, updatedByEmail) {
        try {
            const student = await this.getStudentByEmail(email);
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

            const result = await dynamodb.update(params).promise();
            return result.Attributes;
        } catch (error) {
            console.error('Error in updateStudentStatus:', error);
            throw new Error('Failed to update student status: ' + error.message);
        }
    }

    /**
     * Delete student
     */
    async deleteStudent(email) {
        try {
            // First delete from Cognito
            try {
                await cognito.adminDeleteUser({
                    UserPoolId: this.userPoolId,
                    Username: email
                }).promise();
                console.log(`Successfully deleted user ${email} from Cognito`);
            } catch (cognitoError) {
                // Log the error but don't fail the operation if Cognito deletion fails
                console.warn(`Failed to delete user ${email} from Cognito:`, cognitoError.message);
            }

            // Then delete from DynamoDB
            const params = {
                TableName: this.tableName,
                Key: {
                    PK: this.clientPK,
                    SK: `STUDENT#${email}`
                }
            };

            await dynamodb.delete(params).promise();
            return true;
        } catch (error) {
            throw new Error('Failed to delete student: ' + error.message);
        }
    }
}

module.exports = new StudentService(process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy');