// @ts-nocheck
const express = require('express');
const router = express.Router();
const studentService = require('../services/StudentService');
const { authenticateToken } = require('../auth/auth.middleware');
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

/**
 * GET /api/students
 * Get all students
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const requesterEmail = await getEmailFromRequest(req);
        console.log('GET /api/students - Requester email:', requesterEmail);
        const students = await studentService.getAllStudents(requesterEmail);
        res.status(200).json({
            success: true,
            data: students
        });
    } catch (error) {
        console.error('Error in GET /api/students:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/students/:email
 * Get student by email
 */
router.get('/:email', authenticateToken, async (req, res) => {
    try {
        const { email } = req.params;
        const requesterEmail = await getEmailFromRequest(req);
        console.log('GET /api/students/:email - Requester email:', requesterEmail);
        const student = await studentService.getStudentByEmail(email, requesterEmail);
        
        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }

        res.status(200).json({
            success: true,
            data: student
        });
    } catch (error) {
        console.error('Error in GET /api/students/:email:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/students
 * Create or update student (Upsert)
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const studentData = req.body;
        const createdByEmail = await getEmailFromRequest(req);
        console.log('POST /api/students - Creator email:', createdByEmail);

        // Validate required fields
        if (!studentData.email || !studentData.rollNumber || !studentData.name || !studentData.department) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: email, rollNumber, name, department'
            });
        }

        const student = await studentService.upsertStudent(studentData, createdByEmail);
        
        res.status(200).json({
            success: true,
            message: 'Student saved successfully',
            data: student
        });
    } catch (error) {
        console.error('Error in POST /api/students:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/students/:email/status
 * Update student status
 */
router.put('/:email/status', authenticateToken, async (req, res) => {
    try {
        // Debug the user object
        console.log('req.user object:', JSON.stringify(req.user, null, 2));
        
        const { email } = req.params;
        const { status } = req.body;
        
        const updatedByEmail = await getEmailFromRequest(req);
        console.log('PUT /api/students/:email/status - Updater email:', updatedByEmail);

        if (!status || !['Active', 'Inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be "Active" or "Inactive"'
            });
        }

        const student = await studentService.updateStudentStatus(email, status, updatedByEmail);
        
        res.status(200).json({
            success: true,
            message: 'Student status updated successfully',
            data: student
        });
    } catch (error) {
        console.error('Error in PUT /api/students/:email/status:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/students/:email
 * Delete student
 */
router.delete('/:email', authenticateToken, async (req, res) => {
    try {
        const { email } = req.params;
        const requesterEmail = await getEmailFromRequest(req);
        console.log('DELETE /api/students/:email - Requester email:', requesterEmail);
        const result = await studentService.deleteStudent(email, requesterEmail);
        
        res.status(200).json({
            success: true,
            message: 'Student deleted successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in DELETE /api/students/:email:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;