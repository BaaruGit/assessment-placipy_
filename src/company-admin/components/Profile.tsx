import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AdminProfile, SecuritySettings, AdminPreferences } from '../../services/profile.service';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'preferences'>('personal');
  const [isEditing, setIsEditing] = useState<{[key: string]: boolean}>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showImageSelector, setShowImageSelector] = useState(false);

  // Static profile images
  const profileImages = [
    'https://images.unsplash.com/photo-1494790108755-2616b612b977?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
  ];

  // Profile State
  const [profile, setProfile] = useState<AdminProfile>({
    id: 'admin_001',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@placipy.com',
    phone: '+1 (555) 123-4567',
    designation: 'Company Administrator',
    department: 'Administration',
    employeeId: 'EMP001',
    joiningDate: '2020-01-15',
    bio: 'Experienced administrator overseeing placement training operations across multiple educational institutions.',
    address: '123 Corporate Drive',
    city: 'Tech Valley',
    state: 'California',
    zipCode: '94000',
    country: 'United States',
    profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b612b977?w=150&h=150&fit=crop&crop=face'
  });

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: true,
    emailNotifications: true,
    smsNotifications: false
  });

  // Password Change Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Preferences State
  const [preferences, setPreferences] = useState<AdminPreferences>({
    theme: 'light',
    language: 'English',
    timezone: 'America/Los_Angeles',
    dateFormat: 'MM/DD/YYYY',
    emailDigest: 'daily',
    notificationSound: true,
    autoLogout: 60
  });

  const handleProfileChange = (field: keyof AdminProfile, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSecurityChange = (field: keyof SecuritySettings, value: any) => {
    setSecuritySettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePreferencesChange = (field: keyof AdminPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleEdit = (section: string) => {
    setIsEditing(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setErrorMessage('');
    
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage('Profile updated successfully!');
      setIsEditing({});
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      // API call would go here - replace with actual ProfileService call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage('Password changed successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('Failed to change password. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    setErrorMessage('');
    
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage('Preferences saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageSelect = (imageUrl: string) => {
    setProfile(prev => ({
      ...prev,
      profilePicture: imageUrl
    }));
    setShowImageSelector(false);
    setSuccessMessage('Profile picture updated successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div className="admin-profile-header-left">
          <button 
            className="admin-back-button"
            onClick={() => navigate('/company-admin')}
            title="Back to Dashboard"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            Back to Dashboard
          </button>
          <h2 className="admin-page-title">Profile Management</h2>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="admin-success-message">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="admin-error-message">
          {errorMessage}
        </div>
      )}

      {/* Profile Tabs */}
      <div className="admin-profile-tabs">
        <button
          className={`admin-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          Personal Information
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
          Security Settings
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
          Preferences
        </button>
      </div>

      {/* Tab Content */}
      <div className="admin-profile-content">
        {/* Personal Information Tab */}
        {activeTab === 'personal' && (
          <div className="admin-profile-section">
            {/* Profile Picture & Basic Info */}
            <div className="admin-profile-header">
              <div className="admin-profile-picture">
                <img 
                  src={profile.profilePicture || profileImages[0]} 
                  alt="Profile" 
                />
                {isEditing.personal && (
                  <button 
                    className="admin-profile-picture-edit"
                    onClick={() => setShowImageSelector(!showImageSelector)}
                    title="Change Profile Picture"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 2l-1 1v2h2V3h8v8h-2v2h2l1-1V2l-1-1H9zM3 6l-1 1v10l1 1h10l1-1v-2h-2v2H3V6h2V4H3z"/>
                    </svg>
                  </button>
                )}
                {showImageSelector && (
                  <div className="admin-image-selector">
                    <p>Choose a profile picture:</p>
                    <div className="admin-image-options">
                      {profileImages.map((imageUrl, index) => (
                        <button
                          key={index}
                          className={`admin-image-option ${profile.profilePicture === imageUrl ? 'selected' : ''}`}
                          onClick={() => handleImageSelect(imageUrl)}
                        >
                          <img src={imageUrl} alt={`Option ${index + 1}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="admin-profile-basic">
                <h3>{profile.firstName} {profile.lastName}</h3>
                <p>{profile.designation} • {profile.department}</p>
                <p>Employee ID: {profile.employeeId}</p>
              </div>
              <button
                className="admin-btn-edit"
                onClick={() => toggleEdit('personal')}
              >
                {isEditing.personal ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            {/* Personal Details Form */}
            <div className="admin-profile-form">
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => handleProfileChange('firstName', e.target.value)}
                    disabled={!isEditing.personal}
                    className="admin-form-control"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => handleProfileChange('lastName', e.target.value)}
                    disabled={!isEditing.personal}
                    className="admin-form-control"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    disabled={!isEditing.personal}
                    className="admin-form-control"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    disabled={!isEditing.personal}
                    className="admin-form-control"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Designation</label>
                  <input
                    type="text"
                    value={profile.designation}
                    onChange={(e) => handleProfileChange('designation', e.target.value)}
                    disabled={!isEditing.personal}
                    className="admin-form-control"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={profile.department}
                    onChange={(e) => handleProfileChange('department', e.target.value)}
                    disabled={!isEditing.personal}
                    className="admin-form-control"
                  />
                </div>
                <div className="admin-form-group admin-form-group-full">
                  <label>Address</label>
                  <input
                    type="text"
                    value={profile.address}
                    onChange={(e) => handleProfileChange('address', e.target.value)}
                    disabled={!isEditing.personal}
                    className="admin-form-control"
                  />
                </div>
                <div className="admin-form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => handleProfileChange('city', e.target.value)}
                    disabled={!isEditing.personal}
                    className="admin-form-control"
                  />
                </div>
                <div className="admin-form-group">
                  <label>State</label>
                  <input
                    type="text"
                    value={profile.state}
                    onChange={(e) => handleProfileChange('state', e.target.value)}
                    disabled={!isEditing.personal}
                    className="admin-form-control"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Zip Code</label>
                  <input
                    type="text"
                    value={profile.zipCode}
                    onChange={(e) => handleProfileChange('zipCode', e.target.value)}
                    disabled={!isEditing.personal}
                    className="admin-form-control"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    value={profile.country}
                    onChange={(e) => handleProfileChange('country', e.target.value)}
                    disabled={!isEditing.personal}
                    className="admin-form-control"
                  />
                </div>
                <div className="admin-form-group admin-form-group-full">
                  <label>Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                    disabled={!isEditing.personal}
                    className="admin-form-control admin-textarea"
                    rows={4}
                  />
                </div>
              </div>

              {isEditing.personal && (
                <div className="admin-form-actions">
                  <button
                    className="admin-btn-primary"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    className="admin-btn-secondary"
                    onClick={() => toggleEdit('personal')}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Settings Tab */}
        {activeTab === 'security' && (
          <div className="admin-profile-section">
            <h3>Security Settings</h3>
            
            {/* Change Password */}
            <div className="admin-security-card">
              <h4>Change Password</h4>
              <div className="admin-form-grid">
                <div className="admin-form-group admin-form-group-full">
                  <label>Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                    className="admin-form-control"
                    placeholder="Enter current password"
                  />
                </div>
                <div className="admin-form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                    className="admin-form-control"
                    placeholder="Enter new password"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                    className="admin-form-control"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <button
                className="admin-btn-primary"
                onClick={handleChangePassword}
                disabled={isSaving}
              >
                {isSaving ? 'Changing...' : 'Change Password'}
              </button>
            </div>

            {/* Two Factor Authentication */}
            <div className="admin-security-card">
              <h4>Two-Factor Authentication</h4>
              <div className="admin-security-option">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={securitySettings.twoFactorEnabled}
                    onChange={(e) => handleSecurityChange('twoFactorEnabled', e.target.checked)}
                  />
                  <span className="admin-checkbox-custom"></span>
                  Enable Two-Factor Authentication
                </label>
                <p className="admin-help-text">
                  Add an extra layer of security to your account with two-factor authentication.
                </p>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="admin-security-card">
              <h4>Notification Settings</h4>
              <div className="admin-security-option">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={securitySettings.emailNotifications}
                    onChange={(e) => handleSecurityChange('emailNotifications', e.target.checked)}
                  />
                  <span className="admin-checkbox-custom"></span>
                  Email Notifications
                </label>
              </div>
              <div className="admin-security-option">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={securitySettings.smsNotifications}
                    onChange={(e) => handleSecurityChange('smsNotifications', e.target.checked)}
                  />
                  <span className="admin-checkbox-custom"></span>
                  SMS Notifications
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="admin-profile-section">
            <h3>Preferences</h3>
            
            {/* Appearance */}
            <div className="admin-preferences-card">
              <h4>Appearance</h4>
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>Theme</label>
                  <select
                    value={preferences.theme}
                    onChange={(e) => handlePreferencesChange('theme', e.target.value as 'light' | 'dark')}
                    className="admin-form-control"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Language</label>
                  <select
                    value={preferences.language}
                    onChange={(e) => handlePreferencesChange('language', e.target.value)}
                    className="admin-form-control"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Regional Settings */}
            <div className="admin-preferences-card">
              <h4>Regional Settings</h4>
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>Timezone</label>
                  <select
                    value={preferences.timezone}
                    onChange={(e) => handlePreferencesChange('timezone', e.target.value)}
                    className="admin-form-control"
                  >
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="Europe/London">London Time</option>
                    <option value="Asia/Kolkata">India Standard Time</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Date Format</label>
                  <select
                    value={preferences.dateFormat}
                    onChange={(e) => handlePreferencesChange('dateFormat', e.target.value)}
                    className="admin-form-control"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="DD-MMM-YYYY">DD-MMM-YYYY</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="admin-preferences-card">
              <h4>Notification Preferences</h4>
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>Email Digest</label>
                  <select
                    value={preferences.emailDigest}
                    onChange={(e) => handlePreferencesChange('emailDigest', e.target.value)}
                    className="admin-form-control"
                  >
                    <option value="disabled">Disabled</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Auto Logout (minutes)</label>
                  <select
                    value={preferences.autoLogout}
                    onChange={(e) => handlePreferencesChange('autoLogout', parseInt(e.target.value))}
                    className="admin-form-control"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={240}>4 hours</option>
                  </select>
                </div>
              </div>
              <div className="admin-security-option">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={preferences.notificationSound}
                    onChange={(e) => handlePreferencesChange('notificationSound', e.target.checked)}
                  />
                  <span className="admin-checkbox-custom"></span>
                  Enable Notification Sounds
                </label>
              </div>
            </div>

            <div className="admin-form-actions">
              <button
                className="admin-btn-primary"
                onClick={handleSavePreferences}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
