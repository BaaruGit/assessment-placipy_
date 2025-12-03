// @ts-nocheck
const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION
});

class AssessmentService {
    private assessmentsTableName: string;
    private questionsTableName: string;

    constructor(tableName: string) {
        // Use separate tables for assessments and questions
        this.assessmentsTableName = process.env.ASSESSMENTS_TABLE_NAME || 'Assesment_placipy_assesments';
        this.questionsTableName = process.env.QUESTIONS_TABLE_NAME || 'Assessment_placipy_assesessment_questions';
    }

    /**
     * Get department code from department name
     */
    private getDepartmentCode(department: string): string {
        if (!department) {
            return 'GEN';
        }

        // Map common department names to codes
        const deptMap: { [key: string]: string } = {
            'Computer Science': 'CSE',
            'Information Technology': 'IT',
            'Electronics': 'ECE',
            'Mechanical': 'ME',
            'Civil': 'CE'
        };

        // Try to find a matching code
        if (deptMap[department]) {
            return deptMap[department];
        } else {
            // Use first 3 characters of department name as fallback
            return department.substring(0, 3).toUpperCase();
        }
    }

    /**
     * Extract domain from email address
     */
    private getDomainFromEmail(email: string): string {
        if (!email || !email.includes('@')) {
            // For dynamic domains, don't use a default domain
            // Return empty string to indicate no domain was provided
            return '';
        }
        return email.split('@')[1];
    }

    /**
     * Generate entities based on question types with proper batching
     */
    private generateEntities(questions: any[]): any[] {
        const entities: any[] = [];
        const mcqSubcategories = new Set<string>();
        let hasCoding = false;
        let mcqCount = 0;
        let codingCount = 0;

        // Analyze questions to determine entity types and subcategories
        questions.forEach((question) => {
            // Check if this is an MCQ question
            if (question.hasOwnProperty('options') && question.options && question.options.length > 0 && question.options.some((opt: any) => opt.text && opt.text.trim() !== "")) {
                // This is an MCQ question
                mcqCount++;
                const subcategory = question.subcategory || 'technical';
                mcqSubcategories.add(subcategory);
            }
            // Check if this is a Coding question
            else if (question.starterCode && question.starterCode.trim() !== "") {
                // This is a Coding question
                hasCoding = true;
                codingCount++;
            }
        });

        // Add MCQ entity with proper batching (50 questions per batch)
        if (mcqCount > 0) {
            const mcqBatches = Math.ceil(mcqCount / 50);
            for (let i = 1; i <= mcqBatches; i++) {
                entities.push({
                    type: "MCQ",
                    subcategories: Array.from(mcqSubcategories),
                    batch: `mcq_batch_${i}`
                });
            }
        }

        // Add Coding entity (no batching limit)
        if (hasCoding) {
            entities.push({
                type: "Coding",
                description: "Programming questions",
                batch: `coding_batch_1`
            });
        }

        return entities;
    }

    /**
     * Get the next sequential assessment number for a department
     */
    private async getNextAssessmentNumber(deptCode: string, domain: string): Promise<string> {
        try {
            // Query DynamoDB for assessments with this department code
            // Swapped PK and SK for efficient client-based querying
            const params = {
                TableName: this.assessmentsTableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk': `CLIENT#${domain}`,
                    ':sk_prefix': `ASSESSMENT#ASSESS_${deptCode}_`
                }
            };
            console.log('Scanning with params:', JSON.stringify(params, null, 2));
            const result = await dynamodb.query(params).promise();
            console.log(`Found ${result.Items?.length || 0} existing assessments for department ${deptCode}`);
            console.log('Found items:', JSON.stringify(result.Items, null, 2));
            const deptAssessments = result.Items || [];

            // Find the highest number and increment
            let maxNumber = 0;
            for (const assessment of deptAssessments) {
                const sk = assessment.SK as string;
                console.log(`Processing SK: ${sk}`);
                // Extract the number part from ASSESSMENT#ASSESS_DEPT_XXX
                const parts = sk.split('_');
                if (parts.length >= 4) {
                    const numberPart = parts[3]; // The XXX part (index 3)
                    const number = parseInt(numberPart, 10);
                    console.log(`Extracted number: ${number}`);
                    if (!isNaN(number) && number > maxNumber) {
                        maxNumber = number;
                    }
                }
            }
            console.log(`Max number found: ${maxNumber}`);

            // Return the next number, padded with leading zeros
            const nextNumber = String(maxNumber + 1).padStart(3, '0');
            console.log(`Next assessment number: ${nextNumber}`);
            return nextNumber;
        } catch (error) {
            console.error('Error getting next assessment number:', error);
            // Fallback to 001 if there's an error
            return '001';
        }
    }

    async createAssessment(assessmentData: any, createdBy: string): Promise<any> {
        try {
            console.log('=== Create Assessment Debug Info ===');
            console.log('createdBy parameter:', createdBy);
            console.log('assessmentData.createdByName:', assessmentData.createdByName);
            console.log('Final createdBy value:', createdBy);
            console.log('Final createdByName value:', assessmentData.createdByName || createdBy);
            console.log('Assessments table name:', this.assessmentsTableName);
            console.log('Questions table name:', this.questionsTableName);
            console.log('Received assessmentData:', JSON.stringify(assessmentData, null, 2));

            // Generate a sequential assessment number (001, 002, etc.) per department
            const deptCode = this.getDepartmentCode(assessmentData.department);
            const domain = this.getDomainFromEmail(createdBy);
            console.log(`Generating assessment ID for department: ${assessmentData.department}, code: ${deptCode}, domain: ${domain}`);
            const assessmentNumber = await this.getNextAssessmentNumber(deptCode, domain);

            const assessmentId = `ASSESS_${deptCode}_${assessmentNumber}`;
            console.log(`Generated assessment ID: ${assessmentId}`);
            const createdAt = new Date().toISOString();


            console.log('Processing questions:', JSON.stringify(assessmentData.questions, null, 2));
            // Create questions array in the new format
            const questions = assessmentData.questions.map((question: any, index: number) => {
                // Create base question structure matching the sample
                const baseQuestion: any = {
                    questionId: `Q_${String(index + 1).padStart(3, '0')}`,
                    questionNumber: index + 1,
                    question: question.text || question.question,
                    points: question.marks || question.points || 1,
                    difficulty: (question.difficulty || assessmentData.difficulty || 'MEDIUM').toUpperCase(),
                    subcategory: question.subcategory || 'technical'
                };

                // Determine question type and structure accordingly
                console.log('Processing question:', JSON.stringify(question, null, 2));
                if (question.hasOwnProperty('options') && question.options && question.options.length > 0 && question.options.some((opt: any) => {
                    // Check if option is a string with content
                    if (typeof opt === 'string') {
                        return opt.trim() !== '';
                    }
                    // Check if option is an object with text content
                    if (opt && opt.text) {
                        return opt.text.trim() !== '';
                    }
                    return false;
                })) {
                    console.log('Identified as MCQ question');
                    // This is an MCQ question - match sample format
                    baseQuestion.entityType = 'mcq';
                    baseQuestion.category = 'MCQ';

                    // Format options to match sample structure
                    baseQuestion.options = question.options.map((option: any, optionIndex: any) => {
                        // If options are strings, convert to the required format
                        if (typeof option === 'string') {
                            return {
                                id: String.fromCharCode(65 + optionIndex), // A, B, C, D
                                text: option
                            };
                        }
                        // If options are already in the correct format, use as is
                        return option;
                    });

                    // Handle correctAnswer - convert to array format if needed
                    if (Array.isArray(question.correctAnswer)) {
                        baseQuestion.correctAnswer = question.correctAnswer;
                    } else if (typeof question.correctAnswer === 'string') {
                        baseQuestion.correctAnswer = [question.correctAnswer];
                    } else if (typeof question.correctAnswer === 'number') {
                        baseQuestion.correctAnswer = [question.correctAnswer];
                    } else {
                        baseQuestion.correctAnswer = [];
                    }

                    // Handle numeric answer type questions
                    if (question.answerType === 'numeric') {
                        baseQuestion.answerType = 'numeric';
                        baseQuestion.correctAnswers = Array.isArray(question.correctAnswers) ? question.correctAnswers : [question.correctAnswers];
                        if (question.range) {
                            baseQuestion.range = question.range;
                        }
                        if (question.unit) {
                            baseQuestion.unit = question.unit;
                        }
                        if (question.explanation) {
                            baseQuestion.explanation = question.explanation;
                        }
                    }
                } else if (question.starterCode && question.starterCode.trim() !== "") {
                    console.log('Identified as Coding question');
                    // This is a Coding question
                    baseQuestion.entityType = 'coding';
                    baseQuestion.category = 'PROGRAMMING';
                    baseQuestion.starterCode = question.starterCode || '';

                    // Handle test cases if present
                    if (question.testCases && question.testCases.length > 0) {
                        baseQuestion.testCases = question.testCases.map((tc: any) => ({
                            inputs: {
                                input: tc.input
                            },
                            expectedOutput: tc.expectedOutput
                        }));
                    }
                } else {
                    console.log('Question type not identified');
                }

                console.log('Processed question:', JSON.stringify(baseQuestion, null, 2));
                return baseQuestion;
            });

            // Create assessment metadata in assessments table with swapped PK/SK structure
            const assessment = {
                PK: `CLIENT#${domain}`, // Swapped: CLIENT is now PK for efficient querying
                SK: `ASSESSMENT#${assessmentId}`, // Swapped: ASSESSMENT is now SK
                assessmentId: assessmentId, // Keep original field for reference
                title: assessmentData.title,
                description: assessmentData.description || '',
                department: assessmentData.department || '',
                // Also store department code for easier querying
                departmentCode: deptCode,
                difficulty: assessmentData.difficulty || 'MEDIUM',
                category: assessmentData.category || ["MCQ"], // Use actual categories from data
                type: "DEPARTMENT_WISE", // Fixed type as per sample
                domain: domain, // Use dynamic domain from email
                entities: this.generateEntities(questions),
                configuration: {
                    duration: assessmentData.duration || 60,
                    maxAttempts: assessmentData.maxAttempts || 1,
                    passingScore: assessmentData.passingScore || 50,
                    randomizeQuestions: assessmentData.randomizeQuestions || false,
                    totalQuestions: assessmentData.totalQuestions || questions.length
                },
                scheduling: {
                    startDate: assessmentData.scheduling?.startDate,
                    endDate: assessmentData.scheduling?.endDate,
                    timezone: assessmentData.scheduling?.timezone || "Asia/Kolkata"
                },
                target: {
                    departments: assessmentData.targetDepartments,
                    years: assessmentData.targetYears || []
                },
                stats: {
                    avgScore: 0,
                    completed: 0,
                    highestScore: 0,
                    totalParticipants: 0
                },
                status: assessmentData.status || "ACTIVE", // Default to ACTIVE instead of draft
                isPublished: assessmentData.isPublished || false,
                createdBy: createdBy, // Email address
                createdByName: assessmentData.createdByName || createdBy, // Actual name or fallback to email
                createdAt: createdAt,
                updatedAt: createdAt
            };

            console.log('Saving assessment with PK:', assessment.PK, 'and SK:', assessment.SK);
            // Check if assessment with this PK/SK already exists
            const existingAssessmentParams = {
                TableName: this.assessmentsTableName,
                Key: {
                    PK: assessment.PK,
                    SK: assessment.SK
                }
            };

            try {
                const existingAssessment = await dynamodb.get(existingAssessmentParams).promise();
                if (existingAssessment.Item) {
                    console.log(`Assessment with PK ${assessment.PK} and SK ${assessment.SK} already exists, regenerating assessment number`);
                    // Assessment already exists, regenerate the assessment number
                    // We need to generate a new number that's guaranteed to be unique
                    let newAssessmentNumber = assessmentNumber;
                    let attempts = 0;
                    do {
                        newAssessmentNumber = String(parseInt(newAssessmentNumber) + 1).padStart(3, '0');
                        const newAssessmentId = `ASSESS_${deptCode}_${newAssessmentNumber}`;
                        assessment.SK = `ASSESSMENT#${newAssessmentId}`;
                        assessment.assessmentId = newAssessmentId;
                        console.log(`Trying new assessment ID: ${newAssessmentId}`);
                        attempts++;

                        // Prevent infinite loop
                        if (attempts > 100) {
                            throw new Error('Unable to generate unique assessment ID after 100 attempts');
                        }

                        // Check if this new ID already exists
                        const checkParams = {
                            TableName: this.assessmentsTableName,
                            Key: {
                                PK: assessment.PK,
                                SK: assessment.SK
                            }
                        };
                        const checkResult = await dynamodb.get(checkParams).promise();
                        if (!checkResult.Item) {
                            break; // Found a unique ID
                        }
                    } while (true);
                    // Update the assessmentId variable to match the new assessment ID
                    console.log(`New assessment ID: ${assessment.assessmentId}`);
                }
            } catch (error) {
                console.log('Error checking for existing assessment:', error);
            }

            // Save assessment metadata to assessments table
            const assessmentParams = {
                TableName: this.assessmentsTableName,
                Item: assessment
            };

            await dynamodb.put(assessmentParams).promise();

            console.log('All questions:', JSON.stringify(questions, null, 2));
            // Create batch items for MCQ batches with swapped PK/SK structure
            const mcqQuestions = questions.filter((q: any) => q.entityType === 'mcq');
            console.log(`Found ${mcqQuestions.length} MCQ questions`);
            if (mcqQuestions.length > 0) {
                // Group MCQ questions into batches of 50
                const mcqBatches = [];
                for (let i = 0; i < mcqQuestions.length; i += 50) {
                    mcqBatches.push(mcqQuestions.slice(i, i + 50));
                }

                console.log(`Creating ${mcqBatches.length} MCQ batches`);
                // Create batch items for each MCQ batch with swapped PK/SK
                for (let i = 0; i < mcqBatches.length; i++) {
                    const batchItem = {
                        PK: `CLIENT#${domain}`, // Swapped: CLIENT is now PK
                        SK: `ASSESSMENT#${assessment.assessmentId}#MCQ_BATCH_${i + 1}`, // Swapped: ASSESSMENT is now SK
                        assessmentId: assessment.assessmentId,
                        department: assessmentData.department,
                        entityType: `mcq_batch_${i + 1}`,
                        questions: mcqBatches[i]
                    };
                    console.log(`Creating MCQ batch ${i + 1}:`, JSON.stringify(batchItem, null, 2));

                    const batchParams = {
                        TableName: this.questionsTableName,
                        Item: batchItem
                    };

                    await dynamodb.put(batchParams).promise();
                    console.log(`Created MCQ batch ${i + 1}`);
                }
            }

            // Create batch items for Coding questions with swapped PK/SK structure
            const codingQuestions = questions.filter((q: any) => q.entityType === 'coding');
            console.log(`Found ${codingQuestions.length} Coding questions`);
            console.log('Coding questions:', JSON.stringify(codingQuestions, null, 2));
            if (codingQuestions.length > 0) {
                // Group Coding questions into batches (no limit)
                const codingBatches = [];
                for (let i = 0; i < codingQuestions.length; i += 50) {
                    codingBatches.push(codingQuestions.slice(i, i + 50));
                }

                console.log(`Creating ${codingBatches.length} Coding batches`);
                // Create batch items for each Coding batch with swapped PK/SK
                for (let i = 0; i < codingBatches.length; i++) {
                    const batchItem = {
                        PK: `CLIENT#${domain}`, // Swapped: CLIENT is now PK
                        SK: `ASSESSMENT#${assessment.assessmentId}#CODING_BATCH_${i + 1}`, // Swapped: ASSESSMENT is now SK
                        assessmentId: assessment.assessmentId,
                        department: assessmentData.department,
                        entityType: `coding_batch_${i + 1}`,
                        questions: codingBatches[i]
                    };
                    console.log(`Creating Coding batch ${i + 1}:`, JSON.stringify(batchItem, null, 2));

                    const batchParams = {
                        TableName: this.questionsTableName,
                        Item: batchItem
                    };

                    await dynamodb.put(batchParams).promise();
                    console.log(`Created Coding batch ${i + 1}`);
                }
            }

            // Return assessment with questions for the response
            return {
                ...assessment,
                questions: questions
            };
        } catch (error) {
            console.error('Error creating assessment:', error);
            throw new Error('Failed to create assessment: ' + error.message);
        }
    }

    async getAssessmentById(assessmentId: string, domain: string): Promise<any> {
        try {
            console.log('=== getAssessmentById called with ID:', assessmentId, 'and domain:', domain, '===');

            // Use efficient query with the new swapped PK/SK structure
            // PK = CLIENT#domain and SK begins_with ASSESSMENT#assessmentId
            const queryParams = {
                TableName: this.assessmentsTableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk': `CLIENT#${domain}`, // PK is now CLIENT#domain
                    ':sk_prefix': `ASSESSMENT#${assessmentId}` // SK begins with ASSESSMENT#assessmentId
                }
            };

            console.log('Querying for assessment with params:', JSON.stringify(queryParams, null, 2));
            const queryResult = await dynamodb.query(queryParams).promise();
            console.log('Query result:', JSON.stringify(queryResult, null, 2));

            if (!queryResult.Items || queryResult.Items.length === 0) {
                console.log('No assessment found with ID:', assessmentId, 'and domain:', domain);
                // Don't scan, just return null when not found in specific domain
                return null;
            }

            // Since we're using begins_with, we might get multiple items
            // Find the exact match for the assessment (not a batch item)
            const assessment = queryResult.Items.find(item =>
                item.SK === `ASSESSMENT#${assessmentId}` &&
                !item.SK.includes('#MCQ_BATCH_') &&
                !item.SK.includes('#CODING_BATCH_')
            );

            if (!assessment) {
                console.log('No exact assessment match found with ID:', assessmentId, 'and domain:', domain);
                // Don't scan, just return null when not found in specific domain
                return null;
            }

            console.log('Found assessment:', JSON.stringify(assessment, null, 2));

            // Get batch items for this assessment using another efficient query
            const batchQueryParams = {
                TableName: this.questionsTableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk': `CLIENT#${domain}`, // PK is CLIENT#domain
                    ':sk_prefix': `ASSESSMENT#${assessmentId}#` // SK begins with ASSESSMENT#assessmentId#
                }
            };

            console.log('Querying for batch items with params:', JSON.stringify(batchQueryParams, null, 2));
            const batchQueryResult = await dynamodb.query(batchQueryParams).promise();
            console.log('Batch items result:', JSON.stringify(batchQueryResult, null, 2));

            const batchItems = batchQueryResult.Items || [];
            console.log('Found batch items:', batchItems.length);

            // Collect all questions from batch items
            let allQuestions: any[] = [];
            for (const batchItem of batchItems) {
                console.log('Processing batch item:', JSON.stringify(batchItem, null, 2));
                // Validate that this batch item belongs to the correct assessment
                if (batchItem.PK === `CLIENT#${domain}` && 
                    batchItem.SK.startsWith(`ASSESSMENT#${assessmentId}#`) &&
                    batchItem.questions && Array.isArray(batchItem.questions)) {
                    console.log('Adding questions from batch item:', batchItem.questions.length);
                    allQuestions = allQuestions.concat(batchItem.questions);
                } else {
                    console.log('Skipping invalid batch item');
                }
            }

            console.log('Total questions collected:', allQuestions.length);

            // Return the assessment with questions
            const result = {
                ...assessment,
                questions: allQuestions.sort((a, b) => {
                    // Handle case where questionNumber might not exist
                    const numA = a.questionNumber || 0;
                    const numB = b.questionNumber || 0;
                    return numA - numB;
                }),
                // Also add separated question arrays for frontend
                mcqQuestions: allQuestions.filter(q => q.entityType === 'mcq'),
                codingQuestions: allQuestions.filter(q => q.entityType === 'coding')
            };

            console.log('Final result:', JSON.stringify(result, null, 2));
            return result;
        } catch (error) {
            console.error('Error getting assessment:', error);
            throw new Error('Failed to retrieve assessment: ' + error.message);
        }
    }

    async getAllAssessments(filters: any = {}, limit: number = 50, lastKey: any = null): Promise<any> {
        try {
            console.log('=== getAllAssessments called ===');
            console.log('Filters:', filters);
            console.log('Limit:', limit);
            console.log('LastKey:', lastKey);

            if (filters.clientDomain) {
                // Query for a specific client domain
                const queryParams: any = {
                    TableName: this.assessmentsTableName,
                    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                    ExpressionAttributeValues: {
                        ':pk': `CLIENT#${filters.clientDomain}`,
                        ':sk_prefix': 'ASSESSMENT#'
                    },
                    Limit: limit
                };

                const filterExpressions: string[] = [];
                const expressionAttributeValues: any = {};
                const expressionAttributeNames: any = {};

                if (filters.department) {
                    filterExpressions.push('(department = :department OR department = :allUpper OR department = :allLower OR department = :allDepts OR department = :allDeptsUpper)');
                    expressionAttributeValues[':department'] = filters.department;
                    expressionAttributeValues[':allUpper'] = 'ALL';
                    expressionAttributeValues[':allLower'] = 'All';
                    expressionAttributeValues[':allDepts'] = 'All Departments';
                    expressionAttributeValues[':allDeptsUpper'] = 'ALL DEPARTMENTS';
                }

                if (filters.status) {
                    filterExpressions.push('#status = :status');
                    expressionAttributeValues[':status'] = filters.status;
                    expressionAttributeNames['#status'] = 'status';
                }

                if (filterExpressions.length > 0) {
                    queryParams.FilterExpression = filterExpressions.join(' AND ');
                    queryParams.ExpressionAttributeValues = {
                        ...queryParams.ExpressionAttributeValues,
                        ...expressionAttributeValues
                    };
                    if (Object.keys(expressionAttributeNames).length > 0) {
                        queryParams.ExpressionAttributeNames = expressionAttributeNames;
                    }
                }

                if (lastKey) {
                    queryParams.ExclusiveStartKey = lastKey;
                }

                const queryResult = await dynamodb.query(queryParams).promise();
                let items = queryResult.Items || [];

                // Keep only assessment items (exclude batch items)
                items = items.filter(item => {
                    return item.PK && item.PK.startsWith('CLIENT#') && item.SK && item.SK.startsWith('ASSESSMENT#') &&
                        !item.SK.includes('#MCQ_BATCH_') && !item.SK.includes('#CODING_BATCH_');
                });

                // Strict in-memory department filter (case/whitespace normalized)
                if (filters.department) {
                    const deptNorm = String(filters.department).trim().toLowerCase();
                    items = items.filter((item: any) => {
                        const v = (item.department ?? '').toString().trim().toLowerCase();
                        return v === deptNorm || v === 'all' || v === 'all departments';
                    });
                }

                return {
                    items,
                    lastKey: queryResult.LastEvaluatedKey,
                    hasMore: !!queryResult.LastEvaluatedKey
                };
            } else {
                // Scan across all client domains (less efficient)
                const scanParams: any = {
                    TableName: this.assessmentsTableName,
                    Limit: limit
                };

                const filterExpressions: string[] = [];
                const expressionAttributeValues: any = {};
                const expressionAttributeNames: any = {};

                // Only assessment items (exclude batches) using PK/SK prefixes
                filterExpressions.push('begins_with(PK, :pk_prefix) AND begins_with(SK, :sk_prefix)');
                expressionAttributeValues[':pk_prefix'] = 'CLIENT#';
                expressionAttributeValues[':sk_prefix'] = 'ASSESSMENT#';

                if (filters.department) {
                    filterExpressions.push('(department = :department OR department = :allUpper OR department = :allLower OR department = :allDepts OR department = :allDeptsUpper)');
                    expressionAttributeValues[':department'] = filters.department;
                    expressionAttributeValues[':allUpper'] = 'ALL';
                    expressionAttributeValues[':allLower'] = 'All';
                    expressionAttributeValues[':allDepts'] = 'All Departments';
                    expressionAttributeValues[':allDeptsUpper'] = 'ALL DEPARTMENTS';
                }

                if (filters.status) {
                    filterExpressions.push('#status = :status');
                    expressionAttributeValues[':status'] = filters.status;
                    expressionAttributeNames['#status'] = 'status';
                }

                if (filterExpressions.length > 0) {
                    scanParams.FilterExpression = filterExpressions.join(' AND ');
                    scanParams.ExpressionAttributeValues = expressionAttributeValues;
                    if (Object.keys(expressionAttributeNames).length > 0) {
                        scanParams.ExpressionAttributeNames = expressionAttributeNames;
                    }
                }

                if (lastKey) {
                    scanParams.ExclusiveStartKey = lastKey;
                }

                const scanResult = await dynamodb.scan(scanParams).promise();
                let items = scanResult.Items || [];

                // Keep only assessment items (exclude batch items)
                items = items.filter(item => {
                    return item.PK && item.PK.startsWith('CLIENT#') && item.SK && item.SK.startsWith('ASSESSMENT#') &&
                        !item.SK.includes('#MCQ_BATCH_') && !item.SK.includes('#CODING_BATCH_');
                });

                // Strict in-memory department filter (case/whitespace normalized)
                if (filters.department) {
                    const deptNorm = String(filters.department).trim().toLowerCase();
                    items = items.filter((item: any) => {
                        const v = (item.department ?? '').toString().trim().toLowerCase();
                        return v === deptNorm || v === 'all' || v === 'all departments';
                    });
                }

                return {
                    items,
                    lastKey: scanResult.LastEvaluatedKey,
                    hasMore: !!scanResult.LastEvaluatedKey
                };
            }
        } catch (error) {
            console.error('Error getting all assessments:', error);
            throw new Error('Failed to retrieve assessments: ' + error.message);
        }
    }

    /**
     * Get assessment questions by assessment ID and domain
     * Automatically fetches all question batches and combines them into a single array
     * Ensures that questions are only returned if they belong to a valid assessment
     */
    async getAssessmentQuestions(assessmentId: string, domain: string): Promise<any[]> {
        try {
            console.log(`Fetching questions for assessment ${assessmentId} in domain ${domain}`);

            // Validate inputs
            if (!assessmentId) {
                throw new Error('Assessment ID is required');
            }

            if (!domain) {
                throw new Error('Domain is required');
            }

            // First verify that the assessment exists with swapped PK/SK structure
            const mainAssessmentParams = {
                TableName: this.assessmentsTableName,
                KeyConditionExpression: 'PK = :pk AND SK = :sk',
                ExpressionAttributeValues: {
                    ':pk': `CLIENT#${domain}`, // Swapped: CLIENT is now PK
                    ':sk': `ASSESSMENT#${assessmentId}` // Swapped: ASSESSMENT is now SK
                }
            };

            console.log('Verifying assessment exists with params:', JSON.stringify(mainAssessmentParams, null, 2));
            const mainAssessmentResult = await dynamodb.query(mainAssessmentParams).promise();
            console.log('Assessment verification result:', JSON.stringify(mainAssessmentResult, null, 2));

            if (!mainAssessmentResult.Items || mainAssessmentResult.Items.length === 0) {
                // Don't scan, just throw an error when not found in specific domain
                throw new Error(`Assessment ${assessmentId} not found for domain ${domain}`);
            }

            // Now query for all question batch items with swapped PK/SK structure
            // Using the pattern: PK = "CLIENT#<domain>" and SK begins_with "ASSESSMENT#<assessmentId>#"
            const questionParams = {
                TableName: this.questionsTableName,  // Use questions table instead of assessments table
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk': `CLIENT#${domain}`, // Swapped: CLIENT is now PK
                    ':sk_prefix': `ASSESSMENT#${assessmentId}#` // Swapped: ASSESSMENT is now in SK
                }
            };

            console.log('Querying questions with params:', JSON.stringify(questionParams, null, 2));
            const questionResult = await dynamodb.query(questionParams).promise();
            console.log('Found', questionResult.Count, 'question items');

            // If no questions found with the swapped structure, try the original structure
            if (!questionResult.Items || questionResult.Items.length === 0) {
                console.log('No questions found with swapped structure, trying original structure...');
                
                // Try with the original structure where PK = ASSESSMENT#<assessmentId> and SK = QUESTION#<questionId>
                const originalQuestionParams = {
                    TableName: this.questionsTableName,
                    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                    ExpressionAttributeValues: {
                        ':pk': `ASSESSMENT#${assessmentId}`,
                        ':sk_prefix': 'QUESTION#'
                    }
                };
                
                console.log('Querying questions with original params:', JSON.stringify(originalQuestionParams, null, 2));
                const originalQuestionResult = await dynamodb.query(originalQuestionParams).promise();
                console.log('Found with original structure:', originalQuestionResult.Count, 'question items');
                
                if (originalQuestionResult.Items && originalQuestionResult.Items.length > 0) {
                    // Validate that these questions actually belong to the assessment by checking the assessment ID
                    const validQuestions = originalQuestionResult.Items.filter(question => 
                        question.PK === `ASSESSMENT#${assessmentId}`
                    );
                    
                    if (validQuestions.length === 0) {
                        throw new Error(`No valid questions found for assessment ${assessmentId}`);
                    }
                    
                    // Return questions from original structure
                    return validQuestions.sort((a, b) => {
                        const numA = a.questionNumber || 0;
                        const numB = b.questionNumber || 0;
                        return numA - numB;
                    });
                }
            }

            // Process and combine all questions from batch items
            let allQuestions: any[] = [];
            if (questionResult.Items && questionResult.Items.length > 0) {
                for (const batchItem of questionResult.Items) {
                    // Validate that this batch item belongs to the correct assessment
                    if (batchItem.PK === `CLIENT#${domain}` && 
                        batchItem.SK.startsWith(`ASSESSMENT#${assessmentId}#`) &&
                        batchItem.questions && Array.isArray(batchItem.questions)) {
                        allQuestions = allQuestions.concat(batchItem.questions);
                    }
                }
                
                // Sort questions by questionNumber if available
                allQuestions.sort((a, b) => {
                    const numA = a.questionNumber || 0;
                    const numB = b.questionNumber || 0;
                    return numA - numB;
                });
            }

            console.log('Returning combined questions:', JSON.stringify(allQuestions, null, 2));

            // If we have no questions but the assessment exists, return empty array
            if (allQuestions.length === 0) {
                console.log(`Assessment ${assessmentId} exists but has no questions`);
                return [];
            }

            return allQuestions;
        } catch (error) {
            console.error('Error in getAssessmentQuestions:', error);
            throw new Error('Failed to retrieve assessment questions: ' + error.message);
        }
    }

    /**
     * Get assessment with questions combined
     * This method fetches the assessment metadata and automatically includes all questions
     */
    async getAssessmentWithQuestions(assessmentId: string, domain: string): Promise<any> {
        try {
            console.log(`Fetching assessment ${assessmentId} with questions for domain ${domain}`);

            // First get the assessment metadata
            const assessment = await this.getAssessmentById(assessmentId, domain);
            
            if (!assessment) {
                console.log(`Assessment ${assessmentId} not found for domain ${domain}`);
                // Don't scan, just throw an error when not found in specific domain
                throw new Error(`Assessment ${assessmentId} not found for domain ${domain}`);
            }

            // Get all questions for this assessment
            const questions = await this.getAssessmentQuestions(assessmentId, domain);

            // Return assessment with questions combined
            return {
                ...assessment,
                questions: questions,
                mcqQuestions: questions.filter((q: any) => q.entityType === 'mcq'),
                codingQuestions: questions.filter((q: any) => q.entityType === 'coding')
            };
        } catch (error) {
            console.error('Error in getAssessmentWithQuestions:', error);
            throw new Error('Failed to retrieve assessment with questions: ' + error.message);
        }
    }

    async updateAssessment(assessmentId: string, updates: any, updatedBy?: string): Promise<any> {
        try {
            const timestamp = new Date().toISOString();

            // First, get the current item to understand its structure
            // Use query with the specific domain
            const getCurrentItemParams = {
                TableName: this.assessmentsTableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk': `CLIENT#${updates.domain || 'unknown'}`, // Use provided domain or unknown
                    ':sk_prefix': `ASSESSMENT#${assessmentId}`
                }
            };

            // Execute the query with the specific domain
            const currentItemResult = await dynamodb.query(getCurrentItemParams).promise();
            const currentItem = currentItemResult.Items && currentItemResult.Items[0];

            // If not found with specific domain, throw an error instead of scanning
            if (!currentItem) {
                throw new Error(`Assessment ${assessmentId} not found for domain ${updates.domain || 'unknown'}`);
            }

            // Build update expression
            let updateExpression = 'SET updatedAt = :updatedAt';
            const expressionAttributeValues: any = {
                ':updatedAt': timestamp
            };
            const expressionAttributeNames: any = {};

            // Add updates for each field
            Object.keys(updates).forEach(key => {
                // Skip questions as they're handled separately
                if (key === 'questions') return;

                // Skip read-only fields
                if (key === 'createdAt' || key === 'assessmentId' || key === 'PK' || key === 'SK') return;

                updateExpression += `, #${key} = :${key}`;
                expressionAttributeNames[`#${key}`] = key;
                expressionAttributeValues[`:${key}`] = updates[key];
            });

            // Add updatedBy if provided
            if (updatedBy) {
                updateExpression += ', updatedBy = :updatedBy';
                expressionAttributeValues[':updatedBy'] = updatedBy;
            }

            const updateParams = {
                TableName: this.assessmentsTableName,
                Key: {
                    PK: currentItem.PK,
                    SK: currentItem.SK
                },
                UpdateExpression: updateExpression,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW'
            };

            if (Object.keys(expressionAttributeNames).length > 0) {
                updateParams.ExpressionAttributeNames = expressionAttributeNames;
            }

            const updatedAssessment = await dynamodb.update(updateParams).promise();

            // Handle questions update if provided
            if (updates.questions && Array.isArray(updates.questions)) {
                // First, delete all existing batch items for this assessment
                // Use query for better performance when we know the domain
                const batchParams = {
                    TableName: this.questionsTableName,
                    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                    ExpressionAttributeValues: {
                        ':pk': currentItem.PK, // We know the PK from currentItem
                        ':sk_prefix': `ASSESSMENT#${assessmentId}#`
                    }
                };

                const batchResult = await dynamodb.query(batchParams).promise();
                const batchItems = batchResult.Items || [];

                // Delete existing batch items
                for (const batchItem of batchItems) {
                    const deleteParams = {
                        TableName: this.questionsTableName,
                        Key: {
                            PK: batchItem.PK,
                            SK: batchItem.SK
                        }
                    };
                    await dynamodb.delete(deleteParams).promise();
                }

                // Create new batch items with swapped PK/SK structure
                // Create batch items for MCQ batches
                const mcqQuestions = updates.questions.filter((q: any) => q.entityType === 'mcq');
                if (mcqQuestions.length > 0) {
                    // Group MCQ questions into batches of 50
                    const mcqBatches = [];
                    for (let i = 0; i < mcqQuestions.length; i += 50) {
                        mcqBatches.push(mcqQuestions.slice(i, i + 50));
                    }

                    // Create batch items for each MCQ batch with swapped PK/SK
                    for (let i = 0; i < mcqBatches.length; i++) {
                        const batchItem = {
                            PK: currentItem.PK, // Swapped: CLIENT is now PK
                            SK: `ASSESSMENT#${assessmentId}#MCQ_BATCH_${i + 1}`, // Swapped: ASSESSMENT is now SK
                            assessmentId: assessmentId,
                            department: currentItem.department,
                            entityType: `mcq_batch_${i + 1}`,
                            questions: mcqBatches[i]
                        };

                        const batchParams = {
                            TableName: this.questionsTableName,
                            Item: batchItem
                        };

                        await dynamodb.put(batchParams).promise();
                    }
                }

                // Create batch items for Coding questions with swapped PK/SK structure
                const codingQuestions = updates.questions.filter((q: any) => q.entityType === 'coding');
                if (codingQuestions.length > 0) {
                    // Group Coding questions into batches (no limit)
                    const codingBatches = [];
                    for (let i = 0; i < codingQuestions.length; i += 50) {
                        codingBatches.push(codingQuestions.slice(i, i + 50));
                    }

                    // Create batch items for each Coding batch with swapped PK/SK
                    for (let i = 0; i < codingBatches.length; i++) {
                        const batchItem = {
                            PK: currentItem.PK, // Swapped: CLIENT is now PK
                            SK: `ASSESSMENT#${assessmentId}#CODING_BATCH_${i + 1}`, // Swapped: ASSESSMENT is now SK
                            assessmentId: assessmentId,
                            department: currentItem.department,
                            entityType: `coding_batch_${i + 1}`,
                            questions: codingBatches[i]
                        };

                        const batchParams = {
                            TableName: this.questionsTableName,
                            Item: batchItem
                        };

                        await dynamodb.put(batchParams).promise();
                    }
                }
            }

            // Get updated questions from batch items
            // Use query for better performance
            const batchQueryParams = {
                TableName: this.questionsTableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk': currentItem.PK, // We know the PK from currentItem
                    ':sk_prefix': `ASSESSMENT#${assessmentId}#`
                }
            };

            const batchQueryResult = await dynamodb.query(batchQueryParams).promise();
            const batchItems = batchQueryResult.Items || [];

            // Collect all questions from batch items
            let updatedQuestions: any[] = [];
            for (const batchItem of batchItems) {
                if (batchItem.questions && Array.isArray(batchItem.questions)) {
                    updatedQuestions = updatedQuestions.concat(batchItem.questions);
                }
            }

            // Regenerate entities based on updated questions
            const entities = this.generateEntities(updatedQuestions);

            // Update the entities in the main assessment item
            const entitiesUpdateParams = {
                TableName: this.assessmentsTableName,
                Key: {
                    PK: currentItem.PK,
                    SK: currentItem.SK
                },
                UpdateExpression: 'SET entities = :entities',
                ExpressionAttributeValues: {
                    ':entities': entities
                },
                ReturnValues: 'ALL_NEW'
            };

            await dynamodb.update(entitiesUpdateParams).promise();

            return {
                ...updatedAssessment.Attributes,
                entities: entities,
                questions: updatedQuestions.sort((a, b) => a.questionNumber - b.questionNumber)
            };
        } catch (error) {
            console.error('Error updating assessment:', error);
            throw new Error('Failed to update assessment: ' + error.message);
        }
    }

    async deleteAssessment(assessmentId: string, domain: string): Promise<void> {
        try {
            // First, find the assessment by querying with the specific domain
            const getAssessmentParams = {
                TableName: this.assessmentsTableName,
                KeyConditionExpression: 'PK = :pk AND SK = :sk',
                ExpressionAttributeValues: {
                    ':pk': `CLIENT#${domain}`,
                    ':sk': `ASSESSMENT#${assessmentId}`
                }
            };

            const assessmentResult = await dynamodb.query(getAssessmentParams).promise();
            const assessment = assessmentResult.Items && assessmentResult.Items[0];

            if (!assessment) {
                throw new Error(`Assessment ${assessmentId} not found for domain ${domain}`);
            }

            // Delete main assessment from assessments table
            const assessmentParams = {
                TableName: this.assessmentsTableName,
                Key: {
                    PK: assessment.PK,
                    SK: assessment.SK
                }
            };

            await dynamodb.delete(assessmentParams).promise();

            // Delete all batch items for this assessment
            // Use query for better performance when we know the PK
            const batchQueryParams = {
                TableName: this.questionsTableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk': assessment.PK, // We know the PK from assessment
                    ':sk_prefix': `ASSESSMENT#${assessmentId}#`
                }
            };

            const batchQueryResult = await dynamodb.query(batchQueryParams).promise();
            const batchItems = batchQueryResult.Items || [];

            // Delete each batch item
            for (const batchItem of batchItems) {
                const deleteParams = {
                    TableName: this.questionsTableName,
                    Key: {
                        PK: batchItem.PK,
                        SK: batchItem.SK
                    }
                };
                await dynamodb.delete(deleteParams).promise();
            }
        } catch (error) {
            console.error('Error deleting assessment:', error);
            throw new Error('Failed to delete assessment: ' + error.message);
        }
    }
}

module.exports = new AssessmentService();