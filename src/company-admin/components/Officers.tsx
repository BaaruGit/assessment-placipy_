import React, { useState, useEffect } from 'react';
import AdminService, { type Officer, type College } from '../../services/admin.service';
import { AdminSkeletonWrapper } from './SkeletonLoader';

const Officers: React.FC = () => {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingPTS, setViewingPTS] = useState<{
    college: College;
    ptsList: Officer[];
    ptsByDepartment: Record<string, Officer[]>;
  } | null>(null);

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

  // Group officers by college
  const groupedByCollege = colleges.map(college => {
    const collegeOfficers = officers.filter(o => o.collegeId === college.id);
    const pto = collegeOfficers.find(o => o.role === 'Placement Training Officer');
    const ptsList = collegeOfficers.filter(o => o.role === 'Placement Training Staff');
    
    // Group PTS by department
    const ptsByDepartment = ptsList.reduce((acc, pts) => {
      const dept = pts.department || 'No Department';
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(pts);
      return acc;
    }, {} as Record<string, Officer[]>);
    
    return {
      college,
      pto,
      ptsByDepartment,
      totalPTS: ptsList.length
    };
  }).filter(group => group.pto || group.totalPTS > 0); // Only show colleges with officers

  // Filter colleges based on search term
  const filteredColleges = groupedByCollege.filter(group =>
    group.college.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.pto?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (group.pto?.email.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentColleges = filteredColleges.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredColleges.length / itemsPerPage);

  const handleViewPTS = (college: College, ptsByDepartment: Record<string, Officer[]>) => {
    const ptsList = officers.filter(o => o.collegeId === college.id && o.role === 'Placement Training Staff');
    setViewingPTS({ college, ptsList, ptsByDepartment });
  };

  const handleBackToList = () => {
    setViewingPTS(null);
  };

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
    const newStatus: Officer['status'] = officer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    try {
      // Optimistic update: Update UI immediately
      setOfficers(officers.map(off => 
        off.id === id ? { ...off, status: newStatus } : off
      ));
      
      // Update viewingPTS if open
      if (viewingPTS) {
        const updatedPtsList = viewingPTS.ptsList.map(pts =>
          pts.id === id ? { ...pts, status: newStatus } : pts
        );
        const updatedPtsByDepartment = { ...viewingPTS.ptsByDepartment };
        Object.keys(updatedPtsByDepartment).forEach(dept => {
          updatedPtsByDepartment[dept] = updatedPtsByDepartment[dept].map(pts =>
            pts.id === id ? { ...pts, status: newStatus } : pts
          );
        });
        setViewingPTS({
          ...viewingPTS,
          ptsList: updatedPtsList,
          ptsByDepartment: updatedPtsByDepartment
        });
      }
      
      // Then update backend
      await AdminService.updateOfficer(id, { status: newStatus });
      
    } catch (err: any) {
      // If backend fails, revert the optimistic update
      setOfficers(officers.map(off => 
        off.id === id ? { ...off, status: originalStatus } : off
      ));
      
      // Revert viewingPTS if open
      if (viewingPTS) {
        const revertedPtsList = viewingPTS.ptsList.map(pts =>
          pts.id === id ? { ...pts, status: originalStatus } : pts
        );
        const revertedPtsByDepartment = { ...viewingPTS.ptsByDepartment };
        Object.keys(revertedPtsByDepartment).forEach(dept => {
          revertedPtsByDepartment[dept] = revertedPtsByDepartment[dept].map(pts =>
            pts.id === id ? { ...pts, status: originalStatus } : pts
          );
        });
        setViewingPTS({
          ...viewingPTS,
          ptsList: revertedPtsList,
          ptsByDepartment: revertedPtsByDepartment
        });
      }
      
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
    <AdminSkeletonWrapper loading={loading} type="admin-table">
      <div className="admin-page-container">
        {error && (
          <div className="admin-error-message">
            <p>❌ {error}</p>
            <button className="admin-btn-secondary" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div className="admin-page-header">
          <div className="admin-search-bar-with-icon">
            
            <input
              type="text"
              placeholder="Search officers..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="admin-search-input"
              style={{ paddingLeft: '40px' }}
            />
          </div>
          <div className="admin-header-actions">
            <button className="admin-btn-secondary" onClick={loadData} style={{marginRight: '10px'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px' }}>
                <path d="M23 4V10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 20V14H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.51 9.00001C4.01717 7.56457 4.87913 6.28639 6.01574 5.27543C7.15236 4.26447 8.52827 3.55124 10.0153 3.19555C11.5023 2.83986 13.0546 2.85303 14.5348 3.23349C16.015 3.61396 17.3762 4.34974 18.49 5.38001L23 10M1 14L5.51 18.62C6.62379 19.6503 7.985 20.386 9.46516 20.7665C10.9453 21.147 12.4977 21.1602 13.9847 20.8045C15.4717 20.4488 16.8476 19.7355 17.9843 18.7246C19.1209 17.7136 19.9828 16.4354 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Refresh
            </button>
            <button className="admin-btn-primary" onClick={handleCreate}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px' }}>
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Add Officer
            </button>
          </div>
        </div>

        {/* PTS Detail View Page */}
        {viewingPTS ? (
          <div className="pts-detail-page">
            <div className="admin-page-header">
              <button className="admin-btn-secondary" onClick={handleBackToList}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px' }}>
                  <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to Officers
              </button>
              <h2 style={{ margin: 0, color: '#523C48' }}>PTS Staff - {viewingPTS.college.name}</h2>
              <div></div>
            </div>

            <div className="admin-table-container">
              {viewingPTS.ptsList.length === 0 ? (
                <div className="admin-empty-state">
                  <p>No PTS staff assigned to this college.</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(viewingPTS.ptsByDepartment).map(([department, ptsList]) => (
                      ptsList.map((pts, idx) => (
                        <tr key={pts.id}>
                          {idx === 0 && (
                            <td rowSpan={ptsList.length} className="department-cell">
                              {department}
                            </td>
                          )}
                          <td>{pts.name}</td>
                          <td>{pts.email}</td>
                          <td>{pts.phone || '-'}</td>
                          <td>
                            <span
                              className={`admin-status-badge ${getStatusColor(pts.status)}`}
                              onClick={() => handleToggleStatus(pts.id)}
                              title={pts.status === 'ACTIVE' ? 'Click to Deactivate' : 'Click to Activate'}
                              style={{ cursor: 'pointer' }}
                            >
                              {pts.status}
                            </span>
                          </td>
                          <td>
                            <div className="admin-action-icons">
                              <button 
                                className="admin-icon-btn admin-btn-edit"
                                onClick={() => handleEdit(pts)}
                                title="Edit PTS"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="admin-icon-btn admin-btn-delete"
                                onClick={() => handleDelete(pts.id)}
                                title="Delete PTS"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div className="admin-search-and-table-container">
            <div className="admin-table-container">
              {/* Main Table - Colleges with PTO */}
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>College</th>
                    <th>PTO Name</th>
                    <th>PTO Email</th>
                    <th>PTO Phone</th>
                    <th>Status</th>
                    <th>Staffs</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentColleges.map(({ college, pto, ptsByDepartment, totalPTS }) => (
                    <tr key={college.id} className="college-main-row">
                      <td>
                        <span className="college-name">{college.name}</span>
                      </td>
                      <td>{pto ? pto.name : <span className="no-data">No PTO</span>}</td>
                      <td>{pto ? pto.email : '-'}</td>
                      <td>{pto ? (pto.phone || '-') : '-'}</td>
                      <td>
                        {pto ? (
                          <span
                            className={`admin-status-badge ${getStatusColor(pto.status)}`}
                            onClick={() => handleToggleStatus(pto.id)}
                            title={pto.status === 'ACTIVE' ? 'Click to Deactivate' : 'Click to Activate'}
                            style={{ cursor: 'pointer' }}
                          >
                            {pto.status}
                          </span>
                        ) : (
                          <span className="no-data">-</span>
                        )}
                      </td>
                      <td>
                        {totalPTS > 0 ? (
                          <button 
                            className="admin-btn-view"
                            onClick={() => handleViewPTS(college, ptsByDepartment)}
                          >
                            View
                          </button>
                        ) : (
                          <span className="no-data">-</span>
                        )}
                      </td>
                      <td>
                        {pto ? (
                          <div className="admin-action-icons">
                            <button 
                              className="admin-icon-btn admin-btn-edit"
                              onClick={() => handleEdit(pto)}
                              title="Edit PTO"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            <button
                              className="admin-icon-btn admin-btn-delete"
                              onClick={() => handleDelete(pto.id)}
                              title="Delete PTO"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button className="admin-btn-sm" onClick={handleCreate}>
                            Add PTO
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

            {filteredColleges.length === 0 && (
              <div className="admin-empty-state">
                <p>No officers found. Add your first officer to get started.</p>
              </div>
            )}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="admin-pagination">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="admin-pagination-btn"
              >
                Previous
              </button>
              
              <span className="admin-pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="admin-pagination-btn"
              >
                Next
              </button>
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
    </AdminSkeletonWrapper>
  );
};

export default Officers;