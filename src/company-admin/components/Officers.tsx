import React, { useState } from 'react';

interface Officer {
  id: string;
  name: string;
  email: string;
  collegeId: string;
  collegeName?: string;
  role: 'PTO' | 'ADMIN' | 'COORDINATOR';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  permissions?: string[];
  phone?: string;
  department?: string;
  lastLogin?: string;
  createdAt?: string;
}

interface College {
  id: string;
  name: string;
}

const Officers: React.FC = () => {
  // Mock data with new structure
  const [officers, setOfficers] = useState<Officer[]>([
    { 
      id: '1', 
      name: 'John Doe', 
      email: 'john.doe@ksrit.edu.in', 
      collegeId: '1',
      collegeName: 'KSR College',
      role: 'PTO',
      status: 'ACTIVE',
      permissions: ['MANAGE_STUDENTS', 'CREATE_ASSESSMENTS'],
      phone: '+91 98765 43210',
      department: 'Computer Science'
    },
    { 
      id: '2', 
      name: 'Jane Smith', 
      email: 'jane.smith@snsct.org', 
      collegeId: '2',
      collegeName: 'SNS College',
      role: 'ADMIN',
      status: 'ACTIVE',
      permissions: ['MANAGE_STUDENTS', 'CREATE_ASSESSMENTS', 'MANAGE_OFFICERS'],
      phone: '+91 98765 43211',
      department: 'Information Technology'
    },
    { 
      id: '3', 
      name: 'Robert Johnson', 
      email: 'robert.j@psgtech.ac.in', 
      collegeId: '3',
      collegeName: 'PSG College',
      role: 'COORDINATOR',
      status: 'INACTIVE',
      permissions: ['CREATE_ASSESSMENTS'],
      phone: '+91 98765 43212',
      department: 'Mechanical Engineering'
    },
  ]);

  // Mock colleges for dropdown
  const [colleges] = useState<College[]>([
    { id: '1', name: 'KSR College' },
    { id: '2', name: 'SNS College' },
    { id: '3', name: 'PSG College' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    collegeId: '',
    role: 'PTO' as Officer['role'],
    phone: '',
    department: '',
  });

  const handleCreate = () => {
    setEditingOfficer(null);
    setFormData({
      name: '',
      email: '',
      collegeId: '',
      role: 'PTO',
      phone: '',
      department: '',
    });
    setIsModalOpen(true);
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

  const handleSave = () => {
    if (editingOfficer) {
      // Update existing officer
      setOfficers(officers.map(off =>
        off.id === editingOfficer.id 
          ? { 
              ...off, 
              ...formData,
              collegeName: colleges.find(c => c.id === formData.collegeId)?.name
            }
          : off
      ));
    } else {
      // Create new officer
      const newOfficer: Officer = {
        id: Date.now().toString(),
        ...formData,
        collegeName: colleges.find(c => c.id === formData.collegeId)?.name,
        status: 'ACTIVE',
        permissions: formData.role === 'ADMIN' 
          ? ['MANAGE_STUDENTS', 'CREATE_ASSESSMENTS', 'MANAGE_OFFICERS']
          : ['MANAGE_STUDENTS', 'CREATE_ASSESSMENTS'],
        createdAt: new Date().toISOString(),
      };
      setOfficers([...officers, newOfficer]);
    }
    setIsModalOpen(false);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingOfficer(null);
  };

  const handleToggleStatus = (id: string) => {
    setOfficers(officers.map(off =>
      off.id === id 
        ? { ...off, status: off.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }
        : off
    ));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this officer?')) {
      setOfficers(officers.filter(off => off.id !== id));
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
      case 'ADMIN': return 'admin';
      case 'PTO': return 'pto';
      case 'COORDINATOR': return 'coordinator';
      default: return 'coordinator';
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
                <td>{officer.collegeName}</td>
                <td>
                  <span className={`admin-role-badge ${getRoleColor(officer.role)}`}>
                    {officer.role}
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
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter officer name"
                    required
                  />
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
                    <option value="PTO">Placement Training Officer (PTO)</option>
                    <option value="ADMIN">Administrator</option>
                    <option value="COORDINATOR">Coordinator</option>
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
              <button className="admin-btn-primary" onClick={handleSave}>
                {editingOfficer ? 'Update Officer' : 'Add Officer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Officers;