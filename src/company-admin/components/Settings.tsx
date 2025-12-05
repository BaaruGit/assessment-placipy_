import React, { useState, useEffect } from 'react';
import AdminService from '../../services/admin.service';

interface AdminProfile {
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  designation: string;
  department: string;
  employeeId: string;
  joiningDate: string;
  bio: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  profilePicture: string;
}

interface SettingsData {
  logo?: string;
  theme: 'light' | 'dark';
  emailTemplate: string;
  companyName?: string;
  supportEmail?: string;
  maxFileSize?: number;
  allowedFileTypes?: string[];
}

type TabType = 'profile' | 'branding' | 'email-templates';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Profile state
  const [profile, setProfile] = useState<AdminProfile>({
    email: '',
    name: '',
    firstName: '',
    lastName: '',
    phone: '',
    designation: 'Company Administrator',
    department: 'Administration',
    employeeId: '',
    joiningDate: '',
    bio: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    profilePicture: ''
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState<SettingsData>({
    theme: 'light',
    emailTemplate: `Dear Student,

Welcome to Placipy Assessment Platform!

You have been assigned a new assessment: [Assessment Name]
Start Date: [Date]
Duration: [Duration]

Please log in to your dashboard to begin.

Best regards,
Placement Training Team`
  });
  
  const [logoPreview, setLogoPreview] = useState<string>('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load profile and settings in parallel
      const [profileData, settingsData] = await Promise.all([
        AdminService.getAdminProfile(),
        AdminService.getSettings()
      ]);
      
      // Set profile data
      if (profileData) {
        setProfile({
          email: profileData.email || '',
          name: profileData.name || '',
          firstName: profileData.firstName || '',
          lastName: profileData.lastName || '',
          phone: profileData.phone || '',
          designation: profileData.designation || 'Company Administrator',
          department: profileData.department || 'Administration',
          employeeId: profileData.employeeId || '',
          joiningDate: profileData.joiningDate || '',
          bio: profileData.bio || '',
          address: profileData.address || '',
          city: profileData.city || '',
          state: profileData.state || '',
          zipCode: profileData.zipCode || '',
          country: profileData.country || '',
          profilePicture: profileData.profilePicture || ''
        });
      }
      
      // Set settings data
      const safeSettings: SettingsData = {
        theme: settingsData.theme || 'light',
        emailTemplate: settingsData.emailTemplate || settings.emailTemplate,
        companyName: settingsData.companyName || '',
        supportEmail: settingsData.supportEmail || '',
        maxFileSize: settingsData.maxFileSize || 2048,
        allowedFileTypes: settingsData.allowedFileTypes || ['jpg', 'jpeg', 'png']
      };
      
      setSettings(safeSettings);
      setLogoPreview(settingsData.logo || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await AdminService.updateAdminProfile(profile);
      
      setSuccess('Profile updated successfully!');
      setIsEditingProfile(false);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const updatedSettings = {
        ...settings,
        logo: logoPreview
      };
      
      await AdminService.updateSettings(updatedSettings);
      setSettings(updatedSettings);
      setSuccess('Settings saved successfully!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = (field: keyof AdminProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const updateSetting = (key: keyof SettingsData, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="admin-settings-section">
            <div className="admin-profile-header-section">
              <div className="admin-profile-info">
                <div className="admin-profile-avatar">
                  {profile.profilePicture ? (
                    <img src={profile.profilePicture} alt="Profile" />
                  ) : (
                    <div className="admin-profile-avatar-placeholder">
                      {(profile.firstName?.[0] || 'A') + (profile.lastName?.[0] || 'D')}
                    </div>
                  )}
                </div>
                <div className="admin-profile-details">
                  <h3 className="admin-profile-name">{profile.firstName} {profile.lastName}</h3>
                  <p className="admin-profile-role">{profile.designation}</p>
                  <p className="admin-profile-email">{profile.email}</p>
                </div>
              </div>
              <button
                className={isEditingProfile ? 'admin-btn-secondary' : 'admin-btn-primary'}
                onClick={() => setIsEditingProfile(!isEditingProfile)}
              >
                {isEditingProfile ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label>First Name</label>
                <input
                  type="text"
                  className="admin-form-control"
                  value={profile.firstName}
                  onChange={(e) => updateProfile('firstName', e.target.value)}
                  disabled={!isEditingProfile}
                />
              </div>

              <div className="admin-form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  className="admin-form-control"
                  value={profile.lastName}
                  onChange={(e) => updateProfile('lastName', e.target.value)}
                  disabled={!isEditingProfile}
                />
              </div>

              <div className="admin-form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="admin-form-control"
                  value={profile.email}
                  disabled
                  title="Email cannot be changed"
                />
              </div>

              <div className="admin-form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  className="admin-form-control"
                  value={profile.phone}
                  onChange={(e) => updateProfile('phone', e.target.value)}
                  disabled={!isEditingProfile}
                />
              </div>

              <div className="admin-form-group">
                <label>Designation</label>
                <input
                  type="text"
                  className="admin-form-control"
                  value={profile.designation}
                  onChange={(e) => updateProfile('designation', e.target.value)}
                  disabled={!isEditingProfile}
                />
              </div>

              <div className="admin-form-group">
                <label>Department</label>
                <input
                  type="text"
                  className="admin-form-control"
                  value={profile.department}
                  onChange={(e) => updateProfile('department', e.target.value)}
                  disabled={!isEditingProfile}
                />
              </div>

              <div className="admin-form-group">
                <label>Joining Date</label>
                <input
                  type="date"
                  className="admin-form-control"
                  value={profile.joiningDate}
                  onChange={(e) => updateProfile('joiningDate', e.target.value)}
                  disabled={!isEditingProfile}
                />
              </div>

              <div className="admin-form-group admin-form-group-full">
                <label>Bio</label>
                <textarea
                  className="admin-form-control"
                  value={profile.bio}
                  onChange={(e) => updateProfile('bio', e.target.value)}
                  disabled={!isEditingProfile}
                  rows={3}
                />
              </div>
            </div>

            {isEditingProfile && (
              <div className="admin-form-actions">
                <button
                  className="admin-btn-primary"
                  onClick={handleProfileUpdate}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="admin-btn-secondary"
                  onClick={() => {
                    setIsEditingProfile(false);
                    loadAllData(); // Reload original data
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        );

      case 'branding':
        return (
          <div className="admin-settings-grid">
            <div className="admin-settings-card">
              <h3 className="admin-settings-section-title">Logo Upload</h3>
              <div className="admin-logo-upload-section">
                {logoPreview ? (
                  <div className="admin-logo-preview">
                    <img src={logoPreview} alt="Logo preview" />
                    <button
                      className="admin-btn-remove"
                      onClick={() => setLogoPreview('')}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="admin-logo-upload-placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="64" height="64" style={{ color: '#9768E1' }}>
                      <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.161a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                    </svg>
                    <p>No logo uploaded</p>
                  </div>
                )}
                <label className="admin-file-upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                  />
                  <span className="admin-btn-secondary">Choose Logo</span>
                </label>
                <p className="admin-help-text">Recommended: PNG or JPG, max 2MB</p>
              </div>
            </div>

            <div className="admin-settings-card">
              <h3 className="admin-settings-section-title">Color Theme</h3>
              <div className="admin-theme-selector">
                <label className="admin-theme-option">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={settings.theme === 'light'}
                    onChange={(e) => updateSetting('theme', e.target.value as 'light' | 'dark')}
                  />
                  <div className="admin-theme-preview light">
                    <div className="admin-theme-preview-header"></div>
                    <div className="admin-theme-preview-body"></div>
                  </div>
                  <span>Light Theme</span>
                </label>
                <label className="admin-theme-option">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={settings.theme === 'dark'}
                    onChange={(e) => updateSetting('theme', e.target.value as 'light' | 'dark')}
                  />
                  <div className="admin-theme-preview dark">
                    <div className="admin-theme-preview-header"></div>
                    <div className="admin-theme-preview-body"></div>
                  </div>
                  <span>Dark Theme</span>
                </label>
              </div>
            </div>

            <div className="admin-form-actions" style={{ gridColumn: '1 / -1' }}>
              <button
                className="admin-btn-primary"
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Branding Settings'}
              </button>
            </div>
          </div>
        );

      case 'email-templates':
        return (
          <div className="admin-settings-section">
            <div className="admin-settings-card admin-settings-card-full">
              <h3 className="admin-settings-section-title">Email Template Editor</h3>
              <div className="admin-email-template-section">
                <textarea
                  className="admin-email-template-editor"
                  value={settings.emailTemplate}
                  onChange={(e) => updateSetting('emailTemplate', e.target.value)}
                  rows={15}
                  placeholder="Enter email template..."
                />
                <div className="admin-email-template-preview">
                  <h4>Preview</h4>
                  <div className="admin-email-preview-content">
                    {(settings.emailTemplate || '').split('\n').map((line: string, index: number) => (
                      <p key={index}>{line || '\u00A0'}</p>
                    ))}
                  </div>
                </div>
              </div>
              <p className="admin-help-text">
                Use placeholders: [Assessment Name], [Date], [Duration], [Student Name]
              </p>
            </div>

            <div className="admin-form-actions">
              <button
                className="admin-btn-primary"
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Email Template'}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <h2 className="admin-page-title">Settings</h2>
      </div>

      {error && (
        <div className="admin-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className="admin-success">
          <p>{success}</p>
          <button onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      {loading ? (
        <div className="admin-loading">
          <div className="spinner"></div>
          <p>Loading settings...</p>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              Profile Management
            </button>
            <button
              className={`admin-tab ${activeTab === 'branding' ? 'active' : ''}`}
              onClick={() => setActiveTab('branding')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
              </svg>
              Branding
            </button>
            <button
              className={`admin-tab ${activeTab === 'email-templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('email-templates')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              Email Templates
            </button>
          </div>

          {/* Tab Content */}
          <div className="admin-tab-content">
            {renderTabContent()}
          </div>
        </>
      )}
    </div>
  );
};

export default Settings;

