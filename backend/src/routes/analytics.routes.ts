// @ts-nocheck
const express = require('express');
const authMiddleware = require('../auth/auth.middleware');
const AWS = require('aws-sdk');

const router = express.Router();
const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy';

// Get student analytics
router.get('/students', authMiddleware.authenticateToken, async (req, res) => {
    try {
        // Scan for all students
        const params = {
            TableName: TABLE_NAME,
            FilterExpression: 'begins_with(SK, :student)',
            ExpressionAttributeValues: {
                ':student': 'STUDENT#'
            }
        };

        const result = await dynamodb.scan(params).promise();
        const students = result.Items || [];

        // Count by department
        const departmentCount = students.reduce((acc: any, student: any) => {
            const dept = student.department || 'Unknown';
            acc[dept] = (acc[dept] || 0) + 1;
            return acc;
        }, {});

        // Count by status
        const activeCount = students.filter((s: any) => s.status === 'Active').length;

        res.json({
            success: true,
            data: {
                totalStudents: students.length,
                activeStudents: activeCount,
                departmentCounts: departmentCount,
                students: students.slice(0, 100) // Limit to 100 for performance
            }
        });
    } catch (error) {
        console.error('Error getting student analytics:', error);
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

module.exports = router;
