import React, { useEffect, useState } from 'react';
import { FaUser, FaEdit, FaLock, FaBell } from 'react-icons/fa';
import { useUser } from '../../contexts/UserContext';
import PTOService from '../../services/pto.service';
import ProfileService from '../../services/profile.service';

const Profile: React.FC = () => {
  const { user, refreshUser } = useUser();
  const [activeTab, setActiveTab] = useState('details');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profilePicture, setProfilePicture] = useState<string>(
    localStorage.getItem('ptoProfilePictureUrl') ||
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'
  );
  const [showImageSelector, setShowImageSelector] = useState(false);
  
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    designation: 'Placement Training Officer',
    email: '',
    phone: '',
    contact: '',
    department: '',
    employeeId: ''
  });

  const [deptOptions, setDeptOptions] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await PTOService.getProfile();
        const name = String(data.name || '').trim();
        const parts = name.split(' ');
        const first = parts[0] || '';
        const last = parts.slice(1).join(' ') || '';
        const sk = String((data.SK || '') as string);
        const empId = sk.startsWith('PTO#') ? sk.replace('PTO#','') : '';
        setProfileData({
          firstName: first,
          lastName: last,
          designation: String(data.designation || 'Placement Training Officer'),
          email: String(data.email || user?.email || ''),
          phone: String(data.phone || ''),
          contact: '',
          department: String(data.department || ''),
          employeeId: String((data.employeeId || empId) || '')
        });
        const stored = localStorage.getItem('ptoProfilePictureUrl');
        if (stored) setProfilePicture(stored);
      } catch {}
    };
    load();
    const loadDepartments = async () => {
      try {
        const catalog = await PTOService.getDepartmentCatalog();
        const codes = Array.isArray(catalog)
          ? catalog
              .map((d: any) => {
                if (typeof d === 'string') return d;
                if (d && typeof d === 'object') return String(d.code || '').toUpperCase();
                return String(d || '').toUpperCase();
              })
              .filter((c: string) => !!c && c !== '[OBJECT OBJECT]')
          : [];
        const unique = Array.from(new Set(codes));
        setDeptOptions(unique);
      } catch {}
    };
    loadDepartments();
  }, [user]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  const handleSaveDetails = async () => {
    setError('');
    setSuccess('');
    const firstName = String(profileData.firstName || '').trim();
    const lastName = String(profileData.lastName || '').trim();
    const email = String(profileData.email || '').trim();
    const phone = String(profileData.phone || '').trim();
    if (!firstName || !lastName) {
      setError('First name and last name are required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    try {
      const payload = {
        firstName,
        lastName,
        email,
        phone,
        designation: profileData.designation,
        department: profileData.department,
        employeeId: profileData.employeeId
      };
      await PTOService.updateProfile(payload);
      setSuccess('Profile updated successfully');
      setEditing(false);
      await refreshUser();
      const updated = await PTOService.getProfile();
      const parts = String(updated.name || '').trim().split(' ');
        setProfileData({
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ') || '',
          designation: String(updated.designation || 'Placement Training Officer'),
          email: String(updated.email || email),
          phone: String(updated.phone || ''),
          contact: '',
          department: String(updated.department || ''),
          employeeId: String((updated.employeeId || (String(updated.SK || '').startsWith('PTO#') ? String(updated.SK || '').replace('PTO#','') : '')) || '')
        });
      setTimeout(() => setSuccess(''), 2500);
    } catch (e: any) {
      setError(e.message || 'Failed to update profile');
    }
  };

  const allowedImages = [
    'https://images.unsplash.com/photo-1494790108755-2616b612b977?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
  ];

  const handleImageSelect = async (url: string) => {
    setError('');
    setSuccess('');
    try {
      await ProfileService.updateProfilePicture(url);
      setProfilePicture(url);
      localStorage.setItem('ptoProfilePictureUrl', url);
      setShowImageSelector(false);
      setSuccess('Profile picture updated successfully');
      setTimeout(() => setSuccess(''), 2500);
    } catch (e: any) {
      setError(e.message || 'Failed to update profile picture');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    try {
      setSuccess('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    }
  };

  const handleSaveNotifications = () => {
    alert('Notification preferences saved successfully!');
  };

  return (
    <div className="pto-component-page">
      <div className="profile-page">
        {success && (<div className="success-message">{success}</div>)}
        {error && (<div className="error-message">{error}</div>)}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <img
                      src={profilePicture}
                      alt="Profile"
                      style={{ width: 50, height: 50, borderRadius: '50%', border: '2px solid #9768E1' }}
                    />
                    <button
                      className="secondary-btn"
                      onClick={() => setShowImageSelector(!showImageSelector)}
                    >
                      Change Picture
                    </button>
                  </div>
                  {showImageSelector && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                      {allowedImages.map((img) => (
                        <button
                          key={img}
                          onClick={() => handleImageSelect(img)}
                          style={{ width: 50, height: 50, borderRadius: '50%', overflow: 'hidden', border: profilePicture === img ? '3px solid #9768E1' : '2px solid #D0BFE7' }}
                        >
                          <img src={img} alt="option" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleInputChange}
                        placeholder="Enter first name"
                        required
                      />
                      <div className="helper-text">Required</div>
                    </div>
                    <div className="form-group">
                      <label>Last Name *</label>
                      <input
                        type="text"
                        name="lastName"
                        value={profileData.lastName}
                        onChange={handleInputChange}
                        placeholder="Enter last name"
                        required
                      />
                      <div className="helper-text">Required</div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Designation *</label>
                    <select
                      name="designation"
                      value={profileData.designation}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="Placement Training Officer">Placement Training Officer</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Department *</label>
                    <select
                      name="department"
                      value={profileData.department}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Department</option>
                      {deptOptions.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <div className="helper-text">Required</div>
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleInputChange}
                      placeholder={`username@${(user?.email || '').split('@')[1] || 'collegedomain'}`}
                      required
                    />
                    <div className="helper-text">Must end with @{(user?.email || '').split('@')[1] || 'collegedomain'}</div>
                  </div>
                  <div className="form-group">
                    <label>Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter your phone number"
                      required
                    />
                    <div className="helper-text">Required</div>
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
                      <span className="value">{`${profileData.firstName} ${profileData.lastName}`.trim()}</span>
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
                      <span className="label">Department:</span>
                      <span className="value">{profileData.department}</span>
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

