// @ts-nocheck
const DynamoDBService = require('./DynamoDBService');
const { v4: uuidv4 } = require('uuid');

class AdminService {
  constructor() {
    this.dynamoService = new DynamoDBService(process.env.DYNAMODB_TABLE_NAME || 'Assesment_placipy');
  }

  // Delegate DynamoDB methods to the service
  async scanTable(params) {
    return this.dynamoService.scanTable(params);
  }

  async queryTable(params) {
    return this.dynamoService.queryTable(params);
  }

  async putItem(item) {
    return this.dynamoService.putItem(item);
  }

  async getItem(params) {
    return this.dynamoService.getItem(params);
  }

  async updateItem(params) {
    return this.dynamoService.updateItem(params);
  }

  async deleteItem(params) {
    return this.dynamoService.deleteItem(params);
  }

  async batchWrite(items) {
    return this.dynamoService.batchWrite(items);
  }

  // Dashboard Statistics
  async getDashboardStats() {
    try {
      const [colleges, officers, students, assessments, topColleges] = await Promise.all([
        this.getAllColleges(),
        this.getAllOfficers({}),
        this.getAllStudents(),
        this.getAllAssessments({}),
        this.getTopActiveColleges(5)
      ]);

      const activeAssessments = assessments.filter(assessment => assessment.status === 'active' || assessment.status === 'ACTIVE');
      
      return {
        totalColleges: colleges.length,
        totalOfficers: officers.length,
        totalStudents: students.length,
        activeAssessments: activeAssessments.length,
        totalAssessments: assessments.length,
        topColleges: topColleges,
        recentActivity: await this.getRecentActivity()
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  async getTopActiveColleges(limit = 5) {
    try {
      // Get all colleges
      const colleges = await this.getAllColleges();
      
      // Get assessment results to calculate activity
      const resultsParams = {
        FilterExpression: 'begins_with(SK, :resultPrefix)',
        ExpressionAttributeValues: {
          ':resultPrefix': 'RESULT#ASSESSMENT#'
        }
      };
      const resultsData = await this.scanTable(resultsParams);
      
      // Get all assessments
      const assessmentsParams = {
        FilterExpression: 'begins_with(SK, :assessmentPrefix)',
        ExpressionAttributeValues: {
          ':assessmentPrefix': 'ASSESSMENT#'
        }
      };
      const assessmentsData = await this.scanTable(assessmentsParams);
      
      // Calculate stats for each college
      const collegeStats = colleges.map(college => {
        const collegePK = college.id;
        
        // Count students (unique emails in results)
        const collegeResults = resultsData.Items.filter(item => item.PK === collegePK);
        const uniqueStudents = new Set(collegeResults.map(r => r.email)).size;
        
        // Count assessments
        const collegeAssessments = assessmentsData.Items.filter(item => item.PK === collegePK);
        const totalAssessments = collegeAssessments.length;
        
        // Count completed assessments (from results)
        const completedAssessments = new Set(collegeResults.map(r => r.assessmentId)).size;
        
        return {
          name: college.name,
          domain: college.domain,
          students: uniqueStudents,
          assessments: totalAssessments,
          completedAssessments: completedAssessments,
          activityScore: (completedAssessments * 2) + uniqueStudents + totalAssessments
        };
      });
      
      // Sort by activity score and return top N
      return collegeStats
        .sort((a, b) => b.activityScore - a.activityScore)
        .slice(0, limit)
        .map(({ activityScore, ...rest }) => rest);
        
    } catch (error) {
      console.error('Error getting top active colleges:', error);
      return [];
    }
  }

  // College Management
  async getAllColleges() {
    try {
      const params = {
        FilterExpression: 'begins_with(PK, :clientPrefix) AND SK = :metadata',
        ExpressionAttributeValues: {
          ':clientPrefix': 'CLIENT#',
          ':metadata': 'METADATA'
        }
      };

      const result = await this.scanTable(params);
      return result.Items.map(item => this.formatCollegeData(item));
    } catch (error) {
      console.error('Error getting all colleges:', error);
      throw error;
    }
  }

  async createCollege(collegeData) {
    try {
      const collegeId = `CLIENT#${collegeData.domain}`;
      const timestamp = new Date().toISOString();

      const college = {
        PK: collegeId,
        SK: 'METADATA',
        name: collegeData.name,
        domain: collegeData.domain,
        clientType: 'college',
        location: collegeData.location || '',
        collegeName: collegeData.name,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: collegeData.createdBy
      };

      await this.putItem(college);
      return this.formatCollegeData(college);
    } catch (error) {
      console.error('Error creating college:', error);
      throw error;
    }
  }

  async getCollegeById(collegeId) {
    try {
      const pk = collegeId.startsWith('CLIENT#') ? collegeId : `CLIENT#${collegeId}`;
      const params = {
        Key: {
          PK: pk,
          SK: 'METADATA'
        }
      };

      const result = await this.getItem(params);
      return result.Item ? this.formatCollegeData(result.Item) : null;
    } catch (error) {
      console.error('Error getting college by ID:', error);
      throw error;
    }
  }

  async updateCollege(collegeId, updates) {
    try {
      const pk = collegeId.startsWith('CLIENT#') ? collegeId : `CLIENT#${collegeId}`;
      
      const updateExpression = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      let valueIndex = 0;
      Object.keys(updates).forEach((key) => {
        if (key !== 'PK' && key !== 'SK' && updates[key] !== undefined) {
          updateExpression.push(`#${key} = :val${valueIndex}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:val${valueIndex}`] = updates[key];
          valueIndex++;
        }
      });

      // Always update the timestamp
      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      if (updateExpression.length === 1) {
        throw new Error('No valid fields to update');
      }

      const params = {
        Key: { PK: pk, SK: 'METADATA' },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      };

      const result = await this.updateItem(params);
      return this.formatCollegeData(result.Attributes);
    } catch (error) {
      console.error('Error updating college:', error);
      throw error;
    }
  }

  async deleteCollege(collegeId) {
    try {
      const pk = collegeId.startsWith('CLIENT#') ? collegeId : `CLIENT#${collegeId}`;
      
      // First check if college has users
      const hasUsers = await this.checkCollegeHasUsers(pk);
      if (hasUsers) {
        throw new Error('Cannot delete college with active users');
      }

      const params = {
        Key: {
          PK: pk,
          SK: 'METADATA'
        }
      };

      await this.deleteItem(params);
      return true;
    } catch (error) {
      console.error('Error deleting college:', error);
      throw error;
    }
  }

  async checkCollegeHasUsers(collegeId) {
    try {
      const pk = collegeId.startsWith('CLIENT#') ? collegeId : `CLIENT#${collegeId}`;
      const params = {
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': pk
        },
        Limit: 1
      };

      const result = await this.queryTable(params);
      // Check if there are any records other than METADATA
      return result.Items.some(item => item.SK !== 'METADATA');
    } catch (error) {
      console.error('Error checking college users:', error);
      return false;
    }
  }

  // Officer Management
  async getAllOfficers(filters = {}) {
    try {
      let params = {};

      if (filters.collegeId) {
        // Get officers from specific college
        const pk = filters.collegeId.startsWith('CLIENT#') ? filters.collegeId : `CLIENT#${filters.collegeId}`;
        
        // Query for legacy PTO# prefixes
        params = {
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :ptoPrefix)',
          ExpressionAttributeValues: {
            ':pk': pk,
            ':ptoPrefix': 'PTO#'
          }
        };
        const result1 = await this.queryTable(params);
        
        // Query for legacy PTS# prefixes
        params.ExpressionAttributeValues[':ptoPrefix'] = 'PTS#';
        const result2 = await this.queryTable(params);
        
        // Query for new Placement Training Officer# prefixes
        params.ExpressionAttributeValues[':ptoPrefix'] = 'Placement Training Officer#';
        const result3 = await this.queryTable(params);
        
        // Query for new Placement Training Staff# prefixes
        params.ExpressionAttributeValues[':ptoPrefix'] = 'Placement Training Staff#';
        const result4 = await this.queryTable(params);
        
        // Query for Administrator# prefixes
        params.ExpressionAttributeValues[':ptoPrefix'] = 'Administrator#';
        const result5 = await this.queryTable(params);
        
        const officers = [...result1.Items, ...result2.Items, ...result3.Items, ...result4.Items, ...result5.Items];
        return officers.map(item => this.formatOfficerData(item));
      } else {
        // Get all officers from all colleges
        params = {
          FilterExpression: 'begins_with(SK, :ptoPrefix) OR begins_with(SK, :ptsPrefix) OR begins_with(SK, :newPtoPrefix) OR begins_with(SK, :newPtsPrefix) OR begins_with(SK, :adminPrefix)',
          ExpressionAttributeValues: {
            ':ptoPrefix': 'PTO#',
            ':ptsPrefix': 'PTS#',
            ':newPtoPrefix': 'Placement Training Officer#',
            ':newPtsPrefix': 'Placement Training Staff#',
            ':adminPrefix': 'Administrator#'
          }
        };
        
        const result = await this.scanTable(params);
        return result.Items.map(item => this.formatOfficerData(item));
      }
    } catch (error) {
      console.error('Error getting officers:', error);
      throw error;
    }
  }

  async createOfficer(officerData) {
    try {
      const timestamp = new Date().toISOString();
      const officerId = `${officerData.role}#${uuidv4().substring(0, 8)}`;
      const collegeId = officerData.collegeId.startsWith('CLIENT#') ? officerData.collegeId : `CLIENT#${officerData.collegeId}`;

      // Generate default password that meets Cognito policy: 
      // Must have uppercase, lowercase, numbers, and symbols
      const username = officerData.email;
      const emailPart = username.split('@')[0]; // Get part before @
      const defaultPassword = emailPart.charAt(0).toUpperCase() + emailPart.slice(1) + '123!@#';

      // STEP 1: First create officer record in DynamoDB
      const officer = {
        PK: collegeId,
        SK: officerId,
        name: officerData.name,
        email: officerData.email,
        role: officerData.role,
        department: officerData.department || '',
        phone: officerData.phone || '',
        permissions: officerData.permissions || [],
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: officerData.createdBy,
        defaultPasswordSet: true, // Flag to indicate default password was set
        mustChangePassword: true, // Flag to force password change on first login
        cognitoUserCreated: false // Track Cognito creation status - initialize to false
      };

      await this.putItem(officer);

      // STEP 2: Then create user in Cognito using Admin API
      const { adminCreateUser } = require('../auth/cognito');
      
      try {
        await adminCreateUser(username, defaultPassword, officerData.email, false);
        
        // Update DynamoDB record to mark Cognito user as created
        const updateParams = {
          Key: {
            PK: collegeId,
            SK: officerId
          },
          UpdateExpression: 'SET cognitoUserCreated = :cognitoStatus, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':cognitoStatus': true,
            ':updatedAt': new Date().toISOString()
          }
        };
        await this.updateItem(updateParams);
        officer.cognitoUserCreated = true;
        
      } catch (cognitoError) {
        console.error('Error creating Cognito user:', cognitoError);
        
        // Handle specific Cognito errors
        if (cognitoError.code === 'UsernameExistsException') {
          console.log(`User ${username} already exists in Cognito, marking as created`);
          // Update DynamoDB to mark Cognito user as created (already exists)
          const updateParams = {
            Key: {
              PK: collegeId,
              SK: officerId
            },
            UpdateExpression: 'SET cognitoUserCreated = :cognitoStatus, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':cognitoStatus': true,
              ':updatedAt': new Date().toISOString()
            }
          };
          await this.updateItem(updateParams);
          officer.cognitoUserCreated = true;
        } else {
          // For other Cognito errors, log but don't fail the entire operation
          // The officer record exists in DynamoDB, admin can retry Cognito creation later
          console.error(`Failed to create Cognito user for ${username}:`, cognitoError.message);
          
          // Update DynamoDB with error info
          const updateParams = {
            Key: {
              PK: collegeId,
              SK: officerId
            },
            UpdateExpression: 'SET cognitoUserCreated = :cognitoStatus, cognitoError = :error, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':cognitoStatus': false,
              ':error': cognitoError.message,
              ':updatedAt': new Date().toISOString()
            }
          };
          await this.updateItem(updateParams);
          
          // Include warning in response but don't fail
          officer.cognitoUserCreated = false;
          officer.cognitoError = cognitoError.message;
        }
      }

      // Return formatted officer data
      const formattedOfficer = this.formatOfficerData(officer);
      
      // Add default password info to response (for admin notification)
      formattedOfficer.defaultPassword = defaultPassword;
      formattedOfficer.loginInstructions = officer.cognitoUserCreated 
        ? `Default password: ${defaultPassword}. User must change password on first login.`
        : `Officer created in database. Authentication account creation ${officer.cognitoError ? 'failed: ' + officer.cognitoError : 'pending'}.`;
      
      return formattedOfficer;
    } catch (error) {
      console.error('Error creating officer:', error);
      throw error;
    }
  }

  async updateOfficer(officerId, updates) {
    try {
      // First find the officer to get the PK
      const officer = await this.findOfficerById(officerId);
      
      if (!officer) {
        throw new Error('Officer not found');
      }

      const updateExpression = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      let valueIndex = 0;
      Object.keys(updates).forEach((key) => {
        if (key !== 'PK' && key !== 'SK' && updates[key] !== undefined) {
          updateExpression.push(`#${key} = :val${valueIndex}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:val${valueIndex}`] = updates[key];
          valueIndex++;
        }
      });

      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      if (updateExpression.length === 1) {
        throw new Error('No valid fields to update');
      }

      const params = {
        Key: { PK: officer.PK, SK: officer.SK },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      };

      const result = await this.updateItem(params);
      return this.formatOfficerData(result.Attributes);
    } catch (error) {
      console.error('Error updating officer:', error);
      throw error;
    }
  }

  async deleteOfficer(officerId) {
    try {
      const officer = await this.findOfficerById(officerId);
      if (!officer) {
        throw new Error('Officer not found');
      }

      const params = {
        Key: {
          PK: officer.PK,
          SK: officer.SK
        }
      };

      await this.deleteItem(params);
      return true;
    } catch (error) {
      console.error('Error deleting officer:', error);
      throw error;
    }
  }

  // Helper Methods
  async findOfficerById(officerId) {
    try {
      // Scan for officer across all colleges
      const params = {
        FilterExpression: 'SK = :officerId',
        ExpressionAttributeValues: {
          ':officerId': officerId
        }
      };

      const result = await this.scanTable(params);
      return result.Items && result.Items.length > 0 ? result.Items[0] : null;
    } catch (error) {
      console.error('Error finding officer:', error);
      return null;
    }
  }

  async getAllStudents() {
    try {
      const params = {
        FilterExpression: 'begins_with(SK, :studentPrefix)',
        ExpressionAttributeValues: {
          ':studentPrefix': 'STUDENT#'
        }
      };

      const result = await this.scanTable(params);
      return result.Items.map(item => this.formatStudentData(item));
    } catch (error) {
      console.error('Error getting students:', error);
      throw error;
    }
  }

  async getAllDepartments(collegeId = null) {
    try {
      let params;

      if (collegeId) {
        params = {
          FilterExpression: 'begins_with(PK, :deptPrefix)',
          ExpressionAttributeValues: {
            ':deptPrefix': 'DEPARTMENT'
          }
        };
      } else {
        params = {
          FilterExpression: 'begins_with(PK, :deptPrefix)',
          ExpressionAttributeValues: {
            ':deptPrefix': 'DEPARTMENT'
          }
        };
      }

      const result = await this.scanTable(params);
      return result.Items.map(item => this.formatDepartmentData(item));
    } catch (error) {
      console.error('Error getting departments:', error);
      throw error;
    }
  }

  async getAllAssessments(filters = {}) {
    try {
      let params = {
        FilterExpression: 'begins_with(PK, :assessPrefix)',
        ExpressionAttributeValues: {
          ':assessPrefix': 'ASSESSMENT'
        }
      };

      if (filters.status) {
        params.FilterExpression += ' AND #status = :status';
        params.ExpressionAttributeNames = { '#status': 'status' };
        params.ExpressionAttributeValues[':status'] = filters.status;
      }

      const result = await this.scanTable(params);
      return result.Items.map(item => this.formatAssessmentData(item));
    } catch (error) {
      console.error('Error getting assessments:', error);
      throw error;
    }
  }

  async getRecentActivity() {
    try {
      // Get recent items (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const params = {
        FilterExpression: '#updatedAt > :sevenDaysAgo',
        ExpressionAttributeNames: {
          '#updatedAt': 'updatedAt'
        },
        ExpressionAttributeValues: {
          ':sevenDaysAgo': sevenDaysAgo.toISOString()
        },
        Limit: 10
      };

      const result = await this.scanTable(params);
      return result.Items.map(item => ({
        type: this.getEntityType(item),
        action: 'updated',
        timestamp: item.updatedAt,
        details: this.getActivityDetails(item)
      }));
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  // Reporting Methods
  async getPerformanceReport(filters = {}) {
    try {
      const assessments = await this.getAllAssessments(filters);
      const colleges = await this.getAllColleges();
      
      return {
        assessmentPerformance: assessments.map(assessment => ({
          id: assessment.id,
          name: assessment.name,
          department: assessment.department,
          status: assessment.status,
          attempts: assessment.attempts || 0
        })),
        collegePerformance: colleges.map(college => ({
          id: college.id,
          name: college.name,
          totalUsers: 0, // Will be calculated
          activeAssessments: assessments.filter(a => a.collegeId === college.id).length
        }))
      };
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw error;
    }
  }

  async getCollegeReports() {
    try {
      const colleges = await this.getAllColleges();
      const reports = [];

      for (const college of colleges) {
        const officers = await this.getAllOfficers({ collegeId: college.id });
        const students = await this.getStudentsByCollege(college.id);
        
        reports.push({
          college: college,
          stats: {
            totalOfficers: officers.length,
            totalStudents: students.length,
            departments: await this.getDepartmentsByCollege(college.id)
          }
        });
      }

      return reports;
    } catch (error) {
      console.error('Error generating college reports:', error);
      throw error;
    }
  }

  // System Settings
  async getSystemSettings() {
    try {
      const params = {
        Key: {
          PK: 'GLOBAL#SETTINGS',
          SK: 'CONFIG'
        }
      };

      const result = await this.getItem(params);
      return result.Item || {
        theme: 'light',
        emailNotifications: true,
        defaultLanguage: 'en',
        systemName: 'Assessment Platform'
      };
    } catch (error) {
      console.error('Error getting system settings:', error);
      throw error;
    }
  }

  async updateSystemSettings(settings) {
    try {
      const timestamp = new Date().toISOString();
      
      const item = {
        PK: 'GLOBAL#SETTINGS',
        SK: 'CONFIG',
        ...settings,
        updatedAt: timestamp
      };

      await this.putItem(item);
      return item;
    } catch (error) {
      console.error('Error updating system settings:', error);
      throw error;
    }
  }

  // Admin Profile Management
  async getAdminProfile(email) {
    try {
      // Validate email format first
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        console.error('Invalid email format provided:', email);
        throw new Error('Invalid email format');
      }
      
      // Try to get admin profile from DynamoDB using ADMIN#PROFILE pattern
      let adminProfile = null;
      try {
        const params = {
          Key: {
            PK: 'ADMIN#PROFILE',
            SK: `USER#${email}`
          }
        };
        const result = await this.getItem(params);
        adminProfile = result.Item;
      } catch (dbError) {
        // Silently handle profile lookup failure
      }
      
      if (adminProfile) {
        return {
          email: adminProfile.email || email,
          name: adminProfile.name || '',
          firstName: adminProfile.firstName || adminProfile.name?.split(' ')[0] || '',
          lastName: adminProfile.lastName || adminProfile.name?.split(' ').slice(1).join(' ') || '',
          phone: adminProfile.phone || '',
          designation: adminProfile.designation || 'Company Administrator',
          department: adminProfile.department || 'Administration',
          employeeId: adminProfile.employeeId || '',
          joiningDate: adminProfile.joiningDate || adminProfile.createdAt || '',
          bio: adminProfile.bio || '',
          address: adminProfile.address || '',
          city: adminProfile.city || '',
          state: adminProfile.state || '',
          zipCode: adminProfile.zipCode || '',
          country: adminProfile.country || '',
          profilePicture: adminProfile.profilePicture || ''
        };
      }
      
      // If not found, try to get from Cognito
      console.log('Attempting to fetch from Cognito...');
      const { getUserAttributes } = require('../auth/cognito');
      try {
        const cognitoAttributes = await getUserAttributes(email);
        console.log('Cognito attributes fetched successfully');
        
        // Extract attributes from Cognito
        const attributes = {};
        if (Array.isArray(cognitoAttributes)) {
          cognitoAttributes.forEach(attr => {
            attributes[attr.Name] = attr.Value;
          });
        } else if (cognitoAttributes.attributes) {
          Object.assign(attributes, cognitoAttributes.attributes);
        }
        
        return {
          email: attributes.email || email,
          name: attributes.name || '',
          firstName: attributes.given_name || attributes.name?.split(' ')[0] || '',
          lastName: attributes.family_name || attributes.name?.split(' ').slice(1).join(' ') || '',
          phone: attributes.phone_number || '',
          designation: attributes['custom:designation'] || 'Company Administrator',
          department: attributes['custom:department'] || 'Administration',
          employeeId: attributes['custom:employeeId'] || '',
          joiningDate: attributes['custom:joiningDate'] || '',
          bio: attributes['custom:bio'] || '',
          address: attributes['custom:address'] || '',
          city: attributes['custom:city'] || '',
          state: attributes['custom:state'] || '',
          zipCode: attributes['custom:zipCode'] || '',
          country: attributes['custom:country'] || '',
          profilePicture: attributes.picture || ''
        };
      } catch (cognitoError) {
        console.error('Error fetching from Cognito:', cognitoError);
        // Return basic profile with email
        return {
          email: email,
          name: '',
          firstName: '',
          lastName: '',
          phone: '',
          designation: 'Company Administrator',
          department: 'Administration',
          employeeId: '',
          joiningDate: '',
          bio: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          profilePicture: ''
        };
      }
    } catch (error) {
      console.error('Error getting admin profile:', error);
      throw error;
    }
  }

  async updateAdminProfile(email, updates) {
    try {
      const timestamp = new Date().toISOString();
      
      // Check if profile exists
      let existingProfile = null;
      try {
        const params = {
          Key: {
            PK: 'ADMIN#PROFILE',
            SK: `USER#${email}`
          }
        };
        const result = await this.getItem(params);
        existingProfile = result.Item;
      } catch (err) {
        // No existing profile found, will create new one
      }
      
      // Prepare the profile data
      const profileData = {
        PK: 'ADMIN#PROFILE',
        SK: `USER#${email}`,
        email: email,
        name: updates.name || updates.firstName + ' ' + updates.lastName || existingProfile?.name || '',
        firstName: updates.firstName || existingProfile?.firstName || '',
        lastName: updates.lastName || existingProfile?.lastName || '',
        phone: updates.phone || existingProfile?.phone || '',
        designation: updates.designation || existingProfile?.designation || 'Company Administrator',
        department: updates.department || existingProfile?.department || 'Administration',
        employeeId: updates.employeeId || existingProfile?.employeeId || '',
        joiningDate: updates.joiningDate || existingProfile?.joiningDate || '',
        bio: updates.bio || existingProfile?.bio || '',
        address: updates.address || existingProfile?.address || '',
        city: updates.city || existingProfile?.city || '',
        state: updates.state || existingProfile?.state || '',
        zipCode: updates.zipCode || existingProfile?.zipCode || '',
        country: updates.country || existingProfile?.country || '',
        profilePicture: updates.profilePicture || existingProfile?.profilePicture || '',
        role: 'Admin',
        updatedAt: timestamp,
        createdAt: existingProfile?.createdAt || timestamp
      };
      
      // Save to DynamoDB
      await this.putItem(profileData);
      
      // Return the updated profile
      return this.getAdminProfile(email);
    } catch (error) {
      console.error('Error updating admin profile:', error);
      throw error;
    }
  }

  // Data Formatting Methods
  formatCollegeData(item) {
    return {
      id: item.PK,
      name: item.collegeName || item.name || '',
      domain: item.domain || '',
      location: item.location || '',
      clientType: item.clientType || 'college',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      active: item.active !== undefined ? item.active : true // Use stored value or default to active
    };
  }

  // Helper method to normalize legacy role formats
  normalizeRole(role) {
    if (!role) return 'Placement Training Officer'; // Default for empty roles
    
    switch (role.toLowerCase()) {
      case 'pto':
        return 'Placement Training Officer';
      case 'pts':
        return 'Placement Training Staff';
      case 'admin':
        return 'Administrator';
      default:
        // If already in new format, return as-is
        return role;
    }
  }

  formatOfficerData(item) {
    return {
      id: item.SK,
      name: item.name || '',
      email: item.email || '',
      role: this.normalizeRole(item.role),
      department: item.department || '',
      phone: item.phone || '',
      collegeId: item.PK,
      collegeName: '', // Will be populated from college data if needed
      permissions: item.permissions || [],
      status: item.status || 'ACTIVE', // Use stored status or default to ACTIVE
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      // Include authentication-related fields
      cognitoUserCreated: item.cognitoUserCreated,
      cognitoError: item.cognitoError,
      defaultPasswordSet: item.defaultPasswordSet,
      mustChangePassword: item.mustChangePassword
    };
  }

  formatStudentData(item) {
    return {
      id: item.SK,
      name: item.name || '',
      email: item.email || '',
      department: item.department || '',
      year: item.year || '',
      collegeId: item.PK,
      role: 'Student'
    };
  }

  formatDepartmentData(item) {
    return {
      id: item.id,
      name: item.name || '',
      code: item.code || '',
      createdAt: item.createdAt
    };
  }

  formatAssessmentData(item) {
    return {
      id: item.id,
      name: item.name || '',
      department: item.department || '',
      status: item.status || 'inactive',
      duration: item.duration || 60,
      attempts: item.attempts || 0,
      type: item.type || 'college-wide',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  getEntityType(item) {
    if (item.PK.startsWith('CLIENT#')) return 'college';
    if (item.PK.startsWith('ASSESSMENT')) return 'assessment';
    if (item.PK.startsWith('DEPARTMENT')) return 'department';
    if (item.SK.startsWith('PTO#')) return 'officer';
    if (item.SK.startsWith('PTS#')) return 'officer';
    if (item.SK.startsWith('STUDENT#')) return 'student';
    return 'unknown';
  }

  getActivityDetails(item) {
    const type = this.getEntityType(item);
    const name = item.name || item.collegeName || item.email || 'Unknown';
    return { type, name };
  }

  // Helper methods for college-specific data
  async getStudentsByCollege(collegeId) {
    try {
      const pk = collegeId.startsWith('CLIENT#') ? collegeId : `CLIENT#${collegeId}`;
      const params = {
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :studentPrefix)',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':studentPrefix': 'STUDENT#'
        }
      };

      const result = await this.queryTable(params);
      return result.Items.map(item => this.formatStudentData(item));
    } catch (error) {
      console.error('Error getting students by college:', error);
      return [];
    }
  }

  async getDepartmentsByCollege(collegeId) {
    try {
      // This would need to be implemented based on how departments are linked to colleges
      return [];
    } catch (error) {
      console.error('Error getting departments by college:', error);
      return [];
    }
  }

  // Assessment Analytics Methods
  async getAssessmentResults() {
    try {
      // Get all assessment results from DynamoDB
      const params = {
        FilterExpression: 'begins_with(SK, :resultPrefix)',
        ExpressionAttributeValues: {
          ':resultPrefix': 'RESULT#ASSESSMENT#'
        }
      };

      const result = await this.scanTable(params);
      
      return result.Items.map(item => ({
        assessmentId: item.assessmentId,
        studentEmail: item.email,
        studentName: item.Name,
        department: item.department,
        score: parseFloat(item.score) || 0,
        maxScore: parseFloat(item.maxScore) || 0,
        percentage: parseFloat(item.percentage) || 0,
        accuracy: parseFloat(item.accuracy) || 0,
        numCorrect: parseInt(item.numCorrect) || 0,
        numIncorrect: parseInt(item.numIncorrect) || 0,
        numUnattempted: parseInt(item.numUnattempted) || 0,
        timeSpent: parseInt(item.timeSpentSeconds) || 0,
        submittedAt: item.submittedAt,
        evaluated: item.evaluated === 'true' || item.evaluated === true,
        clientId: item.PK
      }));
    } catch (error) {
      console.error('Error getting assessment results:', error);
      throw error;
    }
  }

  async getPerformanceOverview() {
    try {
      const results = await this.getAssessmentResults();
      
      if (results.length === 0) {
        return {
          totalResults: 0,
          averageScore: 0,
          averageAccuracy: 0,
          averageTimeSpent: 0,
          passRate: 0,
          topPerformers: [],
          assessmentBreakdown: []
        };
      }

      // Calculate overall statistics
      const totalResults = results.length;
      const averageScore = results.reduce((sum, r) => sum + r.percentage, 0) / totalResults;
      const averageAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / totalResults;
      const averageTimeSpent = results.reduce((sum, r) => sum + r.timeSpent, 0) / totalResults;
      const passRate = (results.filter(r => r.percentage >= 50).length / totalResults) * 100;

      // Group by assessment
      const assessmentMap = {};
      results.forEach(result => {
        if (!assessmentMap[result.assessmentId]) {
          assessmentMap[result.assessmentId] = {
            assessmentId: result.assessmentId,
            totalAttempts: 0,
            averageScore: 0,
            scores: []
          };
        }
        assessmentMap[result.assessmentId].totalAttempts++;
        assessmentMap[result.assessmentId].scores.push(result.percentage);
      });

      const assessmentBreakdown = Object.values(assessmentMap).map(assessment => ({
        assessmentId: assessment.assessmentId,
        totalAttempts: assessment.totalAttempts,
        averageScore: assessment.scores.reduce((sum, s) => sum + s, 0) / assessment.scores.length,
        highestScore: Math.max(...assessment.scores),
        lowestScore: Math.min(...assessment.scores)
      }));

      // Get top performers (unique students with best average)
      const studentMap = {};
      results.forEach(result => {
        if (!studentMap[result.studentEmail]) {
          studentMap[result.studentEmail] = {
            email: result.studentEmail,
            name: result.studentName,
            scores: [],
            department: result.department
          };
        }
        studentMap[result.studentEmail].scores.push(result.percentage);
      });

      const topPerformers = Object.values(studentMap)
        .map(student => ({
          email: student.email,
          name: student.name,
          department: student.department,
          averageScore: student.scores.reduce((sum, s) => sum + s, 0) / student.scores.length,
          totalAttempts: student.scores.length
        }))
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 10);

      return {
        totalResults,
        averageScore: Math.round(averageScore * 100) / 100,
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        averageTimeSpent: Math.round(averageTimeSpent),
        passRate: Math.round(passRate * 100) / 100,
        topPerformers,
        assessmentBreakdown
      };
    } catch (error) {
      console.error('Error getting performance overview:', error);
      throw error;
    }
  }

  async getAssessmentStats(assessmentId) {
    try {
      const allResults = await this.getAssessmentResults();
      const results = allResults.filter(r => r.assessmentId === assessmentId);

      if (results.length === 0) {
        return {
          assessmentId,
          totalAttempts: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          passRate: 0,
          scoreDistribution: [],
          departmentPerformance: []
        };
      }

      const scores = results.map(r => r.percentage);
      const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      const passRate = (results.filter(r => r.percentage >= 50).length / results.length) * 100;

      // Score distribution (0-20, 21-40, 41-60, 61-80, 81-100)
      const scoreRanges = [
        { label: '0-20%', count: 0 },
        { label: '21-40%', count: 0 },
        { label: '41-60%', count: 0 },
        { label: '61-80%', count: 0 },
        { label: '81-100%', count: 0 }
      ];

      results.forEach(r => {
        const score = r.percentage;
        if (score <= 20) scoreRanges[0].count++;
        else if (score <= 40) scoreRanges[1].count++;
        else if (score <= 60) scoreRanges[2].count++;
        else if (score <= 80) scoreRanges[3].count++;
        else scoreRanges[4].count++;
      });

      // Department performance
      const deptMap = {};
      results.forEach(result => {
        const dept = result.department || 'Unknown';
        if (!deptMap[dept]) {
          deptMap[dept] = { department: dept, scores: [] };
        }
        deptMap[dept].scores.push(result.percentage);
      });

      const departmentPerformance = Object.values(deptMap).map(dept => ({
        department: dept.department,
        averageScore: dept.scores.reduce((sum, s) => sum + s, 0) / dept.scores.length,
        totalAttempts: dept.scores.length
      }));

      return {
        assessmentId,
        totalAttempts: results.length,
        averageScore: Math.round(averageScore * 100) / 100,
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        passRate: Math.round(passRate * 100) / 100,
        scoreDistribution: scoreRanges,
        departmentPerformance: departmentPerformance.sort((a, b) => b.averageScore - a.averageScore)
      };
    } catch (error) {
      console.error('Error getting assessment stats:', error);
      throw error;
    }
  }

  async getDepartmentPerformance() {
    try {
      const results = await this.getAssessmentResults();
      
      const deptMap = {};
      results.forEach(result => {
        const dept = result.department || 'Unknown';
        if (!deptMap[dept]) {
          deptMap[dept] = {
            department: dept,
            totalAttempts: 0,
            totalScore: 0,
            scores: [],
            students: new Set()
          };
        }
        deptMap[dept].totalAttempts++;
        deptMap[dept].totalScore += result.percentage;
        deptMap[dept].scores.push(result.percentage);
        deptMap[dept].students.add(result.studentEmail);
      });

      return Object.values(deptMap).map(dept => ({
        department: dept.department,
        totalStudents: dept.students.size,
        totalAttempts: dept.totalAttempts,
        averageScore: Math.round((dept.totalScore / dept.totalAttempts) * 100) / 100,
        highestScore: Math.max(...dept.scores),
        lowestScore: Math.min(...dept.scores),
        passRate: Math.round((dept.scores.filter(s => s >= 50).length / dept.scores.length) * 100 * 100) / 100
      })).sort((a, b) => b.averageScore - a.averageScore);
    } catch (error) {
      console.error('Error getting department performance:', error);
      throw error;
    }
  }
}

module.exports = AdminService;