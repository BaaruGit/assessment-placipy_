import React, { useState, useEffect } from 'react';
import AdminService, { type College } from '../../services/admin.service';

const Colleges: React.FC = () => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState<College | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    location: '',
  });

  useEffect(() => {
    loadColleges();
  }, []);

  const loadColleges = async () => {
    try {
      setLoading(true);
      setError(null);
      const collegesData = await AdminService.getColleges();
      setColleges(collegesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load colleges');
      console.error('Error loading colleges:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingCollege(null);
    setFormData({ name: '', domain: '', location: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (college: College) => {
    setEditingCollege(college);
    setFormData({
      name: college.name,
      domain: college.domain,
      location: college.location || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (editingCollege) {
        // Update existing college
        const updatedCollege = await AdminService.updateCollege(editingCollege.id, formData);
        setColleges(colleges.map(col => 
          col.id === editingCollege.id ? updatedCollege : col
        ));
      } else {
        // Add new college
        const newCollege = await AdminService.createCollege(formData);
        setColleges([...colleges, newCollege]);
      }

      setIsModalOpen(false);
      setEditingCollege(null);
      setFormData({ name: '', domain: '', location: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to save college');
      console.error('Error saving college:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (collegeId: string) => {
    const college = colleges.find(c => c.id === collegeId);
    if (!college) return;

    const originalActive = college.active;
    const newActive = !college.active;
    
    try {
      // Optimistic update: Update UI immediately
      setColleges(colleges.map(col =>
        col.id === collegeId ? { ...col, active: newActive } : col
      ));

      // Then update backend
      await AdminService.updateCollege(collegeId, { 
        active: newActive 
      });
      
    } catch (err: any) {
      // If backend fails, revert the optimistic update
      setColleges(colleges.map(col =>
        col.id === collegeId ? { ...col, active: originalActive } : col
      ));
      setError(err.message || 'Failed to update college status');
      console.error('Error updating college status:', err);
    }
  };

  const handleDelete = async (collegeId: string, collegeName: string) => {
    if (window.confirm(`Are you sure you want to delete "${collegeName}"? This action cannot be undone.`)) {
      try {
        await AdminService.deleteCollege(collegeId);
        setColleges(colleges.filter(col => col.id !== collegeId));
      } catch (err: any) {
        setError(err.message || 'Failed to delete college');
        console.error('Error deleting college:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="admin-page-container">
        <div className="admin-loading-state">
          <div className="admin-spinner"></div>
          <p>Loading colleges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      {error && (
        <div className="admin-error-message">
          <p>❌ {error}</p>
          <button className="admin-btn-secondary" onClick={loadColleges}>
            Retry
          </button>
        </div>
      )}

      <div className="admin-page-header">
        <h2 className="admin-page-title">Colleges Management</h2>
        <div>
          <button className="admin-btn-secondary" onClick={loadColleges} style={{ marginRight: '10px' }}>
            🔄 Refresh
          </button>
          <button className="admin-btn-primary" onClick={handleAddNew}>
            Add New College
          </button>
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>College Name</th>
              <th>Domain</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {colleges.map((college) => (
              <tr key={college.id}>
                <td>{college.name}</td>
                <td>{college.domain}</td>
                <td>{college.location || 'Not specified'}</td>
                <td>
                  <span className={`admin-status-badge ${college.active ? 'active' : 'inactive'}`}>
                    {college.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="admin-action-buttons">
                    <button 
                      className="admin-btn-edit"
                      onClick={() => handleEdit(college)}
                    >
                      Edit
                    </button>
                    <button
                      className={`admin-btn-toggle ${college.active ? 'disable' : 'enable'}`}
                      onClick={() => handleToggleStatus(college.id)}
                    >
                      {college.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      className="admin-btn-delete"
                      onClick={() => handleDelete(college.id, college.name)}
                      title="Delete College"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingCollege ? 'Edit College' : 'Add New College'}</h3>
              <button className="admin-modal-close" onClick={() => setIsModalOpen(false)}>
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label>College Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter college name"
                />
              </div>
              <div className="admin-form-group">
                <label>Domain</label>
                <input
                  type="text"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="college.edu.in (without @)"
                />
              </div>
              <div className="admin-form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="City, State"
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn-secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>
                Cancel
              </button>
              <button className="admin-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Colleges;

