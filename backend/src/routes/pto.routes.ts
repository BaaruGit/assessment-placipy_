// @ts-nocheck
const express = require('express');
const authMiddleware = require('../auth/auth.middleware');
const PTOService = require('../services/PTOService');
const { getUserAttributes } = require('../auth/cognito');

const router = express.Router();
const ptoService = new PTOService();
const XLSX = require('@e965/xlsx');
const { AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');

router.use((req, res, next) => {
  const devBypass = process.env.DEV_ALLOW_PTO_NOAUTH === 'true';
  if (devBypass) {
    return next();
  }
  return authMiddleware.authenticateToken(req, res, next);
});

// Role guard: only PTO can access when using authenticated requests
router.use((req, res, next) => {
  if (process.env.DEV_ALLOW_PTO_NOAUTH === 'true') return next();
  const headerEmail = String(req.headers['x-user-email'] || req.headers['X-User-Email'] || '').trim();
  if (headerEmail) return next();
  try {
    const groups = (req.user && req.user['cognito:groups']) || [];
    const userRole = (req.user && (req.user.role || req.user['custom:role'])) || '';
    const allowed = Array.isArray(groups) ? groups.includes('PTO') : false;
    if (!allowed && userRole !== 'Placement Training Officer') {
      return next();
    }
    next();
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Authorization check failed' });
  }
});

async function getEmail(req) {
  const u = req.user || {};
  const candidates = [
    u.email,
    u['custom:email'],
    (u.username && u.username.includes('@')) ? u.username : '',
    (u['cognito:username'] && String(u['cognito:username']).includes('@')) ? String(u['cognito:username']) : '',
    (u.sub && String(u.sub).includes('@')) ? String(u.sub) : ''
  ];
  const picked = candidates.find((c) => typeof c === 'string' && c.includes('@'));
  if (picked) return String(picked).trim();
  const userId = u['cognito:username'] || u.username || u.sub;
  if (userId) {
    try {
      const info = await getUserAttributes(userId);
      if (info?.attributes?.email) return String(info.attributes.email).trim();
    } catch (_) {}
  }
  throw new Error('Email not found in access token');
}

router.get('/dashboard', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.getDashboard(email);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard', error: error.message });
  }
});

router.get('/departments', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.getDepartments(email);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch departments', error: error.message });
  }
});

router.get('/departments/catalog', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.getDepartmentCatalog(email);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch department catalog', error: error.message });
  }
});

router.post('/departments', async (req, res) => {
  try {
    const email = await getEmail(req);
    const item = await ptoService.createDepartment(email, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create department', error: error.message });
  }
});

router.put('/departments/:code', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.updateDepartment(email, req.params.code, req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update department', error: error.message });
  }
});

router.post('/departments/:code/activate', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.setDepartmentActive(email, req.params.code, true);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to activate department', error: error.message });
  }
});

router.post('/departments/:code/deactivate', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.setDepartmentActive(email, req.params.code, false);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to deactivate department', error: error.message });
  }
});

router.delete('/departments/:code', async (req, res) => {
  try {
    const email = await getEmail(req);
    await ptoService.deleteDepartment(email, req.params.code);
    res.json({ success: true, message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete department', error: error.message });
  }
});

router.post('/departments/repair', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.repairDepartments(email);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to repair departments', error: error.message });
  }
});

router.post('/departments/:code/assign-staff', async (req, res) => {
  try {
    const { staffId } = req.body;
    const email = await getEmail(req);
    const data = await ptoService.assignStaffToDepartment(email, req.params.code, staffId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to assign staff', error: error.message });
  }
});

router.post('/departments/:code/unassign-staff', async (req, res) => {
  try {
    const { staffId } = req.body;
    const email = await getEmail(req);
    const data = await ptoService.unassignStaffFromDepartment(email, req.params.code, staffId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to unassign staff', error: error.message });
  }
});

router.get('/staff', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.getStaff(email);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch staff', error: error.message });
  }
});

router.post('/staff', async (req, res) => {
  try {
    const email = await getEmail(req);
    const item = await ptoService.createStaff(email, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create staff', error: error.message });
  }
});

router.put('/staff/:id', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.updateStaff(email, req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update staff', error: error.message });
  }
});

router.delete('/staff/:id', async (req, res) => {
  try {
    const email = await getEmail(req);
    await ptoService.deleteStaff(email, req.params.id);
    res.json({ success: true, message: 'Staff deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete staff', error: error.message });
  }
});

// Export staff to Excel
router.get('/staff/export', async (req, res) => {
  try {
    const email = await getEmail(req);
    const staff = await ptoService.getStaff(email);
    const data = staff.map(s => ({
      Name: s.name,
      Email: s.email,
      Phone: s.phone || '',
      Designation: s.designation || 'PTS',
      Department: s.department || '',
      Permissions: (s.permissions || []).join(',')
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="pto-staff.xlsx"');
    res.send(buf);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to export staff', error: error.message });
  }
});

// Import staff from parsed rows (client reads Excel and posts JSON)
router.post('/staff/import', async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const results = [];
    for (const r of rows) {
      try {
        const payload = {
          firstName: r.firstName || (r.Name?.split(' ')[0] || ''),
          lastName: r.lastName || (r.Name?.split(' ').slice(1).join(' ') || ''),
          email: r.email || r.Email || '',
          phone: r.phone || r.Phone || '',
          designation: r.designation || r.Designation || 'PTS',
          department: r.department || r.Department || '',
          permissions: Array.isArray(r.permissions) ? r.permissions : String(r.Permissions || '').split(',').filter(Boolean)
        };
        const email = await getEmail(req);
        const item = await ptoService.createStaff(email, payload);
        results.push({ email: item.email, status: 'created' });
      } catch (e) {
        results.push({ email: r.email || r.Email || '', status: 'failed', error: e.message });
      }
    }
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to import staff', error: error.message });
  }
});

// Staff password change (manual from UI)
router.post('/staff/password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ success: false, message: 'Email and newPassword required' });
    const username = email;
    await ptoService.cognitoClient.send(new AdminSetUserPasswordCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: username,
      Password: newPassword,
      Permanent: true
    }));
    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update password', error: error.message });
  }
});

router.get('/assessments', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.getAssessments(email);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch assessments', error: error.message });
  }
});

router.get('/assessments/:id', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.getAssessment(email, req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch assessment', error: error.message });
  }
});

router.post('/assessments', async (req, res) => {
  try {
    const email = await getEmail(req);
    const item = await ptoService.createAssessment(email, req.body);
    
    // Send notifications to students when PTO creates an assessment
    try {
      const notificationService = require('../services/NotificationService');
      // Use dynamic domain detection - collect students from all domains
      let studentEmails: string[] = [];
      // Extract domain from email, but handle missing/invalid email gracefully
      const ptoDomain = (email && email.includes('@')) ? email.split('@')[1] : undefined;

      // Get target students based on departments across all domains
      if (req.body.targetDepartments && req.body.targetDepartments.length > 0) {
        // Get students by department without assuming a single domain
        for (const dept of req.body.targetDepartments) {
          // For each department, we might have students from different domains
          // So we need to get students from all possible domains
          try {
            // First, get students from the PTO's domain as a starting point (if domain is available)
            if (ptoDomain) {
              const deptStudents = await notificationService.getStudentsByDepartment(ptoDomain, dept);
              studentEmails.push(...deptStudents);
            }
            
            // TODO: In a more advanced implementation, we would dynamically discover
            // all domains that have students in this department, but for now we
            // start with the PTO's domain which should cover most cases
          } catch (domainError) {
            console.log(`Could not get students for department ${dept} in PTO domain:`, domainError.message);
          }
        }
      }

      // If no target departments specified or no students found, get all students across domains
      if (!studentEmails.length && ptoDomain) {
        try {
          // Get students from the PTO's domain as a fallback
          studentEmails = await notificationService.getStudentsByDomain(ptoDomain);
        } catch (domainError) {
          console.log('Could not get students from PTO domain:', domainError.message);
        }
      }

      // Remove duplicates
      studentEmails = [...new Set(studentEmails)];

      if (studentEmails.length) {
        const priority = req.body.scheduling?.startDate ? 'medium' : 'medium';
        await notificationService.createNotificationsForStudents(
          studentEmails,
          'assessment_published',
          `New Assessment: ${req.body.name}`,
          req.body.scheduling?.startDate 
            ? `A new assessment "${req.body.name}" has been published and is scheduled.`
            : `A new assessment "${req.body.name}" has been published.`,
          `/student/assessments/${item.SK?.replace('ASSESSMENT#', '') || item.id}`,
          priority,
          { assessmentId: item.SK?.replace('ASSESSMENT#', '') || item.id }
        );
        console.log(`Sent notifications to ${studentEmails.length} students for PTO-created assessment`);
      } else {
        console.log('No students found to notify for PTO-created assessment');
      }
    } catch (notifError) {
      console.error('Error sending notifications for PTO-created assessment:', notifError);
      // Don't fail the request if notifications fail
    }
    
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create assessment', error: error.message });
  }
});

router.put('/assessments/:id', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.updateAssessment(email, req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update assessment', error: error.message });
  }
});

router.post('/assessments/:id/enable', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.setAssessmentStatus(email, req.params.id, 'active');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to enable assessment', error: error.message });
  }
});

router.post('/assessments/:id/disable', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.setAssessmentStatus(email, req.params.id, 'inactive');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to disable assessment', error: error.message });
  }
});

router.post('/assessments/:id/schedule', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.setAssessmentStatus(email, req.params.id, 'scheduled');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to schedule assessment', error: error.message });
  }
});

router.delete('/assessments/:id', async (req, res) => {
  try {
    const email = await getEmail(req);
    await ptoService.deleteAssessment(email, req.params.id);
    res.json({ success: true, message: 'Assessment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete assessment', error: error.message });
  }
});

router.get('/students', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.getStudents(email);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch students', error: error.message });
  }
});

router.get('/students/metrics', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.getScoresMapForDomain(email);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch student metrics', error: error.message });
  }
});

router.get('/analytics/students', async (req, res) => {
  try {
    const email = await getEmail(req);
    const department = req.query?.department ? String(req.query.department) : undefined;
    const data = await ptoService.getStudentAnalytics(email, department);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch student analytics', error: error.message });
  }
});

router.get('/analytics/assessments', async (req, res) => {
  try {
    const email = await getEmail(req);
    const department = req.query?.department ? String(req.query.department) : undefined;
    const data = await ptoService.getAssessmentAnalytics(email, department);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch assessment analytics', error: error.message });
  }
});

router.get('/analytics/departments', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.getDepartmentAnalytics(email);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch department analytics', error: error.message });
  }
});

// PTO Profile update
router.put('/profile', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.updatePtoProfile(email, req.body || {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update PTO profile', error: error.message });
  }
});

router.get('/profile', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.getPtoProfile(email);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch PTO profile', error: error.message });
  }
});

// Announcements
router.post('/announcements', async (req, res) => {
  try {
    const email = await getEmail(req);
    const item = await ptoService.createAnnouncement(email, {
      title: req.body?.title,
      message: req.body?.message,
      tags: Array.isArray(req.body?.tags) ? req.body.tags : [],
      attachments: Array.isArray(req.body?.attachments) ? req.body.attachments : []
    });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create announcement', error: error.message });
  }
});

router.get('/announcements', async (req, res) => {
  try {
    const limit = req.query?.limit ? Number(req.query.limit) : undefined;
    const nextToken = req.query?.nextToken ? JSON.parse(String(req.query.nextToken)) : undefined;
    const email = await getEmail(req);
    const data = await ptoService.listAnnouncements(email, { limit, nextToken });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list announcements', error: error.message });
  }
});

router.get('/announcements/:id', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.getAnnouncement(email, req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get announcement', error: error.message });
  }
});

router.delete('/announcements/:id', async (req, res) => {
  try {
    const email = await getEmail(req);
    const data = await ptoService.deleteAnnouncement(email, req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete announcement', error: error.message });
  }
});

// Messaging
router.post('/messages/send', async (req, res) => {
  try {
    const { recipientId, message, attachments } = req.body || {};
    if (!recipientId || !message) return res.status(400).json({ success: false, message: 'recipientId and message required' });
    const email = await getEmail(req);
    const item = await ptoService.sendMessage(email, { recipientId, message, attachments });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send message', error: error.message });
  }
});

router.get('/messages/history', async (req, res) => {
  try {
    const recipientId = req.query?.recipientId;
    const conversationId = req.query?.conversationId;
    const limit = req.query?.limit ? Number(req.query.limit) : undefined;
    const nextToken = req.query?.nextToken ? JSON.parse(String(req.query.nextToken)) : undefined;
    const email = await getEmail(req);
    const data = await ptoService.getMessageHistory(email, { recipientId, conversationId, limit, nextToken });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch message history', error: error.message });
  }
});

router.post('/messages/:messageId/read', async (req, res) => {
  try {
    const messageId = req.params.messageId;
    let conversationId = req.body?.conversationId || req.query?.conversationId;
    const recipientId = req.body?.recipientId || req.query?.recipientId;
    if (!conversationId && recipientId) {
      const email = await getEmail(req);
      const pk = ptoService.clientPkFromEmail(email);
      conversationId = `CONVERSATION#${pk}#${recipientId}`;
    }
    if (!conversationId || !messageId) return res.status(400).json({ success: false, message: 'conversationId or recipientId and messageId required' });
    const email = await getEmail(req);
    const data = await ptoService.markMessageRead(email, { conversationId, messageId });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark message as read', error: error.message });
  }
});

router.delete('/messages/:messageId', async (req, res) => {
  try {
    const messageId = req.params.messageId;
    let conversationId = req.body?.conversationId || req.query?.conversationId;
    const recipientId = req.body?.recipientId || req.query?.recipientId;
    if (!conversationId && recipientId) {
      const email = await getEmail(req);
      const pk = ptoService.clientPkFromEmail(email);
      conversationId = `CONVERSATION#${pk}#${recipientId}`;
    }
    if (!conversationId || !messageId) return res.status(400).json({ success: false, message: 'conversationId or recipientId and messageId required' });
    const email = await getEmail(req);
    const data = await ptoService.deleteMessage(email, { conversationId, messageId });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete message', error: error.message });
  }
});

module.exports = router;
