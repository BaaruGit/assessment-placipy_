import React, { useState, useEffect } from 'react';
import AdminService, { type College } from '../../services/admin.service';
import { AdminSkeletonWrapper } from './SkeletonLoader';

const Colleges: React.FC = () => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Filter colleges based on search term
  const filteredColleges = colleges.filter(college =>
    college.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    college.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    college.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentColleges = filteredColleges.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredColleges.length / itemsPerPage);


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

  return (
    <AdminSkeletonWrapper loading={loading} type="admin-table">
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
          <div className="admin-search-bar-with-icon">
           
            <input
              type="text"
              placeholder="Search colleges..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="admin-search-input"
            />
          </div>
          <div className="admin-header-actions">
            <button className="admin-btn-secondary" onClick={loadColleges}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px' }}>
                <path d="M23 4V10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 20V14H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.51 9.00001C4.01717 7.56457 4.87913 6.28639 6.01574 5.27543C7.15236 4.26447 8.52827 3.55124 10.0153 3.19555C11.5023 2.83986 13.0546 2.85303 14.5348 3.23349C16.015 3.61396 17.3762 4.34974 18.49 5.38001L23 10M1 14L5.51 18.62C6.62379 19.6503 7.985 20.386 9.46516 20.7665C10.9453 21.147 12.4977 21.1602 13.9847 20.8045C15.4717 20.4488 16.8476 19.7355 17.9843 18.7246C19.1209 17.7136 19.9828 16.4354 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Refresh
            </button>
            <button className="admin-btn-primary" onClick={handleAddNew}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px' }}>
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Add College
            </button>
          </div>
        </div>

        <div className="admin-search-and-table-container">
          
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
                {currentColleges.map((college) => (
                  <tr key={college.id}>
                    <td>{college.name}</td>
                    <td>{college.domain}</td>
                    <td>{college.location || 'Not specified'}</td>
                    <td>
                      <span
                        className={`admin-status-badge ${college.active ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleStatus(college.id)}
                        title={college.active ? 'Click to Deactivate' : 'Click to Activate'}
                        style={{ cursor: 'pointer' }}
                      >
                        {college.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-action-icons">
                        <button 
                          className="admin-icon-btn admin-btn-edit"
                          onClick={() => handleEdit(college)}
                          title="Edit College"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          className="admin-icon-btn admin-btn-delete"
                          onClick={() => handleDelete(college.id, college.name)}
                          title="Delete College"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredColleges.length === 0 && (
              <div className="admin-empty-state">
                <p>No colleges found. Add your first college to get started.</p>
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
      </div>
    </AdminSkeletonWrapper>
  );

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
};

export default Colleges;

