import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Filter, X, Save, Upload } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import * as XLSX from '@e965/xlsx';
import {
  getAllStudents,
  upsertStudent,
  updateStudentStatus,
  deleteStudent,
  type Student
} from '../services/student.service';
import AuthService from '../services/auth.service';

// Student interface is imported from student.service

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [domainAlert, setDomainAlert] = useState<{ show: boolean; emailDomain: string; userDomain: string }>({ show: false, emailDomain: '', userDomain: '' });
  
  const { user: contextUser, loading: userLoading } = useUser();
  const [ptsProfile, setPtsProfile] = useState<any>(null);
  const [ptsProfileLoading, setPtsProfileLoading] = useState(true);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    rollNumber: '',
    department: 'Computer Science',
    phone: '',
    status: 'Active' as 'Active' | 'Inactive'
  });

  const [departments] = useState(['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Information Technology']);
  
  // Get PTS profile on component mount
  useEffect(() => {
    const fetchPtsProfile = async () => {
      if (contextUser) {
        try {
          const token = AuthService.getAccessToken();
          if (token) {
            const profile = await AuthService.getUserProfile(token);
            setPtsProfile(profile);
            // Set department from profile, checking for different possible field names
            const profileAny: any = profile;
            const deptValue = profileAny.department || profileAny.dept || profileAny.userDepartment || profileAny.userDept || '';
            setFormData(prev => ({
              ...prev,
              department: deptValue
            }));
          }
        } catch (error) {
          console.error('Error fetching PTS profile:', error);
        } finally {
          setPtsProfileLoading(false);
        }
      } else {
        setPtsProfileLoading(false);
      }
    };
    
    fetchPtsProfile();
  }, [contextUser]);
  
  // Get department from PTS profile
  const ptsDepartment = ptsProfile?.department || 'Computer Science';

  // Unified save handler: used for both Add and Edit flows
  const handleSaveStudent = async () => {
    // Validate email format (allow any valid domain)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    // Check if the email domain matches the logged-in user's domain
    const emailDomain = formData.email.split('@')[1];
    
    // Get the logged-in user's domain from context
    const userDomain = contextUser?.email ? contextUser.email.split('@')[1] : 'unknown';
    
    if (emailDomain !== userDomain) {
      const confirm = window.confirm(
        `Warning: You are adding a student from domain '${emailDomain}' while you are logged in from domain '${userDomain}'. ` +
        `This student will only be visible to users from the same domain. Are you sure you want to proceed?`
      );
      
      if (!confirm) {
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      // Ensure the department matches the PTS user's department when adding a new student
      const studentData = isEditing 
        ? formData 
        : { ...formData, department: ptsProfile?.department || formData.department };

      // upsertStudent works for both create and update
      await upsertStudent(studentData);

      // Reload list
      await loadStudents();

      resetForm();
      setShowAddModal(false);
      setIsEditing(false);

      alert(isEditing ? 'Student updated successfully!' : 'Student added successfully!');
    } catch (err: any) {
      alert('Failed to save student: ' + err.message);
      console.error('Failed to save student:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open modal for editing (Option A: email not editable)
  const openEditModal = (student: Student) => {
    setIsEditing(true);
    setFormData({
      email: student.email,
      name: student.name,
      rollNumber: student.rollNumber,
      department: student.department,
      phone: student.phone || '',
      status: student.status
    });
    setShowAddModal(true);
  };

  const handleDeleteStudent = async (email: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this student?');
    if (!confirmDelete) return;

    try {
      setLoading(true);
      setError(null);

      await deleteStudent(email);
      await loadStudents();

      alert('Student deleted successfully');
    } catch (err: any) {
      alert('Failed to delete student: ' + err.message);
      console.error('Failed to delete student:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentStatus = async (email: string) => {
    console.log('Toggle status called for email:', email);
    const student = students.find(s => s.email === email);
    if (!student) {
      console.log('Student not found for email:', email);
      return;
    }

    console.log('Current student status:', student.status);
    const newStatus = student.status === 'Active' ? 'Inactive' : 'Active';
    console.log('New status will be:', newStatus);

    try {
      setLoading(true);
      setError(null);
      console.log('Calling updateStudentStatus with:', { email, newStatus });
      const result = await updateStudentStatus(email, newStatus);
      console.log('Update result:', result);

      // Update local state (better UX) and reset filter if needed
      setStudents(prev => prev.map(s => (s.email === email ? { ...s, status: newStatus } : s)));
      setFilterStatus('all'); // keep this to ensure visibility if user had a status filter
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert('Failed to update status: ' + err.message);
      console.error('Failed to update status:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      rollNumber: '',
      department: ptsProfile?.department || 'Computer Science',
      phone: '',
      status: 'Active'
    });
    setIsEditing(false);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (value: string) => {
    // Allow only numbers, spaces, +, -, and ()
    const phoneRegex = /^[0-9+\-\s()]*$/;
    if (phoneRegex.test(value)) {
      setFormData(prev => ({ ...prev, phone: value }));
    }
  };

  const handleEmailChange = (value: string) => {
    // Allow any valid email format, don't auto-add domain
    setFormData(prev => ({ ...prev, email: value }));
  };

  // Load students on component mount
  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllStudents();
      setStudents(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Only show students from the PTS user's department
    const matchesDepartment = ptsProfile ? student.department === ptsProfile.department : true;
    
    // Keep the status filter
    const matchesStatus = filterStatus === 'all' || student.status === filterStatus;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Export to Excel function
  const exportToExcel = () => {
    // Define the columns we want to export
    const exportData = filteredStudents.map(student => ({
      Name: student.name,
      'Roll Number': student.rollNumber,
      Email: student.email,
      Department: student.department,
      Phone: student.phone || '',
      Status: student.status,
      CreatedAt: student.createdAt || '',
      UpdatedAt: student.updatedAt || ''
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    // Export to file
    XLSX.writeFile(wb, 'students-export.xlsx');
  };

  // File input reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Excel file import
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportLoading(true);
      setImportResults(null);
      setError(null);
      
      // Read Excel file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);
      
      if (jsonData.length === 0) {
        throw new Error('No data found in Excel file');
      }

      // Check domains before importing
      const userDomain = students.length > 0 ? students[0].email.split('@')[1] : '';
      const differentDomains = [];
      
      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        const email = row.Email || row.email || row['Email Address'] || '';
        if (email) {
          const emailDomain = email.split('@')[1];
          if (emailDomain && userDomain && emailDomain !== userDomain) {
            differentDomains.push({ row: i + 1, email, domain: emailDomain });
          }
        }
      }
      
      if (differentDomains.length > 0) {
        const confirm = window.confirm(
          `Warning: You are importing students from different domains:\n` +
          `${differentDomains.map(d => `  • Row ${d.row}: ${d.email} (${d.domain})`).join('\n')}\n\n` +
          `These students will only be visible to users from their respective domains. Do you want to proceed?`
        );
        
        if (!confirm) {
          setImportLoading(false);
          return;
        }
      }

      // Process students
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      
      setImportProgress({ current: 0, total: jsonData.length });
      
      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        setImportProgress({ current: i + 1, total: jsonData.length });
        
        try {
          // Map Excel columns to student fields
          const studentData: any = {
            email: row.Email || row.email || row['Email Address'] || '',
            rollNumber: row['Roll Number'] || row.rollNumber || row.roll_number || row['Roll No'] || row['Roll'] || '',
            name: row.Name || row.name || row['Full Name'] || row['Student Name'] || '',
            department: row.Department || row.department || row['Department Name'] || 'Computer Science',
            phone: row.Phone || row.phone || row['Phone Number'] || row['Mobile'] || '',
            status: row.Status || row.status || 'Active'
          };
          
          // Validate required fields
          if (!studentData.email) {
            throw new Error('Missing email');
          }
          
          if (!studentData.rollNumber) {
            // Generate a roll number if missing
            const emailUsername = studentData.email.split('@')[0];
            studentData.rollNumber = emailUsername.toUpperCase();
            console.log(`Generated roll number for ${studentData.email}: ${studentData.rollNumber}`);
          }
          
          if (!studentData.name) {
            throw new Error('Missing name');
          }
          
          if (!studentData.department) {
            throw new Error('Missing department');
          }
          
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(studentData.email)) {
            throw new Error('Invalid email format');
          }
          
          // Create/update student
          await upsertStudent(studentData);
          successCount++;
        } catch (err: any) {
          const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
          errors.push(`Row ${i + 1}: ${errorMessage}`);
          failedCount++;
        }
      }
      
      setImportResults({ success: successCount, failed: failedCount, errors });
      
      // Refresh student list
      await loadStudents();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Show success message
      if (successCount > 0) {
        alert(`${successCount} students imported successfully!`);
      }
      
      if (failedCount > 0) {
        console.error('Import errors:', errors);
      }
    } catch (err: any) {
      console.error('Error importing Excel file:', err);
      setError(err.message || 'Failed to import Excel file');
    } finally {
      setImportLoading(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Show loading state with skeleton UI when data is being fetched
  if (loading && students.length === 0) { // Only show full page skeleton on initial load
    return (
      <div className="pts-fade-in">
        {/* Skeleton for Header Actions */}
        <div className="action-buttons-section" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '0', flexWrap: 'wrap' }}>
            <div className="pts-skeleton pts-skeleton-button" style={{ width: '120px', height: '36px', marginBottom: '10px' }}></div>
            <div className="pts-skeleton pts-skeleton-button" style={{ width: '100px', height: '36px', marginBottom: '10px', marginLeft: '10px' }}></div>
            <div className="pts-skeleton pts-skeleton-button" style={{ width: '100px', height: '36px', marginBottom: '10px', marginLeft: '10px' }}></div>
          </div>
        </div>
        
        {/* Skeleton for Search and Filters */}
        <div className="pts-form-container" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'end' }}>
            <div className="pts-skeleton pts-skeleton-input" style={{ flex: 1, maxWidth: '300px', height: '50px', borderRadius: '6px' }}></div>
            <div className="pts-skeleton pts-skeleton-input" style={{ flex: 1, maxWidth: '200px', height: '50px', borderRadius: '6px' }}></div>
          </div>
        </div>
        
        {/* Skeleton for Students Table */}
        <div className="pts-form-container">
          <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="pts-skeleton pts-skeleton-text" style={{ width: '150px', height: '24px', borderRadius: '4px' }}></div>
            <div className="pts-skeleton pts-skeleton-text" style={{ width: '120px', height: '20px', borderRadius: '4px' }}></div>
          </div>
          
          {/* Table header line */}
          <div style={{ height: '4px', background: 'linear-gradient(90deg, #9768E1 0%, #7c4dce 100%)', borderRadius: '2px', marginBottom: '20px' }}></div>
          
          <div>
            <div className="pts-skeleton" style={{ width: '100%', height: '300px', borderRadius: '8px' }}></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="pts-fade-in">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls,.csv"
        onChange={handleImportExcel}
        style={{ display: 'none' }}
      />
      
      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: '15px',
            marginBottom: '20px',
            background: '#f8d7da',
            color: '#721c24',
            borderRadius: '8px',
            border: '1px solid #f5c6cb'
          }}
        >
          Error: {error}
        </div>
      )}
      
      {/* Import Results */}
      {importResults && (
        <div
          style={{
            padding: '15px',
            marginBottom: '20px',
            background: importResults.failed === 0 ? '#d4edda' : '#fff3cd',
            color: importResults.failed === 0 ? '#155724' : '#856404',
            borderRadius: '8px',
            border: `1px solid ${importResults.failed === 0 ? '#c3e6cb' : '#ffeaa7'}`
          }}
        >
          <strong>Import Results:</strong> {importResults.success} successful, {importResults.failed} failed
          {importResults.errors.length > 0 && (
            <div style={{ marginTop: '10px', fontSize: '0.9rem' }}>
              <strong>Errors:</strong>
              <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
                {importResults.errors.slice(0, 5).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {importResults.errors.length > 5 && (
                  <li>... and {importResults.errors.length - 5} more errors</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Import Progress */}
      {importLoading && (
        <div
          style={{
            padding: '15px',
            marginBottom: '20px',
            background: '#d1ecf1',
            color: '#0c5460',
            borderRadius: '8px',
            border: '1px solid #bee5eb'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Importing students... ({importProgress.current}/{importProgress.total})</span>
            <div style={{ width: '200px', height: '8px', background: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%`, 
                  height: '100%', 
                  background: '#0c5460',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Header Actions */}
      <div className="action-buttons-section" style={{ marginBottom: '20px' }}>
        <button
          className="pts-btn-primary"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          <Plus size={18} /> Add New Student
        </button>
        <button 
          className="pts-btn-secondary" 
          onClick={triggerFileInput}
          disabled={importLoading}
          style={{ marginLeft: '10px' }}
        >
          <Upload size={18} /> Import Excel
        </button>
        <button className="pts-btn-secondary" onClick={exportToExcel} style={{ marginLeft: '10px' }}>
          Export as Excel
        </button>
      </div>

      {/* Search and Filters */}
      <div className="pts-form-container" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'end' }}>
          <div className="pts-form-group" style={{ flex: 1, maxWidth: '300px' }}>
            <label className="pts-form-label">
              <Search size={16} /> Search
            </label>
            <input
              type="text"
              className="pts-form-input"
              placeholder="Search by name, roll number, or email"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="pts-form-group" style={{ flex: 1, maxWidth: '200px' }}>
            <label className="pts-form-label">Status</label>
            <select className="pts-form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="pts-form-container">
        <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="pts-form-title">Students List</h3>
          <div style={{ color: '#A4878D', fontSize: '0.9rem' }}>
            Showing {filteredStudents.length} of {filteredStudents.length} students
          </div>
        </div>
        
        {/* Table header line */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #9768E1 0%, #7c4dce 100%)', borderRadius: '2px', marginBottom: '20px' }}></div>
        
        <div>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                <th style={{ padding: '12px', textAlign: 'left', color: '#523C48', width: '25%' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#523C48', width: '12%' }}>Roll No</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#523C48', width: '15%' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#523C48', width: '12%' }}>Department</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#523C48', width: '12%' }}>Phone</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#523C48', width: '12%' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#523C48', width: '13%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                      <div className="pts-skeleton" style={{ width: '100%', height: '400px', borderRadius: '8px' }}></div>
                      <div className="pts-skeleton pts-skeleton-text" style={{ width: '60%', height: '24px', borderRadius: '4px' }}></div>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#A4878D' }}>
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={student.email} style={{ borderBottom: '1px solid #e9ecef', height: 'auto', minHeight: '50px', verticalAlign: 'middle' }}>
                    <td style={{ 
                      padding: '10px 12px', 
                      color: '#A4878D', 
                      fontSize: '0.9rem',
                      position: 'relative',
                      zIndex: 1,
                      height: 'auto',
                      verticalAlign: 'middle',
                      lineHeight: '1.4'
                    }}>
                      {student.email}
                    </td>
                    <td style={{ 
                      padding: '10px 12px', 
                      color: '#523C48', 
                      fontWeight: '500',
                      position: 'relative',
                      zIndex: 1,
                      height: 'auto',
                      verticalAlign: 'middle',
                      lineHeight: '1.4'
                    }}>
                      {student.rollNumber}
                    </td>
                    <td style={{ 
                      padding: '10px 12px', 
                      color: '#523C48',
                      position: 'relative',
                      zIndex: 1,
                      height: 'auto',
                      verticalAlign: 'middle',
                      lineHeight: '1.4'
                    }}>
                      {student.name}
                    </td>
                    <td style={{ 
                      padding: '10px 12px', 
                      color: '#523C48',
                      position: 'relative',
                      zIndex: 1,
                      height: 'auto',
                      verticalAlign: 'middle',
                      lineHeight: '1.4'
                    }}>
                      {student.department}
                    </td>
                    <td style={{ 
                      padding: '10px 12px', 
                      color: '#A4878D', 
                      fontSize: '0.9rem',
                      position: 'relative',
                      zIndex: 1,
                      height: 'auto',
                      verticalAlign: 'middle',
                      lineHeight: '1.4'
                    }}>
                      {student.phone || '-'}
                    </td>
                    <td style={{ 
                      padding: '10px 12px',
                      position: 'relative',
                      zIndex: 1,
                      height: 'auto',
                      verticalAlign: 'middle',
                      lineHeight: '1.4'
                    }}>
                      <button
                        onClick={() => toggleStudentStatus(student.email)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                          background: student.status === 'Active' ? '#d4edda' : '#f8d7da',
                          color: student.status === 'Active' ? '#155724' : '#721c24',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          opacity: 1,
                          position: 'relative',
                          zIndex: 10
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.opacity = '0.8';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="Click to toggle status"
                      >
                        {student.status}
                      </button>
                    </td>

                    <td
                      style={{
                        padding: '12px',
                        verticalAlign: 'middle',
                        textAlign: 'center'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        {/* Edit Button */}
                        <button
                          className="pts-btn-secondary"
                          onClick={() => openEditModal(student)}
                          title="Edit student"
                        >
                          Edit
                        </button>

                        {/* Delete Button */}
                        <button
                          className="pts-btn-danger"
                          onClick={() => handleDeleteStudent(student.email)}
                          title="Delete student"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="pts-form-title">{isEditing ? 'Edit Student' : 'Add New Student'}</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A4878D' }}
              >
                <X size={24} />
              </button>
            </div>

            <div className="pts-form-grid">
              <div className="pts-form-group">
                <label className="pts-form-label">Email (College ID) *</label>
                <input
                  type="email"
                  className="pts-form-input"
                  value={formData.email}
                  onChange={e => handleEmailChange(e.target.value)}
                  placeholder="john.doe@example.com"
                  disabled={Boolean(isEditing)} // Option A: email not editable when editing
                  style={isEditing ? { backgroundColor: '#f5f5f5' } : {}}
                />
                <small style={{ color: '#6c757d', fontSize: '0.85rem' }}>Enter a valid email address</small>
              </div>

              <div className="pts-form-group">
                <label className="pts-form-label">Roll Number *</label>
                <input
                  type="text"
                  className="pts-form-input"
                  value={formData.rollNumber}
                  onChange={e => handleFormChange('rollNumber', e.target.value)}
                  placeholder="CS2024001"
                />
              </div>

              <div className="pts-form-group">
                <label className="pts-form-label">Full Name *</label>
                <input
                  type="text"
                  className="pts-form-input"
                  value={formData.name}
                  onChange={e => handleFormChange('name', e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div className="pts-form-group">
                <label className="pts-form-label">Department *</label>
                <select 
                  className="pts-form-select" 
                  value={ptsProfile?.department || ptsProfile?.dept || ptsProfile?.userDepartment || ptsProfile?.userDept || formData.department} // Show profile department or form data
                  onChange={e => handleFormChange('department', e.target.value)}
                  disabled={!!ptsProfile} // Disable if PTS profile is loaded
                  style={ptsProfile ? { 
                    backgroundColor: '#f5f5f5',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none'
                  } : {}}
                >
                  {departments.map(dept => (
                    <option 
                      key={dept} 
                      value={dept}
                      disabled={ptsProfile && dept !== (ptsProfile?.department || ptsProfile?.dept || ptsProfile?.userDepartment || ptsProfile?.userDept)} // Only allow PTS department if profile loaded
                    >
                      {dept}
                    </option>
                  ))}
                  {/* Add the profile department as an option if it's not in the predefined list */}
                  {ptsProfile && (ptsProfile?.department || ptsProfile?.dept || ptsProfile?.userDepartment || ptsProfile?.userDept) && 
                   !departments.includes(ptsProfile?.department || ptsProfile?.dept || ptsProfile?.userDepartment || ptsProfile?.userDept) && (
                    <option value={ptsProfile?.department || ptsProfile?.dept || ptsProfile?.userDepartment || ptsProfile?.userDept}>
                      {ptsProfile?.department || ptsProfile?.dept || ptsProfile?.userDepartment || ptsProfile?.userDept}
                    </option>
                  )}
                </select>
              </div>

              <div className="pts-form-group">
                <label className="pts-form-label">Phone</label>
                <input
                  type="tel"
                  className="pts-form-input"
                  value={formData.phone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="+91 1234567890"
                  maxLength={15}
                />
                <small style={{ color: '#6c757d', fontSize: '0.85rem' }}>Numbers, +, -, spaces, () only</small>
              </div>

              <div className="pts-form-group">
                <label className="pts-form-label">Status</label>
                <select className="pts-form-select" value={formData.status} onChange={e => handleFormChange('status', e.target.value as 'Active' | 'Inactive')}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button
                className="pts-btn-secondary"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button
                className="pts-btn-primary"
                onClick={handleSaveStudent}
                disabled={!formData.email || !formData.name || !formData.rollNumber || loading}
              >
                <Save size={16} /> {loading ? 'Saving...' : isEditing ? 'Update Student' : 'Add Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
