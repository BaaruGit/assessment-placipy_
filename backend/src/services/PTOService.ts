// @ts-nocheck
const DynamoDBService = require('./DynamoDBService');
const { registerUser, addUserToGroup } = require('../auth/cognito');
const { v4: uuidv4 } = require('uuid');

class PTOService {
  constructor() {
    this.dynamoService = new DynamoDBService(process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy');
  }

  clientPkFromEmail(email) {
    const domain = (email || '').split('@')[1];
    if (!domain) throw new Error('Invalid email for client resolution');
    return `CLIENT#${domain}`;
  }

  async getDashboard(email) {
    const pk = this.clientPkFromEmail(email);
    const students = await this.queryByPrefix(pk, 'STUDENT#');
    const assessments = await this.queryByPrefix(pk, 'ASSESSMENT#');
    const meta = await this.dynamoService.getItem({ Key: { PK: pk, SK: 'METADATA' } });
    const deptCodes = Array.isArray(meta?.Item?.departments) ? meta.Item.departments : [];

    const deptStats = deptCodes.map(code => {
      const deptStudents = students.filter(s => (s.department || '').toUpperCase() === String(code).toUpperCase());
      const avgScore = deptStudents.length
        ? (deptStudents.reduce((sum, s) => sum + (Number(s.avgScore) || 0), 0) / deptStudents.length)
        : 0;
      const completed = assessments.filter(a => (a.department || '').toUpperCase() === String(code).toUpperCase()).length;
      return {
        code,
        name: code,
        students: deptStudents.length,
        avgScore: Math.round(avgScore),
        completed
      };
    });

    const upcoming = assessments.filter(a => a.status === 'scheduled');
    const ongoing = assessments.filter(a => a.status === 'active');

    return {
      totalStudents: students.length,
      totalDepartments: deptCodes.length,
      totalAssessments: assessments.length,
      activeAssessments: ongoing.length,
      departmentPerformance: deptStats,
      upcomingTests: upcoming,
      ongoingTests: ongoing
    };
  }

  async getDepartments(email) {
    const pk = this.clientPkFromEmail(email);
    const meta = await this.dynamoService.getItem({ Key: { PK: pk, SK: 'METADATA' } });
    const deptCodes = Array.isArray(meta?.Item?.departments) ? meta.Item.departments : [];
    const students = await this.queryByPrefix(pk, 'STUDENT#');
    const staff = await this.queryByPrefix(pk, 'PTS#');
    const assessments = await this.queryByPrefix(pk, 'ASSESSMENT#');
    return deptCodes.map(code => {
      const studentsCount = students.filter(s => (s.department || '').toUpperCase() === String(code).toUpperCase()).length;
      const staffCount = staff.filter(st => (st.department || '').toUpperCase() === String(code).toUpperCase()).length;
      const assessmentsCount = assessments.filter(a => (a.department || '').toUpperCase() === String(code).toUpperCase()).length;
      return {
        id: `DEPARTMENT#${code}`,
        name: code,
        code,
        students: studentsCount,
        staff: staffCount,
        assessments: assessmentsCount,
        staffMembers: []
      };
    });
  }

  async getDepartmentCatalog(email) {
    const pk = this.clientPkFromEmail(email);
    const res = await this.dynamoService.getItem({ Key: { PK: pk, SK: 'METADATA' } });
    const current = Array.isArray(res?.Item?.departments) ? res.Item.departments : [];
    const defaults = ['CE', 'ME', 'EEE', 'ECE', 'CSE', 'IT'];
    const union = Array.from(new Set([...
      current.map(c => String(c).toUpperCase()),
      ...defaults
    ]));
    if (union.length !== current.length) {
      await this.dynamoService.updateItem({
        Key: { PK: pk, SK: 'METADATA' },
        UpdateExpression: 'SET #departments = :departments, #updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#departments': 'departments', '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: { ':departments': union, ':updatedAt': new Date().toISOString() }
      });
    }
    return union;
  }

  async createDepartment(email, { name, code }) {
    const pk = this.clientPkFromEmail(email);
    const meta = await this.dynamoService.getItem({ Key: { PK: pk, SK: 'METADATA' } });
    const current = Array.isArray(meta?.Item?.departments) ? meta.Item.departments : [];
    if (!current.includes(code)) current.push(code);
    await this.dynamoService.updateItem({
      Key: { PK: pk, SK: 'METADATA' },
      UpdateExpression: 'SET #departments = :departments, #updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#departments': 'departments', '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':departments': current, ':updatedAt': new Date().toISOString() }
    });
    return { PK: pk, SK: 'METADATA', departments: current, name, code };
  }

  async updateDepartment(email, code, updates) {
    const pk = this.clientPkFromEmail(email);
    const newCode = updates.code || code;
    const meta = await this.dynamoService.getItem({ Key: { PK: pk, SK: 'METADATA' } });
    const current = Array.isArray(meta?.Item?.departments) ? meta.Item.departments : [];
    const next = current.map(c => (String(c).toUpperCase() === String(code).toUpperCase() ? newCode : c));
    await this.dynamoService.updateItem({
      Key: { PK: pk, SK: 'METADATA' },
      UpdateExpression: 'SET #departments = :departments, #updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#departments': 'departments', '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':departments': next, ':updatedAt': new Date().toISOString() }
    });
    return { PK: pk, SK: 'METADATA', departments: next };
  }

  async deleteDepartment(email, code) {
    const pk = this.clientPkFromEmail(email);
    const meta = await this.dynamoService.getItem({ Key: { PK: pk, SK: 'METADATA' } });
    const current = Array.isArray(meta?.Item?.departments) ? meta.Item.departments : [];
    const next = current.filter(c => String(c).toUpperCase() !== String(code).toUpperCase());
    await this.dynamoService.updateItem({
      Key: { PK: pk, SK: 'METADATA' },
      UpdateExpression: 'SET #departments = :departments, #updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#departments': 'departments', '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':departments': next, ':updatedAt': new Date().toISOString() }
    });
    return true;
  }

  async getStaff(email) {
    const pk = this.clientPkFromEmail(email);
    const items = await this.queryByPrefix(pk, 'PTS#');
    return items.map(i => ({
      id: i.SK,
      name: i.name,
      email: i.email,
      phone: i.phone,
      designation: i.designation,
      department: i.department,
      permissions: i.permissions || []
    }));
  }

  async createStaff(email, data) {
    const pk = this.clientPkFromEmail(email);
    const now = new Date().toISOString();
    const clientDomain = (email || '').split('@')[1] || '';
    const provided = String(data.email || '').trim();
    const localPart = provided.includes('@') ? provided.split('@')[0] : provided;
    const finalEmail = `${localPart}@${clientDomain}`.toLowerCase();
    const id = `PTS#${finalEmail}`;
    const fullName = data.name || [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
    const item = {
      PK: pk,
      SK: id,
      name: fullName,
      firstName: data.firstName || (fullName ? fullName.split(' ')[0] : ''),
      lastName: data.lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : ''),
      email: finalEmail,
      phone: data.phone || '',
      designation: data.designation || 'PTS',
      role: 'Placement Training Staff',
      status: 'ACTIVE',
      joiningDate: data.joiningDate || '',
      department: data.department || '',
      permissions: data.permissions || [],
      createdAssessments: [],
      updatedAt: now
    };
    await this.dynamoService.putItem(item);

    try {
      const username = finalEmail;
      const defaultPassword = 'Praskla@123';
      await registerUser(username, defaultPassword, finalEmail);
      try {
        await addUserToGroup(username, 'instructor');
      } catch (groupErr) {
        console.warn('Failed to add user to Cognito group instructor:', groupErr?.message || groupErr);
      }
    } catch (cogErr) {
      throw new Error('Cognito registration failed: ' + (cogErr?.message || cogErr));
    }

    return item;
  }

  async updateStaff(email, id, updates) {
    const pk = this.clientPkFromEmail(email);
    const params = {
      Key: { PK: pk, SK: id },
      UpdateExpression: '',
      ExpressionAttributeNames: {},
      ExpressionAttributeValues: {},
      ReturnValues: 'ALL_NEW'
    };
    const expression = [];
    let idx = 0;
    Object.keys(updates || {}).forEach(k => {
      if (k === 'firstName' || k === 'lastName') return;
      expression.push(`#${k} = :v${idx}`);
      params.ExpressionAttributeNames[`#${k}`] = k;
      params.ExpressionAttributeValues[`:v${idx}`] = updates[k];
      idx++;
    });
    if (updates.firstName || updates.lastName) {
      const current = await this.dynamoService.getItem({ Key: { PK: pk, SK: id } });
      const newFirst = updates.firstName ?? (current?.Item?.firstName || '');
      const newLast = updates.lastName ?? (current?.Item?.lastName || '');
      const combined = [newFirst, newLast].filter(Boolean).join(' ').trim();
      expression.push(`#name = :name`);
      params.ExpressionAttributeNames['#name'] = 'name';
      params.ExpressionAttributeValues[':name'] = combined;
      expression.push(`#firstName = :firstName`);
      params.ExpressionAttributeNames['#firstName'] = 'firstName';
      params.ExpressionAttributeValues[':firstName'] = newFirst;
      expression.push(`#lastName = :lastName`);
      params.ExpressionAttributeNames['#lastName'] = 'lastName';
      params.ExpressionAttributeValues[':lastName'] = newLast;
    }
    expression.push('#updatedAt = :updatedAt');
    params.ExpressionAttributeNames['#updatedAt'] = 'updatedAt';
    params.ExpressionAttributeValues[':updatedAt'] = new Date().toISOString();
    params.UpdateExpression = `SET ${expression.join(', ')}`;
    const res = await this.dynamoService.updateItem(params);
    return res.Attributes;
  }

  async deleteStaff(email, id) {
    const pk = this.clientPkFromEmail(email);
    await this.dynamoService.deleteItem({ Key: { PK: pk, SK: id } });
    return true;
  }

  async getAssessments(email) {
    const pk = this.clientPkFromEmail(email);
    const items = await this.queryByPrefix(pk, 'ASSESSMENT#');
    return items.map(i => ({
      id: i.SK,
      name: i.name,
      department: i.department || 'All Departments',
      type: i.type || 'college-wide',
      duration: i.duration || 60,
      date: i.date || '',
      timeWindow: i.timeWindow || {},
      attempts: i.attempts || 1,
      questions: (i.questions || []).length,
      status: i.status || 'inactive'
    }));
  }

  async createAssessment(email, data) {
    const pk = this.clientPkFromEmail(email);
    const now = new Date().toISOString();
    const id = `ASSESSMENT#${uuidv4().substring(0,8)}`;
    const item = {
      PK: pk,
      SK: id,
      name: data.name,
      department: data.department || 'All Departments',
      type: data.type || 'college-wide',
      duration: data.duration || 60,
      date: data.date || '',
      timeWindow: data.timeWindow || {},
      attempts: data.attempts || 1,
      questions: data.questions || [],
      status: 'inactive',
      createdAt: now,
      updatedAt: now
    };
    await this.dynamoService.putItem(item);
    return item;
  }

  async updateAssessment(email, id, updates) {
    const pk = this.clientPkFromEmail(email);
    const params = {
      Key: { PK: pk, SK: id },
      UpdateExpression: '',
      ExpressionAttributeNames: {},
      ExpressionAttributeValues: {},
      ReturnValues: 'ALL_NEW'
    };
    const expression = [];
    let idx = 0;
    Object.keys(updates || {}).forEach(k => {
      expression.push(`#${k} = :v${idx}`);
      params.ExpressionAttributeNames[`#${k}`] = k;
      params.ExpressionAttributeValues[`:v${idx}`] = updates[k];
      idx++;
    });
    expression.push('#updatedAt = :updatedAt');
    params.ExpressionAttributeNames['#updatedAt'] = 'updatedAt';
    params.ExpressionAttributeValues[':updatedAt'] = new Date().toISOString();
    params.UpdateExpression = `SET ${expression.join(', ')}`;
    const res = await this.dynamoService.updateItem(params);
    return res.Attributes;
  }

  async deleteAssessment(email, id) {
    const pk = this.clientPkFromEmail(email);
    await this.dynamoService.deleteItem({ Key: { PK: pk, SK: id } });
    return true;
  }

  async assignStaffToDepartment(email, deptCode, staffId) {
    const pk = this.clientPkFromEmail(email);
    const now = new Date().toISOString();
    await this.dynamoService.updateItem({
      Key: { PK: pk, SK: staffId },
      UpdateExpression: 'SET #department = :dept, #updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#department': 'department', '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':dept': deptCode, ':updatedAt': now }
    });
    return { staffId, deptCode };
  }

  async unassignStaffFromDepartment(email, deptCode, staffId) {
    const pk = this.clientPkFromEmail(email);
    const now = new Date().toISOString();
    await this.dynamoService.updateItem({
      Key: { PK: pk, SK: staffId },
      UpdateExpression: 'SET #department = :dept, #updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#department': 'department', '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':dept': '', ':updatedAt': now }
    });
    return { staffId, deptCode };
  }

  async getStudents(email) {
    const pk = this.clientPkFromEmail(email);
    const items = await this.queryByPrefix(pk, 'STUDENT#');
    return items.map(i => ({
      id: i.SK,
      name: i.name,
      rollNumber: i.rollNumber,
      department: i.department,
      email: i.email,
      testsParticipated: i.testsParticipated || 0,
      avgScore: i.avgScore || 0
    }));
  }

  async queryByPrefix(pk, skPrefix) {
    const params = {
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': pk, ':prefix': skPrefix }
    };
    const res = await this.dynamoService.queryTable(params);
    return res.Items || [];
  }
}

module.exports = PTOService;