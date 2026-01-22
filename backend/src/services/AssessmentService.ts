// @ts-nocheck
const DynamoDB = require('aws-sdk/clients/dynamodb');

const dynamodb = new DynamoDB.DocumentClient({
    region: process.env.AWS_REGION
});

interface AssessmentItem {
    PK: string;
    SK: string;
    assessmentId: string;
    title: string;
    description?: string;
    department?: string;
    departmentCode?: string;
    difficulty?: string;
    category?: string[];
    type: string;
    domain: string;
    entities: Array<{ type: string; subcategories?: string[]; description?: string; batch: string; }>;
    configuration: {
        duration: number;
        maxAttempts: number;
        passingScore: number;
        randomizeQuestions: boolean;
        totalQuestions: number;
    };
    scheduling: {
        startDate?: string;
        endDate?: string;
        timezone: string;
    };
    target: {
        departments?: string[];
        years?: string[];
    };
    stats: {
        avgScore: number;
        completed: number;
        highestScore: number;
        totalParticipants: number;
    };
    status: string;
    isPublished: boolean;
    createdBy: string;
    createdByName?: string;
    createdAt: string;
    updatedAt: string;
}

interface QuestionOption {
    id: string;
    text: string;
}

interface TestCase {
    inputs: { input: any }; // Further refine if input structure is known, currently 'any'
    expectedOutput: any; // Currently 'any'
}

interface QuestionItem {
    questionId: string;
    questionNumber: number;
    question: string;
    points: number;
    difficulty: string;
    subcategory: string;
    entityType?: string;
    category?: string;
    options?: QuestionOption[];
    correctAnswer?: (string | number)[];
    answerType?: string;
    correctAnswers?: (string | number)[];
    range?: any;
    unit?: string;
    explanation?: string;
    starterCode?: string;
    testCases?: TestCase[];
    PK?: string; // PK can exist if it was part of the original structure
}

interface QuestionBatchItem {
    PK: string;
    SK: string;
    assessmentId: string;
    department?: string;
    entityType: string;
    questions: QuestionItem[];
}

interface AssessmentWithQuestions extends AssessmentItem {
    questions: QuestionItem[];
    mcqQuestions: QuestionItem[];
    codingQuestions: QuestionItem[];
}

// Interface for incoming assessment data, less strict than AssessmentItem
interface CreateAssessmentData {
    title: string;
    description?: string;
    department: string;
    difficulty?: string;
    category?: string[];
    questions: any[]; // Raw questions from input
    duration?: number;
    maxAttempts?: number;
    passingScore?: number;
    randomizeQuestions?: boolean;
    totalQuestions?: number;
    scheduling?: {
        startDate?: string;
        endDate?: string;
        timezone?: string;
    };
    targetDepartments?: string[];
    targetYears?: string[];
    status?: string;
    isPublished?: boolean;
    createdByName?: string;
}

class AssessmentService {
    private assessmentsTableName: string;
    private questionsTableName: string;

    constructor() {
        this.assessmentsTableName = process.env.ASSESSMENTS_TABLE_NAME || 'Assesment_placipy_assesments';
        this.questionsTableName = process.env.QUESTIONS_TABLE_NAME || 'Assessment_placipy_assesessment_questions';
    }

    private getDepartmentCode(department: string): string {
        if (!department) {
            return 'GEN';
        }

        const deptMap: { [key: string]: string } = {
            'Computer Science': 'CSE',
            'Information Technology': 'IT',
            'Electronics': 'ECE',
            'Mechanical': 'ME',
            'Civil': 'CE'
        };

        if (deptMap[department]) {
            return deptMap[department];
        } else {
            return department.substring(0, 3).toUpperCase();
        }
    }

    private getDomainFromEmail(email: string): string {
        if (!email || !email.includes('@')) {
            return '';
        }
        return email.split('@')[1];
    }

    private generateEntities(questions: QuestionItem[]): Array<{ type: string; subcategories?: string[]; description?: string; batch: string; }> {
        const entities: Array<{ type: string; subcategories?: string[]; description?: string; batch: string; }> = [];
        const mcqSubcategories = new Set<string>();
        let hasCoding = false;

        questions.forEach((question) => {
            if (Object.prototype.hasOwnProperty.call(question, 'options') && question.options && question.options.length > 0 && question.options.some((opt: QuestionOption) => opt.text && opt.text.trim() !== "")) {
                const subcategory = question.subcategory || 'technical';
                mcqSubcategories.add(subcategory);
            }
            else if (question.starterCode && question.starterCode.trim() !== "") {
                hasCoding = true;
            }
        });

        if (mcqSubcategories.size > 0) {
            entities.push({
                type: "MCQ",
                subcategories: Array.from(mcqSubcategories),
                batch: `mcq_batch_1`
            });
        }

        if (hasCoding) {
            entities.push({
                type: "Coding",
                description: "Programming questions",
                batch: `coding_batch_1`
            });
        }

        return entities;
    }

    private async getNextAssessmentNumber(deptCode: string, domain: string): Promise<string> {
        try {
            const params: DynamoDB.DocumentClient.QueryInput = {
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
            const deptAssessments = result.Items as AssessmentItem[] || [];

            let maxNumber = 0;
            for (const assessment of deptAssessments) {
                const sk = assessment.SK;
                console.log(`Processing SK: ${sk}`);
                const parts = sk.split('_');
                if (parts.length >= 4) {
                    const numberPart = parts[3];
                    const number = parseInt(numberPart, 10);
                    console.log(`Extracted number: ${number}`);
                    if (!isNaN(number) && number > maxNumber) {
                        maxNumber = number;
                    }
                }
            }
            console.log(`Max number found: ${maxNumber}`);

            const nextNumber = String(maxNumber + 1).padStart(3, '0');
            console.log(`Next assessment number: ${nextNumber}`);
            return nextNumber;
        } catch (error: unknown) {
            console.error('Error getting next assessment number:', (error as Error).message);
            return '001';
        }
    }

    async createAssessment(assessmentData: CreateAssessmentData, createdBy: string): Promise<AssessmentWithQuestions> {
        try {
            console.log('=== Create Assessment Debug Info ===');
            console.log('createdBy parameter:', createdBy);
            console.log('assessmentData.createdByName:', assessmentData.createdByName);
            console.log('Final createdBy value:', createdBy);
            console.log('Final createdByName value:', assessmentData.createdByName || createdBy);
            console.log('Assessments table name:', this.assessmentsTableName);
            console.log('Questions table name:', this.questionsTableName);
            console.log('Received assessmentData:', JSON.stringify(assessmentData, null, 2));

            const deptCode = this.getDepartmentCode(assessmentData.department);
            const domain = this.getDomainFromEmail(createdBy);
            console.log(`Generating assessment ID for department: ${assessmentData.department}, code: ${deptCode}, domain: ${domain}`);
            const assessmentNumber = await this.getNextAssessmentNumber(deptCode, domain);

            const assessmentId = `ASSESS_${deptCode}_${assessmentNumber}`;
            console.log(`Generated assessment ID: ${assessmentId}`);
            const createdAt = new Date().toISOString();


            console.log('Processing questions:', JSON.stringify(assessmentData.questions, null, 2));
            const questions: QuestionItem[] = assessmentData.questions.map((question: any, index: number) => {
                const baseQuestion: QuestionItem = {
                    questionId: `Q_${String(index + 1).padStart(3, '0')}`,
                    questionNumber: index + 1,
                    question: question.text || question.question,
                    points: question.marks || question.points || 1,
                    difficulty: (question.difficulty || assessmentData.difficulty || 'MEDIUM').toUpperCase(),
                    subcategory: question.subcategory || 'technical'
                };

                console.log('Processing question:', JSON.stringify(question, null, 2));
                if (Object.prototype.hasOwnProperty.call(question, 'options') && question.options && question.options.length > 0 && question.options.some((opt: { text: string; }) => opt.text && opt.text.trim() !== "")) {
                    console.log('Identified as MCQ question');
                    baseQuestion.entityType = 'mcq';
                    baseQuestion.category = 'MCQ';

                    baseQuestion.options = question.options.map((option: any, optionIndex: number) => {
                        if (typeof option === 'string') {
                            return {
                                id: String.fromCharCode(65 + optionIndex),
                                text: option
                            };
                        }
                        return option as QuestionOption;
                    });

                    if (Array.isArray(question.correctAnswer)) {
                        baseQuestion.correctAnswer = question.correctAnswer;
                    } else if (typeof question.correctAnswer === 'string') {
                        baseQuestion.correctAnswer = [question.correctAnswer];
                    } else if (typeof question.correctAnswer === 'number') {
                        baseQuestion.correctAnswer = [question.correctAnswer];
                    } else {
                        baseQuestion.correctAnswer = [];
                    }

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
                    baseQuestion.entityType = 'coding';
                    baseQuestion.category = 'PROGRAMMING';
                    baseQuestion.starterCode = question.starterCode || '';

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

            const assessment: AssessmentItem = {
                PK: `CLIENT#${domain}`,
                SK: `ASSESSMENT#${assessmentId}`,
                assessmentId: assessmentId,
                title: assessmentData.title,
                description: assessmentData.description || '',
                department: assessmentData.department || '',
                departmentCode: deptCode,
                difficulty: (assessmentData.difficulty || 'MEDIUM').toUpperCase(),
                category: assessmentData.category || ["MCQ"],
                type: "DEPARTMENT_WISE",
                domain: domain,
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
                status: assessmentData.status || "ACTIVE",
                isPublished: assessmentData.isPublished || false,
                createdBy: createdBy,
                createdByName: assessmentData.createdByName || createdBy,
                createdAt: createdAt,
                updatedAt: createdAt
            };

            console.log('Saving assessment with PK:', assessment.PK, 'and SK:', assessment.SK);
            const existingAssessmentParams: DynamoDB.DocumentClient.GetItemInput = {
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
                    let newAssessmentNumber = assessmentNumber;
                    let attempts = 0;
                    do {
                        newAssessmentNumber = String(parseInt(newAssessmentNumber) + 1).padStart(3, '0');
                        const newAssessmentId = `ASSESS_${deptCode}_${newAssessmentNumber}`;
                        assessment.SK = `ASSESSMENT#${newAssessmentId}`;
                        assessment.assessmentId = newAssessmentId;
                        console.log(`Trying new assessment ID: ${newAssessmentId}`);
                        attempts++;

                        if (attempts > 100) {
                            throw new Error('Unable to generate unique assessment ID after 100 attempts');
                        }

                        const checkParams: DynamoDB.DocumentClient.GetItemInput = {
                            TableName: this.assessmentsTableName,
                            Key: {
                                PK: assessment.PK,
                                SK: assessment.SK
                            }
                        };
                        const checkResult = await dynamodb.get(checkParams).promise();
                        if (!checkResult.Item) {
                            break;
                        }
                    } while (true);
                    console.log(`New assessment ID: ${assessment.assessmentId}`);
                }
            } catch (error: unknown) {
                console.log('Error checking for existing assessment:', (error as Error).message);
            }

            const assessmentParams: DynamoDB.DocumentClient.PutItemInput = {
                TableName: this.assessmentsTableName,
                Item: assessment
            };

            await dynamodb.put(assessmentParams).promise();

            console.log('All questions:', JSON.stringify(questions, null, 2));
            const mcqQuestions = questions.filter((q) => q.entityType === 'mcq');
            console.log(`Found ${mcqQuestions.length} MCQ questions`);
            if (mcqQuestions.length > 0) {
                const mcqBatches: QuestionItem[][] = [];
                for (let i = 0; i < mcqQuestions.length; i += 50) {
                    mcqBatches.push(mcqQuestions.slice(i, i + 50));
                }

                console.log(`Creating ${mcqBatches.length} MCQ batches`);
                for (let i = 0; i < mcqBatches.length; i++) {
                    const batchItem: QuestionBatchItem = {
                        PK: `CLIENT#${domain}`,
                        SK: `ASSESSMENT#${assessment.assessmentId}#MCQ_BATCH_${i + 1}`,
                        assessmentId: assessment.assessmentId,
                        department: assessmentData.department,
                        entityType: `mcq_batch_${i + 1}`,
                        questions: mcqBatches[i]
                    };
                    console.log(`Creating MCQ batch ${i + 1}:`, JSON.stringify(batchItem, null, 2));

                    const batchParams: DynamoDB.DocumentClient.PutItemInput = {
                        TableName: this.questionsTableName,
                        Item: batchItem
                    };

                    await dynamodb.put(batchParams).promise();
                    console.log(`Created MCQ batch ${i + 1}`);
                }
            }

            const codingQuestions = questions.filter((q) => q.entityType === 'coding');
            console.log(`Found ${codingQuestions.length} Coding questions`);
            console.log('Coding questions:', JSON.stringify(codingQuestions, null, 2));
            if (codingQuestions.length > 0) {
                const codingBatches: QuestionItem[][] = [];
                for (let i = 0; i < codingQuestions.length; i += 50) {
                    codingBatches.push(codingQuestions.slice(i, i + 50));
                }

                console.log(`Creating ${codingBatches.length} Coding batches`);
                for (let i = 0; i < codingBatches.length; i++) {
                    const batchItem: QuestionBatchItem = {
                        PK: `CLIENT#${domain}`,
                        SK: `ASSESSMENT#${assessment.assessmentId}#CODING_BATCH_${i + 1}`,
                        assessmentId: assessment.assessmentId,
                        department: assessmentData.department,
                        entityType: `coding_batch_${i + 1}`,
                        questions: codingBatches[i]
                    };
                    console.log(`Creating Coding batch ${i + 1}:`, JSON.stringify(batchItem, null, 2));

                    const batchParams: DynamoDB.DocumentClient.PutItemInput = {
                        TableName: this.questionsTableName,
                        Item: batchItem
                    };

                    await dynamodb.put(batchParams).promise();
                    console.log(`Created Coding batch ${i + 1}`);
                }
            }

            return {
                ...assessment,
                questions: questions,
                mcqQuestions: mcqQuestions,
                codingQuestions: codingQuestions
            };
        } catch (error: unknown) {
            console.error('Error creating assessment:', (error as Error).message);
            throw new Error('Failed to create assessment: ' + (error as Error).message);
        }
    }

    async getAssessmentById(assessmentId: string, domain: string): Promise<AssessmentItem | null> {
        try {
            console.log('=== getAssessmentById called with ID:', assessmentId, 'and domain:', domain, '===');

            const queryParams: DynamoDB.DocumentClient.QueryInput = {
                TableName: this.assessmentsTableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk': `CLIENT#${domain}`,
                    ':sk_prefix': `ASSESSMENT#${assessmentId}`
                }
            };

            console.log('Querying for assessment with params:', JSON.stringify(queryParams, null, 2));
            const queryResult = await dynamodb.query(queryParams).promise();
            console.log('Query result:', JSON.stringify(queryResult, null, 2));

            if (!queryResult.Items || queryResult.Items.length === 0) {
                console.log('No assessment found with ID:', assessmentId, 'and domain:', domain);
                return null;
            }

            const assessment = queryResult.Items.find((item): item is AssessmentItem =>
                item.SK === `ASSESSMENT#${assessmentId}` &&
                !item.SK.includes('#MCQ_BATCH_') &&
                !item.SK.includes('#CODING_BATCH_')
            ) as AssessmentItem;

            if (!assessment) {
                console.log('No exact assessment match found with ID:', assessmentId, 'and domain:', domain);
                return null;
            }

            console.log('Found assessment:', JSON.stringify(assessment, null, 2));
            return assessment;
        } catch (error: unknown) {
            console.error('Error getting assessment:', (error as Error).message);
            throw new Error('Failed to retrieve assessment: ' + (error as Error).message);
        }
    }

    async getAllAssessments(filters: { clientDomain?: string; department?: string; status?: string; } = {}, limit: number = 50, lastKey?: DynamoDB.DocumentClient.Key): Promise<{ items: AssessmentItem[]; lastKey?: DynamoDB.DocumentClient.Key; hasMore: boolean }> {
        try {
            console.log('=== getAllAssessments called ===');
            console.log('Initial Filters:', filters);
            console.log('Limit:', limit);
            console.log('LastKey:', lastKey);

            const filterExpressions: string[] = [];
            const expressionAttributeValues: Record<string, any> = {};
            const expressionAttributeNames: Record<string, string> = {};

            // Always filter for assessment type - only show DEPARTMENT_WISE assessments for students
            filterExpressions.push('#type = :typeValue');
            expressionAttributeValues[':typeValue'] = 'DEPARTMENT_WISE';
            expressionAttributeNames['#type'] = 'type';

            if (filters.department) {
                // Only show assessments for the student's specific department (exclude "All Departments")
                console.log(`[FILTER] Adding department filter: "${filters.department}"`);
                filterExpressions.push('#department = :department');
                expressionAttributeValues[':department'] = filters.department;
                expressionAttributeNames['#department'] = 'department';
            } else {
                console.log('[FILTER] No department filter provided - will show all assessments');
            }

            if (filters.status) {
                filterExpressions.push('#status = :status');
                expressionAttributeValues[':status'] = filters.status;
                expressionAttributeNames['#status'] = 'status';
            }

            if (filters.clientDomain) {
                const queryParams: DynamoDB.DocumentClient.QueryInput = {
                    TableName: this.assessmentsTableName,
                    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                    ExpressionAttributeValues: {
                        ':pk': `CLIENT#${filters.clientDomain}`,
                        ':sk_prefix': 'ASSESSMENT#'
                    },
                    Limit: limit
                };

                if (filterExpressions.length > 0) {
                    queryParams.FilterExpression = filterExpressions.join(' AND ');
                    queryParams.ExpressionAttributeValues = {
                        ...queryParams.ExpressionAttributeValues,
                        ...expressionAttributeValues
                    };
                    if (Object.keys(expressionAttributeNames).length > 0) {
                        queryParams.ExpressionAttributeNames = expressionAttributeNames;
                    }
                    console.log('[QUERY] FilterExpression:', queryParams.FilterExpression);
                    console.log('[QUERY] ExpressionAttributeValues:', JSON.stringify(queryParams.ExpressionAttributeValues, null, 2));
                    console.log('[QUERY] ExpressionAttributeNames:', JSON.stringify(queryParams.ExpressionAttributeNames, null, 2));
                } else {
                    console.log('[QUERY] No FilterExpression applied');
                }

                if (lastKey) {
                    queryParams.ExclusiveStartKey = lastKey;
                }

                console.log('Executing DynamoDB Query with params:', JSON.stringify(queryParams, null, 2));
                const queryResult = await dynamodb.query(queryParams).promise();
                console.log('DynamoDB Query Result - Count:', queryResult.Count, 'ScannedCount:', queryResult.ScannedCount);
                console.log('DynamoDB Query Result - Items before filtering:', queryResult.Items?.map((item: any) => ({
                    assessmentId: item.assessmentId,
                    department: item.department,
                    type: item.type,
                    SK: item.SK
                })));
                let items = queryResult.Items as AssessmentItem[] || [];

                const beforeFilterCount = items.length;
                items = items.filter((item) => {
                    // Filter out batch items
                    if (!item.PK || !item.PK.startsWith('CLIENT#') || !item.SK || !item.SK.startsWith('ASSESSMENT#') ||
                        item.SK.includes('#MCQ_BATCH_') || item.SK.includes('#CODING_BATCH_')) {
                        return false;
                    }

                    // Additional department filter check as safety net - exclude "All Departments"
                    if (filters.department) {
                        const itemDept = (item.department || '').trim();
                        const filterDept = (filters.department || '').trim();
                        if (itemDept !== filterDept || itemDept === 'All Departments') {
                            console.log(`[QUERY] Filtering out assessment ${item.assessmentId}: department mismatch. Expected: "${filterDept}", Found: "${itemDept}"`);
                            return false;
                        }
                        console.log(`[QUERY] Keeping assessment ${item.assessmentId}: department matches "${itemDept}"`);
                    }

                    return true;
                });
                console.log(`[QUERY] Filtered ${beforeFilterCount} items down to ${items.length} items`);
                console.log('[QUERY] Final items after filtering:', items.map((item: any) => ({
                    assessmentId: item.assessmentId,
                    department: item.department,
                    title: item.title
                })));
                console.log(`[QUERY] Summary: Returning ${items.length} assessments for department filter: "${filters.department || 'NONE'}"`);

                return {
                    items,
                    lastKey: queryResult.LastEvaluatedKey,
                    hasMore: !!queryResult.LastEvaluatedKey
                };
            } else {
                const scanParams: DynamoDB.DocumentClient.ScanInput = {
                    TableName: this.assessmentsTableName,
                    Limit: limit
                };

                filterExpressions.push('begins_with(PK, :pk_prefix) AND begins_with(SK, :sk_prefix)');
                expressionAttributeValues[':pk_prefix'] = 'CLIENT#';
                expressionAttributeValues[':sk_prefix'] = 'ASSESSMENT#';

                if (filterExpressions.length > 0) {
                    scanParams.FilterExpression = filterExpressions.join(' AND ');
                    scanParams.ExpressionAttributeValues = {
                        ...scanParams.ExpressionAttributeValues,
                        ...expressionAttributeValues
                    };
                    if (Object.keys(expressionAttributeNames).length > 0) {
                        scanParams.ExpressionAttributeNames = expressionAttributeNames;
                    }
                    console.log('[SCAN] FilterExpression:', scanParams.FilterExpression);
                    console.log('[SCAN] ExpressionAttributeValues:', JSON.stringify(scanParams.ExpressionAttributeValues, null, 2));
                    console.log('[SCAN] ExpressionAttributeNames:', JSON.stringify(scanParams.ExpressionAttributeNames, null, 2));
                } else {
                    console.log('[SCAN] No FilterExpression applied');
                }

                if (lastKey) {
                    scanParams.ExclusiveStartKey = lastKey;
                }

                console.log('Executing DynamoDB Scan with params:', JSON.stringify(scanParams, null, 2));
                const scanResult = await dynamodb.scan(scanParams).promise();
                console.log('DynamoDB Scan Result - Count:', scanResult.Count, 'ScannedCount:', scanResult.ScannedCount);
                console.log('DynamoDB Scan Result - Items before filtering:', scanResult.Items?.map((item: any) => ({
                    assessmentId: item.assessmentId,
                    department: item.department,
                    type: item.type,
                    SK: item.SK
                })));
                let items = scanResult.Items as AssessmentItem[] || [];

                const beforeFilterCount = items.length;
                items = items.filter((item) => {
                    // Filter out batch items
                    if (!item.PK || !item.PK.startsWith('CLIENT#') || !item.SK || !item.SK.startsWith('ASSESSMENT#') ||
                        item.SK.includes('#MCQ_BATCH_') || item.SK.includes('#CODING_BATCH_')) {
                        return false;
                    }

                    // Additional department filter check as safety net - exclude "All Departments"
                    if (filters.department) {
                        const itemDept = (item.department || '').trim();
                        const filterDept = (filters.department || '').trim();
                        if (itemDept !== filterDept || itemDept === 'All Departments') {
                            console.log(`[SCAN] Filtering out assessment ${item.assessmentId}: department mismatch. Expected: "${filterDept}", Found: "${itemDept}"`);
                            return false;
                        }
                        console.log(`[SCAN] Keeping assessment ${item.assessmentId}: department matches "${itemDept}"`);
                    }

                    return true;
                });
                console.log(`[SCAN] Filtered ${beforeFilterCount} items down to ${items.length} items`);
                console.log('[SCAN] Final items after filtering:', items.map((item: any) => ({
                    assessmentId: item.assessmentId,
                    department: item.department,
                    title: item.title
                })));
                console.log(`[SCAN] Summary: Returning ${items.length} assessments for department filter: "${filters.department || 'NONE'}"`);

                return {
                    items,
                    lastKey: scanResult.LastEvaluatedKey,
                    hasMore: !!scanResult.LastEvaluatedKey
                };
            }
        } catch (error: unknown) {
            console.error('Error getting all assessments:', (error as Error).message);
            throw new Error('Failed to retrieve assessments: ' + (error as Error).message);
        }
    }

    /**
     * Get assessment questions by assessment ID and domain
     * Automatically fetches all question batches and combines them into a single array
     * Ensures that questions are only returned if they belong to a valid assessment
     */
    async getAssessmentQuestions(assessmentId: string, domain: string): Promise<QuestionItem[]> {
        try {
            console.log(`Fetching questions for assessment ${assessmentId} in domain ${domain}`);

            if (!assessmentId) {
                throw new Error('Assessment ID is required');
            }

            if (!domain) {
                throw new Error('Domain is required');
            }

            const mainAssessmentParams: DynamoDB.DocumentClient.QueryInput = {
                TableName: this.assessmentsTableName,
                KeyConditionExpression: 'PK = :pk AND SK = :sk',
                ExpressionAttributeValues: {
                    ':pk': `CLIENT#${domain}`,
                    ':sk': `ASSESSMENT#${assessmentId}`
                }
            };

            console.log('Verifying assessment exists with params:', JSON.stringify(mainAssessmentParams, null, 2));
            const mainAssessmentResult = await dynamodb.query(mainAssessmentParams).promise();
            console.log('Assessment verification result:', JSON.stringify(mainAssessmentResult, null, 2));

            if (!mainAssessmentResult.Items || mainAssessmentResult.Items.length === 0) {
                throw new Error(`Assessment ${assessmentId} not found for domain ${domain}`);
            }

            const questionParams: DynamoDB.DocumentClient.QueryInput = {
                TableName: this.questionsTableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk': `CLIENT#${domain}`,
                    ':sk_prefix': `ASSESSMENT#${assessmentId}#`
                }
            };

            console.log('Querying questions with params:', JSON.stringify(questionParams, null, 2));
            const questionResult = await dynamodb.query(questionParams).promise();
            console.log('Found', questionResult.Count, 'question items');

            if (!questionResult.Items || questionResult.Items.length === 0) {
                console.log('No questions found with swapped structure, trying original structure...');

                const originalQuestionParams: DynamoDB.DocumentClient.QueryInput = {
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
                    const validQuestions = originalQuestionResult.Items.filter((questionItem): questionItem is QuestionItem =>
                        (questionItem as QuestionItem).PK === `ASSESSMENT#${assessmentId}`
                    );

                    if (validQuestions.length === 0) {
                        throw new Error(`No valid questions found for assessment ${assessmentId}`);
                    }

                    return validQuestions.sort((a, b) => {
                        const numA = a.questionNumber || 0;
                        const numB = b.questionNumber || 0;
                        return numA - numB;
                    });
                }
            }

            let allQuestions: QuestionItem[] = [];
            if (questionResult.Items && questionResult.Items.length > 0) {
                for (const batchItem of questionResult.Items as QuestionBatchItem[]) {
                    if (batchItem.PK === `CLIENT#${domain}` &&
                        batchItem.SK.startsWith(`ASSESSMENT#${assessmentId}#`) &&
                        batchItem.questions && Array.isArray(batchItem.questions)) {
                        allQuestions = allQuestions.concat(batchItem.questions);
                    }
                }

                allQuestions.sort((a, b) => {
                    const numA = a.questionNumber || 0;
                    const numB = b.questionNumber || 0;
                    return numA - numB;
                });
            }

            console.log('Returning combined questions:', JSON.stringify(allQuestions, null, 2));

            if (allQuestions.length === 0) {
                console.log(`Assessment ${assessmentId} exists but has no questions`);
                return [];
            }

            return allQuestions;
        } catch (error: unknown) {
            console.error('Error in getAssessmentQuestions:', (error as Error).message);
            throw new Error('Failed to retrieve assessment questions: ' + (error as Error).message);
        }
    }

    /**
     * Get assessment with questions combined
     * This method fetches the assessment metadata and automatically includes all questions
     */
    async getAssessmentWithQuestions(assessmentId: string, domain: string): Promise<AssessmentWithQuestions> {
        try {
            console.log(`Fetching assessment ${assessmentId} with questions for domain ${domain}`);

            const assessment = await this.getAssessmentById(assessmentId, domain);

            if (!assessment) {
                console.log(`Assessment ${assessmentId} not found for domain ${domain}`);
                throw new Error(`Assessment ${assessmentId} not found for domain ${domain}`);
            }

            const questions = await this.getAssessmentQuestions(assessmentId, domain);

            return {
                ...assessment,
                questions: questions,
                mcqQuestions: questions.filter((q) => q.entityType === 'mcq'),
                codingQuestions: questions.filter((q) => q.entityType === 'coding')
            };
        } catch (error: unknown) {
            console.error('Error in getAssessmentWithQuestions:', (error as Error).message);
            throw new Error('Failed to retrieve assessment with questions: ' + (error as Error).message);
        }
    }

    async updateAssessment(assessmentId: string, updates: any, updatedBy?: string): Promise<AssessmentWithQuestions> {
        try {
            const timestamp = new Date().toISOString();

            const getCurrentItemParams: DynamoDB.DocumentClient.QueryInput = {
                TableName: this.assessmentsTableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk': `CLIENT#${updates.domain || 'unknown'}`,
                    ':sk_prefix': `ASSESSMENT#${assessmentId}`
                }
            };

            const currentItemResult = await dynamodb.query(getCurrentItemParams).promise();
            const currentItem = currentItemResult.Items && currentItemResult.Items[0] as AssessmentItem;

            if (!currentItem) {
                throw new Error(`Assessment ${assessmentId} not found for domain ${updates.domain || 'unknown'}`);
            }

            let updateExpression = 'SET updatedAt = :updatedAt';
            const expressionAttributeValues: Record<string, any> = {
                ':updatedAt': timestamp
            };
            const expressionAttributeNames: Record<string, string> = {};

            Object.keys(updates).forEach(key => {
                if (key === 'questions') return;

                if (key === 'createdAt' || key === 'assessmentId' || key === 'PK' || key === 'SK') return;

                updateExpression += `, #${key} = :${key}`;
                expressionAttributeNames[`#${key}`] = key;
                expressionAttributeValues[`:${key}`] = updates[key];
            });

            if (updatedBy) {
                updateExpression += ', updatedBy = :updatedBy';
                expressionAttributeValues[':updatedBy'] = updatedBy;
            }

            const updateParams: DynamoDB.DocumentClient.UpdateItemInput = {
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

            if (updates.questions && Array.isArray(updates.questions)) {
                const batchParams: DynamoDB.DocumentClient.QueryInput = {
                    TableName: this.questionsTableName,
                    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                    ExpressionAttributeValues: {
                        ':pk': currentItem.PK,
                        ':sk_prefix': `ASSESSMENT#${assessmentId}#`
                    }
                };

                const batchResult = await dynamodb.query(batchParams).promise();
                const batchItems = batchResult.Items || [];

                for (const batchItem of batchItems) {
                    const deleteParams: DynamoDB.DocumentClient.DeleteItemInput = {
                        TableName: this.questionsTableName,
                        Key: {
                            PK: (batchItem as QuestionBatchItem).PK,
                            SK: (batchItem as QuestionBatchItem).SK
                        }
                    };
                    await dynamodb.delete(deleteParams).promise();
                }

                const mcqQuestions = updates.questions.filter((q: QuestionItem) => q.entityType === 'mcq');
                if (mcqQuestions.length > 0) {
                    const mcqBatches: QuestionItem[][] = [];
                    for (let i = 0; i < mcqQuestions.length; i += 50) {
                        mcqBatches.push(mcqQuestions.slice(i, i + 50));
                    }

                    for (let i = 0; i < mcqBatches.length; i++) {
                        const batchItem: QuestionBatchItem = {
                            PK: currentItem.PK,
                            SK: `ASSESSMENT#${assessmentId}#MCQ_BATCH_${i + 1}`,
                            assessmentId: assessmentId,
                            department: currentItem.department,
                            entityType: `mcq_batch_${i + 1}`,
                            questions: mcqBatches[i]
                        };

                        const batchParams: DynamoDB.DocumentClient.PutItemInput = {
                            TableName: this.questionsTableName,
                            Item: batchItem
                        };

                        await dynamodb.put(batchParams).promise();
                    }
                }

                const codingQuestions = updates.questions.filter((q: QuestionItem) => q.entityType === 'coding');
                if (codingQuestions.length > 0) {
                    const codingBatches: QuestionItem[][] = [];
                    for (let i = 0; i < codingQuestions.length; i += 50) {
                        codingBatches.push(codingQuestions.slice(i, i + 50));
                    }

                    for (let i = 0; i < codingBatches.length; i++) {
                        const batchItem: QuestionBatchItem = {
                            PK: currentItem.PK,
                            SK: `ASSESSMENT#${assessmentId}#CODING_BATCH_${i + 1}`,
                            assessmentId: assessmentId,
                            department: currentItem.department,
                            entityType: `coding_batch_${i + 1}`,
                            questions: codingBatches[i]
                        };

                        const batchParams: DynamoDB.DocumentClient.PutItemInput = {
                            TableName: this.questionsTableName,
                            Item: batchItem
                        };

                        await dynamodb.put(batchParams).promise();
                    }
                }
            }

            const batchQueryParams: DynamoDB.DocumentClient.QueryInput = {
                TableName: this.questionsTableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk': currentItem.PK,
                    ':sk_prefix': `ASSESSMENT#${assessmentId}#`
                }
            };

            const batchQueryResult = await dynamodb.query(batchQueryParams).promise();
            const batchItems = batchQueryResult.Items || [];

            let updatedQuestions: QuestionItem[] = [];
            for (const batchItem of batchItems as QuestionBatchItem[]) {
                if (batchItem.questions && Array.isArray(batchItem.questions)) {
                    updatedQuestions = updatedQuestions.concat(batchItem.questions);
                }
            }

            const entities = this.generateEntities(updatedQuestions);

            const entitiesUpdateParams: DynamoDB.DocumentClient.UpdateItemInput = {
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
                ...updatedAssessment.Attributes as AssessmentItem,
                entities: entities,
                questions: updatedQuestions.sort((a, b) => a.questionNumber - b.questionNumber),
                mcqQuestions: updatedQuestions.filter((q) => q.entityType === 'mcq'),
                codingQuestions: updatedQuestions.filter((q) => q.entityType === 'coding')
            };
        } catch (error: unknown) {
            console.error('Error updating assessment:', (error as Error).message);
            throw new Error('Failed to update assessment: ' + (error as Error).message);
        }
    }

    async deleteAssessment(assessmentId: string, domain: string): Promise<void> {
        try {
            const getAssessmentParams: DynamoDB.DocumentClient.QueryInput = {
                TableName: this.assessmentsTableName,
                KeyConditionExpression: 'PK = :pk AND SK = :sk',
                ExpressionAttributeValues: {
                    ':pk': `CLIENT#${domain}`,
                    ':sk': `ASSESSMENT#${assessmentId}`
                }
            };

            const assessmentResult = await dynamodb.query(getAssessmentParams).promise();
            const assessment = assessmentResult.Items && assessmentResult.Items[0] as AssessmentItem;

            if (!assessment) {
                throw new Error(`Assessment ${assessmentId} not found for domain ${domain}`);
            }

            const assessmentParams: DynamoDB.DocumentClient.DeleteItemInput = {
                TableName: this.assessmentsTableName,
                Key: {
                    PK: assessment.PK,
                    SK: assessment.SK
                }
            };

            await dynamodb.delete(assessmentParams).promise();

            const batchQueryParams: DynamoDB.DocumentClient.QueryInput = {
                TableName: this.questionsTableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues: {
                    ':pk': assessment.PK,
                    ':sk_prefix': `ASSESSMENT#${assessmentId}#`
                }
            };

            const batchQueryResult = await dynamodb.query(batchQueryParams).promise();
            const batchItems = batchQueryResult.Items || [];

            for (const batchItem of batchItems) {
                const deleteParams: DynamoDB.DocumentClient.DeleteItemInput = {
                    TableName: this.questionsTableName,
                    Key: {
                        PK: (batchItem as QuestionBatchItem).PK,
                        SK: (batchItem as QuestionBatchItem).SK
                    }
                };
                await dynamodb.delete(deleteParams).promise();
            }
        } catch (error: unknown) {
            console.error('Error deleting assessment:', (error as Error).message);
            throw new Error('Failed to delete assessment: ' + (error as Error).message);
        }
    }
}

module.exports = new AssessmentService();
