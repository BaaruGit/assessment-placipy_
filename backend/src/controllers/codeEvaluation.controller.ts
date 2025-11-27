import { Request, Response } from 'express';
import Judge0Service from '../services/Judge0Service';
import AWS from 'aws-sdk';

// Extend Request interface to include user property
interface AuthenticatedRequest extends Request {
    user?: any;
}

const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION
});

class CodeEvaluationController {
    private assessmentsTableName: string;
    private questionsTableName: string;

    constructor() {
        this.assessmentsTableName = process.env.ASSESSMENTS_TABLE_NAME || 'Assesment_placipy_assesments';
        this.questionsTableName = process.env.QUESTIONS_TABLE_NAME || 'Assessment_placipy_assesessment_questions';
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
     * Evaluate student code against test cases using Judge0
     */
    async evaluateCode(req: AuthenticatedRequest, res: Response) {
        try {
            const { assessmentId, questionId, code, language } = req.body;
            const studentId = req.user?.username || req.user?.sub || req.user?.email || 'unknown_student';
            // Extract email from user object
            const userEmail = req.user?.email || req.user?.username || req.user?.sub || '';
            
            console.log('=== Code Evaluation Request ===');
            console.log('Assessment ID:', assessmentId);
            console.log('Question ID:', questionId);
            console.log('Student ID:', studentId);
            console.log('User Email:', userEmail);
            console.log('Language:', language);
            console.log('Code length:', code?.length);

            // Validate required fields
            if (!assessmentId || !questionId || !code || !language) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: assessmentId, questionId, code, language'
                });
            }

            // Get question with test cases from database
            // We need to scan for the question since we don't know the exact PK structure
            const questionParams = {
                TableName: this.questionsTableName,
                FilterExpression: 'begins_with(PK, :pk_prefix) AND SK = :sk',
                ExpressionAttributeValues: {
                    ':pk_prefix': `ASSESSMENT#${assessmentId}`,
                    ':sk': `CLIENT#${this.getDomainFromEmail(userEmail)}`
                }
            };

            const questionResult = await dynamodb.scan(questionParams).promise();
            const questions = questionResult.Items || [];
            
            // Find the specific question
            const question = questions.find(q => q.questionId === questionId);
            
            if (!question) {
                return res.status(404).json({
                    success: false,
                    message: 'Question not found'
                });
            }

            // Check if question has test cases
            const testCases = question.testCases || [];
            if (testCases.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No test cases found for this question'
                });
            }

            console.log('Found test cases:', testCases.length);

            // Execute code with test cases using Judge0
            const evaluationResult = await Judge0Service.executeCodeWithTestCases(code, language, testCases);

            // Prepare response with detailed results
            const response = {
                success: true,
                data: {
                    assessmentId,
                    questionId,
                    studentId,
                    language,
                    ...evaluationResult,
                    timestamp: new Date().toISOString()
                }
            };

            console.log('Code evaluation completed:', response);
            return res.status(200).json(response);
        } catch (error: any) {
            console.error('Error evaluating code:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to evaluate code'
            });
        }
    }
}

export default new CodeEvaluationController();