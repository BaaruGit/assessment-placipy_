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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    collegeId: '',
    role: 'PTO' as Officer['role'],
    phone: '',
    department: '',
  });

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
      role: 'PTO',
      phone: '',
      department: '',
  });
  setIsModalOpen(true);
};

const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (editingOfficer) {
        // Update existing officer
        await AdminService.updateOfficer(editingOfficer.id, formData);
      } else {
        // Create new officer
        await AdminService.createOfficer(formData);
      }
      
      // Reload officers data
      await loadData();
      setIsModalOpen(false);
      resetForm();
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
      role: 'PTO' as Officer['role'],
      phone: '',
      department: '',
    });
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
              <button className="admin-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editingOfficer ? 'Update Officer' : 'Add Officer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Officers;