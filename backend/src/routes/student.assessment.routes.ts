// @ts-nocheck
const express = require('express');
const authMiddleware = require('../auth/auth.middleware');
const studentAssessmentService = require('../services/StudentAssessmentService');

const router = express.Router();

console.log('Student assessment routes loaded');

// Get assessment with questions by ID for students
router.get('/:assessmentId/with-questions', authMiddleware.authenticateToken, async (req, res) => {
    try {
        console.log('=== Get Student Assessment With Questions Request ===');
        console.log('User:', req.user);
        console.log('Params:', req.params);
        console.log('Headers:', req.headers);

        const { assessmentId } = req.params;
        
        // Validate assessment ID
        if (!assessmentId) {
            return res.status(400).json({
                success: false,
                message: 'Assessment ID is required'
            });
        }
        
        // Get requester email for domain-based filtering
        const requesterEmail = req.user?.email || req.user?.username || req.user?.sub || '';
        console.log(`Fetching assessment ${assessmentId} with questions for user: ${requesterEmail}`);
        const result = await studentAssessmentService.getAssessmentWithQuestions(assessmentId, requesterEmail);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                message: `Assessment ${assessmentId} not found`
            });
        }
        
        // Separate assessment metadata and questions
        const { assessment, questions } = result;
        
        res.status(200).json({
            success: true,
            data: {
                assessment,
                questions
            }
        });
    } catch (error: any) {
        console.error('Error fetching student assessment with questions:', error);
        
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

console.log('Student assessment routes defined');

module.exports = router;