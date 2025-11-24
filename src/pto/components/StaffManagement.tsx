import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { FaUser, FaTrash, FaUserPlus, FaBuilding } from 'react-icons/fa';
import PTOService, { type StaffMember as StaffDto } from '../../services/pto.service';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  permissions: {
    createAssessments: boolean;
    editAssessments: boolean;
    viewReports: boolean;
  };
}

const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await PTOService.getStaff();
        const filtered = data.filter((s: StaffDto) => String(s.id || '').includes('@'));
        const mapped: StaffMember[] = filtered.map((s: StaffDto) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          phone: s.phone || '',
          designation: s.designation || '',
          department: s.department || '',
          permissions: {
            createAssessments: (s.permissions || []).includes('createAssessments'),
            editAssessments: (s.permissions || []).includes('editAssessments'),
            viewReports: (s.permissions || []).includes('viewReports')
          }
        }));
        setStaff(mapped);
      } catch (e: any) {
        setError(e.message || 'Failed to load staff');
      } finally {
        setLoading(false);
      }
    };
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, []);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    designation: '',
    department: '',
    permissions: {
      createAssessments: false,
      editAssessments: false,
      viewReports: false
    }
  });
  const isCreateValid = () => {
    const email = String(formData.email || '').trim().toLowerCase();
    const domainOk = !!email && email.includes('@') && email.endsWith(`@${collegeDomain}`);
    return Boolean(
      String(formData.firstName || '').trim() &&
      domainOk &&
      String(formData.designation || '').trim() &&
      String(formData.department || '').trim()
    );
  };

  const departments = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'All Departments'];
  const ptoEmail = (localStorage.getItem('ptoDevEmail') || localStorage.getItem('ptoEmail') || '') as string;
  const collegeDomain = (ptoEmail.includes('@') ? ptoEmail.split('@')[1] : 'ksrce.ac.in');

  const handleAddStaff = async () => {
    const email = String(formData.email || '').trim().toLowerCase();
    if (!email || !email.includes('@') || !email.endsWith(`@${collegeDomain}`)) {
      setError(`Email must end with @${collegeDomain}`);
      return;
    }
    if (!String(formData.firstName || '').trim()) {
      setError('First name is required');
      return;
    }
    if (!String(formData.designation || '').trim()) {
      setError('Designation is required');
      return;
    }
    if (!String(formData.department || '').trim()) {
      setError('Department is required');
      return;
    }
    if (formData.email) {
      await PTOService.createStaff({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: email,
        phone: formData.phone,
        designation: formData.designation,
        department: formData.department,
        permissions: Object.keys(formData.permissions).filter((perm) => (formData.permissions as any)[perm])
      });
      const refreshed = await PTOService.getStaff();
      const filtered = refreshed.filter((s: StaffDto) => String(s.id || '').includes('@'));
      const mapped: StaffMember[] = filtered.map((s: StaffDto) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone || '',
        designation: s.designation || '',
        department: s.department || '',
        permissions: {
          createAssessments: (s.permissions || []).includes('createAssessments'),
          editAssessments: (s.permissions || []).includes('editAssessments'),
          viewReports: (s.permissions || []).includes('viewReports')
        }
      }));
      setStaff(mapped);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        designation: '',
        department: '',
        permissions: { createAssessments: false, editAssessments: false, viewReports: false }
      });
      setIsAddModalOpen(false);
    }
  };

  const handleEditStaff = (member: StaffMember) => {
    setSelectedStaff(member);
    setFormData({
      firstName: (member.name || '').split(' ')[0] || '',
      lastName: (member.name || '').split(' ').slice(1).join(' ') || '',
      email: member.email,
      phone: member.phone,
      designation: member.designation,
      department: member.department,
      permissions: { ...member.permissions }
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateStaff = async () => {
    if (selectedStaff) {
      const email = String(formData.email || '').trim().toLowerCase();
      if (email && (!email.includes('@') || !email.endsWith(`@${collegeDomain}`))) {
        setError(`Email must end with @${collegeDomain}`);
        return;
      }
      await PTOService.updateStaff(selectedStaff.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email,
        phone: formData.phone,
        designation: formData.designation,
        department: formData.department,
        permissions: Object.keys(formData.permissions).filter((perm) => (formData.permissions as any)[perm])
      });
      const refreshed = await PTOService.getStaff();
      const filtered = refreshed.filter((s: StaffDto) => String(s.id || '').includes('@'));
      const mapped: StaffMember[] = filtered.map((s: StaffDto) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone || '',
        designation: s.designation || '',
        department: s.department || '',
        permissions: {
          createAssessments: (s.permissions || []).includes('createAssessments'),
          editAssessments: (s.permissions || []).includes('editAssessments'),
          viewReports: (s.permissions || []).includes('viewReports')
        }
      }));
      setStaff(mapped);
      setIsEditModalOpen(false);
      setSelectedStaff(null);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      await PTOService.deleteStaff(id);
      setStaff(staff.filter(member => member.id !== id));
    }
  };

  const togglePermission = (permission: keyof StaffMember['permissions']) => {
    if (isEditModalOpen && selectedStaff) {
      setFormData({
        ...formData,
        permissions: {
          ...formData.permissions,
          [permission]: !formData.permissions[permission]
        }
      });
    } else {
      setFormData({
        ...formData,
        permissions: {
          ...formData.permissions,
          [permission]: !formData.permissions[permission]
        }
      });
    }
  };

  return (
    <div className="pto-component-page">
      {/* Statistics */}
      <div className="stats-grid">
        {error && (<div className="admin-error"><p>{error}</p></div>)}
        {loading && (<div className="admin-loading"><div className="spinner"></div><p>Loading staff...</p></div>)}
        <div className="stat-card">
          <FaUser size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Total Staff</h3>
            <p className="stat-value">{staff.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <FaBuilding size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Departments Covered</h3>
            <p className="stat-value">{new Set(staff.map(s => s.department)).size}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons-section" style={{ display: 'flex', gap: '10px' }}>
        <button className="primary-btn" onClick={() => setIsAddModalOpen(true)}>
          <FaUserPlus /> Create Staff Account
        </button>
        <button className="secondary-btn" onClick={async () => {
          try {
            const blob = await PTOService.exportStaff();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pto-staff.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          } catch (e) {
            alert('Export failed');
          }
        }}>Export</button>
        <label className="secondary-btn" style={{ cursor: 'pointer' }}>
          Import
          <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { type: 'array' });
            const wsName = wb.SheetNames[0];
            const ws = wb.Sheets[wsName];
            const rows = XLSX.utils.sheet_to_json(ws);
            try {
              const result = await PTOService.importStaff(rows as any[]);
              if (result?.success) {
                const refreshed = await PTOService.getStaff();
                const filtered = refreshed.filter((s: StaffDto) => String(s.id || '').includes('@'));
                const mapped: StaffMember[] = filtered.map((s: StaffDto) => ({
                  id: s.id,
                  name: s.name,
                  email: s.email,
                  phone: s.phone || '',
                  designation: s.designation || '',
                  department: s.department || '',
                  permissions: {
                    createAssessments: (s.permissions || []).includes('createAssessments'),
                    editAssessments: (s.permissions || []).includes('editAssessments'),
                    viewReports: (s.permissions || []).includes('viewReports')
                  }
                }));
                setStaff(mapped);
                alert('Import completed');
              } else {
                alert('Import failed');
              }
            } catch (err) {
              alert('Import failed');
            }
            e.currentTarget.value = '';
          }} />
        </label>
      </div>

      {/* Staff Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Designation</th>
              <th>Department</th>
              <th>Permissions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(member => (
              <tr key={member.id} onClick={(e) => e.stopPropagation()}>
                <td>{member.name}</td>
                <td>{member.email}</td>
                <td>{member.phone}</td>
                <td>{member.designation}</td>
                <td>{member.department}</td>
                <td>
                  <div className="permissions-badges">
                    {member.permissions.createAssessments && (
                      <span className="permission-badge">Create</span>
                    )}
                    {member.permissions.editAssessments && (
                      <span className="permission-badge">Edit</span>
                    )}
                    {member.permissions.viewReports && (
                      <span className="permission-badge">Reports</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="edit-btn text-btn" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEditStaff(member);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      title="Edit"
                      type="button"
                    >
                      Edit
                    </button>
                    <button 
                      className="icon-btn delete-btn" 
                      onClick={() => handleDeleteStaff(member.id)}
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>Create Staff Account</h3>
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Enter first name"
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Enter last name"
              />
            </div>
            <div className="form-group">
              <label>Email (College ID) *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={`username@${collegeDomain}`}
                required
              />
              <div className="helper-text">Must end with @{collegeDomain}</div>
            </div>
            <div className="form-group">
              <label>Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
                required
              />
            </div>
            <div className="form-group">
              <label>Designation *</label>
              <select
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                required
              >
                <option value="">Select designation</option>
                <option value="Placement Training Staff / PTS">Placement Training Staff / PTS</option>
              </select>
            </div>
            <div className="form-group">
              <label>Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="permissions-section">
              <label>Permissions</label>
              <div className="permissions-list">
                <label className="permission-item">
                  <input
                    type="checkbox"
                    checked={formData.permissions.createAssessments}
                    onChange={() => togglePermission('createAssessments')}
                  />
                  <span>Create Assessments</span>
                </label>
                <label className="permission-item">
                  <input
                    type="checkbox"
                    checked={formData.permissions.editAssessments}
                    onChange={() => togglePermission('editAssessments')}
                  />
                  <span>Edit Assessments</span>
                </label>
                <label className="permission-item">
                  <input
                    type="checkbox"
                    checked={formData.permissions.viewReports}
                    onChange={() => togglePermission('viewReports')}
                  />
                  <span>View Reports</span>
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={handleAddStaff} disabled={!isCreateValid()}>Create</button>
              <button className="secondary-btn" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Staff Account</h3>
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Email (College ID) *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={`username@${collegeDomain}`}
              />
              <div className="helper-text">Must end with @{collegeDomain}</div>
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Designation *</label>
              <select
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              >
                <option value="Placement Training Staff / PTS">Placement Training Staff / PTS</option>
              </select>
            </div>
            <div className="form-group">
              <label>Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="permissions-section">
              <label>Permissions</label>
              <div className="permissions-list">
                <label className="permission-item">
                  <input
                    type="checkbox"
                    checked={formData.permissions.createAssessments}
                    onChange={() => togglePermission('createAssessments')}
                  />
                  <span>Create Assessments</span>
                </label>
                <label className="permission-item">
                  <input
                    type="checkbox"
                    checked={formData.permissions.editAssessments}
                    onChange={() => togglePermission('editAssessments')}
                  />
                  <span>Edit Assessments</span>
                </label>
                <label className="permission-item">
                  <input
                    type="checkbox"
                    checked={formData.permissions.viewReports}
                    onChange={() => togglePermission('viewReports')}
                  />
                  <span>View Reports</span>
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={handleUpdateStaff}>Update</button>
              <button className="secondary-btn" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;

