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

const Settings: React.FC = () => {
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
    return (
      <div className="pts-fade-in">
        <div className="pts-form-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#9768E1', border: '3px solid #9768E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '40px' }}>
              {profile.firstName?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div>
              <h3 style={{ margin: '0 0 8px 0', color: '#523C48', fontSize: '1.5rem' }}>{profile.firstName} {profile.lastName}</h3>
              <p style={{ margin: '0', color: '#A4878D', fontSize: '0.95rem' }}>{profile.email}</p>
            </div>
          </div>

          {!isEditingProfile ? (
            <div>
              <div className="pts-form-grid">
                <div>
                  <label className="pts-form-label">Full Name</label>
                  <div className="pts-form-display">{profile.firstName} {profile.lastName}</div>
                </div>
                <div>
                  <label className="pts-form-label">Email</label>
                  <div className="pts-form-display">{profile.email}</div>
                </div>
                <div>
                  <label className="pts-form-label">Phone</label>
                  <div className="pts-form-display">{profile.phone || 'N/A'}</div>
                </div>
                <div>
                  <label className="pts-form-label">Designation</label>
                  <div className="pts-form-display">{profile.designation}</div>
                </div>
                <div>
                  <label className="pts-form-label">Department</label>
                  <div className="pts-form-display">{profile.department}</div>
                </div>
                <div>
                  <label className="pts-form-label">Joining Date</label>
                  <div className="pts-form-display">{profile.joiningDate}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="pts-form-label">Bio</label>
                  <div className="pts-form-display">{profile.bio || 'N/A'}</div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="pts-form-grid">
                <div>
                  <label className="pts-form-label">First Name *</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => updateProfile('firstName', e.target.value)}
                    className="pts-form-input"
                    placeholder="Enter your first name"
                    required
                  />
                </div>
                <div>
                  <label className="pts-form-label">Last Name *</label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => updateProfile('lastName', e.target.value)}
                    className="pts-form-input"
                    placeholder="Enter your last name"
                    required
                  />
                </div>
                <div>
                  <label className="pts-form-label">Email (Read-only)</label>
                  <input
                    type="email"
                    value={profile.email}
                    className="pts-form-input"
                    disabled
                    readOnly
                  />
                </div>
                <div>
                  <label className="pts-form-label">Phone</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => updateProfile('phone', e.target.value)}
                    className="pts-form-input"
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <label className="pts-form-label">Designation</label>
                  <input
                    type="text"
                    value={profile.designation}
                    onChange={(e) => updateProfile('designation', e.target.value)}
                    className="pts-form-input"
                    placeholder="Enter your designation"
                  />
                </div>
                <div>
                  <label className="pts-form-label">Department</label>
                  <input
                    type="text"
                    value={profile.department}
                    onChange={(e) => updateProfile('department', e.target.value)}
                    className="pts-form-input"
                    placeholder="Enter your department"
                  />
                </div>
                <div>
                  <label className="pts-form-label">Joining Date</label>
                  <input
                    type="date"
                    value={profile.joiningDate}
                    onChange={(e) => updateProfile('joiningDate', e.target.value)}
                    className="pts-form-input"
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="pts-form-label">Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => updateProfile('bio', e.target.value)}
                    className="pts-form-textarea"
                    placeholder="Tell us about yourself"
                    rows={4}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={handleProfileUpdate}
                  className="pts-btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    loadAllData(); // Reload original data
                  }}
                  className="pts-btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="ad-profile-page">
      <div className="ad-page-header">
        
      </div>

      {error && (
        <div className="ad-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className="ad-success">
          <p>{success}</p>
          <button onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      {loading ? (
        <div className="ad-loading">
          <div className="spinner"></div>
          <p>Loading settings...</p>
        </div>
      ) : (
        <div className="ad-tab-content">
          {renderTabContent()}
        </div>
      )}
    </div>
  );
};

export default Settings;

