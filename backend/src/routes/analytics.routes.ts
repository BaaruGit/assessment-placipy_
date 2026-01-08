// @ts-nocheck
const express = require('express');
const authMiddleware = require('../auth/auth.middleware');
const AWS = require('aws-sdk');
const resultsService = require('../services/ResultsService');
const { getUserAttributes } = require('../auth/cognito');

const router = express.Router();
const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy';

/**
 * Helper function to get user email from Cognito profile
 * Always fetches the actual email from the user's profile
 */
async function getEmailFromRequest(req) {
    // Get user ID from JWT token
    const userId = req.user?.['cognito:username'] || req.user?.username || req.user?.sub;
    
    console.log('Extracted user ID from token:', userId);
    
    if (!userId) {
        // Fallback: try to get email directly from token
        const email = req.user?.email || req.user?.['cognito:email'];
        if (email) {
            console.log('Using email from token directly:', email);
            return email.toLowerCase();
        }
        throw new Error('User ID not found in authentication token');
    }
    
    try {
        console.log('Fetching email from Cognito profile for user ID:', userId);
        // Always fetch email from Cognito profile to ensure accuracy
        const userInfo = await getUserAttributes(userId);
        const email = userInfo?.attributes?.email;
        
        if (!email) {
            // Fallback: try to get email from token if not in profile
            const tokenEmail = req.user?.email || req.user?.['cognito:email'];
            if (tokenEmail) {
                console.log('Using email from token as fallback:', tokenEmail);
                return tokenEmail.toLowerCase();
            }
            throw new Error('Email not found in user profile');
        }
        
        console.log('Got email from Cognito profile:', email);
        return email.toLowerCase();
    } catch (error) {
        console.error('Error fetching email from Cognito profile:', error);
        console.error('Error stack:', error.stack);
        
        // Fallback: try to get email from token
        const tokenEmail = req.user?.email || req.user?.['cognito:email'];
        if (tokenEmail) {
            console.log('Using email from token as final fallback:', tokenEmail);
            return tokenEmail.toLowerCase();
        }
        
        throw new Error('Failed to fetch user email from profile: ' + error.message);
    }
}

// Get student analytics
router.get('/students', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Getting Student Analytics ===');
        console.log('Request object:', JSON.stringify(req.user, null, 2));
        
        // Get requester email for domain-based filtering
        const requesterEmail = await getEmailFromRequest(req);
        console.log('Requester email:', requesterEmail);
        
        // Validate email format
        if (!requesterEmail || !requesterEmail.includes('@')) {
            throw new Error('Invalid email format: ' + requesterEmail);
        }
        
        // Extract domain from requester's email
        const requesterDomain = requesterEmail.split('@')[1];
        console.log('Requester domain:', requesterDomain);
        
        // Validate table names
        const resultsTableName = process.env.RESULTS_TABLE_NAME || 'Assessment_placipy_asseessment_result';
        const studentsTableName = process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy';
        
        if (!resultsTableName || !studentsTableName) {
            throw new Error('Table names are not configured');
        }
        
        // Step 1: Fetch Student Management data first and filter by requester domain and owner email
        // Query all students in the requester's domain
        const studentParams = {
            TableName: studentsTableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
            FilterExpression: '#createdBy = :requesterEmail',
            ExpressionAttributeNames: {
                '#createdBy': 'createdBy'
            },
            ExpressionAttributeValues: {
                ':pk': `CLIENT#${requesterDomain}`,
                ':skPrefix': 'STUDENT#',
                ':requesterEmail': requesterEmail
            }
        };
        
        console.log('Querying students for domain:', `CLIENT#${requesterDomain}`, 'owned by:', requesterEmail);
        const studentResult = await dynamodb.query(studentParams).promise();
        const studentList = studentResult.Items || [];
        console.log('Found students owned by requester:', studentList.length);
        
        // Step 2: Build an email-based Map for O(1) lookups
        const studentEmailMap = new Map();
        for (const student of studentList) {
            if (student.email) {
                studentEmailMap.set(student.email.toLowerCase(), student);
            }
        }
        console.log('Student email map size:', studentEmailMap.size);
        console.log('Sample student emails in map:', Array.from(studentEmailMap.keys()).slice(0, 5));
        
        // Step 3: Query results for this domain only
        const resultsParams = {
            TableName: resultsTableName,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
                ':pk': `CLIENT#${requesterDomain}`
            }
        };
        
        console.log('Query params for results:', JSON.stringify(resultsParams, null, 2));
        const resultsResult = await dynamodb.query(resultsParams).promise();
        const allResultsFromDB = resultsResult.Items || [];
        console.log('Found all results:', allResultsFromDB.length);
        
        // Get all assessments created by the current user to filter results
        const assessmentParams = {
            TableName: process.env.ASSESSMENTS_TABLE_NAME || 'Assesment_placipy_assesments',
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
                ':pk': `CLIENT#${requesterDomain}`
            }
        };
        
        console.log('Querying assessments for domain:', `CLIENT#${requesterDomain}`);
        const assessmentResult = await dynamodb.query(assessmentParams).promise();
        const assessments = assessmentResult.Items || [];
        
        // Filter to only include assessments created by the current user
        const userAssessmentIds = new Set();
        for (const assessment of assessments) {
            if (assessment.createdBy && assessment.createdBy.toLowerCase() === requesterEmail.toLowerCase()) {
                userAssessmentIds.add(assessment.assessmentId);
            }
        }
        
        console.log('Number of assessments created by user:', userAssessmentIds.size);
        
        // Filter allResults to only include results for assessments created by the current user
        const allResults = allResultsFromDB.filter(result => 
            userAssessmentIds.has(result.assessmentId)
        );
        
        console.log('Filtered results for user assessments:', allResults.length);
        
        console.log('Number of students after ownerEmail filtering:', studentList.length);
        console.log('All results after user assessment filtering:', allResults.length);
        
        // Step 4: Create analytics data by iterating over Student Management students
        // and matching with results from the Results table using same email
        const studentAnalyticsMap = new Map();
        
        // Initialize all students from Student Management in the analytics map
        for (const student of studentList) {
            if (student.email) {
                const emailKey = student.email.toLowerCase();
                studentAnalyticsMap.set(emailKey, {
                    email: student.email,
                    name: student.name || student.email,  // Identity from Student Management
                    rollNo: student.rollNumber || 'N/A',
                    department: student.department || 'Unknown',
                    batch: student.batch || 'N/A',
                    assessmentsTaken: 0,
                    totalScore: 0,
                    totalMarks: 0,
                    highestScore: 0,
                    lastActive: null,
                    averageScore: 0
                });
            }
        }
        
        // Process results and aggregate performance data only for matched students
        let matchedResultsCount = 0;
        for (const result of allResults) {
            if (!result.email) continue;
            
            const emailKey = result.email.toLowerCase();
            
            // Only process results that map to a Student Management student
            if (studentEmailMap.has(emailKey)) {
                matchedResultsCount++;
                const studentAnalytics = studentAnalyticsMap.get(emailKey);
                if (studentAnalytics) {
                    // Track unique assessments to avoid counting multiple attempts of the same assessment
                    if (!studentAnalytics.uniqueAssessmentIds) {
                        studentAnalytics.uniqueAssessmentIds = new Set();
                    }
                    
                    // Only increment assessmentsTaken if this is a new unique assessment for this student
                    if (!studentAnalytics.uniqueAssessmentIds.has(result.assessmentId)) {
                        studentAnalytics.uniqueAssessmentIds.add(result.assessmentId);
                        studentAnalytics.assessmentsTaken += 1;
                    }
                    
                    // Aggregate performance data
                    studentAnalytics.totalScore += result.percentage || 0;
                    studentAnalytics.totalMarks += result.score || 0;
                    
                    // Update highest score
                    if ((result.percentage || 0) > studentAnalytics.highestScore) {
                        studentAnalytics.highestScore = result.percentage || 0;
                    }
                    
                    // Update last active date if this is more recent
                    if (result.submittedAt && (!studentAnalytics.lastActive || new Date(result.submittedAt) > new Date(studentAnalytics.lastActive))) {
                        studentAnalytics.lastActive = result.submittedAt;
                    }
                }
            }
        }
        
        console.log('Results that matched students in Student Management:', matchedResultsCount);
        console.log('Total results processed:', allResults.length);
        
        // Calculate average scores for each student
        for (const [emailKey, studentAnalytics] of studentAnalyticsMap) {
            if (studentAnalytics.assessmentsTaken > 0) {
                studentAnalytics.averageScore = studentAnalytics.totalScore / studentAnalytics.assessmentsTaken;
            }
        }
        
        // Convert to array and create top performers list
        const allStudentsWithAnalytics = Array.from(studentAnalyticsMap.values());
        
        // Get top performers sorted by averageScore
        const topPerformers = allStudentsWithAnalytics
            .filter(student => student.assessmentsTaken > 0)  // Only students who have taken assessments
            .sort((a, b) => b.averageScore - a.averageScore)
            .slice(0, 5)
            .map((student, index) => ({
                id: index + 1,
                name: student.name,  // From Student Management (source of truth)
                rollNo: student.rollNo,  // From Student Management
                department: student.department,  // From Student Management
                batch: student.batch,  // From Student Management
                assessmentsTaken: student.assessmentsTaken,
                averageScore: Math.round(student.averageScore * 100) / 100,
                totalMarks: student.totalMarks,
                rank: index + 1,
                lastActive: student.lastActive
            }));
        
        // Calculate overall statistics
        const activeStudents = allStudentsWithAnalytics.filter(s => s.assessmentsTaken > 0);
        const totalActive = activeStudents.length;
        
        let totalScore = 0;
        let totalAssessments = 0;
        for (const student of activeStudents) {
            totalScore += student.averageScore;
            totalAssessments += student.assessmentsTaken;
        }
        const overallAvgScore = totalActive > 0 ? Math.round((totalScore / totalActive) * 100) / 100 : 0;
        
        console.log('Active students (with assessments taken):', totalActive);
        console.log('Total assessments aggregated:', totalAssessments);
        console.log('Top performers count:', topPerformers.length);
        if (topPerformers.length > 0) {
            console.log('Sample top performer:', topPerformers[0]);
        }
        
        // Create completion report data
        // Count unique students who have taken at least one assessment
        const studentsWhoAttended = new Set();
        for (const result of allResults) {
            if (studentEmailMap.has(result.email.toLowerCase())) {
                studentsWhoAttended.add(result.email.toLowerCase());
            }
        }
                
        // Calculate completion rate
        const totalStudents = studentList.length;
        const attendedStudents = studentsWhoAttended.size;
        const completionRate = totalStudents > 0 ? Math.round((attendedStudents / totalStudents) * 10000) / 100 : 0;
                
        // Get total number of unique assessments taken by this PTS's students
        const uniqueAssessments = new Set();
        for (const result of allResults) {
            if (studentEmailMap.has(result.email.toLowerCase())) {
                uniqueAssessments.add(result.assessmentId);
            }
        }
                
        const completionReport = {
            totalAssessments: uniqueAssessments.size,
            totalStudents: totalStudents,
            studentsAttended: attendedStudents,
            completionRate: completionRate
        };
                
        // Also keep the detailed assessment analytics for individual assessment data
        const assessmentMap = new Map();
        for (const result of allResults) {
            if (studentEmailMap.has(result.email.toLowerCase())) {
                const assessmentId = result.assessmentId;
                if (!assessmentMap.has(assessmentId)) {
                    assessmentMap.set(assessmentId, {
                        assessmentTitle: result.assessmentId,
                        date: result.submittedAt,
                        totalParticipants: 0,
                        averageScore: 0,
                        highestScore: 0,
                        lowestScore: 100, // Start with maximum possible score
                        completionRate: 0,
                        scores: []
                    });
                }
                        
                const assessment = assessmentMap.get(assessmentId);
                assessment.totalParticipants += 1;
                        
                // Use percentage if available, otherwise calculate from score/maxScore
                let score = result.percentage;
                if (score === undefined || score === null) {
                    if (result.score !== undefined && result.maxScore && result.maxScore > 0) {
                        score = (result.score / result.maxScore) * 100;
                    } else {
                        score = 0; // Default to 0 if no valid score data
                    }
                }
                        
                assessment.scores.push(score);
                        
                if (score > assessment.highestScore) {
                    assessment.highestScore = score;
                }
                if (score < assessment.lowestScore) {
                    assessment.lowestScore = score;
                }
            }
        }
                
        // Calculate averages and completion rates for each assessment
        const assessmentAnalytics = Array.from(assessmentMap.values()).map(assessment => {
            const avgScore = assessment.scores.length > 0 
                ? assessment.scores.reduce((sum, score) => sum + score, 0) / assessment.scores.length
                : 0;
                    
            return {
                assessmentTitle: assessment.assessmentTitle,
                date: assessment.date,
                totalParticipants: assessment.totalParticipants,
                averageScore: Math.round(avgScore * 100) / 100,
                highestScore: assessment.highestScore,
                lowestScore: assessment.lowestScore,
                completionRate: Math.round((assessment.totalParticipants / studentList.length) * 10000) / 100
            };
        });
                
        // Sort assessments by date (most recent first)
        assessmentAnalytics.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // rawResults already filtered by user assessments at the beginning of the function
        const rawResults = allResults.filter(result => 
            studentEmailMap.has(result.email.toLowerCase())
        );
        
        res.json({
            success: true,
            data: {
                totalStudents: allStudentsWithAnalytics.length,
                activeStudents: totalActive,
                totalAssessments: totalAssessments,
                avgScore: overallAvgScore,
                topPerformers,
                completionReport, // Include completion report data
                assessments: assessmentAnalytics,
                rawResults // Include raw results for attempt report
            }
        });
    } catch (error) {
        console.error('Error getting student analytics:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve student analytics',
            error: error.message
        });
    }
});

// Get department statistics
router.get('/departments', authMiddleware.authenticateToken, async (req, res) => {
    try {
        // Get all students
        const studentsParams = {
            TableName: TABLE_NAME,
            FilterExpression: 'begins_with(SK, :student)',
            ExpressionAttributeValues: {
                ':student': 'STUDENT#'
            }
        };

        const studentsResult = await dynamodb.scan(studentsParams).promise();
        const students = studentsResult.Items || [];

        // Group by department
        const deptStats = students.reduce((acc: any, student: any) => {
            const dept = student.department || 'Unknown';
            if (!acc[dept]) {
                acc[dept] = {
                    department: dept,
                    totalStudents: 0,
                    activeStudents: 0
                };
            }
            acc[dept].totalStudents++;
            if (student.status === 'Active') {
                acc[dept].activeStudents++;
            }
            return acc;
        }, {});

        const departmentStats = Object.values(deptStats);

        res.json({
            success: true,
            data: departmentStats
        });
    } catch (error) {
        console.error('Error getting department stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve department statistics',
            error: error.message
        });
    }
});

// Get assessment analytics
router.get('/assessments', authMiddleware.authenticateToken, async (req, res) => {
    try {
        // Get all assessments
        const params = {
            TableName: TABLE_NAME,
            FilterExpression: 'SK = :metadata',
            ExpressionAttributeValues: {
                ':metadata': 'METADATA'
            }
        };

        const result = await dynamodb.scan(params).promise();
        const assessments = result.Items || [];

        // Filter only assessment items (PK starts with ASSESSMENT#)
        const assessmentData = assessments.filter((item: any) => 
            item.PK && item.PK.startsWith('ASSESSMENT#')
        );

        res.json({
            success: true,
            data: {
                totalAssessments: assessmentData.length,
                assessments: assessmentData
            }
        });
    } catch (error) {
        console.error('Error getting assessment analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve assessment analytics',
            error: error.message
        });
    }
});

// Get comprehensive analytics data for PTS dashboard
router.get('/pts-overview', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Getting PTS Overview Analytics ===');
        console.log('Request object:', JSON.stringify(req.user, null, 2));
        
        // Get requester email for domain-based filtering
        const requesterEmail = await getEmailFromRequest(req);
        console.log('Requester email:', requesterEmail);
        
        // Validate email format
        if (!requesterEmail || !requesterEmail.includes('@')) {
            throw new Error('Invalid email format: ' + requesterEmail);
        }
        
        // Use the results service to get PTS overview data, passing the requester's domain
        const ptsOverview = await resultsService.getPTSOverview(requesterEmail);
        
        res.json({
            success: true,
            data: ptsOverview
        });
    } catch (error) {
        console.error('Error getting PTS overview analytics:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve PTS overview analytics',
            error: error.message
        });
    }
});

module.exports = router;