// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
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

// Import ResultsService to check for previous attempts
import { instance as dynamoDBService } from './DynamoDBService';

export class StudentAssessmentService {
    private assessmentsTableName: string;
    private questionsTableName: string;

    constructor() {
        this.assessmentsTableName = process.env.ASSESSMENTS_TABLE_NAME || 'Assesment_placipy_assesments';
        this.questionsTableName = process.env.QUESTIONS_TABLE_NAME || 'Assessment_placipy_assesessment_questions';
        console.log('StudentAssessmentService initialized with tables:', {
            assessments: this.assessmentsTableName,
            questions: this.questionsTableName
        });
    }

    /**
     * Shuffle array using Fisher-Yates algorithm
     */
    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Get assessment with questions by assessment ID
     * Fetches both assessment metadata and all related questions
     */
    async getAssessmentWithQuestions(assessmentId: string, requesterEmail: string): Promise<{ assessment: any, questions: any[] }> {
        try {
            console.log(`=== getAssessmentWithQuestions called with ID: ${assessmentId} ===`);

            // Validate input
            if (!assessmentId) {
                throw new Error('Assessment ID is required');
            }

            // Fetch user's department
            const userProfile = await dynamoDBService.getUserDataByEmail(requesterEmail);
            const studentDepartment = userProfile?.department;

            if (!studentDepartment) {
                throw new Error('Student department not found. Cannot retrieve assessments.');
            }

            // First get the assessment metadata
            console.log('Calling getAssessmentById...');
            const assessment = await this.getAssessmentById(assessmentId, studentDepartment, requesterEmail);
            console.log('Assessment result:', assessment);

            if (!assessment) {
                throw new Error(`Assessment ${assessmentId} not found or not accessible to your department`);
            }

            // Check if randomization is enabled for this assessment
            const randomizeQuestions = assessment.configuration?.randomizeQuestions || false;

            // Get all questions for this assessment
            console.log('Calling getAssessmentQuestions...');
            let questions = await this.getAssessmentQuestions(assessmentId, requesterEmail);
            console.log('Questions result:', questions);

            // If randomization is enabled, always randomize questions for every student and every attempt
            if (randomizeQuestions) {
                console.log('Randomization is enabled, randomizing questions for all students and all attempts...');
                questions = this.shuffleArray(questions);
            }

            // Return assessment with questions combined
            return {
                assessment,
                questions
            };
        } catch (error) {
            console.error('Error in getAssessmentWithQuestions:', error);
            throw error;
            throw new Error('Failed to retrieve assessment with questions: ' + error.message);
        }
    }

    /**
     * Get assessment by ID
     */
    async getAssessmentById(assessmentId: string, department: string, requesterEmail: string): Promise<any> {
        try {
            console.log('=== getAssessmentById called with ID:', assessmentId, 'and department:', department, '===');

            // Extract domain from requester's email for proper partitioning
            const domain = requesterEmail.split('@')[1];
            if (!domain) {
                throw new Error('Invalid requester email format');
            }

            const queryParams = {
                TableName: this.assessmentsTableName,
                KeyConditionExpression: 'PK = :pk AND SK = :sk',
                ExpressionAttributeValues: {
                    ':pk': `CLIENT#${domain}`,
                    ':sk': `ASSESSMENT#${assessmentId}`,
                    ':typeValue': 'DEPARTMENT_WISE'
                },
                FilterExpression: '#type = :typeValue', // Always filter by DEPARTMENT_WISE type
                ExpressionAttributeNames: {
                    '#type': 'type'
                }
            };

            if (department) {
                queryParams.FilterExpression += ' AND #dept = :department';
                queryParams.ExpressionAttributeNames['#dept'] = 'department';
                queryParams.ExpressionAttributeValues[':department'] = department;
            }

            console.log('Querying assessment with params:', JSON.stringify(queryParams, null, 2));
            const result = await dynamodb.query(queryParams);
            console.log('Assessment query result:', JSON.stringify(result, null, 2));

            if (result.Items && result.Items.length > 0) {
                const assessment = result.Items[0];
                console.log('Found assessment:', JSON.stringify(assessment, null, 2));

                // Additional check in case FilterExpression wasn't sufficient (e.g., due to eventual consistency)
                if (department && assessment.department !== department) {
                    console.warn(`Assessment ${assessmentId} found but department mismatch. Expected: ${department}, Found: ${assessment.department}`);
                    return null; // Department mismatch, return null as if not found
                }

                return assessment;
            } else {
                console.log('No assessment found with ID:', assessmentId);
                return null;
            }
        } catch (error) {
            console.error('Error getting assessment:', error);
            throw new Error('Failed to retrieve assessment: ' + error.message);
        }
    }

    /**
     * Get assessment questions by assessment ID
     */
    async getAssessmentQuestions(assessmentId: string, requesterEmail: string): Promise<any[]> {
        try {
            console.log(`=== getAssessmentQuestions called with ID: ${assessmentId} ===`);

            // Validate input
            if (!assessmentId) {
                throw new Error('Assessment ID is required');
            }

            // Extract domain from requester's email for proper partitioning
            const domain = requesterEmail.split('@')[1];
            if (!domain) {
                throw new Error('Invalid requester email format');
            }
            const clientPK = `CLIENT#${domain}`;

            // Based on your schema, questions are stored in batch items with:
            // PK = CLIENT#{domain}
            // SK = ASSESSMENT#ASSESS_CSE_001#MCQ_BATCH_1 or CODING_BATCH_1
            // And the questions are in the 'questions' array property

            const queryParams = {
                TableName: this.questionsTableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk': clientPK,
                    ':sk_prefix': `ASSESSMENT#${assessmentId}#`
                }
            };

            console.log('Querying questions with params:', JSON.stringify(queryParams, null, 2));
            const queryResult = await dynamodb.query(queryParams);
            console.log('Questions query result:', JSON.stringify(queryResult, null, 2));

            let allQuestions: any[] = [];

            if (queryResult.Items && queryResult.Items.length > 0) {
                // Extract questions from all batch items (both MCQ and Coding)
                for (const batchItem of queryResult.Items) {
                    if (batchItem.questions && Array.isArray(batchItem.questions)) {
                        // Process each question to ensure test cases are properly formatted
                        const processedQuestions = batchItem.questions.map((question: any) => {
                            // For coding questions, ensure testCases are properly formatted
                            if (question.entityType === 'coding') {
                                // Handle cases where testCases might be missing or empty
                                let formattedTestCases = [];

                                if (question.testCases && Array.isArray(question.testCases) && question.testCases.length > 0) {
                                    // Transform test cases to the expected format for frontend
                                    formattedTestCases = question.testCases.map((tc: any) => {
                                        // Handle different possible formats
                                        const input = tc.inputs?.input ?? tc.input ?? '';
                                        const expectedOutput = tc.expectedOutput ?? '';

                                        return {
                                            input,
                                            expectedOutput
                                        };
                                    });
                                }

                                return {
                                    ...question,
                                    testCases: formattedTestCases
                                };
                            }
                            return question;
                        });

                        allQuestions = allQuestions.concat(processedQuestions);
                    }
                }
            }

            console.log('Total questions found:', allQuestions.length);

            // Sort questions by questionNumber if available
            allQuestions.sort((a, b) => {
                const numA = a.questionNumber || 0;
                const numB = b.questionNumber || 0;
                return numA - numB;
            });

            return allQuestions;
        } catch (error) {
            console.error('Error in getAssessmentQuestions:', error);
            throw error;
            throw new Error('Failed to retrieve assessment questions: ' + error.message);
        }
    }
}

export default new StudentAssessmentService();