// @ts-nocheck
const express = require('express');
const authMiddleware = require('../auth/auth.middleware');
const assessmentService = require('../services/AssessmentService');
const { getUserAttributes } = require('../auth/cognito');
/**
 * Helper function to get user email from Cognito profile
 * Always fetches the actual email from the user's profile
 */
async function getEmailFromRequest(req) {
    // Get user ID from JWT token
    const userId = req.user?.['cognito:username'] || req.user?.username || req.user?.sub;
    
    if (!userId) {
        throw new Error('User ID not found in authentication token');
    }
    
    try {
        console.log('Fetching email from Cognito profile for user ID:', userId);
        // Always fetch email from Cognito profile to ensure accuracy
        const userInfo = await getUserAttributes(userId);
        const email = userInfo?.attributes?.email;
        
        if (!email) {
            throw new Error('Email not found in user profile');
        }
        
        console.log('Got email from Cognito profile:', email);
        return email.toLowerCase();
    } catch (error) {
        console.error('Error fetching email from Cognito profile:', error);
        throw new Error('Failed to fetch user email from profile: ' + error.message);
    }
}

const router = express.Router();

// All assessment routes are protected by authentication
// Some routes require specific roles+

// Get all assessments (student, instructor, admin)
router.get('/', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Get All Assessments Request ===');
        console.log('User:', req.user);

        // Get requester email from Cognito profile
        const requesterEmail = await getEmailFromRequest(req);
        
        // Decode department parameter (it might be URL-encoded like "Information+Technology")
        const departmentParam = req.query.department ? decodeURIComponent(req.query.department as string) : undefined;
        console.log('=== Route Handler Department Filter ===');
        console.log('Raw department query param:', req.query.department);
        console.log('Decoded department param:', departmentParam);
        
        const filters = {
            department: departmentParam,
            status: req.query.status,
            // Extract domain from user email for better performance
            clientDomain: requesterEmail.split('@')[1]
        };
        console.log('Final filters object:', JSON.stringify(filters, null, 2));
        
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const lastKey = req.query.lastKey ? JSON.parse(req.query.lastKey as string) : null;

        const result = await assessmentService.getAllAssessments(filters, limit, lastKey);
        console.log('=== Route Handler Result ===');
        console.log('Number of assessments returned:', result.items.length);
        console.log('Department values in returned assessments:', result.items.map((a: any) => ({ id: a.assessmentId, dept: a.department })));        
        res.status(200).json({
            success: true,
            data: result.items,
            lastKey: result.lastKey,
        });
    } catch (error: any) {
        console.error('Error fetching assessments:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch assessments'
        });
    }
});

// Get assessments created by the current user (PTS)
router.get('/my-assessments', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Get My Assessments Request ===');
        console.log('User:', req.user);
        
        // Get requester email from Cognito profile
        const requesterEmail = await getEmailFromRequest(req);
        
        // Extract domain from user email
        const requesterDomain = requesterEmail.split('@')[1];
        
        console.log('Requester email:', requesterEmail);
        console.log('Requester domain:', requesterDomain);
        
        // Get all assessments for the requester's domain
        const filters = {
            clientDomain: requesterDomain
        };
        
        // Call the assessment service to get all assessments
        const result = await assessmentService.getAllAssessments(filters);
        
        // Filter assessments by the owner (createdBy field)
        const userAssessments = result.items.filter((assessment: any) => {
            // Check if the assessment was created by the current user
            // This can be checked by comparing the createdBy field with the requester email
            return assessment.createdBy && assessment.createdBy.toLowerCase() === requesterEmail.toLowerCase();
        });
        
        console.log('Number of assessments found for user:', userAssessments.length);
        
        res.status(200).json({
            success: true,
            data: userAssessments
        });
    } catch (error: any) {
        console.error('Error fetching user assessments:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch assessments'
        });
    }
});

// Get assessment by ID (student, instructor, admin)
router.get('/:id', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Get Assessment By ID Request ===');
        console.log('User:', req.user);
        console.log('Params:', req.params);

        const { id } = req.params;
        // Get requester email from Cognito profile and extract domain
        const requesterEmail = await getEmailFromRequest(req);
        const domain = requesterEmail.split('@')[1];
        console.log('Extracted domain from user email:', domain);
        
        // Validate assessment ID
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Assessment ID is required'
            });
        }
        
        console.log(`Calling getAssessmentById with id: ${id}, domain: ${domain}`);
        const result = await assessmentService.getAssessmentById(id, domain);
        
        // Check if we got a result
        if (!result) {
            console.log(`Assessment ${id} not found for domain ${domain}`);
            return res.status(404).json({
                success: false,
                message: `Assessment ${id} not found for domain ${domain}. Please check if the assessment exists and you have access to it.`
            });
        }
        
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('Error fetching assessment:', error);
        
        // Provide more specific error messages
        if (error.message && error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch assessment'
        });
    }
});

// Get assessment by ID with questions (enhanced version)
router.get('/:id/with-questions', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Get Assessment With Questions Request ===');
        console.log('User:', req.user);
        console.log('Params:', req.params);
        console.log('Assessment service methods:', Object.keys(assessmentService));

        const { id } = req.params;
        // Get requester email from Cognito profile and extract domain
        const requesterEmail = await getEmailFromRequest(req);
        const domain = requesterEmail.split('@')[1];
        console.log('Extracted domain from user email:', domain);
        
        // Validate assessment ID
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Assessment ID is required'
            });
        }
        
        // Check if the method exists
        if (typeof assessmentService.getAssessmentWithQuestions !== 'function') {
            console.error('getAssessmentWithQuestions method not found on assessmentService');
            return res.status(500).json({
                success: false,
                message: 'Method not implemented'
            });
        }
        
        console.log(`Calling getAssessmentWithQuestions with id: ${id}, domain: ${domain}`);
        const result = await assessmentService.getAssessmentWithQuestions(id, domain);
        
        // Check if we got a result
        if (!result) {
            console.log(`Assessment ${id} not found for domain ${domain}`);
            return res.status(404).json({
                success: false,
                message: `Assessment ${id} not found for domain ${domain}. Please check if the assessment exists and you have access to it.`
            });
        }
        
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('Error fetching assessment with questions:', error);
        
        // Provide more specific error messages
        if (error.message && error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch assessment with questions'
        });
    }
});

// Get assessment questions by ID
router.get('/:id/questions', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Get Assessment Questions Request ===');
        console.log('User:', req.user);
        console.log('Params:', req.params);

        const { id: assessmentId } = req.params;
        // Get requester email from Cognito profile and extract domain
        const requesterEmail = await getEmailFromRequest(req);
        const domain = requesterEmail.split('@')[1];
        console.log('Extracted domain from user email:', domain);

        // Validate assessment ID
        if (!assessmentId) {
            return res.status(400).json({
                success: false,
                message: 'Assessment ID is required'
            });
        }

        console.log(`Calling getAssessmentQuestions with id: ${assessmentId}, domain: ${domain}`);
        const result = await assessmentService.getAssessmentQuestions(assessmentId, domain);
        
        // Check if assessment exists but has no questions
        if (result && Array.isArray(result) && result.length === 0) {
            console.log(`Assessment ${assessmentId} exists but has no questions`);
        }
        
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('Error fetching assessment questions:', error);
        
        // Provide more specific error messages
        if (error.message && error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch assessment questions'
        });
    }
});

// Create a new assessment (no role restrictions)
router.post('/', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Create Assessment Request ===');
        console.log('User:', req.user);
        console.log('Body:', req.body);

        const assessmentData = req.body;
        // Get creator email from Cognito profile
        const createdBy = await getEmailFromRequest(req);

        console.log('JWT token user object:', JSON.stringify(req.user, null, 2));
        // Try multiple possible fields for the user's name
        const createdByName = assessmentData.createdByName ||  // Use from frontend if provided
            req.user.name ||
            (req.user.given_name && req.user.family_name ? `${req.user.given_name} ${req.user.family_name}` : null) ||
            req.user.given_name ||
            req.user.family_name ||
            req.user['cognito:username'] ||
            req.user.username ||
            createdBy;  // Fall back to createdBy (email) if no name found

        console.log('Extracted createdBy (email):', createdBy);
        console.log('Extracted createdByName:', createdByName);
        console.log('Frontend provided createdBy:', assessmentData.createdBy);
        console.log('Frontend provided createdByName:', assessmentData.createdByName);

        // Add the createdByName to the assessment data
        assessmentData.createdByName = createdByName;

        // Log the complete assessment data before sending to service
        console.log('Complete assessment data being sent to service:', JSON.stringify(assessmentData, null, 2));

        // Log specific scheduling data
        console.log('Scheduling data:', {
            startDate: assessmentData.startDate,
            endDate: assessmentData.endDate,
            timezone: assessmentData.timezone
        });

        const result = await assessmentService.createAssessment(assessmentData, createdBy);
        
        // Backend notifications disabled: frontend handles assessment_published notifications
        
        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('Error creating assessment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create assessment'
        });
    }
});

// Update an assessment (no role restrictions)
router.put('/:id', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Update Assessment Request ===');
        console.log('User:', req.user);
        console.log('Params:', req.params);
        console.log('Body:', req.body);

        const { id } = req.params;
        const assessmentData = req.body;
        // Get updater email from Cognito profile
        const updatedBy = await getEmailFromRequest(req);

        console.log('JWT token user object:', JSON.stringify(req.user, null, 2));
        // Try multiple possible fields for the user's name
        const updatedByName = assessmentData.updatedByName ||  // Use from frontend if provided
            req.user.name ||
            (req.user.given_name && req.user.family_name ? `${req.user.given_name} ${req.user.family_name}` : null) ||
            req.user.given_name ||
            req.user.family_name ||
            req.user['cognito:username'] ||
            req.user.username ||
            updatedBy;  // Fall back to updatedBy (email) if no name found

        console.log('Extracted updatedBy (email):', updatedBy);
        console.log('Extracted updatedByName:', updatedByName);
        console.log('Frontend provided updatedBy:', assessmentData.updatedBy);
        console.log('Frontend provided updatedByName:', assessmentData.updatedByName);

        // Add the updatedByName to the assessment data
        assessmentData.updatedByName = updatedByName;

        // Check if assessment is being published (isPublished changing from false to true)
        const wasPublished = assessmentData.wasPublished === false || assessmentData.wasPublished === undefined;
        const isBeingPublished = assessmentData.isPublished === true && wasPublished;

        const result = await assessmentService.updateAssessment(id, assessmentData, updatedBy);
        
        // Backend notifications disabled: frontend handles assessment_published notifications
        
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('Error updating assessment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update assessment'
        });
    }
});

// Delete an assessment (no role restrictions)
router.delete('/:id', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Delete Assessment Request ===');
        console.log('User:', req.user);
        console.log('Params:', req.params);

        const { id } = req.params;
        await assessmentService.deleteAssessment(id);
        res.status(200).json({
            success: true,
            message: 'Assessment deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting assessment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete assessment'
        });
    }
});

// Export assessments to CSV
router.get('/export/csv', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Export Assessments to CSV Request ===');
        console.log('User:', req.user);

        const filters = {
            department: req.query.department,
            status: req.query.status
        };

        const result = await assessmentService.getAllAssessments(filters);

        // Create CSV content
        let csvContent = 'Title,Description,Department,Duration,Difficulty,Category,Status,StartDate,EndDate,Timezone,MaxAttempts,PassingScore,RandomizeQuestions,CreatedAt,UpdatedAt\n';

        result.items.forEach((assessment: any) => {
            csvContent += `"${assessment.title || ''}",`;
            csvContent += `"${assessment.description || ''}",`;
            csvContent += `"${assessment.department || ''}",`;
            csvContent += `${assessment.configuration?.duration || 60},`;
            csvContent += `"${assessment.difficulty || 'MEDIUM'}",`;
            csvContent += `"${assessment.category || 'MCQ'}",`;
            csvContent += `"${assessment.status || 'ACTIVE'}",`;
            csvContent += `"${assessment.scheduling?.startDate || ''}",`;
            csvContent += `"${assessment.scheduling?.endDate || ''}",`;
            csvContent += `"${assessment.scheduling?.timezone || 'Asia/Kolkata'}",`;
            csvContent += `${assessment.configuration?.maxAttempts || 1},`;
            csvContent += `${assessment.configuration?.passingScore || 50},`;
            csvContent += `${assessment.configuration?.randomizeQuestions || false},`;
            csvContent += `"${assessment.createdAt || ''}",`;
            csvContent += `"${assessment.updatedAt || ''}"\n`;
        });

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv;charset=utf-8;');
        res.setHeader('Content-Disposition', `attachment; filename="assessments-${new Date().toISOString().split('T')[0]}.csv"`);

        // Add BOM for UTF-8 to ensure Excel opens it correctly
        const BOM = '\uFEFF';
        res.send(BOM + csvContent);
    } catch (error: any) {
        console.error('Error exporting assessments to CSV:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to export assessments to CSV'
        });
    }
});

// Import assessments from CSV
router.post('/import/csv', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Import Assessments from CSV Request ===');
        console.log('User:', req.user);
        console.log('Body:', req.body);

        const { rows } = req.body;

        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No data provided for import'
            });
        }

        // Use email from token or fall back to username if it looks like an email
        // For CSV import, we don't have frontend data, so extract from JWT token
        let createdBy = null;

        // Try common email fields in JWT tokens
        if (req.user.email) {
            createdBy = req.user.email;
        } else if (req.user['cognito:email']) {
            createdBy = req.user['cognito:email'];
        } else if (req.user.username && req.user.username.includes('@')) {
            createdBy = req.user.username;
        } else if (req.user['cognito:username'] && req.user['cognito:username'].includes('@')) {
            createdBy = req.user['cognito:username'];
        } else {
            // Fall back to sub (user ID) if no email found
            createdBy = req.user.sub;
        }

        console.log('JWT token user object:', JSON.stringify(req.user, null, 2));
        // Try multiple possible fields for the user's name
        const createdByName = req.user.name ||
            (req.user.given_name && req.user.family_name ? `${req.user.given_name} ${req.user.family_name}` : null) ||
            req.user.given_name ||
            req.user.family_name ||
            req.user['cognito:username'] ||
            req.user.username ||
            createdBy;  // Fall back to createdBy (email) if no name found

        // Prepare assessment data for bulk import
        const assessmentsData = rows.map((row: any) => ({
            title: row.Title || row.title || '',
            description: row.Description || row.description || '',
            department: row.Department || row.department || '',
            duration: row.Duration ? parseInt(row.Duration) : 60,
            difficulty: row.Difficulty || row.difficulty || 'MEDIUM',
            category: row.Category ? (Array.isArray(row.Category) ? row.Category : row.Category.split(';')) : ['MCQ'],
            status: row.Status || row.status || 'ACTIVE',
            scheduling: {
                startDate: row.StartDate || row.startDate || new Date().toISOString(),
                endDate: row.EndDate || row.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                timezone: row.Timezone || row.timezone || 'Asia/Kolkata'
            },
            configuration: {
                maxAttempts: row.MaxAttempts ? parseInt(row.MaxAttempts) : 1,
                passingScore: row.PassingScore ? parseInt(row.PassingScore) : 50,
                randomizeQuestions: row.RandomizeQuestions ? row.RandomizeQuestions.toLowerCase() === 'true' : false,
                totalQuestions: 0 // Will be set when questions are added
            },
            questions: [], // Empty for now, can be populated separately
            referenceMaterials: [],
            target: {
                departments: [row.Department || row.department || ''],
                years: []
            },
            stats: {
                avgScore: 0,
                completed: 0,
                highestScore: 0,
                totalParticipants: 0
            },
            entities: [],
            isPublished: false,
            createdByName: createdByName
        }));

        // Create assessments one by one
        const results = [];
        for (const assessmentData of assessmentsData) {
            try {
                const result = await assessmentService.createAssessment(assessmentData, createdBy);
                results.push({
                    title: assessmentData.title,
                    status: 'created',
                    id: result.assessmentId,
                    error: null
                });
            } catch (error: any) {
                results.push({
                    title: assessmentData.title || 'Unknown',
                    status: 'failed',
                    id: null,
                    error: error.message
                });
            }
        }

        const successCount = results.filter((r: any) => r.status === 'created').length;
        const failedCount = results.filter((r: any) => r.status === 'failed').length;

        res.status(200).json({
            success: true,
            message: `Import completed: ${successCount} created, ${failedCount} failed`,
            data: results
        });
    } catch (error: any) {
        console.error('Error importing assessments from CSV:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to import assessments from CSV'
        });
    }
});

// Test endpoint to check if routes are working
router.get('/test-route', authMiddleware.authenticateToken, async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Test route is working',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
