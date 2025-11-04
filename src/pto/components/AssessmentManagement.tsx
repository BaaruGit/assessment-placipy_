import React, { useState } from 'react';
import { FaClipboardList, FaPlus, FaEdit, FaTrash, FaEye, FaToggleOn, FaToggleOff, FaUpload, FaFileExcel } from 'react-icons/fa';

interface Assessment {
  id: number;
  name: string;
  department: string;
  type: 'department-wise' | 'college-wide';
  duration: number;
  date: string;
  timeWindow: { start: string; end: string };
  attempts: number;
  questions: number;
  status: 'active' | 'inactive';
}

const AssessmentManagement: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([
    {
      id: 1,
      name: 'Programming Aptitude Test',
      department: 'Computer Science',
      type: 'department-wise',
      duration: 120,
      date: '2025-11-15',
      timeWindow: { start: '09:00', end: '18:00' },
      attempts: 2,
      questions: 30,
      status: 'active'
    },
    {
      id: 2,
      name: 'Technical Assessment - ECE',
      department: 'Electronics',
      type: 'department-wise',
      duration: 90,
      date: '2025-11-18',
      timeWindow: { start: '10:00', end: '16:00' },
      attempts: 1,
      questions: 25,
      status: 'active'
    },
    {
      id: 3,
      name: 'Mock Interview Preparation',
      department: 'All Departments',
      type: 'college-wide',
      duration: 60,
      date: '2025-11-20',
      timeWindow: { start: '09:00', end: '17:00' },
      attempts: 3,
      questions: 20,
      status: 'inactive'
    },
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    type: 'department-wise' as 'department-wise' | 'college-wide',
    duration: 60,
    date: '',
    timeWindow: { start: '09:00', end: '18:00' },
    attempts: 1,
    questions: 0,
  });

  const departments = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'All Departments'];

  const handleAddAssessment = () => {
    if (formData.name && formData.department) {
      const newAssessment: Assessment = {
        id: assessments.length + 1,
        ...formData,
        status: 'inactive'
      };
      setAssessments([...assessments, newAssessment]);
      resetForm();
      setIsAddModalOpen(false);
    }
  };

  const handleEditAssessment = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setFormData({
      name: assessment.name,
      department: assessment.department,
      type: assessment.type,
      duration: assessment.duration,
      date: assessment.date,
      timeWindow: assessment.timeWindow,
      attempts: assessment.attempts,
      questions: assessment.questions,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAssessment = () => {
    if (selectedAssessment) {
      setAssessments(assessments.map(assessment =>
        assessment.id === selectedAssessment.id
          ? { ...selectedAssessment, ...formData }
          : assessment
      ));
      setIsEditModalOpen(false);
      setSelectedAssessment(null);
      resetForm();
    }
  };

  const handleDeleteAssessment = (id: number) => {
    if (window.confirm('Are you sure you want to delete this assessment?')) {
      setAssessments(assessments.filter(assessment => assessment.id !== id));
    }
  };

  const toggleAssessmentStatus = (id: number) => {
    setAssessments(assessments.map(assessment =>
      assessment.id === id
        ? { ...assessment, status: assessment.status === 'active' ? 'inactive' : 'active' }
        : assessment
    ));
  };

  const handlePreview = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setIsPreviewModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      department: '',
      type: 'department-wise',
      duration: 60,
      date: '',
      timeWindow: { start: '09:00', end: '18:00' },
      attempts: 1,
      questions: 0,
    });
  };

  return (
    <div className="pto-component-page">
      <div className="page-header">
        <h2 className="page-title">
          <FaClipboardList className="page-icon" />
          Assessment Management
        </h2>
        <button className="primary-btn" onClick={() => setIsAddModalOpen(true)}>
          <FaPlus /> Create Assessment
        </button>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <FaClipboardList size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Total Assessments</h3>
            <p className="stat-value">{assessments.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <FaToggleOn size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Active</h3>
            <p className="stat-value">{assessments.filter(a => a.status === 'active').length}</p>
          </div>
        </div>
        <div className="stat-card">
          <FaToggleOff size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Inactive</h3>
            <p className="stat-value">{assessments.filter(a => a.status === 'inactive').length}</p>
          </div>
        </div>
      </div>

      {/* Assessments Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Assessment Name</th>
              <th>Department</th>
              <th>Type</th>
              <th>Duration</th>
              <th>Date</th>
              <th>Questions</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map(assessment => (
              <tr key={assessment.id}>
                <td>{assessment.name}</td>
                <td>{assessment.department}</td>
                <td>
                  <span className={`type-badge ${assessment.type}`}>
                    {assessment.type === 'department-wise' ? 'Dept-wise' : 'College-wide'}
                  </span>
                </td>
                <td>{assessment.duration} min</td>
                <td>{assessment.date}</td>
                <td>{assessment.questions}</td>
                <td>
                  <button
                    className={`status-toggle ${assessment.status}`}
                    onClick={() => toggleAssessmentStatus(assessment.id)}
                  >
                    {assessment.status === 'active' ? (
                      <><FaToggleOn /> Active</>
                    ) : (
                      <><FaToggleOff /> Inactive</>
                    )}
                  </button>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="icon-btn preview-btn" 
                      onClick={() => handlePreview(assessment)}
                      title="Preview"
                    >
                      <FaEye />
                    </button>
                    <button 
                      className="icon-btn edit-btn" 
                      onClick={() => handleEditAssessment(assessment)}
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button 
                      className="icon-btn delete-btn" 
                      onClick={() => handleDeleteAssessment(assessment.id)}
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

      {/* Add Assessment Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>Create Assessment</h3>
            <div className="form-group">
              <label>Assessment Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter assessment name"
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'department-wise' | 'college-wide' })}
              >
                <option value="department-wise">Department-wise</option>
                <option value="college-wide">College-wide</option>
              </select>
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
            <div className="form-row">
              <div className="form-group">
                <label>Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Number of Attempts</label>
                <input
                  type="number"
                  value={formData.attempts}
                  onChange={(e) => setFormData({ ...formData, attempts: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Time Window Start</label>
                <input
                  type="time"
                  value={formData.timeWindow.start}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    timeWindow: { ...formData.timeWindow, start: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label>Time Window End</label>
                <input
                  type="time"
                  value={formData.timeWindow.end}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    timeWindow: { ...formData.timeWindow, end: e.target.value }
                  })}
                />
              </div>
            </div>
            <div className="upload-section">
              <label>Upload Questions</label>
              <div className="upload-options">
                <button type="button" className="upload-btn">
                  <FaUpload /> Copy-Paste
                </button>
                <button type="button" className="upload-btn">
                  <FaFileExcel /> Import Excel
                </button>
                <button type="button" className="upload-btn">
                  <FaUpload /> Import Text File
                </button>
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={handleAddAssessment}>Create</button>
              <button className="secondary-btn" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assessment Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Assessment</h3>
            <div className="form-group">
              <label>Assessment Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'department-wise' | 'college-wide' })}
              >
                <option value="department-wise">Department-wise</option>
                <option value="college-wide">College-wide</option>
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
            <div className="form-row">
              <div className="form-group">
                <label>Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Number of Attempts</label>
                <input
                  type="number"
                  value={formData.attempts}
                  onChange={(e) => setFormData({ ...formData, attempts: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Time Window Start</label>
                <input
                  type="time"
                  value={formData.timeWindow.start}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    timeWindow: { ...formData.timeWindow, start: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label>Time Window End</label>
                <input
                  type="time"
                  value={formData.timeWindow.end}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    timeWindow: { ...formData.timeWindow, end: e.target.value }
                  })}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={handleUpdateAssessment}>Update</button>
              <button className="secondary-btn" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Assessment Modal */}
      {isPreviewModalOpen && selectedAssessment && (
        <div className="modal-overlay" onClick={() => setIsPreviewModalOpen(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>Preview Assessment</h3>
            <div className="preview-content">
              <div className="preview-item">
                <strong>Name:</strong> {selectedAssessment.name}
              </div>
              <div className="preview-item">
                <strong>Department:</strong> {selectedAssessment.department}
              </div>
              <div className="preview-item">
                <strong>Type:</strong> {selectedAssessment.type === 'department-wise' ? 'Department-wise' : 'College-wide'}
              </div>
              <div className="preview-item">
                <strong>Duration:</strong> {selectedAssessment.duration} minutes
              </div>
              <div className="preview-item">
                <strong>Date:</strong> {selectedAssessment.date}
              </div>
              <div className="preview-item">
                <strong>Time Window:</strong> {selectedAssessment.timeWindow.start} - {selectedAssessment.timeWindow.end}
              </div>
              <div className="preview-item">
                <strong>Attempts:</strong> {selectedAssessment.attempts}
              </div>
              <div className="preview-item">
                <strong>Questions:</strong> {selectedAssessment.questions}
              </div>
              <div className="preview-item">
                <strong>Status:</strong> 
                <span className={`status-badge ${selectedAssessment.status}`}>
                  {selectedAssessment.status.charAt(0).toUpperCase() + selectedAssessment.status.slice(1)}
                </span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={() => setIsPreviewModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentManagement;

