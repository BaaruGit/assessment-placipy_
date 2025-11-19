// @ts-nocheck
const express = require('express');
const authMiddleware = require('../auth/auth.middleware');
const PTOService = require('../services/PTOService');

const router = express.Router();
const ptoService = new PTOService();

router.use(authMiddleware.authenticateToken);

function getEmail(req) {
  const u = req.user || {};
  const headerEmail = String(req.headers['x-user-email'] || req.headers['X-User-Email'] || '').trim();
  const fromUsername = (u.username && u.username.includes('@')) ? u.username : '';
  const fromCognitoUsername = (u['cognito:username'] && u['cognito:username'].includes('@')) ? u['cognito:username'] : '';
  return u.email || fromUsername || fromCognitoUsername || headerEmail || '';
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

router.delete('/departments/:code', async (req, res) => {
  try {
    await ptoService.deleteDepartment(getEmail(req), req.params.code);
    res.json({ success: true, message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete department', error: error.message });
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

router.get('/assessments', async (req, res) => {
  try {
    const data = await ptoService.getAssessments(getEmail(req));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch assessments', error: error.message });
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

module.exports = router;