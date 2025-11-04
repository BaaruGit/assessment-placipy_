import React, { useState } from 'react';
import { FaUserGraduate, FaSearch, FaFilter, FaEnvelope, FaBuilding } from 'react-icons/fa';

interface Student {
  id: number;
  name: string;
  rollNumber: string;
  department: string;
  email: string;
  testsParticipated: number;
  avgScore: number;
}

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([
    { id: 1, name: 'Alice Johnson', rollNumber: 'CS001', department: 'Computer Science', email: 'alice@college.edu', testsParticipated: 5, avgScore: 85 },
    { id: 2, name: 'Bob Williams', rollNumber: 'CS002', department: 'Computer Science', email: 'bob@college.edu', testsParticipated: 4, avgScore: 78 },
    { id: 3, name: 'Charlie Brown', rollNumber: 'ECE001', department: 'Electronics', email: 'charlie@college.edu', testsParticipated: 3, avgScore: 82 },
    { id: 4, name: 'Diana Prince', rollNumber: 'ME001', department: 'Mechanical', email: 'diana@college.edu', testsParticipated: 6, avgScore: 90 },
    { id: 5, name: 'Eve Davis', rollNumber: 'CE001', department: 'Civil', email: 'eve@college.edu', testsParticipated: 2, avgScore: 75 },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageData, setMessageData] = useState({ subject: '', message: '' });

  const departments = ['all', 'Computer Science', 'Electronics', 'Mechanical', 'Civil'];

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || student.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const handleSelectStudent = (id: number) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const handleSendMessage = () => {
    if (selectedStudents.length > 0 && messageData.subject && messageData.message) {
      alert(`Message sent to ${selectedStudents.length} student(s)`);
      setIsMessageModalOpen(false);
      setMessageData({ subject: '', message: '' });
      setSelectedStudents([]);
    }
  };

  const handleSendAnnouncement = () => {
    if (messageData.subject && messageData.message) {
      alert('Announcement sent to all students');
      setIsMessageModalOpen(false);
      setMessageData({ subject: '', message: '' });
    }
  };

  return (
    <div className="pto-component-page">
      <div className="page-header">
        <h2 className="page-title">
          <FaUserGraduate className="page-icon" />
          Student Management
        </h2>
        <div className="header-actions">
          <button 
            className="primary-btn"
            onClick={() => {
              setSelectedStudents([]);
              setIsMessageModalOpen(true);
            }}
            disabled={selectedStudents.length === 0}
          >
            <FaEnvelope /> Send Message ({selectedStudents.length})
          </button>
          <button 
            className="secondary-btn"
            onClick={() => {
              setSelectedStudents([]);
              setIsMessageModalOpen(true);
            }}
          >
            <FaEnvelope /> Send Announcement
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <FaUserGraduate size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Total Students</h3>
            <p className="stat-value">{students.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <FaBuilding size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Departments</h3>
            <p className="stat-value">{new Set(students.map(s => s.department)).size}</p>
          </div>
        </div>
        <div className="stat-card">
          <FaFilter size={24} color="#9768E1" />
          <div className="stat-content">
            <h3>Active Tests</h3>
            <p className="stat-value">{students.reduce((sum, s) => sum + s.testsParticipated, 0)}</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="search-filter-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, roll number, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-box">
          <FaFilter className="filter-icon" />
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept === 'all' ? 'All Departments' : dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Name</th>
              <th>Roll Number</th>
              <th>Department</th>
              <th>Email</th>
              <th>Tests Participated</th>
              <th>Average Score</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => (
              <tr key={student.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => handleSelectStudent(student.id)}
                  />
                </td>
                <td>{student.name}</td>
                <td>{student.rollNumber}</td>
                <td>{student.department}</td>
                <td>{student.email}</td>
                <td>{student.testsParticipated}</td>
                <td>
                  <span className={`score-badge ${student.avgScore >= 80 ? 'high' : student.avgScore >= 70 ? 'medium' : 'low'}`}>
                    {student.avgScore}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Send Message Modal */}
      {isMessageModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMessageModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              {selectedStudents.length > 0 
                ? `Send Message to ${selectedStudents.length} Student(s)`
                : 'Send Announcement to All Students'}
            </h3>
            <div className="form-group">
              <label>Subject</label>
              <input
                type="text"
                value={messageData.subject}
                onChange={(e) => setMessageData({ ...messageData, subject: e.target.value })}
                placeholder="Enter message subject"
              />
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea
                value={messageData.message}
                onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                placeholder="Enter your message"
                rows={6}
              />
            </div>
            <div className="modal-actions">
              <button 
                className="primary-btn" 
                onClick={selectedStudents.length > 0 ? handleSendMessage : handleSendAnnouncement}
              >
                <FaEnvelope /> Send
              </button>
              <button className="secondary-btn" onClick={() => setIsMessageModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;

