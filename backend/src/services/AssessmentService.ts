// @ts-nocheck
const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION
});

class AssessmentService {
    private tableName: string;

    constructor(tableName: string) {
        this.tableName = tableName;
    }

    async createAssessment(assessmentData: any, createdBy: string): Promise<any> {
        try {
            const timestamp = Date.now();
            const createdAt = new Date().toISOString();
            const assessmentId = `${timestamp}_${createdBy.replace('@', '_at_').replace(/\./g, '_')}`;
            const totalMarks = assessmentData.questions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0);

            const assessment = {
                PK: `ASSESSMENT#${assessmentId}`,
                SK: 'METADATA',
                assessmentId,
                title: assessmentData.title,
                description: assessmentData.description || '',
                duration: assessmentData.duration,
                totalMarks,
                instructions: assessmentData.instructions || '',
                department: assessmentData.department,
                difficulty: assessmentData.difficulty || 'medium',
                category: assessmentData.category || '',
                questionCount: assessmentData.questions.length,
                status: 'draft',
                createdBy,
                createdAt,
                updatedAt: createdAt
            };

            await dynamodb.put({
                TableName: this.tableName,
                Item: assessment
            }).promise();

            const questionPromises = assessmentData.questions.map((question: any, index: number) => {
                return dynamodb.put({
                    TableName: this.tableName,
                    Item: {
                        PK: `ASSESSMENT#${assessmentId}`,
                        SK: `QUESTION#${String(index + 1).padStart(3, '0')}`,
                        questionId: `${assessmentId}_Q${index + 1}`,
                        questionNumber: index + 1,
                        text: question.text,
                        options: question.options,
                        correctAnswer: question.correctAnswer,
                        marks: question.marks || 1
                    }
                }).promise();
            });

            await Promise.all(questionPromises);

            return { ...assessment, questions: assessmentData.questions };
        } catch (error) {
            console.error('Error creating assessment:', error);
            throw new Error('Failed to create assessment: ' + error.message);
        }
    }

    async getAssessmentById(assessmentId: string): Promise<any> {
        try {
            const params = {
                TableName: this.tableName,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: {
                    ':pk': `ASSESSMENT#${assessmentId}`
                }
            };

            const result = await dynamodb.query(params).promise();

            if (!result.Items || result.Items.length === 0) {
                return null;
            }

            const metadata = result.Items.find((item: any) => item.SK === 'METADATA');
            const questions = result.Items
                .filter((item: any) => item.SK.startsWith('QUESTION#'))
                .sort((a: any, b: any) => a.questionNumber - b.questionNumber);

            return { ...metadata, questions };
        } catch (error) {
            console.error('Error getting assessment:', error);
            throw new Error('Failed to retrieve assessment: ' + error.message);
        }
    }

    async getAllAssessments(filters: any = {}, limit: number = 50, lastKey: any = null): Promise<any> {
        try {
            let filterExpression = 'SK = :metadata';
            let expressionAttributeValues: any = { ':metadata': 'METADATA' };

            if (filters.department && filters.department !== 'All Departments') {
                filterExpression += ' AND department = :dept';
                expressionAttributeValues[':dept'] = filters.department;
            }

            if (filters.status) {
                filterExpression += ' AND #status = :status';
                expressionAttributeValues[':status'] = filters.status;
            }

            const params: any = {
                TableName: this.tableName,
                FilterExpression: filterExpression,
                ExpressionAttributeValues: expressionAttributeValues,
                Limit: limit
            };

            if (filters.status) {
                params.ExpressionAttributeNames = { '#status': 'status' };
            }

            if (lastKey) {
                params.ExclusiveStartKey = lastKey;
            }

            const result = await dynamodb.scan(params).promise();

            return {
                items: result.Items || [],
                lastKey: result.LastEvaluatedKey,
                hasMore: !!result.LastEvaluatedKey
            };
        } catch (error) {
            console.error('Error getting all assessments:', error);
            throw new Error('Failed to retrieve assessments: ' + error.message);
        }
    }

    async updateAssessment(assessmentId: string, updates: any): Promise<any> {
        try {
            const timestamp = new Date().toISOString();
            const updateExpression = [];
            const expressionAttributeNames: any = {};
            const expressionAttributeValues: any = {};

            Object.keys(updates).forEach((key, index) => {
                const attrName = `#attr${index}`;
                const attrValue = `:val${index}`;
                updateExpression.push(`${attrName} = ${attrValue}`);
                expressionAttributeNames[attrName] = key;
                expressionAttributeValues[attrValue] = updates[key];
            });

            updateExpression.push('#updatedAt = :updatedAt');
            expressionAttributeNames['#updatedAt'] = 'updatedAt';
            expressionAttributeValues[':updatedAt'] = timestamp;

            const params = {
                TableName: this.tableName,
                Key: {
                    PK: `ASSESSMENT#${assessmentId}`,
                    SK: 'METADATA'
                },
                UpdateExpression: `SET ${updateExpression.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW'
            };

            const result = await dynamodb.update(params).promise();
            return result.Attributes;
        } catch (error) {
            console.error('Error updating assessment:', error);
            throw new Error('Failed to update assessment: ' + error.message);
        }
    }

    async deleteAssessment(assessmentId: string): Promise<void> {
        try {
            const params = {
                TableName: this.tableName,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: {
                    ':pk': `ASSESSMENT#${assessmentId}`
                }
            };

            const result = await dynamodb.query(params).promise();

            if (!result.Items || result.Items.length === 0) {
                throw new Error('Assessment not found');
            }

            const deletePromises = result.Items.map((item: any) => {
                return dynamodb.delete({
                    TableName: this.tableName,
                    Key: { PK: item.PK, SK: item.SK }
                }).promise();
            });

            await Promise.all(deletePromises);
        } catch (error) {
            console.error('Error deleting assessment:', error);
            throw new Error('Failed to delete assessment: ' + error.message);
        }
    }
}

module.exports = new AssessmentService(process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy');
