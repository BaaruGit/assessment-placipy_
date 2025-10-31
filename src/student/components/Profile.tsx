import React, { useState } from 'react';

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState('details');
  const [editing, setEditing] = useState(false);
  
  // Mock student data
  const [studentData, setStudentData] = useState({
    name: 'John Doe',
    rollNumber: 'STU12345',
    department: 'Computer Science',
    email: 'john.doe@example.com',
    phone: '+1 234 567 8900',
    year: '3rd Year',
    section: 'A'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Mock test history
  const testHistory = [
    { id: 1, testName: 'Mathematics Quiz', date: '2025-10-30', score: 85, status: 'completed' },
    { id: 2, testName: 'Physics Test', date: '2025-10-25', score: 78, status: 'completed' },
    { id: 3, testName: 'Chemistry Exam', date: '2025-10-20', score: 92, status: 'completed' },
    { id: 4, testName: 'Biology Midterm', date: '2025-11-15', score: null, status: 'upcoming' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStudentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveDetails = () => {
    // In a real app, this would save to a backend
    alert('Profile details saved successfully!');
    setEditing(false);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    // In a real app, this would call an API to change the password
    alert('Password changed successfully!');
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="profile-page">
      <h2>Profile</h2>
      
      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Personal Details
        </button>
        <button 
          className={`tab-btn ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          Change Password
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Test History
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'details' && (
          <div className="details-tab">
            <h3>Manage Student Details</h3>
            <div className="profile-details">
              {editing ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      name="name"
                      value={studentData.name}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Roll Number</label>
                    <input
                      type="text"
                      name="rollNumber"
                      value={studentData.rollNumber}
                      onChange={handleInputChange}
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      name="department"
                      value={studentData.department}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={studentData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={studentData.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Year</label>
                    <input
                      type="text"
                      name="year"
                      value={studentData.year}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Section</label>
                    <input
                      type="text"
                      name="section"
                      value={studentData.section}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-actions">
                    <button className="save-btn" onClick={handleSaveDetails}>Save Changes</button>
                    <button className="cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="view-details">
                  <div className="detail-row">
                    <span className="label">Name:</span>
                    <span className="value">{studentData.name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Roll Number:</span>
                    <span className="value">{studentData.rollNumber}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Department:</span>
                    <span className="value">{studentData.department}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Email:</span>
                    <span className="value">{studentData.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Phone:</span>
                    <span className="value">{studentData.phone}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Year:</span>
                    <span className="value">{studentData.year}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Section:</span>
                    <span className="value">{studentData.section}</span>
                  </div>
                  <button className="edit-btn" onClick={() => setEditing(true)}>Edit Details</button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="password-tab">
            <h3>Change Password</h3>
            <form className="password-form" onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>
              <button type="submit" className="change-password-btn">Change Password</button>
            </form>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-tab">
            <h3>Test History</h3>
            <div className="history-list">
              {testHistory.map(test => (
                <div key={test.id} className="history-item">
                  <div className="test-info">
                    <h4>{test.testName}</h4>
                    <p>Date: {test.date}</p>
                  </div>
                  <div className="test-status">
                    {test.status === 'completed' ? (
                      <span className="score">Score: {test.score}%</span>
                    ) : (
                      <span className="upcoming">Upcoming</span>
                    )}
                    <span className={`status-badge ${test.status}`}>
                      {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;

// Profile Dropdown Component
export const ProfileDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  
  // Mock student data
  const [studentData, setStudentData] = useState({
    name: 'John Doe',
    rollNumber: 'STU12345',
    department: 'Computer Science',
    email: 'john.doe@example.com',
    phone: '+1 234 567 8900',
    year: '3rd Year',
    section: 'A'
  });

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStudentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveDetails = () => {
    // In a real app, this would save to a backend
    alert('Profile details saved successfully!');
    setEditing(false);
  };

  return (
    <div className="profile-dropdown-container">
      <div className="user-avatar" onClick={toggleDropdown}>
        JD
      </div>
      
      {isOpen && (
        <div className="profile-dropdown">
          <div className="profile-header">
            <h3>Profile Details</h3>
          </div>
          
          <div className="profile-content">
            {editing ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={studentData.name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={studentData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={studentData.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-actions">
                  <button className="save-btn" onClick={handleSaveDetails}>Save</button>
                  <button className="cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="view-details">
                <div className="detail-row">
                  <span className="label">Name:</span>
                  <span className="value">{studentData.name}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Roll No:</span>
                  <span className="value">{studentData.rollNumber}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Department:</span>
                  <span className="value">{studentData.department}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Email:</span>
                  <span className="value">{studentData.email}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Phone:</span>
                  <span className="value">{studentData.phone}</span>
                </div>
                <button className="edit-btn" onClick={() => setEditing(true)}>Edit Profile</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
