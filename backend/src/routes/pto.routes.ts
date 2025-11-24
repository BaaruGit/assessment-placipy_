// @ts-nocheck
const express = require('express');
const authMiddleware = require('../auth/auth.middleware');
const PTOService = require('../services/PTOService');

const router = express.Router();
const ptoService = new PTOService();
const XLSX = require('xlsx');
const { AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');

router.use((req, res, next) => {
  if (process.env.DEV_ALLOW_PTO_NOAUTH === 'true') return next();
  const headerEmail = String(req.headers['x-user-email'] || req.headers['X-User-Email'] || '').trim();
  if (headerEmail) return next();
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
      return res.status(403).json({ success: false, message: 'Forbidden: PTO role required' });
    }
    next();
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Authorization check failed' });
  }
});

function getEmail(req) {
  const u = req.user || {};
  const headerEmail = String(req.headers['x-user-email'] || req.headers['X-User-Email'] || '').trim();
  const fromUsername = (u.username && u.username.includes('@')) ? u.username : '';
  const fromCognitoUsername = (u['cognito:username'] && u['cognito:username'].includes('@')) ? u['cognito:username'] : '';
  const fallback = process.env.DEV_PTO_EMAIL || 'pto@ksrce.ac.in';
  return u.email || fromUsername || fromCognitoUsername || headerEmail || fallback;
}

router.get('/dashboard', async (req, res) => {
  try {
    const data = await ptoService.getDashboard(getEmail(req));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard', error: error.message });
  }
});

router.get('/departments', async (req, res) => {
  try {
    const data = await ptoService.getDepartments(getEmail(req));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch departments', error: error.message });
  }
});

router.get('/departments/catalog', async (req, res) => {
  try {
    const data = await ptoService.getDepartmentCatalog(getEmail(req));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch department catalog', error: error.message });
  }
});

router.post('/departments', async (req, res) => {
  try {
    const item = await ptoService.createDepartment(getEmail(req), req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create department', error: error.message });
  }
});

router.put('/departments/:code', async (req, res) => {
  try {
    const data = await ptoService.updateDepartment(getEmail(req), req.params.code, req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update department', error: error.message });
  }
});

router.post('/departments/:code/activate', async (req, res) => {
  try {
    const data = await ptoService.setDepartmentActive(getEmail(req), req.params.code, true);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to activate department', error: error.message });
  }
});

router.post('/departments/:code/deactivate', async (req, res) => {
  try {
    const data = await ptoService.setDepartmentActive(getEmail(req), req.params.code, false);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to deactivate department', error: error.message });
  }
});

router.delete('/departments/:code', async (req, res) => {
  try {
    await ptoService.deleteDepartment(getEmail(req), req.params.code);
    res.json({ success: true, message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete department', error: error.message });
  }
});

router.post('/departments/repair', async (req, res) => {
  try {
    const data = await ptoService.repairDepartments(getEmail(req));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to repair departments', error: error.message });
  }
});

router.post('/departments/:code/assign-staff', async (req, res) => {
  try {
    const { staffId } = req.body;
    const data = await ptoService.assignStaffToDepartment(getEmail(req), req.params.code, staffId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to assign staff', error: error.message });
  }
});

router.post('/departments/:code/unassign-staff', async (req, res) => {
  try {
    const { staffId } = req.body;
    const data = await ptoService.unassignStaffFromDepartment(getEmail(req), req.params.code, staffId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to unassign staff', error: error.message });
  }
});

router.get('/staff', async (req, res) => {
  try {
    const data = await ptoService.getStaff(getEmail(req));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch staff', error: error.message });
  }
});

router.post('/staff', async (req, res) => {
  try {
    const item = await ptoService.createStaff(getEmail(req), req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create staff', error: error.message });
  }
});

router.put('/staff/:id', async (req, res) => {
  try {
    const data = await ptoService.updateStaff(getEmail(req), req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update staff', error: error.message });
  }
});

router.delete('/staff/:id', async (req, res) => {
  try {
    await ptoService.deleteStaff(getEmail(req), req.params.id);
    res.json({ success: true, message: 'Staff deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete staff', error: error.message });
  }
});

// Export staff to Excel
router.get('/staff/export', async (req, res) => {
  try {
    const staff = await ptoService.getStaff(getEmail(req));
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
        const item = await ptoService.createStaff(getEmail(req), payload);
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
    const data = await ptoService.getAssessments(getEmail(req));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch assessments', error: error.message });
  }
});

router.get('/assessments/:id', async (req, res) => {
  try {
    const data = await ptoService.getAssessment(getEmail(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch assessment', error: error.message });
  }
});

router.post('/assessments', async (req, res) => {
  try {
    const item = await ptoService.createAssessment(getEmail(req), req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create assessment', error: error.message });
  }
});

router.put('/assessments/:id', async (req, res) => {
  try {
    const data = await ptoService.updateAssessment(getEmail(req), req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update assessment', error: error.message });
  }
});

router.post('/assessments/:id/enable', async (req, res) => {
  try {
    const data = await ptoService.setAssessmentStatus(getEmail(req), req.params.id, 'active');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to enable assessment', error: error.message });
  }
});

router.post('/assessments/:id/disable', async (req, res) => {
  try {
    const data = await ptoService.setAssessmentStatus(getEmail(req), req.params.id, 'inactive');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to disable assessment', error: error.message });
  }
});

router.post('/assessments/:id/schedule', async (req, res) => {
  try {
    const data = await ptoService.setAssessmentStatus(getEmail(req), req.params.id, 'scheduled');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to schedule assessment', error: error.message });
  }
});

router.delete('/assessments/:id', async (req, res) => {
  try {
    await ptoService.deleteAssessment(getEmail(req), req.params.id);
    res.json({ success: true, message: 'Assessment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete assessment', error: error.message });
  }
});

router.get('/students', async (req, res) => {
  try {
    const data = await ptoService.getStudents(getEmail(req));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch students', error: error.message });
  }
});

// PTO Profile update
router.put('/profile', async (req, res) => {
  try {
    const data = await ptoService.updatePtoProfile(getEmail(req), req.body || {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update PTO profile', error: error.message });
  }
});

router.get('/profile', async (req, res) => {
  try {
    const data = await ptoService.getPtoProfile(getEmail(req));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch PTO profile', error: error.message });
  }
});

// Announcements
router.post('/announcements', async (req, res) => {
  try {
    const item = await ptoService.createAnnouncement(getEmail(req), {
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
    const data = await ptoService.listAnnouncements(getEmail(req), { limit, nextToken });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list announcements', error: error.message });
  }
});

router.get('/announcements/:id', async (req, res) => {
  try {
    const data = await ptoService.getAnnouncement(getEmail(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get announcement', error: error.message });
  }
});

// Messaging
router.post('/messages/send', async (req, res) => {
  try {
    const { recipientId, message, attachments } = req.body || {};
    if (!recipientId || !message) return res.status(400).json({ success: false, message: 'recipientId and message required' });
    const item = await ptoService.sendMessage(getEmail(req), { recipientId, message, attachments });
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
    const data = await ptoService.getMessageHistory(getEmail(req), { recipientId, conversationId, limit, nextToken });
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
      const pk = ptoService.clientPkFromEmail(getEmail(req));
      conversationId = `CONVERSATION#${pk}#${recipientId}`;
    }
    if (!conversationId || !messageId) return res.status(400).json({ success: false, message: 'conversationId or recipientId and messageId required' });
    const data = await ptoService.markMessageRead(getEmail(req), { conversationId, messageId });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark message as read', error: error.message });
  }
});

module.exports = router;
