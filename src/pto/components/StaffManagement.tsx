import React, { useState } from 'react';
import { FaUser, FaEdit, FaTrash, FaUserPlus, FaBuilding, FaLock, FaUnlock } from 'react-icons/fa';

interface StaffMember {
  id: number;
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
  const [staff, setStaff] = useState<StaffMember[]>([
    { 
      id: 1, 
      name: 'John Doe', 
      email: 'john.doe@college.edu', 
      phone: '+1234567890',
      designation: 'Placement Trainer',
      department: 'Computer Science',
      permissions: { createAssessments: true, editAssessments: true, viewReports: true }
    },
    { 
      id: 2, 
      name: 'Jane Smith', 
      email: 'jane.smith@college.edu', 
      phone: '+1234567891',
      designation: 'Placement Trainer',
      department: 'Electronics',
      permissions: { createAssessments: true, editAssessments: false, viewReports: true }
    },
    { 
      id: 3, 
      name: 'Bob Johnson', 
      email: 'bob.johnson@college.edu', 
      phone: '+1234567892',
      designation: 'Placement Coordinator',
      department: 'Mechanical',
      permissions: { createAssessments: false, editAssessments: true, viewReports: true }
    },
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    name: '',
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

  const departments = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'All Departments'];

  const handleAddStaff = () => {
    if (formData.name && formData.email && formData.department) {
      const newStaff: StaffMember = {
        id: staff.length + 1,
        ...formData
      };
      setStaff([...staff, newStaff]);
      setFormData({
        name: '',
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
      name: member.name,
      email: member.email,
      phone: member.phone,
      designation: member.designation,
      department: member.department,
      permissions: { ...member.permissions }
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateStaff = () => {
    if (selectedStaff) {
      setStaff(staff.map(member =>
        member.id === selectedStaff.id
          ? { ...selectedStaff, ...formData }
          : member
      ));
      setIsEditModalOpen(false);
      setSelectedStaff(null);
    }
  };

  const handleDeleteStaff = (id: number) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
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
      <div className="page-header">
        <h2 className="page-title">
          <FaUser className="page-icon" />
          Staff Management
        </h2>
        <button className="primary-btn" onClick={() => setIsAddModalOpen(true)}>
          <FaUserPlus /> Create Staff Account
        </button>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
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
              <tr key={member.id}>
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
                      className="icon-btn edit-btn" 
                      onClick={() => handleEditStaff(member)}
                      title="Edit"
                    >
                      <FaEdit />
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
              <label>Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter staff name"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div className="form-group">
              <label>Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="Enter designation"
              />
            </div>
            <div className="form-group">
              <label>Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
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
              <button className="primary-btn" onClick={handleAddStaff}>Create</button>
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
              <label>Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
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
              <label>Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
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

