import React, { useState, useEffect } from 'react';
import AdminService, { type Officer, type College } from '../../services/admin.service';

const Officers: React.FC = () => {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
  const [authInfo, setAuthInfo] = useState<{
    email: string;
    defaultPassword: string;
    instructions: string;
    note: string;
    cognitoStatus?: boolean;
  } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    collegeId: '',
    role: 'Placement Training Officer' as Officer['role'],
    phone: '',
    department: '',
  });
  const [nameError, setNameError] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [officersData, collegesData] = await Promise.all([
        AdminService.getOfficers(),
        AdminService.getColleges()
      ]);
      
      setOfficers(officersData);
      setColleges(collegesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error('Error loading officers data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingOfficer(null);
    setFormData({
      name: '',
      email: '',
      collegeId: '',
      role: 'Placement Training Officer',
      phone: '',
      department: '',
  });
  setIsModalOpen(true);
};

const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Validate form before submission
      if (!editingOfficer) {
        const nameValidationError = validateName(formData.name);
        if (nameValidationError) {
          setNameError(nameValidationError);
          setError('Please fix the validation errors before submitting');
          return;
        }
        
        // Additional validation
        if (!formData.name || !formData.email || !formData.collegeId || !formData.role) {
          setError('Please fill in all required fields');
          return;
        }
      }
      
      if (editingOfficer) {
        // Update existing officer
        await AdminService.updateOfficer(editingOfficer.id, formData);
        
        // Reload officers data
        await loadData();
        setIsModalOpen(false);
        resetForm();
      } else {
        // Create new officer - this will also create Cognito user
        const response = await AdminService.createOfficer(formData);
        console.log('Officer creation response:', response);
        console.log('Response keys:', Object.keys(response));
        console.log('AuthInfo in response:', response.authInfo);
        
        // Check if authentication info was returned
        if (response.authInfo) {
          console.log('Auth info received:', {
            email: formData.email,
            password: response.authInfo.defaultPassword,
            hasPassword: !!response.authInfo.defaultPassword,
            cognitoStatus: response.authInfo.cognitoStatus
          });
          
          // Show modal regardless of Cognito success/failure
          setAuthInfo({
            email: formData.email,
            defaultPassword: response.authInfo.defaultPassword || 'Not created - see instructions',
            instructions: response.authInfo.instructions || '',
            note: response.authInfo.note || '',
            cognitoStatus: response.authInfo.cognitoStatus
          });
          setShowAuthModal(true);
        } else {
          console.warn('No auth info in response:', response.authInfo);
          // Show a basic success message even if no auth info
          alert('Officer created successfully in database!');
        }
        
        // Reload officers data
        await loadData();
        setIsModalOpen(false);
        resetForm();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save officer');
      console.error('Error saving officer:', err);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      collegeId: '',
      role: 'Placement Training Officer' as Officer['role'],
      phone: '',
      department: '',
    });
    setNameError('');
  };

  // Validate name - first character must be uppercase
  const validateName = (name: string): string => {
    if (!name) return '';
    if (name.length > 0 && name[0] !== name[0].toUpperCase()) {
      return 'First character must be uppercase';
    }
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      return 'Name must contain only letters and spaces';
    }
    return '';
  };

  // Handle name input change with validation
  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    setNameError(validateName(value));
  };

  const getCollegeName = (collegeId: string): string => {
    const college = colleges.find(c => c.id === collegeId);
    return college ? college.name : 'Unknown College';
  };

  const handleEdit = (officer: Officer) => {
    setEditingOfficer(officer);
    setFormData({
      name: officer.name,
      email: officer.email,
      collegeId: officer.collegeId,
      role: officer.role,
      phone: officer.phone || '',
      department: officer.department || '',
    });
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingOfficer(null);
    resetForm();
  };

  const handleToggleStatus = async (id: string) => {
    const officer = officers.find(off => off.id === id);
    if (!officer) return;
    
    const originalStatus = officer.status;
    const newStatus = officer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    try {
      // Optimistic update: Update UI immediately
      setOfficers(officers.map(off => 
        off.id === id ? { ...off, status: newStatus } : off
      ));
      
      // Then update backend
      await AdminService.updateOfficer(id, { status: newStatus });
      
    } catch (err: any) {
      // If backend fails, revert the optimistic update
      setOfficers(officers.map(off => 
        off.id === id ? { ...off, status: originalStatus } : off
      ));
      setError(err.message || 'Failed to update officer status');
      console.error('Error updating officer status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this officer?')) {
      try {
        setError(null);
        await AdminService.deleteOfficer(id);
        
        // Reload data to reflect changes
        await loadData();
      } catch (err: any) {
        setError(err.message || 'Failed to delete officer');
        console.error('Error deleting officer:', err);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'active';
      case 'INACTIVE': return 'inactive';
      case 'SUSPENDED': return 'suspended';
      default: return 'inactive';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Administrator': return 'admin';
      case 'Placement Training Officer': return 'pto';
      case 'Placement Training Staff': return 'coordinator';
      default: return 'coordinator';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'Placement Training Officer': return 'PTO';
      case 'Placement Training Staff': return 'PTS';
      case 'Administrator': return 'Admin';
      default: return role;
    }
  };

  return (
    <div className="admin-content">
      <div className="admin-header">
        <h1>Officers Management</h1>
        <button className="admin-btn-primary" onClick={handleCreate}>
          Add New Officer
        </button>
      </div>

      {error && (
        <div className="admin-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {loading ? (
        <div className="admin-loading">
          <div className="spinner"></div>
          <p>Loading officers...</p>
        </div>
      ) : (

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>College</th>
              <th>Role</th>
              <th>Department</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {officers.map((officer) => (
              <tr key={officer.id}>
                <td>{officer.name}</td>
                <td>{officer.email}</td>
                <td>{getCollegeName(officer.collegeId)}</td>
                <td>
                  <span className={`admin-role-badge ${getRoleColor(officer.role)}`}>
                    {getRoleDisplayName(officer.role)}
                  </span>
                </td>
                <td>{officer.department || 'N/A'}</td>
                <td>{officer.phone || 'N/A'}</td>
                <td>
                  <span className={`admin-status-badge ${getStatusColor(officer.status)}`}>
                    {officer.status}
                  </span>
                </td>
                <td>
                  <div className="admin-actions">
                    <button
                      className="admin-btn-edit"
                      onClick={() => handleEdit(officer)}
                    >
                      Edit
                    </button>
                    <button
                      className={`admin-btn-toggle ${officer.status === 'ACTIVE' ? 'disable' : 'enable'}`}
                      onClick={() => handleToggleStatus(officer.id)}
                    >
                      {officer.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      className="admin-btn-delete"
                      onClick={() => handleDelete(officer.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {officers.length === 0 && (
          <div className="admin-empty-state">
            <p>No officers found. Add your first officer to get started.</p>
          </div>
        )}
      </div>
      )}

      {/* Modal for Add/Edit Officer */}
      {isModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <div className="admin-modal-header">
              <h3>{editingOfficer ? 'Edit Officer' : 'Add New Officer'}</h3>
              <button className="admin-modal-close" onClick={handleClose}>
                &times;
              </button>
            </div>
            <div className="admin-modal-body">
              <form>
                <div className="admin-form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Enter officer name (First letter must be uppercase)"
                    required
                    className={nameError ? 'error' : ''}
                  />
                  {nameError && <span className="error-message">{nameError}</span>}
                </div>
                <div className="admin-form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="officer@college.edu.in"
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label>College *</label>
                  <select
                    value={formData.collegeId}
                    onChange={(e) => setFormData({ ...formData, collegeId: e.target.value })}
                    required
                  >
                    <option value="">Select College</option>
                    {colleges.map(college => (
                      <option key={college.id} value={college.id}>
                        {college.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Officer['role'] })}
                    required
                  >
                    <option value="Placement Training Officer">Placement Training Officer</option>
                    <option value="Placement Training Staff">Placement Training Staff</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Computer Science"
                  />
                </div>
              </form>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button className="admin-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editingOfficer ? 'Update Officer' : 'Add Officer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Information Modal */}
      {showAuthModal && authInfo && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>Authentication Account Created</h2>
            </div>
            <div className="admin-modal-body">
              <div className="auth-info-content">
                <div className="success-message">
                  <p><strong>Officer and authentication account created successfully!</strong></p>
                </div>
                
                <div className="password-info">
                  <h3>Default Login Credentials:</h3>
                  <div className="credential-item">
                    <label>Username (Email):</label>
                    <code>{authInfo.email}</code>
                    <button 
                      className="copy-btn"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(authInfo.email);
                          alert('Email copied to clipboard!');
                        } catch (err) {
                          console.error('Failed to copy email:', err);
                          // Fallback: show the text in an alert
                          prompt('Copy this email:', authInfo.email);
                        }
                      }}
                      title="Copy email"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="credential-item">
                    <label>Default Password:</label>
                    <code className="password-display">{authInfo.defaultPassword}</code>
                    {authInfo.defaultPassword && authInfo.defaultPassword !== 'Not created - see instructions' && (
                      <button 
                        className="copy-btn"
                        onClick={async () => {
                          try {
                            console.log('Copying password:', authInfo.defaultPassword);
                            await navigator.clipboard.writeText(authInfo.defaultPassword);
                            alert('Password copied to clipboard!');
                          } catch (err) {
                            console.error('Failed to copy password:', err);
                            // Fallback: show the text in a prompt for manual copying
                            prompt('Copy this password:', authInfo.defaultPassword);
                          }
                        }}
                        title="Copy password"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                </div>

                <div className="instructions">
                  <h3>Important Instructions:</h3>
                  <ul>
                    <li><strong>Password Format:</strong> FirstPartOfEmail + 123!@# (meets security policy)</li>
                    <li><strong>Security:</strong> The officer must change their password on first login</li>
                    <li><strong>Share:</strong> Send these credentials securely to the officer</li>
                    <li><strong>Activation:</strong> Credentials are active immediately</li>
                    <li><strong>Login:</strong> Officer can login at the main login page</li>
                  </ul>
                </div>

                <div className="security-note">
                  <p><strong>Security Note:</strong> {authInfo.note}</p>
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button 
                className="admin-btn-primary" 
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthInfo(null);
                }}
              >
                Got it, Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Officers;