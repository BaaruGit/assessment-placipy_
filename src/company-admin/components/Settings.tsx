import React, { useState, useEffect } from 'react';
import AdminService from '../../services/admin.service';

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
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const settingsData = await AdminService.getSettings();
      
      // Ensure all required fields have defaults
      const safeSettings: SettingsData = {
        theme: settingsData.theme || 'light',
        emailTemplate: settingsData.emailTemplate || `Dear Student,

Welcome to Placipy Assessment Platform!

You have been assigned a new assessment: [Assessment Name]
Start Date: [Date]
Duration: [Duration]

Please log in to your dashboard to begin.

Best regards,
Placement Training Team`,
        companyName: settingsData.companyName || '',
        supportEmail: settingsData.supportEmail || '',
        maxFileSize: settingsData.maxFileSize || 2048,
        allowedFileTypes: settingsData.allowedFileTypes || ['jpg', 'jpeg', 'png']
      };
      
      setSettings(safeSettings);
      setLogoPreview(settingsData.logo || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
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
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof SettingsData, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <h2 className="admin-page-title">Settings</h2>
        <button 
          className="admin-btn-primary" 
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
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

      <div className="admin-settings-grid">
        {/* Logo Upload */}
        <div className="admin-settings-card">
          <h3 className="admin-settings-section-title">Logo Upload</h3>
          <div className="admin-logo-upload-section">
            {logoPreview ? (
              <div className="admin-logo-preview">
                <img src={logoPreview} alt="Logo preview" />
                <button
                  className="admin-btn-remove"
                  onClick={() => {
                    setLogoPreview('');
                  }}
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

        {/* Theme Selection */}
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

        {/* Email Template */}
        <div className="admin-settings-card admin-settings-card-full">
          <h3 className="admin-settings-section-title">Email Template Preview</h3>
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
        </div>
      </div>
      )}
    </div>
  );
};

export default Settings;

