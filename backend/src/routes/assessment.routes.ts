// @ts-nocheck
const express = require('express');
const authMiddleware = require('../auth/auth.middleware');
const assessmentService = require('../services/AssessmentService');

const router = express.Router();

// All assessment routes are protected by authentication
// Some routes require specific roles+

// Get all assessments (student, instructor, admin)
router.get('/', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Get All Assessments Request ===');
        console.log('User:', req.user);
        
        const filters = {
            department: req.query.department,
            status: req.query.status
        };
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const lastKey = req.query.lastKey ? JSON.parse(req.query.lastKey as string) : null;
        
        const result = await assessmentService.getAllAssessments(filters, limit, lastKey);
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

// Get assessment by ID (student, instructor, admin)
router.get('/:id', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Get Assessment By ID Request ===');
        console.log('User:', req.user);
        console.log('Params:', req.params);
        
        const { id } = req.params;
        const result = await assessmentService.getAssessmentById(id);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('Error fetching assessment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch assessment'
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
        // Separate email and name fields
        // Use email from token or fall back to username if it looks like an email
        // First try to get email from frontend data, then from JWT token
        let createdBy = assessmentData.createdBy || null;
        
        // If not provided by frontend, try to extract from JWT token
        if (!createdBy) {
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
        }
        
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
        // Separate email and name fields
        // Use email from token or fall back to username if it looks like an email
        // First try to get email from frontend data, then from JWT token
        let updatedBy = assessmentData.updatedBy || null;
        
        // If not provided by frontend, try to extract from JWT token
        if (!updatedBy) {
            // Try common email fields in JWT tokens
            if (req.user.email) {
                updatedBy = req.user.email;
            } else if (req.user['cognito:email']) {
                updatedBy = req.user['cognito:email'];
            } else if (req.user.username && req.user.username.includes('@')) {
                updatedBy = req.user.username;
            } else if (req.user['cognito:username'] && req.user['cognito:username'].includes('@')) {
                updatedBy = req.user['cognito:username'];
            } else {
                // Fall back to sub (user ID) if no email found
                updatedBy = req.user.sub;
            }
        }
        
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
            
            const result = await assessmentService.updateAssessment(id, assessmentData, updatedBy);
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

module.exports = router;