import React, { useEffect, useState } from 'react';
import { FaBuilding, FaTrash, FaUserPlus, FaChartBar } from 'react-icons/fa';
import PTOService, { type Department as Dept, type StaffMember as StaffDto } from '../../services/pto.service';

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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await PTOService.getDepartments();
        const mapped: Department[] = data.map((d: Dept, idx) => ({
          id: idx + 1,
          name: d.name,
          code: d.code,
          students: d.students,
          staff: d.staff,
          assessments: d.assessments,
          staffMembers: d.staffMembers || []
        }));
        setDepartments(mapped);
      } catch (e: any) {
        setError(e.message || 'Failed to load departments');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; department?: string }>>([]);
  const [catalog, setCatalog] = useState<string[]>([]);

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const staff = await PTOService.getStaff();
        setStaffList(staff.map((s: StaffDto) => ({ id: s.id, name: s.name, department: s.department })));
      } catch {}
    };
    const loadCatalog = async () => {
      try {
        const codes = await PTOService.getDepartmentCatalog();
        setCatalog(codes);
      } catch {}
    };
    loadStaff();
    loadCatalog();
  }, []);

  const handleAddDepartment = async () => {
    if (formData.name && formData.code) {
      await PTOService.createDepartment({ name: formData.name, code: formData.code });
      const refreshed = await PTOService.getDepartments();
      const mapped: Department[] = refreshed.map((d: Dept, idx) => ({
        id: idx + 1,
        name: d.name,
        code: d.code,
        students: d.students,
        staff: d.staff,
        assessments: d.assessments,
        staffMembers: d.staffMembers || []
      }));
      setDepartments(mapped);
      setFormData({ name: '', code: '' });
      setIsAddModalOpen(false);
    }
  };

  const handleEditDepartment = (dept: Department) => {
    setSelectedDept(dept);
    setFormData({ name: dept.name, code: dept.code });
    setIsEditModalOpen(true);
  };

  const handleUpdateDepartment = async () => {
    if (selectedDept && formData.name && formData.code) {
      await PTOService.updateDepartment(selectedDept.code, { name: formData.name, code: formData.code });
      const refreshed = await PTOService.getDepartments();
      const mapped: Department[] = refreshed.map((d: Dept, idx) => ({
        id: idx + 1,
        name: d.name,
        code: d.code,
        students: d.students,
        staff: d.staff,
        assessments: d.assessments,
        staffMembers: d.staffMembers || []
      }));
      setDepartments(mapped);
      setIsEditModalOpen(false);
      setSelectedDept(null);
      setFormData({ name: '', code: '' });
    }
  };

  const handleDeleteDepartment = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      const dept = departments.find(d => d.id === id);
      if (dept) await PTOService.deleteDepartment(dept.code);
      const refreshed = await PTOService.getDepartments();
      const mapped: Department[] = refreshed.map((d: Dept, idx) => ({
        id: idx + 1,
        name: d.name,
        code: d.code,
        students: d.students,
        staff: d.staff,
        assessments: d.assessments,
        staffMembers: d.staffMembers || []
      }));
      setDepartments(mapped);
    }
  };

  const handleAssignStaff = (dept: Department) => {
    setSelectedDept(dept);
    setIsAssignModalOpen(true);
  };

  // no-op resolveName removed; names used directly from staffList

  return (
    <div className="pto-component-page">
      {/* Statistics Cards */}
      <div className="stats-grid">
        {error && (<div className="admin-error"><p>{error}</p></div>)}
        {loading && (<div className="admin-loading"><div className="spinner"></div><p>Loading departments...</p></div>)}
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

      {/* Action Button */}
      <div className="action-buttons-section">
        <button className="primary-btn" onClick={() => setIsAddModalOpen(true)}>
          <FaUserPlus /> Add Department
        </button>
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
              <tr key={dept.id} onClick={(e) => e.stopPropagation()}>
                <td>{dept.name}</td>
                <td>{dept.code}</td>
                <td>{dept.students}</td>
                <td>{dept.staff}</td>
                <td>{dept.assessments}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="edit-btn text-btn" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEditDepartment(dept);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      title="Edit"
                      type="button"
                    >
                      Edit
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
            {catalog.length > 0 && (
              <div className="form-group">
                <label>Select from Catalog</label>
                <select
                  value={formData.code}
                  onChange={(e) => {
                    const code = e.target.value;
                    setFormData(prev => ({ ...prev, code, name: prev.name || code }));
                  }}
                >
                  <option value="">Choose department code</option>
                  {catalog.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
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
                  {staffList
                    .filter(s => (s.department || '') !== selectedDept.code)
                    .map((s) => (
                      <div key={s.id} className="staff-item">
                        <span>{s.name}</span>
                        <button 
                          className="icon-btn assign-btn"
                          onClick={async () => {
                          await PTOService.assignStaffToDepartment(selectedDept.code, s.id);
                          const refreshedStaff = await PTOService.getStaff();
                          setStaffList(refreshedStaff.map((st: StaffDto) => ({ id: st.id, name: st.name, department: st.department })));
                          const refreshedDepts = await PTOService.getDepartments();
                          const mappedDepts: Department[] = refreshedDepts.map((d: Dept, idx) => ({ id: idx + 1, name: d.name, code: d.code, students: d.students, staff: d.staff, assessments: d.assessments, staffMembers: d.staffMembers || [] }));
                          setDepartments(mappedDepts);
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
                  {staffList.filter(s => (s.department || '') === selectedDept.code).map((s) => (
                    <div key={s.id} className="staff-item">
                      <span>{s.name}</span>
                      <button 
                        className="icon-btn delete-btn"
                        onClick={async () => {
                          await PTOService.unassignStaffFromDepartment(selectedDept.code, s.id);
                          const refreshedStaff = await PTOService.getStaff();
                          setStaffList(refreshedStaff.map((st: StaffDto) => ({ id: st.id, name: st.name, department: st.department })));
                          const refreshedDepts = await PTOService.getDepartments();
                          const mappedDepts: Department[] = refreshedDepts.map((d: Dept, idx) => ({ id: idx + 1, name: d.name, code: d.code, students: d.students, staff: d.staff, assessments: d.assessments, staffMembers: d.staffMembers || [] }));
                          setDepartments(mappedDepts);
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

