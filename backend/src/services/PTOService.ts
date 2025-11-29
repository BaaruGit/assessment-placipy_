// @ts-nocheck
const DynamoDBService = require('./DynamoDBService');
const { registerUser, addUserToGroup } = require('../auth/cognito');
const { v4: uuidv4 } = require('uuid');
const { CognitoIdentityProviderClient, AdminDisableUserCommand, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminUpdateUserAttributesCommand, AdminRemoveUserFromGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { fromEnv } = require('@aws-sdk/credential-providers');

class PTOService {
  constructor() {
    this.dynamoService = new DynamoDBService(process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy');
    this.announcementsTable = new DynamoDBService(process.env.DYNAMODB_ANNOUNCEMENTS_TABLE_NAME || 'Assesment_placipy_announcements');
    this.messagesTable = new DynamoDBService(process.env.DYNAMODB_MESSAGES_TABLE_NAME || 'Assesment_placipy_messages');
    this.resultsTable = new DynamoDBService(process.env.DYNAMODB_RESULTS_TABLE_NAME || 'assessment_placipy_assessment_result');
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.COGNITO_REGION || process.env.AWS_REGION,
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
    let deptItems = await this.queryByPrefix(pk, 'DEPT#');
    if (!deptItems.length) {
      const meta = await this.dynamoService.getItem({ Key: { PK: pk, SK: 'METADATA' } });
      let departments = Array.isArray(meta?.Item?.departments) ? meta.Item.departments : [];
      departments = departments.map(d => (typeof d === 'string' ? { code: d, name: d, active: true } : d));
      const sanitized = departments.filter(d => {
        const s = String(d.code || '').trim();
        if (!s) return false;
        if (s.toUpperCase() === '[OBJECT OBJECT]') return false;
        return /^[A-Za-z0-9_-]+$/.test(s);
      });
      const now = new Date().toISOString();
      for (const d of sanitized) {
        const code = String(d.code).trim();
        await this.dynamoService.putItem({
          PK: pk,
          SK: `DEPT#${code}`,
          id: `DEPARTMENT#${code}`,
          name: d.name || code,
          code,
          active: d.active !== false,
          createdAt: d.createdAt || now,
          updatedAt: now
        });
      }
      deptItems = await this.queryByPrefix(pk, 'DEPT#');
    }
    const activeDepartments = deptItems.filter(d => d && d.active !== false);

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
    let deptItems = await this.queryByPrefix(pk, 'DEPT#');
    if (!deptItems.length) {
      const meta = await this.dynamoService.getItem({ Key: { PK: pk, SK: 'METADATA' } });
      let departments = Array.isArray(meta?.Item?.departments) ? meta.Item.departments : [];
      if (departments.length && typeof departments[0] === 'string') {
        departments = departments.map(code => ({ code, name: String(code), active: true, createdAt: new Date().toISOString() }));
      }
      const now = new Date().toISOString();
      for (const d of departments) {
        const code = String((typeof d === 'string' ? d : d.code) || '').trim();
        if (!code) continue;
        await this.dynamoService.putItem({
          PK: pk,
          SK: `DEPT#${code}`,
          id: `DEPARTMENT#${code}`,
          name: (typeof d === 'string' ? d : (d.name || code)),
          code,
          active: (typeof d === 'object' ? (d.active !== false) : true),
          createdAt: (typeof d === 'object' ? d.createdAt : now),
          updatedAt: now
        });
      }
      deptItems = await this.queryByPrefix(pk, 'DEPT#');
    }
    const students = await this.queryByPrefix(pk, 'STUDENT#');
    const staffNew = await this.queryByPrefix(pk, 'STAFF#').catch(() => []);
    const staffLegacy = await this.queryByPrefix(pk, 'PTS#').catch(() => []);
    const staff = [...staffNew, ...staffLegacy];
    const assessments = await this.getAssessments(email);
    return deptItems.map(d => {
      const code = String(d.code || '').trim();
      const studentsCount = students.filter(s => (s.department || '').toUpperCase() === code.toUpperCase()).length;
      const staffCount = staff.filter(st => (st.department || '').toUpperCase() === code.toUpperCase()).length;
      const assessmentsCount = assessments.filter(a => (a.department || '').toUpperCase() === code.toUpperCase()).length;
      return {
        id: d.id || `DEPARTMENT#${code}`,
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
    const items = await this.queryByPrefix(pk, 'DEPT#');
    let codes = items.map(d => String(d.code || '').toUpperCase()).filter(Boolean);
    if (!codes.length) {
      const res = await this.dynamoService.getItem({ Key: { PK: pk, SK: 'METADATA' } });
      const current = Array.isArray(res?.Item?.departments) ? res.Item.departments : [];
      codes = current.map(d => (typeof d === 'string' ? d : d.code)).map(c => String(c || '').toUpperCase()).filter(Boolean);
    }
    const defaults = ['CE', 'ME', 'EEE', 'ECE', 'CSE', 'IT'];
    const union = Array.from(new Set([ ...codes, ...defaults ]));
    return union;
  }

  async createDepartment(email, { name, code }) {
    const pk = this.clientPkFromEmail(email);
    const now = new Date().toISOString();
    const sk = `DEPT#${String(code).trim()}`;
    const existing = await this.dynamoService.getItem({ Key: { PK: pk, SK: sk } });
    if (existing && existing.Item) return existing.Item;
    const item = { PK: pk, SK: sk, id: `DEPARTMENT#${code}`, name: name || code, code, active: true, createdAt: now, updatedAt: now };
    await this.dynamoService.putItem(item);
    return item;
  }

  async updateDepartment(email, code, updates) {
    const pk = this.clientPkFromEmail(email);
    const sk = `DEPT#${String(code).trim()}`;
    const current = await this.dynamoService.getItem({ Key: { PK: pk, SK: sk } });
    if (!current || !current.Item) throw new Error('Department not found');
    const now = new Date().toISOString();
    const newCode = updates.code ? String(updates.code).trim() : String(current.Item.code).trim();
    const targetSk = `DEPT#${newCode}`;
    const updatedItem = {
      ...current.Item,
      SK: targetSk,
      id: `DEPARTMENT#${newCode}`,
      name: updates.name !== undefined ? updates.name : (current.Item.name || newCode),
      code: newCode,
      active: updates.active !== undefined ? updates.active : (current.Item.active !== false),
      updatedAt: now
    };
    if (targetSk !== sk) {
      await this.dynamoService.putItem(updatedItem);
      await this.dynamoService.deleteItem({ Key: { PK: pk, SK: sk } });
    } else {
      await this.dynamoService.updateItem({
        Key: { PK: pk, SK: sk },
        UpdateExpression: 'SET #name = :name, #active = :active, #updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#name': 'name', '#active': 'active', '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: { ':name': updatedItem.name, ':active': updatedItem.active, ':updatedAt': now }
      });
    }
    return updatedItem;
  }

  async deleteDepartment(email, code) {
    const pk = this.clientPkFromEmail(email);
    const sk = `DEPT#${String(code).trim()}`;
    await this.dynamoService.deleteItem({ Key: { PK: pk, SK: sk } });
    return true;
  }

  async setDepartmentActive(email, code, active) {
    const pk = this.clientPkFromEmail(email);
    const sk = `DEPT#${String(code).trim()}`;
    const now = new Date().toISOString();
    const res = await this.dynamoService.updateItem({
      Key: { PK: pk, SK: sk },
      UpdateExpression: 'SET #active = :active, #updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#active': 'active', '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':active': !!active, ':updatedAt': now },
      ReturnValues: 'ALL_NEW'
    });
    return res.Attributes;
  }

  async repairDepartments(email) {
    const pk = this.clientPkFromEmail(email);
    const meta = await this.dynamoService.getItem({ Key: { PK: pk, SK: 'METADATA' } });
    let current = Array.isArray(meta?.Item?.departments) ? meta.Item.departments : [];
    current = current.map(d => (typeof d === 'string' ? { code: d, name: d, active: true, createdAt: new Date().toISOString() } : d));
    const valid = current.filter(d => {
      const s = String(d.code || '').trim();
      if (!s) return false;
      if (s.toUpperCase() === '[OBJECT OBJECT]') return false;
      return /^[A-Za-z0-9_-]+$/.test(s);
    });
    const now = new Date().toISOString();
    for (const d of valid) {
      const code = String(d.code).trim();
      await this.dynamoService.putItem({
        PK: pk,
        SK: `DEPT#${code}`,
        id: `DEPARTMENT#${code}`,
        name: d.name || code,
        code,
        active: d.active !== false,
        createdAt: d.createdAt || now,
        updatedAt: now
      });
    }
    const deptItems = await this.queryByPrefix(pk, 'DEPT#');
    return deptItems;
  }

  async getStaff(email) {
    const pk = this.clientPkFromEmail(email);
    const itemsPts = await this.queryByPrefix(pk, 'PTS#').catch(() => []);
    const itemsStaff = await this.queryByPrefix(pk, 'STAFF#').catch(() => []);
    const seen = new Set(itemsPts.map(i => String(i.email || '').toLowerCase()));
    let merged = [...itemsPts, ...itemsStaff.filter(i => !seen.has(String(i.email || '').toLowerCase()))];
    merged = merged.filter(i => String(i.email || '').toLowerCase() !== String(email || '').toLowerCase());
    return merged.map(i => ({
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
    const providedRaw = String(data.email || '').trim();
    if (!providedRaw.includes('@')) {
      throw new Error(`Email must include @ and end with @${clientDomain}`);
    }
    if (!providedRaw.toLowerCase().endsWith(`@${clientDomain.toLowerCase()}`)) {
      throw new Error(`Staff email must end with @${clientDomain}`);
    }
    const finalEmail = providedRaw;
    if (finalEmail.toLowerCase() === String(email || '').toLowerCase()) {
      throw new Error('Cannot create staff using the current PTO email');
    }
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
      let createFailedButExists = false;
      try {
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
      } catch (e) {
        const msg = (e && e.message) ? e.message : '';
        const code = e && (e.code || e.name);
        if ((code && /UsernameExistsException/i.test(String(code))) || /exist/i.test(msg)) {
          createFailedButExists = true;
        } else {
          throw e;
        }
      }
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
    if (!current || !current.Item) throw new Error('Staff record not found');
    const now = new Date().toISOString();
    const updatedFields = { ...updates };
    delete updatedFields.email;
    delete updatedFields.firstName;
    delete updatedFields.lastName;
    if (Object.keys(updatedFields).length) {
      const params = {
        Key: { PK: pk, SK: id },
        UpdateExpression: '',
        ExpressionAttributeNames: {},
        ExpressionAttributeValues: {},
        ReturnValues: 'ALL_NEW'
      };
      const expression = [];
      let idx = 0;
      Object.keys(updatedFields).forEach(k => {
        expression.push(`#${k} = :v${idx}`);
        params.ExpressionAttributeNames[`#${k}`] = k;
        params.ExpressionAttributeValues[`:v${idx}`] = updatedFields[k];
        idx++;
      });
      expression.push('#updatedAt = :updatedAt');
      params.ExpressionAttributeNames['#updatedAt'] = 'updatedAt';
      params.ExpressionAttributeValues[':updatedAt'] = now;
      params.UpdateExpression = `SET ${expression.join(', ')}`;
      await this.dynamoService.updateItem(params);
    }
    let newEmail = null;
    if (updates && updates.email) {
      const clientDomain = (email || '').split('@')[1] || '';
      const providedRaw = String(updates.email || '').trim();
      if (!providedRaw.includes('@')) {
        throw new Error(`Email must include @ and end with @${clientDomain}`);
      }
      if (!providedRaw.toLowerCase().endsWith(`@${clientDomain.toLowerCase()}`)) {
        throw new Error(`Staff email must end with @${clientDomain}`);
      }
      if (providedRaw.toLowerCase() === String(email || '').toLowerCase()) {
        throw new Error('Staff email cannot be the current PTO email');
      }
      newEmail = providedRaw;
      const oldEmail = current.Item.email || '';
      if (newEmail !== oldEmail) {
        const defaultPassword = 'Praskla@123';
        try { await this.cognitoClient.send(new AdminDisableUserCommand({ UserPoolId: process.env.COGNITO_USER_POOL_ID, Username: oldEmail })); } catch (_) {}
        let createErrMsg = '';
        try {
          await this.cognitoClient.send(new AdminCreateUserCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: newEmail,
            TemporaryPassword: defaultPassword,
            UserAttributes: [ { Name: 'email', Value: newEmail }, { Name: 'email_verified', Value: 'true' } ],
            MessageAction: 'SUPPRESS'
          }));
        } catch (e) {
          createErrMsg = (e && e.message) ? e.message : '';
          if (!/exists/i.test(createErrMsg)) {
            throw new Error('Cognito re-provision failed: ' + createErrMsg);
          }
        }
        try { await this.cognitoClient.send(new AdminSetUserPasswordCommand({ UserPoolId: process.env.COGNITO_USER_POOL_ID, Username: newEmail, Password: defaultPassword, Permanent: true })); } catch (_) {}
        try { await addUserToGroup(newEmail, 'instructor'); } catch (_) {}
        const newSk = `PTS#${newEmail}`;
        const newItem = { ...current.Item, SK: newSk, email: newEmail, updatedAt: now };
        if (updates.firstName !== undefined) newItem.firstName = updates.firstName;
        if (updates.lastName !== undefined) newItem.lastName = updates.lastName;
        if (updates.firstName !== undefined || updates.lastName !== undefined) {
          const combined = [newItem.firstName || '', newItem.lastName || ''].filter(Boolean).join(' ').trim();
          newItem.name = combined;
        }
        await this.dynamoService.putItem(newItem);
        await this.dynamoService.deleteItem({ Key: { PK: pk, SK: id } });
      }
    }
    const usernameForUpdate = newEmail || current.Item.email;
    const finalItem = await this.dynamoService.getItem({ Key: { PK: pk, SK: newEmail ? `PTS#${newEmail}` : id } });
    const attrs = finalItem?.Item || current.Item;
    await this.updateCognitoAttributes(usernameForUpdate, {
      firstName: attrs.firstName,
      lastName: attrs.lastName,
      fullName: attrs.name,
      role: attrs.role,
      department: attrs.department,
      email: attrs.email
    });
    return attrs;
  }

  async deleteStaff(email, id) {
    const pk = this.clientPkFromEmail(email);
    const exists = await this.dynamoService.getItem({ Key: { PK: pk, SK: id } });
    if (exists && exists.Item) {
      await this.dynamoService.deleteItem({ Key: { PK: pk, SK: id } });
    } else {
      const altId = id.startsWith('STAFF#') ? id.replace('STAFF#','PTS#') : id.replace('PTS#','STAFF#');
      const alt = await this.dynamoService.getItem({ Key: { PK: pk, SK: altId } });
      if (alt && alt.Item) await this.dynamoService.deleteItem({ Key: { PK: pk, SK: altId } });
    }
    return true;
  }

  async updatePtoProfile(email, data) {
    const pk = this.clientPkFromEmail(email);
    const emailOriginal = String((data.email || email) || '').trim();
    const userEmail = emailOriginal.toLowerCase();
    const targetSk = `PTO#${userEmail}`;
    const firstName = String(data.firstName || '').trim();
    const lastName = String(data.lastName || '').trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    const now = new Date().toISOString();
    const existing = await this.dynamoService.getItem({ Key: { PK: pk, SK: targetSk } });
    const item = {
      PK: pk,
      SK: targetSk,
      name: fullName,
      firstName,
      lastName,
      email: emailOriginal,
      phone: String(data.phone || ''),
      designation: String(data.designation || 'Placement Training Officer'),
      role: 'Placement Training Officer',
      department: String(data.department || ''),
      updatedAt: now
    };
    if (existing && existing.Item) {
      await this.dynamoService.updateItem({
        Key: { PK: pk, SK: targetSk },
        UpdateExpression: 'SET #name = :name, #firstName = :firstName, #lastName = :lastName, #email = :email, #phone = :phone, #designation = :designation, #department = :department, #updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#name': 'name', '#firstName': 'firstName', '#lastName': 'lastName', '#email': 'email', '#phone': 'phone', '#designation': 'designation', '#department': 'department', '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: { ':name': fullName, ':firstName': firstName, ':lastName': lastName, ':email': emailOriginal, ':phone': item.phone, ':designation': item.designation, ':department': item.department, ':updatedAt': now },
        ReturnValues: 'ALL_NEW'
      });
    } else {
      await this.dynamoService.putItem(item);
    }
    const staffSkNew = `STAFF#${emailOriginal}`;
    const staffSkLegacy = `PTS#${emailOriginal}`;
    const s1 = await this.dynamoService.getItem({ Key: { PK: pk, SK: staffSkNew } }).catch(() => null);
    if (s1 && s1.Item) await this.dynamoService.deleteItem({ Key: { PK: pk, SK: staffSkNew } }).catch(() => null);
    const s2 = await this.dynamoService.getItem({ Key: { PK: pk, SK: staffSkLegacy } }).catch(() => null);
    if (s2 && s2.Item) await this.dynamoService.deleteItem({ Key: { PK: pk, SK: staffSkLegacy } }).catch(() => null);
    const legacyStaff = await this.queryByPrefix(pk, 'PTS#').catch(() => []);
    for (const it of legacyStaff) {
      if (String(it.email || '').toLowerCase() === userEmail) {
        await this.dynamoService.deleteItem({ Key: { PK: pk, SK: it.SK } }).catch(() => null);
      }
    }
    await this.updateCognitoAttributes(userEmail, { firstName, lastName, fullName, role: 'Placement Training Officer', department: String(data.department || ''), email: emailOriginal });
    try { await this.cognitoClient.send(new AdminRemoveUserFromGroupCommand({ UserPoolId: process.env.COGNITO_USER_POOL_ID, Username: userEmail, GroupName: 'instructor' })); } catch (_) {}
    try { const { addUserToGroup } = require('../auth/cognito'); await addUserToGroup(userEmail, 'PTO'); } catch (_) {}
    return item;
  }

  async getPtoProfile(email) {
    const pk = this.clientPkFromEmail(email);
    const userEmail = String(email || '').trim().toLowerCase();
    const sk = `PTO#${userEmail}`;
    const res = await this.dynamoService.getItem({ Key: { PK: pk, SK: sk } });
    if (res && res.Item) return res.Item;
    const ptoItems = await this.queryByPrefix(pk, 'PTO#').catch(() => []);
    const item = (Array.isArray(ptoItems) ? ptoItems : []).find(it => String(it.email || '').toLowerCase() === userEmail) || null;
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
      date: i.scheduling?.startDate || i.date || '',
      timeWindow: {
        start: i.scheduling?.startDate || i.timeWindow?.start || '',
        end: i.scheduling?.endDate || i.timeWindow?.end || ''
      },
      attempts: i.configuration?.maxAttempts ?? i.attempts ?? 1,
      questions: i.configuration?.totalQuestions ?? (i.questions || []).length ?? 0,
      status: (typeof i.status === 'string' ? String(i.status).toLowerCase() : 'inactive'),
      createdBy: i.createdBy,
      createdByName: i.createdByName
    }));

    const assessmentService = require('./AssessmentService');
    const domain = (String(email || '').split('@')[1] || '').trim();
    const all = await assessmentService.getAllAssessments({ clientDomain: domain });
    const mappedAlt = (all.items || []).map(m => ({
      id: String(m.SK || ''),
      name: m.title || m.name || '',
      department: m.department || 'All Departments',
      type: (m.department && m.department !== 'All Departments') ? 'department-wise' : 'college-wide',
      duration: m.configuration?.duration || m.duration || 60,
      date: m.scheduling?.startDate || m.createdAt || m.date || '',
      timeWindow: {
        start: m.scheduling?.startDate || '',
        end: m.scheduling?.endDate || ''
      },
      attempts: m.configuration?.maxAttempts ?? 1,
      questions: m.configuration?.totalQuestions ?? m.questionCount ?? 0,
      status: (typeof m.status === 'string' ? String(m.status).toLowerCase() : 'inactive'),
      createdBy: m.createdBy,
      createdByName: m.createdByName
    }));
    const byId = new Map();
    for (const a of [...mappedClient, ...mappedAlt]) {
      const key = a.id || '';
      if (!byId.has(key)) byId.set(key, a);
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
      // continue to delete alt layout below
    }
    const cleaned = String(id || '');
    const assessmentId = cleaned.replace(/^ASSESSMENT#/, '');
    try {
      const assessmentService = require('./AssessmentService');
      await assessmentService.deleteAssessment(assessmentId);
    } catch (_) {}
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

  async deleteAnnouncement(email, id) {
    const pk = this.clientPkFromEmail(email);
    const sk = id.startsWith('ANNOUNCEMENT#') ? id : `ANNOUNCEMENT#${id}`;
    const params = { Key: { PK: pk, SK: sk } };
    try {
      await this.announcementsTable.deleteItem(params);
    } catch (_) {
      await this.dynamoService.deleteItem(params);
    }
    return { deleted: true, id: sk };
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

  async deleteMessage(email, { conversationId, messageId, recipientId }) {
    const pkClient = this.clientPkFromEmail(email);
    const convId = conversationId || (recipientId ? `CONVERSATION#${pkClient}#${recipientId}` : null);
    if (!convId || !messageId) throw new Error('conversationId or recipientId and messageId required');
    const params = { Key: { PK: convId, SK: messageId } };
    try {
      await this.messagesTable.deleteItem(params);
    } catch (_) {
      await this.dynamoService.deleteItem(params);
    }
    return { deleted: true, messageId };
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
    const scoresMap = await this.getScoresMapForDomain(email).catch(() => ({}));
    return items.map(i => {
      const em = String(i.email || '').toLowerCase();
      const scoreInfo = scoresMap[em] || { tests: 0, avg: 0 };
      return {
        id: i.SK,
        name: i.name,
        rollNumber: i.rollNumber,
        department: i.department,
        email: i.email,
        testsParticipated: Number(i.testsParticipated || scoreInfo.tests || 0),
        avgScore: Math.round(Number(i.avgScore || scoreInfo.avg || 0))
      };
    });
  }

  async getScoresMapForDomain(email) {
    const domain = String(email).split('@')[1] || '';
    const out = {};
    // Try scanning results table; aggregate by student email
    const params = { };
    try {
      const res = await this.resultsTable.scanTable(params);
      const items = res.Items || [];
      for (const it of items) {
        const em = String(it.studentEmail || it.recipientId || it.email || '').toLowerCase();
        if (!em || (domain && !em.endsWith(`@${domain}`))) continue;
        const totalMarks = Number(it.totalMarks || 0);
        const obtainedMarks = Number(it.obtainedMarks || 0);
        let score = Number(it.score || it.accuracy || 0);
        if (!score && totalMarks > 0) score = (obtainedMarks / totalMarks) * 100;
        if (!out[em]) out[em] = { tests: 0, avg: 0, sum: 0 };
        out[em].tests += 1;
        out[em].sum += (isNaN(score) ? 0 : score);
      }
      Object.keys(out).forEach(k => {
        const v = out[k];
        v.avg = v.tests ? (v.sum / v.tests) : 0;
      });
    } catch (_) {}
    return out;
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
