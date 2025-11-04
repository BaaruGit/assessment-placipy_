import React, { useState } from 'react';
import { FaUser, FaEdit, FaLock, FaBell } from 'react-icons/fa';

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState('details');
  const [editing, setEditing] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: 'John Smith',
    designation: 'Placement Training Officer',
    email: 'john.smith@college.edu',
    phone: '+1234567890',
    contact: '+1234567890',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    assessmentReminders: true,
    reportAlerts: true,
    studentMessages: true,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
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

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveDetails = () => {
    alert('Profile details saved successfully!');
    setEditing(false);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }
    alert('Password changed successfully!');
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleSaveNotifications = () => {
    alert('Notification preferences saved successfully!');
  };

  return (
    <div className="pto-component-page">
      <div className="profile-page">
        <div className="page-header">
          <h2 className="page-title">
            <FaUser className="page-icon" />
            Profile Management
          </h2>
        </div>

        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <FaUser /> Personal Details
          </button>
          <button 
            className={`tab-btn ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            <FaLock /> Change Password
          </button>
          <button 
            className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <FaBell /> Notifications
          </button>
        </div>

        <div className="tab-content">
          {/* Personal Details Tab */}
          {activeTab === 'details' && (
            <div className="details-tab">
              <div className="profile-details">
                {editing ? (
                  <div className="edit-form">
                    <div className="form-group">
                      <label>Name</label>
                      <input
                        type="text"
                        name="name"
                        value={profileData.name}
                        onChange={handleInputChange}
                        placeholder="Enter your name"
                      />
                    </div>
                    <div className="form-group">
                      <label>Designation</label>
                      <input
                        type="text"
                        name="designation"
                        value={profileData.designation}
                        onChange={handleInputChange}
                        placeholder="Enter your designation"
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={profileData.email}
                        onChange={handleInputChange}
                        placeholder="Enter your email"
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={profileData.phone}
                        onChange={handleInputChange}
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div className="form-group">
                      <label>Contact</label>
                      <input
                        type="tel"
                        name="contact"
                        value={profileData.contact}
                        onChange={handleInputChange}
                        placeholder="Enter your contact number"
                      />
                    </div>
                    <div className="form-actions">
                      <button className="primary-btn" onClick={handleSaveDetails}>
                        Save Changes
                      </button>
                      <button className="secondary-btn" onClick={() => setEditing(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="view-details">
                    <div className="detail-row">
                      <span className="label">Name:</span>
                      <span className="value">{profileData.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Designation:</span>
                      <span className="value">{profileData.designation}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Email:</span>
                      <span className="value">{profileData.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Phone:</span>
                      <span className="value">{profileData.phone}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Contact:</span>
                      <span className="value">{profileData.contact}</span>
                    </div>
                    <button className="primary-btn" onClick={() => setEditing(true)}>
                      <FaEdit /> Edit Profile
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Change Password Tab */}
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
                    placeholder="Enter current password"
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
                    placeholder="Enter new password"
                    required
                    minLength={6}
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                  />
                </div>
                <button type="submit" className="primary-btn">
                  Change Password
                </button>
              </form>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="notifications-tab">
              <h3>Notification Preferences</h3>
              <div className="notifications-list">
                <label className="notification-item">
                  <input
                    type="checkbox"
                    checked={notifications.emailNotifications}
                    onChange={() => handleNotificationChange('emailNotifications')}
                  />
                  <span>Email Notifications</span>
                </label>
                <label className="notification-item">
                  <input
                    type="checkbox"
                    checked={notifications.assessmentReminders}
                    onChange={() => handleNotificationChange('assessmentReminders')}
                  />
                  <span>Assessment Reminders</span>
                </label>
                <label className="notification-item">
                  <input
                    type="checkbox"
                    checked={notifications.reportAlerts}
                    onChange={() => handleNotificationChange('reportAlerts')}
                  />
                  <span>Report Alerts</span>
                </label>
                <label className="notification-item">
                  <input
                    type="checkbox"
                    checked={notifications.studentMessages}
                    onChange={() => handleNotificationChange('studentMessages')}
                  />
                  <span>Student Messages</span>
                </label>
              </div>
              <button className="primary-btn" onClick={handleSaveNotifications}>
                Save Preferences
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

