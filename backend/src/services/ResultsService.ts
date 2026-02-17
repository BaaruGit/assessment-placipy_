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


export class ResultsService {
    private resultsTableName: string;
    private studentsTableName: string;

    constructor() {
        // Use dedicated results table - EXACT table name as specified by user
        // Results are stored with PK: CLIENT#<domain> and SK: RESULT#ASSESSMENT#<id>#<email>
        // User specified table: Assessment_placipy_asseessment_result
        this.resultsTableName = process.env.RESULTS_TABLE_NAME || 'Assessment_placipy_asseessment_result';
        this.studentsTableName = process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy';
        console.log('========================================');
        console.log('ResultsService initialized');
        console.log('Results table name:', this.resultsTableName);
        console.log('Students table name:', this.studentsTableName);
        console.log('AWS Region:', process.env.AWS_REGION || 'not set');
        console.log('========================================');
    }

    /**
     * Extract domain from email address
     */
    private getDomainFromEmail(email: string): string {
        if (!email || !email.includes('@')) {
            console.log('Invalid email format, cannot extract domain:', email);
            throw new Error('Invalid email format, cannot extract domain');
        }
        const domain = email.split('@')[1];
        console.log('Extracted domain from email:', email, '=>', domain);
        return domain;
    }

    /**
     * Save student assessment result - EXACT schema as specified
     */
    async saveAssessmentResult(resultData: any): Promise<any> {
        try {
            console.log('=== Saving Assessment Result ===');
            console.log('Results table name:', this.resultsTableName);
            console.log('Result Data:', JSON.stringify(resultData, null, 2));

            const {
                assessmentId,
                email,
                Name,
                department,
                answers,
                score,
                maxScore,
                percentage,
                accuracy,
                numCorrect,
                numIncorrect,
                numUnattempted,
                entity_marks,
                timeSpentSeconds,
                submittedAt
            } = resultData;

            // Validate required fields
            if (!assessmentId) {
                throw new Error('Assessment ID is required');
            }

            if (!email) {
                throw new Error('Student email is required');
            }

            // Get domain from email
            const collegeDomain = this.getDomainFromEmail(email);
            const PK = `CLIENT#${collegeDomain}`;
            const SK = `RESULT#ASSESSMENT#${assessmentId}#${email}`;
            const submittedAtISO = submittedAt || new Date().toISOString();

            // Create the result item with EXACT schema
            const resultItem = {
                PK,
                SK,
                accuracy: accuracy || 0,
                answers: answers || [],
                assessmentId,
                department: department || 'Unknown',
                email,
                entity_marks: entity_marks || {},
                evaluated: true,
                maxScore: maxScore || 0,
                Name: Name || email,
                numCorrect: numCorrect || 0,
                numIncorrect: numIncorrect || 0,
                numUnattempted: numUnattempted || 0,
                percentage: percentage || 0,
                rank: null,
                score: score || 0,
                submittedAt: submittedAtISO,
                timeSpentSeconds: timeSpentSeconds || 0
            };

            console.log('========================================');
            console.log('SAVING TO TABLE:', this.resultsTableName);
            console.log('AWS Region:', process.env.AWS_REGION || 'not set');
            console.log('Result item:', JSON.stringify(resultItem, null, 2));
            console.log('========================================');

            const params = {
                TableName: this.resultsTableName,
                Item: resultItem
            };

            console.log('DynamoDB PUT operation starting...');
            console.log('Table:', this.resultsTableName);
            console.log('PK:', resultItem.PK);
            console.log('SK:', resultItem.SK);
            console.log('Params:', JSON.stringify(params, null, 2));

            const putResult = await dynamodb.put(params);

            console.log('DynamoDB PUT operation completed successfully');
            console.log('Put result:', JSON.stringify(putResult, null, 2));

            console.log('========================================');
            console.log('✅ RESULT SAVED SUCCESSFULLY!');
            console.log('Table:', this.resultsTableName);
            console.log('========================================');

            return resultItem;
        } catch (error: any) {
            console.error('Error saving assessment result:', error);
            console.error('Error stack:', error.stack);
            console.error('Error code:', error.code);
            console.error('Error name:', error.name);
            console.error('Table name being used:', this.resultsTableName);

            // Provide more specific error messages
            if (error.code === 'ResourceNotFoundException') {
                const errorMsg = `DynamoDB table "${this.resultsTableName}" does not exist. Please create the table with PK (String) and SK (String) as keys.`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            } else if (error.code === 'AccessDeniedException') {
                throw new Error('Access denied to DynamoDB. Please check your AWS credentials and permissions.');
            } else if (error.code === 'ValidationException') {
                throw new Error('Invalid data format. Please check the result data being saved.');
            }

            throw new Error('Failed to save assessment result: ' + (error.message || error.toString()));
        }
    }

    /**
     * Get student's assessment results by email
     */
    async getStudentResults(studentEmail: string): Promise<any[]> {
        try {
            console.log('=== Getting Student Results ===');
            console.log('Student Email:', studentEmail);

            // Get domain from email
            let collegeDomain;
            try {
                collegeDomain = this.getDomainFromEmail(studentEmail);
            } catch (domainError) {
                console.error('Error extracting domain from email:', domainError);
                // Try with a default domain as fallback for backward compatibility
                collegeDomain = 'ksrce.ac.in';
            }
            const PK = `CLIENT#${collegeDomain}`;

            // Query all results for this student (SK starts with RESULT#ASSESSMENT#)
            const params = {
                TableName: this.resultsTableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
                FilterExpression: 'email = :email',
                ExpressionAttributeValues: {
                    ':pk': PK,
                    ':skPrefix': 'RESULT#ASSESSMENT#',
                    ':email': studentEmail
                }
            };

            console.log('Query params:', JSON.stringify(params, null, 2));
            const result = await dynamodb.query(params);
            console.log('Query result:', JSON.stringify(result, null, 2));
            return result.Items || [];
        } catch (error) {
            console.error('Error getting student results:', error);
            throw new Error('Failed to retrieve student results: ' + error.message);
        }
    }

    /**
     * Get result by attemptId (SK)
     */
    async getResultByAttemptId(studentEmail: string, attemptId: string): Promise<any> {
        try {
            console.log('=== Getting Result By Attempt ID ===');
            console.log('Student Email:', studentEmail);
            console.log('Attempt ID:', attemptId);
            console.log('Results table name:', this.resultsTableName);

            // Get domain from email
            let collegeDomain;
            try {
                collegeDomain = this.getDomainFromEmail(studentEmail);
            } catch (domainError) {
                console.error('Error extracting domain from email:', domainError);
                // Try with a default domain as fallback for backward compatibility
                collegeDomain = 'ksrce.ac.in';
            }
            const PK = `CLIENT#${collegeDomain}`;
            const SK = attemptId;

            const params = {
                TableName: this.resultsTableName,
                Key: {
                    PK,
                    SK
                }
            };

            console.log('Get params:', JSON.stringify(params, null, 2));
            const result = await dynamodb.get(params);

            console.log('DynamoDB GET result:', JSON.stringify(result, null, 2));

            if (!result.Item) {
                throw new Error('Result not found');
            }

            // Verify the result belongs to the student
            // Check both the email field and the email in the SK
            const emailInSK = SK.split('#').pop(); // Extract email from SK: RESULT#ASSESSMENT#<id>#<email>
            const resultEmail = result.Item.email || emailInSK;

            console.log('Authorization check:');
            console.log('  resultEmail:', resultEmail);
            console.log('  emailInSK:', emailInSK);
            console.log('  studentEmail:', studentEmail);
            console.log('  resultEmail.toLowerCase():', resultEmail.toLowerCase());
            console.log('  studentEmail.toLowerCase():', studentEmail.toLowerCase());
            console.log('  emailInSK.toLowerCase():', emailInSK.toLowerCase());

            // Case-insensitive comparison
            if (resultEmail.toLowerCase() !== studentEmail.toLowerCase() &&
                emailInSK.toLowerCase() !== studentEmail.toLowerCase()) {
                console.error('Email mismatch:', {
                    resultEmail: resultEmail,
                    emailInSK: emailInSK,
                    studentEmail: studentEmail
                });
                throw new Error('Unauthorized: Result does not belong to this student');
            }

            console.log('Get result:', JSON.stringify(result.Item, null, 2));
            return result.Item;
        } catch (error) {
            console.error('Error getting result by attempt ID:', error);
            throw new Error('Failed to retrieve result: ' + error.message);
        }
    }

    /**
     * Get all results for an assessment
     */
    async getAssessmentResults(assessmentId: string): Promise<any[]> {
        try {
            console.log('=== Getting Assessment Results ===');
            console.log('Assessment ID:', assessmentId);

            // Scan for all results with this assessment ID
            const params = {
                TableName: this.resultsTableName,
                FilterExpression: 'assessmentId = :assessmentId',
                ExpressionAttributeValues: {
                    ':assessmentId': assessmentId
                }
            };

            console.log('Scan params:', JSON.stringify(params, null, 2));
            const result = await dynamodb.scan(params);
            console.log('Scan result count:', result.Count);

            return result.Items || [];
        } catch (error) {
            console.error('Error getting assessment results:', error);
            throw new Error('Failed to retrieve assessment results: ' + error.message);
        }
    }

    /**
     * Get student's rank in an assessment
     */
    async getStudentRank(assessmentId: string, studentId: string): Promise<any> {
        try {
            console.log('=== Getting Student Rank ===');
            console.log('Assessment ID:', assessmentId);
            console.log('Student ID:', studentId);

            // Get all results for this assessment
            const allResults = await this.getAssessmentResults(assessmentId);

            // Sort by score (descending)
            const sortedResults = allResults.sort((a, b) => b.score - a.score);

            // Find student's position
            const studentResult = sortedResults.find(result => result.studentId === studentId);
            const studentIndex = sortedResults.findIndex(result => result.studentId === studentId);

            if (!studentResult) {
                return { rank: null, totalStudents: sortedResults.length };
            }

            // Calculate rank (1-based index)
            const rank = studentIndex + 1;

            return {
                rank,
                totalStudents: sortedResults.length,
                score: studentResult.score,
                percentage: studentResult.percentage
            };
        } catch (error) {
            console.error('Error getting student rank:', error);
            throw new Error('Failed to retrieve student rank: ' + error.message);
        }
    }

    /**
     * Get department statistics
     */
    async getDepartmentStats(assessmentId: string): Promise<any> {
        try {
            console.log('=== Getting Department Stats ===');
            console.log('Assessment ID:', assessmentId);

            // Get all results for this assessment
            const allResults = await this.getAssessmentResults(assessmentId);

            // Group by department
            const departmentStats: any = {};

            allResults.forEach(result => {
                const dept = result.department || 'Unknown';
                if (!departmentStats[dept]) {
                    departmentStats[dept] = {
                        students: 0,
                        totalScore: 0,
                        maxScore: result.maxScore || 0,
                        highestScore: 0,
                        lowestScore: result.maxScore || 0
                    };
                }

                departmentStats[dept].students += 1;
                departmentStats[dept].totalScore += result.score;

                if (result.score > departmentStats[dept].highestScore) {
                    departmentStats[dept].highestScore = result.score;
                }

                if (result.score < departmentStats[dept].lowestScore) {
                    departmentStats[dept].lowestScore = result.score;
                }
            });

            // Calculate averages
            Object.keys(departmentStats).forEach(dept => {
                const stats = departmentStats[dept];
                stats.averageScore = stats.students > 0 ? Math.round((stats.totalScore / stats.students) * 100) / 100 : 0;
                stats.completionRate = stats.students > 0 ? Math.round((stats.students / stats.students) * 10000) / 100 : 0; // This would need total students in department
            });

            return departmentStats;
        } catch (error) {
            console.error('Error getting department stats:', error);
            throw new Error('Failed to retrieve department stats: ' + error.message);
        }
    }

    /**
     * Get top performers
     */
    async getTopPerformers(assessmentId: string, limit: number = 10): Promise<any[]> {
        try {
            console.log('=== Getting Top Performers ===');
            console.log('Assessment ID:', assessmentId);
            console.log('Limit:', limit);

            // Get all results for this assessment
            const allResults = await this.getAssessmentResults(assessmentId);

            // Sort by score (descending) and take top N
            const sortedResults = allResults.sort((a, b) => b.score - a.score);
            const topPerformers = sortedResults.slice(0, limit);

            // Add rank to each performer
            return topPerformers.map((result, index) => ({
                ...result,
                rank: index + 1
            }));
        } catch (error) {
            console.error('Error getting top performers:', error);
            throw new Error('Failed to retrieve top performers: ' + error.message);
        }
    }

    /**
     * Get student data by email
     */
    async getStudentByEmail(email: string): Promise<any> {
        try {
            // Validate email
            if (!email || !email.includes('@')) {
                console.log('Invalid email format:', email);
                return null;
            }

            console.log('=== Getting Student By Email ===');
            console.log('Student Email:', email);

            // Get domain from email
            const collegeDomain = this.getDomainFromEmail(email);
            const PK = `CLIENT#${collegeDomain}`;
            const SK = `STUDENT#${email}`;

            const params = {
                TableName: this.studentsTableName,
                Key: {
                    PK,
                    SK
                }
            };

            console.log('Get params:', JSON.stringify(params, null, 2));
            const result = await dynamodb.get(params);

            if (!result.Item) {
                console.log('Student not found for email:', email);
                return null;
            }

            console.log('Found student:', JSON.stringify(result.Item, null, 2));
            return result.Item;
        } catch (error) {
            console.error('Error getting student by email:', error);
            // Don't throw error here as it's optional data enrichment
            return null;
        }
    }

    /**
     * Get comprehensive analytics data for PTS dashboard
     * Filtered by the domain of the requesting PTS user
     */
    async getPTSOverview(requesterEmail: string): Promise<any> {
        try {
            console.log('=== Getting PTS Overview Analytics ===');
            console.log('Requester email:', requesterEmail);

            // Validate requester email
            if (!requesterEmail) {
                throw new Error('Requester email is required for domain-based filtering');
            }

            // Validate email format
            if (!requesterEmail.includes('@')) {
                throw new Error('Invalid email format for requester: ' + requesterEmail);
            }

            // Extract domain from requester's email
            const requesterDomain = this.getDomainFromEmail(requesterEmail);
            console.log('Requester domain:', requesterDomain);

            // Validate table names
            if (!this.resultsTableName || !this.studentsTableName) {
                throw new Error('Table names are not configured');
            }

            // Step 1: Get students from Student Management (source of truth)
            const studentParams = {
                TableName: this.studentsTableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
                ExpressionAttributeValues: {
                    ':pk': `CLIENT#${requesterDomain}`,
                    ':skPrefix': 'STUDENT#'
                }
            };

            console.log('Querying students for domain:', `CLIENT#${requesterDomain}`);
            const studentResult = await dynamodb.query(studentParams);
            const studentList = studentResult.Items || [];
            console.log('Found students in Student Management:', studentList.length);

            // Create a set of valid student emails from Student Management
            const validStudentEmails = new Set(studentList.map(student => student.email?.toLowerCase()));
            console.log('Valid student emails:', Array.from(validStudentEmails));

            // Step 2: Query results for this domain only
            const resultsParams = {
                TableName: this.resultsTableName,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: {
                    ':pk': `CLIENT#${requesterDomain}`
                }
            };

            console.log('Query params for results:', JSON.stringify(resultsParams, null, 2));
            const resultsResult = await dynamodb.query(resultsParams);
            const allResults = resultsResult.Items || [];
            console.log('Found all results:', allResults.length);

            // Step 3: Filter results to only include those from students in Student Management
            const filteredResults = allResults.filter(result => {
                if (!result.email) {
                    console.log('Skipping result without email:', result);
                    return false;
                }

                // Validate result email format
                if (!result.email.includes('@')) {
                    console.log('Skipping result with invalid email format:', result.email);
                    return false;
                }

                // Check if the student exists in Student Management
                return validStudentEmails.has(result.email.toLowerCase());
            });

            console.log('Filtered results count (only students from Student Management):', filteredResults.length);

            // Enrich filtered results with student data (roll numbers, etc.)
            const enrichedResults = [];
            for (const result of filteredResults) {
                // Get student data from our student list instead of separate query
                const studentData = studentList.find(student => student.email?.toLowerCase() === result.email?.toLowerCase());
                enrichedResults.push({
                    ...result,
                    rollNumber: studentData?.rollNumber || 'N/A',
                    department: studentData?.department || result.department || 'Unknown'
                });
            }

            console.log('Enriched results count:', enrichedResults.length);

            // Group results by department
            const departmentStats: any = {};

            enrichedResults.forEach((result: any) => {
                const dept = result.department || 'Unknown';
                if (!departmentStats[dept]) {
                    departmentStats[dept] = {
                        department: dept,
                        totalStudents: 0,
                        activeStudents: 0,
                        assessmentsCompleted: 0,
                        averageScore: 0,
                        totalScore: 0,
                        scoreCount: 0
                    };
                }
                departmentStats[dept].assessmentsCompleted++;
                departmentStats[dept].totalScore += result.percentage || 0;
                departmentStats[dept].scoreCount++;
            });

            // Calculate average scores
            Object.values(departmentStats).forEach((dept: any) => {
                if (dept.scoreCount > 0) {
                    dept.averageScore = Math.round((dept.totalScore / dept.scoreCount) * 100) / 100;
                }
                // We don't have actual student counts, so we'll estimate based on results
                dept.totalStudents = dept.assessmentsCompleted;
                dept.activeStudents = dept.assessmentsCompleted;
            });

            // Get recent assessments
            const recentAssessments = enrichedResults
                .sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                .slice(0, 10)
                .map((result: any) => ({
                    assessmentTitle: `Assessment ${result.assessmentId}`,
                    date: result.submittedAt,
                    totalParticipants: 1,
                    averageScore: result.percentage,
                    highestScore: result.percentage,
                    lowestScore: result.percentage,
                    completionRate: 100
                }));

            // Calculate overall average score
            let totalScore = 0;
            let scoreCount = 0;
            enrichedResults.forEach((result: any) => {
                totalScore += result.percentage || 0;
                scoreCount++;
            });
            const overallAvgScore = scoreCount > 0 ? Math.round((totalScore / scoreCount) * 100) / 100 : 0;

            // Aggregate results by student to avoid duplicates
            const studentResultsMap = new Map();
            for (const result of enrichedResults) {
                const email = result.email;
                if (studentResultsMap.has(email)) {
                    const existing = studentResultsMap.get(email);
                    // Update with cumulative data
                    existing.assessmentsTaken += 1;
                    existing.totalScore += result.percentage || 0;
                    existing.totalMarks += result.score || 0;
                    // Update last active date if this is more recent
                    if (new Date(result.submittedAt) > new Date(existing.lastActive)) {
                        existing.lastActive = result.submittedAt;
                    }
                    // Keep the highest score
                    if ((result.percentage || 0) > existing.highestScore) {
                        existing.highestScore = result.percentage || 0;
                    }
                } else {
                    studentResultsMap.set(email, {
                        email: result.email,
                        name: result.Name || result.email,
                        rollNo: result.rollNumber || 'N/A',
                        department: result.department || 'Unknown',
                        assessmentsTaken: 1,
                        totalScore: result.percentage || 0,
                        totalMarks: result.score || 0,
                        highestScore: result.percentage || 0,
                        lastActive: result.submittedAt
                    });
                }
            }

            // Calculate average scores for each student and create top performers list
            const studentsWithAvg = Array.from(studentResultsMap.values()).map(student => ({
                ...student,
                averageScore: student.totalScore / student.assessmentsTaken
            }));

            // Get top performers with roll numbers
            const topPerformers = studentsWithAvg
                .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
                .slice(0, 5)
                .map((student, index) => ({
                    id: index + 1,
                    name: student.name,
                    rollNo: student.rollNo,
                    department: student.department || 'Unknown',
                    batch: 'N/A',
                    assessmentsTaken: student.assessmentsTaken,
                    averageScore: Math.round(student.averageScore * 100) / 100,
                    totalMarks: student.totalMarks,
                    rank: index + 1,
                    lastActive: student.lastActive
                }));

            return {
                overview: {
                    totalStudents: enrichedResults.length,
                    activeStudents: enrichedResults.length,
                    totalAssessments: enrichedResults.length,
                    avgScore: overallAvgScore,
                    participationRate: 100
                },
                departmentStats: Object.values(departmentStats),
                recentAssessments,
                topPerformers
            };
        } catch (error) {
            console.error('Error getting PTS overview analytics:', error);
            console.error('Error stack:', error.stack);
            throw new Error('Failed to retrieve PTS overview analytics: ' + error.message);
        }
    }
}

export default new ResultsService();
