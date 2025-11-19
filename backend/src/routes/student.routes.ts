// @ts-nocheck
const express = require('express');
const router = express.Router();
const studentService = require('../services/StudentService');
const { authenticateToken } = require('../auth/auth.middleware');

/**
 * GET /api/students
 * Get all students
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const students = await studentService.getAllStudents();
        res.status(200).json({
            success: true,
            data: students
        });
    } catch (error) {
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
        const student = await studentService.getStudentByEmail(email);
        
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
        const createdByEmail = req.user.email;

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
        
        // Try to get email from different possible fields
        const updatedByEmail = req.user?.email || req.user?.username || req.user?.sub || null;

        // Add validation for updatedByEmail
        if (!updatedByEmail) {
            return res.status(400).json({
                success: false,
                error: 'User email not found in authentication token'
            });
        }

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
        await studentService.deleteStudent(email);
        
        res.status(200).json({
            success: true,
            message: 'Student deleted successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;