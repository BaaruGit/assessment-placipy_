// @ts-nocheck
const express = require('express');
const AdminService = require('../services/AdminService');
const authMiddleware = require('../auth/auth.middleware');

const router = express.Router();
const adminService = new AdminService();

// Apply authentication middleware to all admin routes
router.use(authMiddleware.authenticateToken);

// Middleware to check admin role
const checkAdminRole = async (req, res, next) => {
  try {
    // Check if user has admin role in JWT
    if (req.user.role === 'Admin') {
      return next();
    }

    // Check if user has admin scope in JWT
    if (req.user.scope && req.user.scope.includes('aws.cognito.signin.user.admin')) {
      return next();
    }

    // Check if user has Admin group in Cognito
    if (req.user['cognito:groups'] && req.user['cognito:groups'].includes('Admin')) {
      return next();
    }

    // If none of the above, fetch user profile to check role
    const { getUserAttributes } = require('../auth/cognito');
    try {
      const userAttributes = await getUserAttributes(req.user.username || req.user.sub);
      const userRole = userAttributes.find(attr => attr.Name === 'custom:role')?.Value;
      
      if (userRole === 'Admin') {
        return next();
      }
    } catch (error) {
      console.log('Error fetching user attributes:', error.message);
    }

    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin role required.' 
    });
  } catch (error) {
    console.error('Error in admin role check:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error during role verification.' 
    });
  }
};

router.use(checkAdminRole);

// Dashboard Routes
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
});

// College Management Routes
router.get('/colleges', async (req, res) => {
  try {
    const colleges = await adminService.getAllColleges();
    res.json({
      success: true,
      data: colleges
    });
  } catch (error) {
    console.error('Error fetching colleges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch colleges',
      error: error.message
    });
  }
});

router.post('/colleges', async (req, res) => {
  try {
    const { name, domain, location, contactInfo } = req.body;
    
    // Validation
    if (!name || !domain) {
      return res.status(400).json({
        success: false,
        message: 'College name and domain are required'
      });
    }

    const college = await adminService.createCollege({
      name,
      domain,
      location,
      contactInfo,
      createdBy: req.user.userId
    });

    res.status(201).json({
      success: true,
      message: 'College created successfully',
      data: college
    });
  } catch (error) {
    console.error('Error creating college:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create college',
      error: error.message
    });
  }
});

router.get('/colleges/:collegeId', async (req, res) => {
  try {
    const { collegeId } = req.params;
    const college = await adminService.getCollegeById(collegeId);
    
    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found'
      });
    }

    res.json({
      success: true,
      data: college
    });
  } catch (error) {
    console.error('Error fetching college:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch college',
      error: error.message
    });
  }
});

router.put('/colleges/:collegeId', async (req, res) => {
  try {
    const { collegeId } = req.params;
    const updates = req.body;
    
    const college = await adminService.updateCollege(collegeId, {
      ...updates,
      updatedBy: req.user.userId
    });

    res.json({
      success: true,
      message: 'College updated successfully',
      data: college
    });
  } catch (error) {
    console.error('Error updating college:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update college',
      error: error.message
    });
  }
});

router.delete('/colleges/:collegeId', async (req, res) => {
  try {
    const { collegeId } = req.params;
    
    // Check if college has active users before deletion
    const hasUsers = await adminService.checkCollegeHasUsers(collegeId);
    if (hasUsers) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete college with active users. Please transfer or remove users first.'
      });
    }

    await adminService.deleteCollege(collegeId);

    res.json({
      success: true,
      message: 'College deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting college:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete college',
      error: error.message
    });
  }
});

// Officer Management Routes (Cross-college)
router.get('/officers', async (req, res) => {
  try {
    const { collegeId, role, status } = req.query;
    const officers = await adminService.getAllOfficers({
      collegeId,
      role,
      status
    });

    res.json({
      success: true,
      data: officers
    });
  } catch (error) {
    console.error('Error fetching officers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch officers',
      error: error.message
    });
  }
});

router.post('/officers', async (req, res) => {
  try {
    const { name, email, collegeId, role, department, phone, permissions } = req.body;
    
    // Validation
    if (!name || !email || !collegeId || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, college, and role are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    const officer = await adminService.createOfficer({
      name,
      email,
      collegeId,
      role,
      department,
      phone,
      permissions,
      createdBy: req.user.userId
    });

    // Extract sensitive information for admin notification only
    const { defaultPassword, loginInstructions, cognitoUserCreated, cognitoError, ...officerData } = officer;

    // Determine success message based on Cognito creation status
    let successMessage = 'Officer created successfully';
    let authStatus = 'Authentication account created';
    
    if (cognitoUserCreated === false) {
      successMessage = 'Officer created in database, but authentication setup needs attention';
      authStatus = cognitoError ? `Authentication account creation failed: ${cognitoError}` : 'Authentication account creation pending';
    }

    res.status(201).json({
      success: true,
      message: successMessage,
      data: officerData,
      authInfo: {
        message: authStatus,
        defaultPassword: defaultPassword, // Send password if it exists, regardless of cognitoUserCreated flag
        instructions: loginInstructions,
        cognitoStatus: cognitoUserCreated,
        note: cognitoUserCreated === true
          ? 'Please share the default password securely with the officer. They will be required to change it on first login.'
          : 'The officer record was created, but you may need to create their authentication account manually or retry.'
      }
    });
  } catch (error) {
    console.error('Error creating officer:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create officer';
    if (error.message.includes('authentication account')) {
      errorMessage = 'Failed to create authentication account';
    } else if (error.message.includes('UsernameExistsException')) {
      errorMessage = 'An account with this email already exists';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  }
});

router.put('/officers/:officerId', async (req, res) => {
  try {
    const { officerId } = req.params;
    const updates = req.body;
    
    const officer = await adminService.updateOfficer(officerId, {
      ...updates,
      updatedBy: req.user.userId
    });

    res.json({
      success: true,
      message: 'Officer updated successfully',
      data: officer
    });
  } catch (error) {
    console.error('Error updating officer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update officer',
      error: error.message
    });
  }
});

router.delete('/officers/:officerId', async (req, res) => {
  try {
    const { officerId } = req.params;
    
    await adminService.deleteOfficer(officerId);

    res.json({
      success: true,
      message: 'Officer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting officer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete officer',
      error: error.message
    });
  }
});

// Department Management Routes
router.get('/departments', async (req, res) => {
  try {
    const { collegeId } = req.query;
    const departments = await adminService.getAllDepartments(collegeId);

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
      error: error.message
    });
  }
});

// Assessment Management Routes
router.get('/assessments', async (req, res) => {
  try {
    const { status, collegeId } = req.query;
    const assessments = await adminService.getAllAssessments({
      status,
      collegeId
    });

    res.json({
      success: true,
      data: assessments
    });
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assessments',
      error: error.message
    });
  }
});

// Reports Routes
router.get('/reports/performance', async (req, res) => {
  try {
    const { startDate, endDate, collegeId } = req.query;
    const performanceData = await adminService.getPerformanceReport({
      startDate,
      endDate,
      collegeId
    });

    res.json({
      success: true,
      data: performanceData
    });
  } catch (error) {
    console.error('Error generating performance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate performance report',
      error: error.message
    });
  }
});

router.get('/reports/colleges', async (req, res) => {
  try {
    const collegeReports = await adminService.getCollegeReports();

    res.json({
      success: true,
      data: collegeReports
    });
  } catch (error) {
    console.error('Error generating college reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate college reports',
      error: error.message
    });
  }
});

// Admin Profile Routes
router.get('/profile', async (req, res) => {
  try {
    // Debug: Log the entire user object to see what's available
    
    // Get email from the validated token - try multiple possible fields
    let email = req.user.email || 
                req.user['cognito:username'] || 
                req.user.username || 
                req.user.sub;
    
    // If the extracted value is not a valid email, try to fetch from Cognito
    if (!email || !email.includes('@')) {
      const { getUserAttributes } = require('../auth/cognito');
      try {
        const userId = req.user.sub || req.user['cognito:username'] || req.user.username;
        
        const userInfo = await getUserAttributes(userId);
        
        // Extract email from Cognito attributes
        if (Array.isArray(userInfo)) {
          const emailAttr = userInfo.find(attr => attr.Name === 'email');
          if (emailAttr) {
            email = emailAttr.Value;
          }
        } else if (userInfo.attributes && userInfo.attributes.email) {
          email = userInfo.attributes.email;
        }
      } catch (cognitoError) {
        console.error('Error fetching from Cognito:', cognitoError);
      }
    }
    
    // Validate email format
    if (!email || !email.includes('@')) {
      console.error('Invalid email after all attempts:', email);
      return res.status(400).json({
        success: false,
        message: 'Email not found in token or Cognito. Please ensure your account has a valid email.'
      });
    }
    
    const profile = await adminService.getAdminProfile(email);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin profile',
      error: error.message
    });
  }
});

router.put('/profile', async (req, res) => {
  try {
    // Get email from the validated token - try multiple possible fields
    let email = req.user.email || 
                req.user['cognito:username'] || 
                req.user.username || 
                req.user.sub;
    
    // If the extracted value is not a valid email, try to fetch from Cognito
    if (!email || !email.includes('@')) {
      const { getUserAttributes } = require('../auth/cognito');
      try {
        const userId = req.user.sub || req.user['cognito:username'] || req.user.username;
        const userInfo = await getUserAttributes(userId);
        
        if (Array.isArray(userInfo)) {
          const emailAttr = userInfo.find(attr => attr.Name === 'email');
          if (emailAttr) {
            email = emailAttr.Value;
          }
        } else if (userInfo.attributes && userInfo.attributes.email) {
          email = userInfo.attributes.email;
        }
      } catch (cognitoError) {
        console.error('Error fetching from Cognito:', cognitoError);
      }
    }
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Email not found in token or Cognito'
      });
    }

    const updates = req.body;
    const profile = await adminService.updateAdminProfile(email, updates);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: profile
    });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin profile',
      error: error.message
    });
  }
});

// Settings Routes
router.get('/settings', async (req, res) => {
  try {
    const settings = await adminService.getSystemSettings();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const updates = req.body;
    const settings = await adminService.updateSystemSettings({
      ...updates,
      updatedBy: req.user.userId
    });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
});

// Assessment Analytics Routes
router.get('/analytics/assessment-results', async (req, res) => {
  try {
    const results = await adminService.getAssessmentResults();
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching assessment results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assessment results',
      error: error.message
    });
  }
});

router.get('/analytics/performance-overview', async (req, res) => {
  try {
    const overview = await adminService.getPerformanceOverview();
    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('Error fetching performance overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance overview',
      error: error.message
    });
  }
});

router.get('/analytics/assessment-stats/:assessmentId', async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const stats = await adminService.getAssessmentStats(assessmentId);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching assessment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assessment stats',
      error: error.message
    });
  }
});

router.get('/analytics/department-performance', async (req, res) => {
  try {
    const performance = await adminService.getDepartmentPerformance();
    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Error fetching department performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department performance',
      error: error.message
    });
  }
});

module.exports = router;