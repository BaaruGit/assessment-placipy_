import React, { useState } from 'react';
import { FaBuilding, FaEdit, FaTrash, FaUserPlus, FaChartBar } from 'react-icons/fa';

interface Department {
  id: number;
  name: string;
  code: string;
  students: number;
  staff: number;
  assessments: number;
  staffMembers: string[];
}

const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([
    { id: 1, name: 'Computer Science', code: 'CS', students: 450, staff: 3, assessments: 5, staffMembers: ['John Doe', 'Jane Smith', 'Bob Johnson'] },
    { id: 2, name: 'Electronics', code: 'ECE', students: 380, staff: 2, assessments: 3, staffMembers: ['Alice Brown', 'Charlie Wilson'] },
    { id: 3, name: 'Mechanical', code: 'ME', students: 420, staff: 2, assessments: 4, staffMembers: ['David Lee', 'Emily Davis'] },
    { id: 4, name: 'Civil', code: 'CE', students: 310, staff: 2, assessments: 2, staffMembers: ['Frank Miller', 'Grace White'] },
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });

  const handleAddDepartment = () => {
    if (formData.name && formData.code) {
      const newDept: Department = {
        id: departments.length + 1,
        name: formData.name,
        code: formData.code,
        students: 0,
        staff: 0,
        assessments: 0,
        staffMembers: []
      };
      setDepartments([...departments, newDept]);
      setFormData({ name: '', code: '' });
      setIsAddModalOpen(false);
    }
  };

  const handleEditDepartment = (dept: Department) => {
    setSelectedDept(dept);
    setFormData({ name: dept.name, code: dept.code });
    setIsEditModalOpen(true);
  };

  const handleUpdateDepartment = () => {
    if (selectedDept && formData.name && formData.code) {
      setDepartments(departments.map(dept =>
        dept.id === selectedDept.id
          ? { ...dept, name: formData.name, code: formData.code }
          : dept
      ));
      setIsEditModalOpen(false);
      setSelectedDept(null);
      setFormData({ name: '', code: '' });
    }
  };

  const handleDeleteDepartment = (id: number) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      setDepartments(departments.filter(dept => dept.id !== id));
    }
  };

  const handleAssignStaff = (dept: Department) => {
    setSelectedDept(dept);
    setIsAssignModalOpen(true);
  };

  const allStaff = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson', 'David Lee', 'Emily Davis', 'Frank Miller', 'Grace White', 'Sarah Taylor', 'Michael Chen'];

  return (
    <div className="pto-component-page">
      <div className="page-header">
        <h2 className="page-title">
          <FaBuilding className="page-icon" />
          Department Management
        </h2>
        <button className="primary-btn" onClick={() => setIsAddModalOpen(true)}>
          <FaUserPlus /> Add Department
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <FaBuilding size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Total Departments</h3>
            <p className="stat-value">{departments.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <FaChartBar size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Total Students</h3>
            <p className="stat-value">{departments.reduce((sum, dept) => sum + dept.students, 0)}</p>
          </div>
        </div>
        <div className="stat-card">
          <FaUserPlus size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Total Staff</h3>
            <p className="stat-value">{departments.reduce((sum, dept) => sum + dept.staff, 0)}</p>
          </div>
        </div>
      </div>

      {/* Departments Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Department Name</th>
              <th>Code</th>
              <th>Students</th>
              <th>Staff</th>
              <th>Assessments</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map(dept => (
              <tr key={dept.id}>
                <td>{dept.name}</td>
                <td>{dept.code}</td>
                <td>{dept.students}</td>
                <td>{dept.staff}</td>
                <td>{dept.assessments}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="icon-btn edit-btn" 
                      onClick={() => handleEditDepartment(dept)}
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button 
                      className="icon-btn assign-btn" 
                      onClick={() => handleAssignStaff(dept)}
                      title="Assign Staff"
                    >
                      <FaUserPlus />
                    </button>
                    <button 
                      className="icon-btn delete-btn" 
                      onClick={() => handleDeleteDepartment(dept.id)}
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

      {/* Add Department Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Department</h3>
            <div className="form-group">
              <label>Department Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter department name"
              />
            </div>
            <div className="form-group">
              <label>Department Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Enter department code"
              />
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={handleAddDepartment}>Add</button>
              <button className="secondary-btn" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Department</h3>
            <div className="form-group">
              <label>Department Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter department name"
              />
            </div>
            <div className="form-group">
              <label>Department Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Enter department code"
              />
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={handleUpdateDepartment}>Update</button>
              <button className="secondary-btn" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Staff Modal */}
      {isAssignModalOpen && selectedDept && (
        <div className="modal-overlay" onClick={() => setIsAssignModalOpen(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>Assign Staff to {selectedDept.name}</h3>
            <div className="staff-assignment">
              <div className="available-staff">
                <h4>Available Staff</h4>
                <div className="staff-list">
                  {allStaff
                    .filter(staff => !selectedDept.staffMembers.includes(staff))
                    .map((staff, idx) => (
                      <div key={idx} className="staff-item">
                        <span>{staff}</span>
                        <button 
                          className="icon-btn assign-btn"
                          onClick={() => {
                            const updatedDept = {
                              ...selectedDept,
                              staffMembers: [...selectedDept.staffMembers, staff],
                              staff: selectedDept.staff + 1
                            };
                            setDepartments(departments.map(dept => 
                              dept.id === selectedDept.id ? updatedDept : dept
                            ));
                            setSelectedDept(updatedDept);
                          }}
                        >
                          <FaUserPlus />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
              <div className="assigned-staff">
                <h4>Assigned Staff</h4>
                <div className="staff-list">
                  {selectedDept.staffMembers.map((staff, idx) => (
                    <div key={idx} className="staff-item">
                      <span>{staff}</span>
                      <button 
                        className="icon-btn delete-btn"
                        onClick={() => {
                          const updatedDept = {
                            ...selectedDept,
                            staffMembers: selectedDept.staffMembers.filter(s => s !== staff),
                            staff: selectedDept.staff - 1
                          };
                          setDepartments(departments.map(dept => 
                            dept.id === selectedDept.id ? updatedDept : dept
                          ));
                          setSelectedDept(updatedDept);
                        }}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={() => setIsAssignModalOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;

