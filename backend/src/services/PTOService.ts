// @ts-nocheck
const DynamoDBService = require('./DynamoDBService');
const { registerUser, addUserToGroup } = require('../auth/cognito');
const { v4: uuidv4 } = require('uuid');
const { CognitoIdentityProviderClient, AdminDisableUserCommand, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminUpdateUserAttributesCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { fromEnv } = require('@aws-sdk/credential-providers');

class PTOService {
  constructor() {
    this.dynamoService = new DynamoDBService(process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy');
    this.announcementsTable = new DynamoDBService(process.env.DYNAMODB_ANNOUNCEMENTS_TABLE_NAME || 'Assesment_placipy_announcements');
    this.messagesTable = new DynamoDBService(process.env.DYNAMODB_MESSAGES_TABLE_NAME || 'Assesment_placipy_messages');
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.COGNITO_REGION || process.env.AWS_REGION || 'us-east-1',
      credentials: fromEnv()
    });
  }

  async updateCognitoAttributes(username, { firstName, lastName, fullName, role, department, email }) {
    const attrs = [];
    if (email) attrs.push({ Name: 'email', Value: email });
    if (fullName) attrs.push({ Name: 'name', Value: fullName });
    if (firstName) attrs.push({ Name: 'given_name', Value: firstName });
    if (lastName) attrs.push({ Name: 'family_name', Value: lastName });
    if (role) attrs.push({ Name: 'custom:role', Value: role });
    if (department) attrs.push({ Name: 'custom:department', Value: department });
    if (!attrs.length) return;
    try {
      await this.cognitoClient.send(new AdminUpdateUserAttributesCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: username,
        UserAttributes: attrs
      }));
    } catch (_) {}
  }

  clientPkFromEmail(email) {
    const domain = (email || '').split('@')[1];
    if (!domain) throw new Error('Invalid email for client resolution');
    return `CLIENT#${domain}`;
  }

  async getDashboard(email) {
    const pk = this.clientPkFromEmail(email);
    const students = await this.queryByPrefix(pk, 'STUDENT#');
    const assessments = await this.getAssessments(email);
    const meta = await this.dynamoService.getItem({ Key: { PK: pk, SK: 'METADATA' } });
    let departments = Array.isArray(meta?.Item?.departments) ? meta.Item.departments : [];
    departments = departments.map(d => (typeof d === 'string' ? { code: d, name: d, active: true } : d));
    const sanitized = departments.filter(d => {
      const s = String(d.code || '').trim();
      if (!s) return false;
      if (s.toUpperCase() === '[OBJECT OBJECT]') return false;
      return /^[A-Za-z0-9_-]+$/.test(s);
    });
    const activeDepartments = sanitized.filter(d => d && d.active !== false);

    const deptStats = activeDepartments.map(d => {
      const code = String(d.code || '').trim();
      const deptStudents = students.filter(s => (s.department || '').toUpperCase() === code.toUpperCase());
      const avgScore = deptStudents.length
        ? (deptStudents.reduce((sum, s) => sum + (Number(s.avgScore) || 0), 0) / deptStudents.length)
        : 0;
      const completed = assessments.filter(a => (a.department || '').toUpperCase() === code.toUpperCase()).length;
      return {
        code,
        name: String(d.name || code),
        active: d.active !== false,
        students: deptStudents.length,
        avgScore: Math.round(avgScore),
        completed
      };
    });

    const upcoming = assessments.filter(a => a.status === 'scheduled');
    const ongoing = assessments.filter(a => a.status === 'active');

    return {
      totalStudents: students.length,
      totalDepartments: activeDepartments.length,
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
    let departments = Array.isArray(meta?.Item?.departments) ? meta.Item.departments : [];
    // Migrate from string array to object array if needed
    if (departments.length && typeof departments[0] === 'string') {
      departments = departments.map(code => ({ code, name: String(code), active: true, createdAt: new Date().toISOString() }));
      await this.dynamoService.updateItem({
        Key: { PK: pk, SK: 'METADATA' },
        UpdateExpression: 'SET #departments = :departments, #updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#departments': 'departments', '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: { ':departments': departments, ':updatedAt': new Date().toISOString() }
      });
    }
    const students = await this.queryByPrefix(pk, 'STUDENT#');
    const staff = await this.queryByPrefix(pk, 'PTS#');
    const assessments = await this.getAssessments(email);
    const sanitized = departments.filter(d => {
      const code = typeof d === 'string' ? d : d.code;
      const s = String(code || '').trim();
      if (!s) return false;
      if (s.toUpperCase() === '[OBJECT OBJECT]') return false;
      return /^[A-Za-z0-9_-]+$/.test(s);
    }).map(d => (typeof d === 'string' ? { code: d, name: d, active: true, createdAt: new Date().toISOString() } : d));
    return sanitized.map(d => {
      const code = d.code;
      const studentsCount = students.filter(s => (s.department || '').toUpperCase() === String(code).toUpperCase()).length;
      const staffCount = staff.filter(st => (st.department || '').toUpperCase() === String(code).toUpperCase()).length;
      const assessmentsCount = assessments.filter(a => (a.department || '').toUpperCase() === String(code).toUpperCase()).length;
      return {
        id: `DEPARTMENT#${code}`,
        name: d.name || code,
        code,
        active: d.active !== false,
        createdAt: d.createdAt || '',
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
    const codes = current.map(d => (typeof d === 'string' ? d : d.code)).map(c => String(c || '').toUpperCase()).filter(Boolean);
    const defaults = ['CE', 'ME', 'EEE', 'ECE', 'CSE', 'IT'];
    const union = Array.from(new Set([ ...codes, ...defaults ]));
    return union;
  }

  async createDepartment(email, { name, code }) {
    const pk = this.clientPkFromEmail(email);
    const meta = await this.dynamoService.getItem({ Key: { PK: pk, SK: 'METADATA' } });
    let current = Array.isArray(meta?.Item?.departments) ? meta.Item.departments : [];
    if (current.length && typeof current[0] === 'string') {
      current = current.map(c => ({ code: c, name: c, active: true, createdAt: new Date().toISOString() }));
    }
    const exists = current.some(d => String(d.code).toUpperCase() === String(code).toUpperCase());
    if (!exists) current.push({ code, name: name || code, active: true, createdAt: new Date().toISOString() });
    await this.dynamoService.updateItem({
      Key: { PK: pk, SK: 'METADATA' },
      UpdateExpression: 'SET #departments = :departments, #updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#departments': 'departments', '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':departments': current, ':updatedAt': new Date().toISOString() }
    });
    return { PK: pk, SK: 'METADATA', departments: current };
  }

  async updateDepartment(email, code, updates) {
    const pk = this.clientPkFromEmail(email);
    const meta = await this.dynamoService.getItem({ Key: { PK: pk, SK: 'METADATA' } });
    let current = Array.isArray(meta?.Item?.departments) ? meta.Item.departments : [];
    if (current.length && typeof current[0] === 'string') {
      current = current.map(c => ({ code: c, name: c, active: true, createdAt: new Date().toISOString() }));
    }
    const next = current.map(d => {
      if (String(d.code).toUpperCase() !== String(code).toUpperCase()) return d;
      const newCode = updates.code || d.code;
      return {
        ...d,
        code: newCode,
        name: updates.name !== undefined ? updates.name : d.name,
        active: updates.active !== undefined ? updates.active : d.active
      };
    });
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
    let current = Array.isArray(meta?.Item?.departments) ? meta.Item.departments : [];
    if (current.length && typeof current[0] === 'string') {
      current = current.map(c => ({ code: c, name: c, active: true, createdAt: new Date().toISOString() }));
    }
    const next = current.filter(d => String(d.code).toUpperCase() !== String(code).toUpperCase());
    await this.dynamoService.updateItem({
      Key: { PK: pk, SK: 'METADATA' },
      UpdateExpression: 'SET #departments = :departments, #updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#departments': 'departments', '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':departments': next, ':updatedAt': new Date().toISOString() }
    });
    return true;
  }

  async setDepartmentActive(email, code, active) {
    const pk = this.clientPkFromEmail(email);
    const meta = await this.dynamoService.getItem({ Key: { PK: pk, SK: 'METADATA' } });
    let current = Array.isArray(meta?.Item?.departments) ? meta.Item.departments : [];
    if (current.length && typeof current[0] === 'string') {
      current = current.map(c => ({ code: c, name: c, active: true, createdAt: new Date().toISOString() }));
    }
    const next = current.map(d => (String(d.code).toUpperCase() === String(code).toUpperCase() ? { ...d, active } : d));
    await this.dynamoService.updateItem({
      Key: { PK: pk, SK: 'METADATA' },
      UpdateExpression: 'SET #departments = :departments, #updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#departments': 'departments', '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':departments': next, ':updatedAt': new Date().toISOString() }
    });
    return { PK: pk, SK: 'METADATA', departments: next };
  }

  async repairDepartments(email) {
    const pk = this.clientPkFromEmail(email);
    const meta = await this.dynamoService.getItem({ Key: { PK: pk, SK: 'METADATA' } });
    let current = Array.isArray(meta?.Item?.departments) ? meta.Item.departments : [];
    current = current.map(d => (typeof d === 'string' ? { code: d, name: d, active: true, createdAt: new Date().toISOString() } : d));
    const next = current.filter(d => {
      const s = String(d.code || '').trim();
      if (!s) return false;
      if (s.toUpperCase() === '[OBJECT OBJECT]') return false;
      return /^[A-Za-z0-9_-]+$/.test(s);
    });
    await this.dynamoService.updateItem({
      Key: { PK: pk, SK: 'METADATA' },
      UpdateExpression: 'SET #departments = :departments, #updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#departments': 'departments', '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':departments': next, ':updatedAt': new Date().toISOString() }
    });
    return { PK: pk, SK: 'METADATA', departments: next };
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
    const providedRaw = String(data.email || '').trim().toLowerCase();
    if (!providedRaw.includes('@')) {
      throw new Error(`Email must include @ and end with @${clientDomain}`);
    }
    if (!providedRaw.endsWith(`@${clientDomain}`)) {
      throw new Error(`Staff email must end with @${clientDomain}`);
    }
    const finalEmail = providedRaw;
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
      await this.cognitoClient.send(new AdminCreateUserCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: username,
        TemporaryPassword: defaultPassword,
        UserAttributes: [
          { Name: 'email', Value: finalEmail },
          { Name: 'email_verified', Value: 'true' }
        ],
        MessageAction: 'SUPPRESS'
      }));
      await this.cognitoClient.send(new AdminSetUserPasswordCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: username,
        Password: defaultPassword,
        Permanent: true
      }));
      await this.updateCognitoAttributes(username, {
        firstName: item.firstName,
        lastName: item.lastName,
        fullName: item.name,
        role: item.role,
        department: item.department,
        email: item.email
      });
      try { await addUserToGroup(username, 'instructor'); } catch (_) {}
    } catch (cogErr) {
      throw new Error('Cognito registration failed: ' + (cogErr?.message || cogErr));
    }

    return item;
  }

  async updateStaff(email, id, updates) {
    const pk = this.clientPkFromEmail(email);
    const current = await this.dynamoService.getItem({ Key: { PK: pk, SK: id } });
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
      if (k === 'firstName' || k === 'lastName' || k === 'email') return;
      expression.push(`#${k} = :v${idx}`);
      params.ExpressionAttributeNames[`#${k}`] = k;
      params.ExpressionAttributeValues[`:v${idx}`] = updates[k];
      idx++;
    });
    if (updates && updates.email) {
      const clientDomain = (email || '').split('@')[1] || '';
      const providedRaw = String(updates.email || '').trim().toLowerCase();
      if (!providedRaw.includes('@')) {
        throw new Error(`Email must include @ and end with @${clientDomain}`);
      }
      if (!providedRaw.endsWith(`@${clientDomain}`)) {
        throw new Error(`Staff email must end with @${clientDomain}`);
      }
      const newFinalEmail = providedRaw;
      const oldEmail = current?.Item?.email || '';
      params.ExpressionAttributeValues[`:v${idx}`] = newFinalEmail;
      params.ExpressionAttributeNames[`#email`] = 'email';
      expression.push(`#email = :v${idx}`);
      idx++;
      if (newFinalEmail && oldEmail && newFinalEmail !== oldEmail) {
        try {
          await this.cognitoClient.send(new AdminDisableUserCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: oldEmail
          }));
        } catch (e) {}
        {
          const username = newFinalEmail;
          const defaultPassword = 'Praskla@123';
          let createErrMsg = '';
          try {
            await this.cognitoClient.send(new AdminCreateUserCommand({
              UserPoolId: process.env.COGNITO_USER_POOL_ID,
              Username: username,
              TemporaryPassword: defaultPassword,
              UserAttributes: [
                { Name: 'email', Value: newFinalEmail },
                { Name: 'email_verified', Value: 'true' }
              ],
              MessageAction: 'SUPPRESS'
            }));
          } catch (e) {
            createErrMsg = (e && e.message) ? e.message : '';
            if (!/exists/i.test(createErrMsg)) {
              throw new Error('Cognito re-provision failed: ' + createErrMsg);
            }
          }
          try {
            await this.cognitoClient.send(new AdminSetUserPasswordCommand({
              UserPoolId: process.env.COGNITO_USER_POOL_ID,
              Username: username,
              Password: defaultPassword,
              Permanent: true
            }));
          } catch (_) {}
          try { await addUserToGroup(username, 'instructor'); } catch (_) {}
        }
        }
      }
    if (updates.firstName || updates.lastName) {
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

    const updated = res.Attributes || {};
    let usernameForUpdate = updated.email || (current?.Item?.email || '');
    // If email changed above, ensure using new email
    if (updates && updates.email) {
      usernameForUpdate = String(updates.email || '').trim().toLowerCase();
    }
    await this.updateCognitoAttributes(usernameForUpdate, {
      firstName: updated.firstName,
      lastName: updated.lastName,
      fullName: updated.name,
      role: updated.role,
      department: updated.department,
      email: updated.email
    });

    return updated;
  }

  async deleteStaff(email, id) {
    const pk = this.clientPkFromEmail(email);
    await this.dynamoService.deleteItem({ Key: { PK: pk, SK: id } });
    return true;
  }

  async updatePtoProfile(email, data) {
    const pk = this.clientPkFromEmail(email);
    const emailOriginal = String((data.email || email) || '').trim();
    const userEmail = emailOriginal.toLowerCase();
    const ptoItems = await this.queryByPrefix(pk, 'PTO#').catch(() => []);
    let targetSk = '';
    const employeeId = String(data.employeeId || '').trim();
    if (employeeId) {
      const idSk = `PTO#${employeeId}`;
      const idMatch = (Array.isArray(ptoItems) ? ptoItems : []).find(it => String(it.SK || '') === idSk);
      if (idMatch) targetSk = idSk;
    }
    if (!targetSk) {
      const emailMatch = (Array.isArray(ptoItems) ? ptoItems : []).find(it => String(it.email || '').toLowerCase() === userEmail);
      if (emailMatch && emailMatch.SK) targetSk = emailMatch.SK;
    }
    if (!targetSk) {
      const first = (Array.isArray(ptoItems) ? ptoItems : [])[0];
      if (first && first.SK) targetSk = first.SK;
    }
    if (!targetSk) throw new Error('PTO profile not found in existing table');
    const firstName = String(data.firstName || '').trim();
    const lastName = String(data.lastName || '').trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    const params = {
      Key: { PK: pk, SK: targetSk },
      UpdateExpression: 'SET #name = :name, #firstName = :firstName, #lastName = :lastName, #email = :email, #phone = :phone, #designation = :designation, #department = :department, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#firstName': 'firstName',
        '#lastName': 'lastName',
        '#email': 'email',
        '#phone': 'phone',
        '#designation': 'designation',
        '#department': 'department',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':name': fullName,
        ':firstName': firstName,
        ':lastName': lastName,
        ':email': emailOriginal,
        ':phone': String(data.phone || ''),
        ':designation': String(data.designation || 'Placement Training Officer'),
        ':department': String(data.department || ''),
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };
    const res = await this.dynamoService.updateItem(params);
    await this.updateCognitoAttributes(userEmail, {
      firstName,
      lastName,
      fullName,
      role: 'Placement Training Officer',
      department: String(data.department || ''),
      email: emailOriginal
    });
    return res.Attributes;
  }

  async getPtoProfile(email) {
    const pk = this.clientPkFromEmail(email);
    const userEmail = String(email || '').trim().toLowerCase();
    const ptoItems = await this.queryByPrefix(pk, 'PTO#').catch(() => []);
    let item = (Array.isArray(ptoItems) ? ptoItems : []).find(it => String(it.email || '').toLowerCase() === userEmail) || null;
    if (!item) item = (Array.isArray(ptoItems) ? ptoItems : [])[0] || null;
    if (item) return item;
    throw new Error('PTO profile not found');
  }

  async getAssessments(email) {
    const pk = this.clientPkFromEmail(email);
    const items = await this.queryByPrefix(pk, 'ASSESSMENT#');
    const mappedClient = items.map(i => ({
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

    const assessmentService = require('./AssessmentService');
    const all = await assessmentService.getAllAssessments();
    const mappedAlt = (all.items || []).map(m => ({
      id: String(m.PK || ''),
      name: m.title || m.name || '',
      department: m.department || 'All Departments',
      type: (m.department && m.department !== 'All Departments') ? 'department-wise' : 'college-wide',
      duration: m.duration || 60,
      date: m.createdAt || m.date || '',
      timeWindow: {},
      attempts: 1,
      questions: m.questionCount || 0,
      status: m.status || 'inactive'
    }));
    const byId = new Map();
    for (const a of [...mappedClient, ...mappedAlt]) {
      if (!byId.has(a.id)) byId.set(a.id, a);
    }
    return Array.from(byId.values());
  }

  async createAssessment(email, data) {
    const assessmentService = require('./AssessmentService');
    const normalized = this.normalizeQuestions(data.questions || []);
    const created = await assessmentService.createAssessment({
      title: data.name,
      description: '',
      duration: data.duration || 60,
      instructions: '',
      department: data.department || 'All Departments',
      difficulty: 'medium',
      category: data.type || 'college-wide',
      questions: normalized
    }, email);
    return {
      PK: created.PK,
      SK: created.SK,
      id: created.PK,
      name: created.title || created.name || data.name,
      department: created.department || data.department || 'All Departments',
      type: (created.department && created.department !== 'All Departments') ? 'department-wise' : 'college-wide',
      duration: created.duration || data.duration || 60,
      date: data.date || '',
      timeWindow: data.timeWindow || {},
      attempts: data.attempts || 1,
      questions: Array.isArray(created.questions) ? created.questions.length : 0,
      status: created.status || 'draft',
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    };
  }

  async updateAssessment(email, id, updates) {
    const pk = this.clientPkFromEmail(email);
    // Try client-partitioned record first
    const clientItem = await this.dynamoService.getItem({ Key: { PK: pk, SK: id } });
    if (clientItem && clientItem.Item) {
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
        if (k === 'questions') return;
        expression.push(`#${k} = :v${idx}`);
        params.ExpressionAttributeNames[`#${k}`] = k;
        params.ExpressionAttributeValues[`:v${idx}`] = updates[k];
        idx++;
      });
      if (Array.isArray(updates.questions)) {
        expression.push(`#questions = :questions`);
        params.ExpressionAttributeNames['#questions'] = 'questions';
        params.ExpressionAttributeValues[':questions'] = this.normalizeQuestions(updates.questions);
      }
      expression.push('#updatedAt = :updatedAt');
      params.ExpressionAttributeNames['#updatedAt'] = 'updatedAt';
      params.ExpressionAttributeValues[':updatedAt'] = new Date().toISOString();
      params.UpdateExpression = `SET ${expression.join(', ')}`;
      const res = await this.dynamoService.updateItem(params);
      return res.Attributes;
    }

    // Fallback: PTS-style assessment where PK = id and SK = 'METADATA'
    const metaRes = await this.dynamoService.getItem({ Key: { PK: id, SK: 'METADATA' } });
    if (metaRes && metaRes.Item) {
      const params = {
        Key: { PK: id, SK: 'METADATA' },
        UpdateExpression: '',
        ExpressionAttributeNames: {},
        ExpressionAttributeValues: {},
        ReturnValues: 'ALL_NEW'
      };
      const expression = [];
      let idx = 0;
      Object.keys(updates || {}).forEach(k => {
        if (k === 'questions') return;
        expression.push(`#${k} = :v${idx}`);
        params.ExpressionAttributeNames[`#${k}`] = k;
        params.ExpressionAttributeValues[`:v${idx}`] = updates[k];
        idx++;
      });
      expression.push('#updatedAt = :updatedAt');
      params.ExpressionAttributeNames['#updatedAt'] = 'updatedAt';
      params.ExpressionAttributeValues[':updatedAt'] = new Date().toISOString();
      params.UpdateExpression = `SET ${expression.join(', ')}`;
      const updatedMeta = await this.dynamoService.updateItem(params);

      // If questions are provided, write them as separate QUESTION items
      if (Array.isArray(updates.questions)) {
        const existing = await this.dynamoService.queryTable({
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: { ':pk': id, ':prefix': 'QUESTION#' }
        });
        const deletes = (existing.Items || []).map(it => ({
          DeleteRequest: { Key: { PK: it.PK, SK: it.SK } }
        }));
        const normalized = this.normalizeQuestions(updates.questions);
        const puts = normalized.map((q, index) => ({
          PutRequest: { Item: {
            PK: id,
            SK: `QUESTION#${String(index + 1).padStart(3, '0')}`,
            questionId: `${String(id).replace('ASSESSMENT#','')}_Q${index + 1}`,
            questionNumber: index + 1,
            text: q.text,
            options: q.options,
            correctAnswer: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            marks: 1
          } }
        }));
        const batch = [...deletes, ...puts];
        if (batch.length) await this.dynamoService.batchWrite(batch);
      }

      return updatedMeta.Attributes;
    }

    throw new Error('Assessment not found');
  }

  normalizeQuestions(qs) {
    const letters = ['A','B','C','D','E','F','G'];
    return (Array.isArray(qs) ? qs : []).map((q, i) => {
      const text = String(q.text || q.question || '').trim();
      const optionsRaw = q.options || q.choices || [];
      const options = (Array.isArray(optionsRaw) ? optionsRaw : String(optionsRaw || '').split('|')).map(o => String(o).trim()).filter(Boolean);
      const answerRaw = q.correctOption ?? q.answer ?? q.correctIndex;
      let correctIndex = typeof answerRaw === 'number' ? answerRaw : letters.indexOf(String(answerRaw || '').toUpperCase());
      if (correctIndex < 0) correctIndex = 0;
      return {
        id: q.id || `Q${i+1}`,
        text,
        options,
        correctIndex
      };
    });
  }

  async getAssessment(email, id) {
    const pk = this.clientPkFromEmail(email);
    const item = await this.dynamoService.getItem({ Key: { PK: pk, SK: id } });
    if (item && item.Item) return item.Item;
    // Fallback to PTS-style layout
    const res = await this.dynamoService.queryTable({
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': id }
    });
    const items = res.Items || [];
    if (!items.length) return null;
    const metadata = items.find(it => it.SK === 'METADATA') || {};
    const questions = items.filter(it => String(it.SK || '').startsWith('QUESTION#'))
      .sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0))
      .map((q, i) => ({
        id: q.questionId || `Q${i+1}`,
        text: q.text,
        options: q.options || [],
        correctIndex: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0
      }));
    return { ...metadata, questions };
  }

  async setAssessmentStatus(email, id, status) {
    const pk = this.clientPkFromEmail(email);
    const clientRes = await this.dynamoService.updateItem({
      Key: { PK: pk, SK: id },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':status': status, ':updatedAt': new Date().toISOString() },
      ReturnValues: 'ALL_NEW'
    }).catch(() => null);
    if (clientRes && clientRes.Attributes) return clientRes.Attributes;
    // Fallback to PTS-style metadata
    const altRes = await this.dynamoService.updateItem({
      Key: { PK: id, SK: 'METADATA' },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':status': status, ':updatedAt': new Date().toISOString() },
      ReturnValues: 'ALL_NEW'
    });
    return altRes.Attributes;
  }

  async deleteAssessment(email, id) {
    const pk = this.clientPkFromEmail(email);
    const clientItem = await this.dynamoService.getItem({ Key: { PK: pk, SK: id } });
    if (clientItem && clientItem.Item) {
      await this.dynamoService.deleteItem({ Key: { PK: pk, SK: id } });
      return true;
    }
    const res = await this.dynamoService.queryTable({
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': id }
    });
    const toDelete = (res.Items || []).map(it => ({
      DeleteRequest: { Key: { PK: it.PK, SK: it.SK } }
    }));
    if (toDelete.length) await this.dynamoService.batchWrite(toDelete);
    return true;
  }

  async createAnnouncement(email, { title, message, tags, attachments }) {
    const pk = this.clientPkFromEmail(email);
    const id = `ANNOUNCEMENT#${uuidv4()}`;
    const now = new Date().toISOString();
    const item = {
      PK: pk,
      SK: id,
      id,
      title: String(title || '').trim(),
      message: String(message || '').trim(),
      createdAt: now,
      tags: Array.isArray(tags) ? tags : [],
      target: 'students',
      attachments: Array.isArray(attachments) ? attachments.map(a => ({
        filename: String(a.filename || ''),
        contentType: String(a.contentType || 'application/octet-stream'),
        data: String(a.data || '')
      })) : []
    };
    try { await this.announcementsTable.putItem(item); } catch (_) { await this.dynamoService.putItem(item); }
    return item;
  }

  async listAnnouncements(email, { limit, nextToken } = {}) {
    const pk = this.clientPkFromEmail(email);
    const params = {
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': pk, ':prefix': 'ANNOUNCEMENT#' }
    };
    if (limit) params.Limit = Number(limit);
    if (nextToken && nextToken.PK && nextToken.SK) params.ExclusiveStartKey = nextToken;
    let res;
    try { res = await this.announcementsTable.queryTable(params); }
    catch (_) { res = await this.dynamoService.queryTable(params); }
    return { items: res.Items || [], nextToken: res.LastEvaluatedKey || null };
  }

  async getAnnouncement(email, id) {
    const pk = this.clientPkFromEmail(email);
    const sk = id.startsWith('ANNOUNCEMENT#') ? id : `ANNOUNCEMENT#${id}`;
    let res;
    try { res = await this.announcementsTable.getItem({ Key: { PK: pk, SK: sk } }); }
    catch (_) { res = await this.dynamoService.getItem({ Key: { PK: pk, SK: sk } }); }
    return res?.Item || null;
  }

  async sendMessage(email, { recipientId, message, attachments }) {
    const pk = this.clientPkFromEmail(email);
    const senderId = email;
    const now = new Date().toISOString();
    const conversationId = `CONVERSATION#${pk}#${recipientId}`;
    const sk = `MESSAGE#${now}#${uuidv4()}`;
    const item = {
      PK: conversationId,
      SK: sk,
      messageId: sk,
      senderType: 'PTO',
      senderId,
      recipientType: 'STUDENT',
      recipientId,
      message: String(message || '').trim(),
      timestamp: now,
      readStatus: false,
      conversationId,
      attachments: Array.isArray(attachments) ? attachments.map(a => ({
        filename: String(a.filename || ''),
        contentType: String(a.contentType || 'application/octet-stream'),
        data: String(a.data || '')
      })) : []
    };
    try { await this.messagesTable.putItem(item); } catch (_) { await this.dynamoService.putItem(item); }
    return item;
  }

  async getMessageHistory(email, { recipientId, conversationId, limit, nextToken } = {}) {
    const pk = this.clientPkFromEmail(email);
    const convId = conversationId || `CONVERSATION#${pk}#${recipientId}`;
    const params = {
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': convId }
    };
    if (limit) params.Limit = Number(limit);
    if (nextToken && nextToken.PK && nextToken.SK) params.ExclusiveStartKey = nextToken;
    let res;
    try { res = await this.messagesTable.queryTable(params); }
    catch (_) { res = await this.dynamoService.queryTable(params); }
    const items = (res.Items || []).sort((a, b) => String(a.SK).localeCompare(String(b.SK)));
    return { items, nextToken: res.LastEvaluatedKey || null };
  }

  async markMessageRead(email, { conversationId, messageId }) {
    const params = {
      Key: { PK: conversationId, SK: messageId },
      UpdateExpression: 'SET #readStatus = :readStatus',
      ExpressionAttributeNames: { '#readStatus': 'readStatus' },
      ExpressionAttributeValues: { ':readStatus': true },
      ReturnValues: 'ALL_NEW'
    };
    let res;
    try { res = await this.messagesTable.updateItem(params); }
    catch (_) { res = await this.dynamoService.updateItem(params); }
    return res.Attributes;
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
