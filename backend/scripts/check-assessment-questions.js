// @ts-nocheck
require('dotenv').config();
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    region: process.env.AWS_REGION || 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB.DocumentClient();

const QUESTIONS_TABLE_NAME = process.env.QUESTIONS_TABLE_NAME || 'Assessment_placipy_assesessment_questions';

async function checkAssessmentQuestions(assessmentId, domain) {
    try {
        console.log(`Checking questions for assessment: ${assessmentId} in domain: ${domain}`);
        
        const questionParams = {
            TableName: QUESTIONS_TABLE_NAME,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
            ExpressionAttributeValues: {
                ':pk': `CLIENT#${domain}`,
                ':sk_prefix': `ASSESSMENT#${assessmentId}#`
            }
        };

        console.log('Querying for questions...');
        const questionResult = await dynamodb.query(questionParams).promise();
        
        console.log(`Found ${questionResult.Count} question items`);
        
        if (questionResult.Items && questionResult.Items.length > 0) {
            console.log('\nQuestion items found:');
            questionResult.Items.forEach((batchItem, index) => {
                console.log(`${index + 1}. PK: ${batchItem.PK}, SK: ${batchItem.SK}`);
                if (batchItem.questions && Array.isArray(batchItem.questions)) {
                    console.log(`   Number of questions in batch: ${batchItem.questions.length}`);
                    batchItem.questions.forEach((question, qIndex) => {
                        console.log(`     Q${qIndex + 1}: ${question.question || question.questionText || 'No question text'}`);
                        console.log(`       Type: ${question.entityType || question.type || 'Unknown'}`);
                    });
                }
                console.log('---');
            });
        } else {
            console.log('No questions found for this assessment in the specified domain.');
            console.log('Checking for questions with different domain patterns...');
            
            // Try with different domain patterns (for debugging)
            const scanParams = {
                TableName: QUESTIONS_TABLE_NAME,
                FilterExpression: 'contains(SK, :assessmentId)',
                ExpressionAttributeValues: {
                    ':assessmentId': assessmentId
                }
            };
            
            const scanResult = await dynamodb.scan(scanParams).promise();
            console.log(`Found ${scanResult.Count} items containing the assessment ID`);
            
            if (scanResult.Items && scanResult.Items.length > 0) {
                console.log('Found items with assessment ID in different domains:');
                scanResult.Items.forEach((item, index) => {
                    console.log(`${index + 1}. PK: ${item.PK}, SK: ${item.SK}`);
                });
            }
        }
        
    } catch (error) {
        console.error('Error checking assessment questions:', error);
    }
}

// Check the specific assessment from the error logs
checkAssessmentQuestions('ASSESS_IT_005', 'ksrce.ac.in');