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

const ASSESSMENTS_TABLE_NAME = process.env.ASSESSMENTS_TABLE_NAME || 'Assesment_placipy_assesments';

async function checkAssessments() {
    try {
        console.log('Checking assessments in table:', ASSESSMENTS_TABLE_NAME);
        
        // Query for all assessment items (not batch items)
        const params = {
            TableName: ASSESSMENTS_TABLE_NAME,
            FilterExpression: 'begins_with(SK, :sk_prefix) AND attribute_not_exists(SK, :batch_suffix)',
            ExpressionAttributeValues: {
                ':sk_prefix': 'ASSESSMENT#',
                ':batch_suffix': '#MCQ_BATCH_'
            }
        };

        // Since the filter expression above might not work as expected for the batch suffix,
        // let's just query for items with SK starting with ASSESSMENT# and then filter
        const queryParam = {
            TableName: ASSESSMENTS_TABLE_NAME,
            FilterExpression: 'begins_with(SK, :sk_prefix)',
            ExpressionAttributeValues: {
                ':sk_prefix': 'ASSESSMENT#'
            }
        };

        console.log('Querying for assessments...');
        const result = await dynamodb.scan(queryParam).promise();
        
        console.log(`Found ${result.Items ? result.Items.length : 0} items in the table`);
        
        if (result.Items) {
            console.log('\nAll items in the assessments table:');
            result.Items.forEach((item, index) => {
                console.log(`${index + 1}. PK: ${item.PK}, SK: ${item.SK}`);
                if (item.assessmentId) {
                    console.log(`   Assessment ID: ${item.assessmentId}`);
                }
                if (item.title) {
                    console.log(`   Title: ${item.title}`);
                }
                if (item.department) {
                    console.log(`   Department: ${item.department}`);
                }
                console.log('---');
            });
            
            // Filter for actual assessment items (not batch items)
            const assessmentItems = result.Items.filter(item => 
                item.SK.startsWith('ASSESSMENT#') && 
                !item.SK.includes('#MCQ_BATCH_') && 
                !item.SK.includes('#CODING_BATCH_')
            );
            
            console.log(`\nFound ${assessmentItems.length} actual assessment items:`);
            assessmentItems.forEach((item, index) => {
                console.log(`${index + 1}. Assessment ID: ${item.assessmentId || 'N/A'}, Title: ${item.title || 'N/A'}, Department: ${item.department || 'N/A'}`);
            });
            
            // Check specifically for ASSESS_IT_005
            const targetAssessment = assessmentItems.find(item => 
                item.assessmentId === 'ASSESS_IT_005' || 
                item.SK === 'ASSESSMENT#ASSESS_IT_005'
            );
            
            if (targetAssessment) {
                console.log('\n✓ Found assessment ASSESS_IT_005 in the database');
                console.log('Assessment details:', JSON.stringify(targetAssessment, null, 2));
            } else {
                console.log('\n✗ Assessment ASSESS_IT_005 not found in the database');
            }
        }
        
    } catch (error) {
        console.error('Error checking assessments:', error);
    }
}

// Run the check
checkAssessments();