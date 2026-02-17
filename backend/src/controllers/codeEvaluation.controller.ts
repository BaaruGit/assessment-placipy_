// @ts-nocheck
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";
import Judge0Service from '../services/Judge0Service';

const dbClient = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: fromEnv()
});

const dynamodb = DynamoDBDocument.from(dbClient, {
    marshallOptions: {
        removeUndefinedValues: true
    }
});

export class CodeEvaluationController {
    private questionsTableName: string;

    constructor() {
        this.questionsTableName = process.env.QUESTIONS_TABLE_NAME || 'Assessment_placipy_assesessment_questions';
    }

    /**
     * Get domain from email address
     */
    private getDomainFromEmail(email: string): string {
        if (!email) return 'ksrce.ac.in';
        const parts = email.split('@');
        return parts.length > 1 ? parts[1] : 'ksrce.ac.in';
    }

    /**
     * Evaluate coding question
     */
    async evaluateCodingQuestion(req: any, res: any) {
        try {
            console.log('=== Evaluate Coding Question Request ===');
            console.log('Body:', req.body);
            console.log('User:', req.user);

            const { assessmentId, questionId, code, language } = req.body;
            const userEmail = req.user.email;

            // Validate required fields
            if (!assessmentId || !questionId || !code || !language) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: assessmentId, questionId, code, and language are required'
                });
            }

            console.log(`Evaluating coding question ${questionId} for assessment ${assessmentId}`);

            // Query questions table with swapped PK/SK structure
            const questionParams = {
                TableName: this.questionsTableName,
                FilterExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk': `CLIENT#${this.getDomainFromEmail(userEmail)}`,
                    ':sk_prefix': `ASSESSMENT#${assessmentId}#`
                }
            };

            const questionResult = await dynamodb.scan(questionParams);
            const questions = questionResult.Items || [];

            // Find the specific question
            const question = questions.find(q => q.questionId === questionId);

            if (!question) {
                return res.status(404).json({
                    success: false,
                    message: 'Question not found'
                });
            }

            // Handle coding questions with or without test cases
            if (question.entityType === 'coding') {
                const testCases = question.testCases || [];

                console.log('Found test cases:', testCases.length);

                // If there are test cases, execute with test cases
                if (testCases.length > 0) {
                    console.log('Executing code with test cases');
                    const evaluationResult = await Judge0Service.executeCodeWithTestCases(code, language, testCases);

                    // Prepare response with detailed results
                    const response = {
                        success: true,
                        data: {
                            assessmentId,
                            questionId,
                            ...evaluationResult
                        }
                    };

                    return res.status(200).json(response);
                } else {
                    // If no test cases, just execute the code
                    console.log('No test cases found, executing code without test cases');
                    const executionResult = await Judge0Service.executeCode(code, language);

                    // Prepare response
                    const response = {
                        success: true,
                        data: {
                            assessmentId,
                            questionId,
                            ...executionResult
                        }
                    };

                    return res.status(200).json(response);
                }
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Question is not a coding question'
                });
            }
        } catch (error: any) {
            console.error('Error evaluating coding question:', error);

            res.status(500).json({
                success: false,
                message: error.message || 'Failed to evaluate coding question'
            });
        }
    }


    evaluateCode = async (req: any, res: any) => {
        return this.evaluateCodingQuestion(req, res);
    }
}

export default new CodeEvaluationController();
