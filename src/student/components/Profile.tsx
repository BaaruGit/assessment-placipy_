﻿﻿import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { User, Lock, BarChart3, Calendar } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { useLocation } from 'react-router-dom';

interface StudentInfo {
  name: string;
  email: string;
  phone: string;
  regNo: string;
  collegeName: string;
  department: string;
  year: string;
  section: string;
  enrollmentDate: string;
}

interface SecuritySettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  twoFactorEnabled: boolean;
  emailNotifications: boolean;
}

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'activity'>('personal');
  const [isEditing, setIsEditing] = useState<{ personal: boolean; security: boolean }>({ personal: false, security: false });
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const { user, loading, refreshUser } = useUser();

  const [studentInfo, setStudentInfo] = useState<StudentInfo>({
    name: '',
    email: '',
    phone: '',
    regNo: '',
    collegeName: '',
    department: '',
    year: '',
    section: '',
    enrollmentDate: new Date().toISOString().split('T')[0]
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
    emailNotifications: true
  });

  const [activityLog] = useState([
    { id: 1, action: 'Logged in to account', timestamp: 'Today at 2:30 PM' },
    { id: 2, action: 'Updated profile information', timestamp: 'Yesterday at 10:15 AM' },
    { id: 3, action: 'Changed password', timestamp: '5 days ago' },
    { id: 4, action: 'Downloaded assessment results', timestamp: '1 week ago' },
  ]);

  const location = useLocation();

  // helper to safely read arbitrary attributes from the `user` object
  const getUserAttr = useCallback(<T,>(key: string): T | undefined => {
    return (user as unknown as Record<string, unknown>)?.[key] as T | undefined;
  }, [user]);

  const fetchStudentProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setErrorMessage('Authentication required');
        setLoadingProfile(false);
        return;
      }

      const response = await axios.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.profile) {
        const profile = response.data.profile;
        setStudentInfo({
          name: profile.name || profile.firstName || user?.name || '',
          email: profile.email || user?.email || '',
          phone: profile.phone || '',
          regNo: profile.regNo || profile.registrationNumber || '',
          collegeName: profile.collegeName || profile.college || '',
          department: profile.department || '',
          year: profile.year || profile.yearOfStudy || '',
          section: profile.section || '',
          enrollmentDate: profile.enrollmentDate || new Date().toISOString().split('T')[0]
        });
        setErrorMessage('');
      } else {
        setStudentInfo(prev => ({
          ...prev,
          name: user?.name || prev.name,
          email: user?.email || prev.email,
          phone: getUserAttr<string>('phone') || prev.phone,
          regNo: getUserAttr<string>('regNo') || prev.regNo,
          collegeName: getUserAttr<string>('collegeName') || prev.collegeName,
          department: user?.department || prev.department,
          year: user?.year || prev.year,
          section: getUserAttr<string>('section') || prev.section,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch student profile:', error);
      if (user) {
        setStudentInfo(prev => ({
          ...prev,
          name: user.name || prev.name,
          email: user.email || prev.email,
          phone: getUserAttr<string>('phone') || prev.phone,
          regNo: getUserAttr<string>('regNo') || prev.regNo,
          collegeName: getUserAttr<string>('collegeName') || prev.collegeName,
          department: user.department || prev.department,
          year: user.year || prev.year,
          section: getUserAttr<string>('section') || prev.section,
        }));
      }
    } finally {
      setLoadingProfile(false);
    }
  }, [user, getUserAttr]);

  

  // Fetch when the route becomes the profile page (so navigating to profile loads data)
  useEffect(() => {
    const path = location.pathname || '';
    if (path.includes('/student/profile') || path.endsWith('/profile')) {
      fetchStudentProfile();
    }
  }, [location.pathname, fetchStudentProfile]);

  const handleInfoChange = (field: keyof StudentInfo, value: string) => {
    setStudentInfo(prev => ({ ...prev, [field]: value }));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSecurityChange = (field: keyof SecuritySettings, value: any) => {
    setSecuritySettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleEdit = (section: 'personal' | 'security') => {
    setIsEditing(prev => ({ ...prev, [section]: !prev[section] }));
    setErrorMessage('');
  };

  const saveChanges = async (section: 'personal' | 'security') => {
    if (section === 'personal') {
      if (!studentInfo.name.trim() || !studentInfo.email.trim()) {
        setErrorMessage('Name and Email are required');
        return;
      }
    } else if (section === 'security') {
      if (securitySettings.newPassword && securitySettings.newPassword.length < 6) {
        setErrorMessage('New password must be at least 6 characters');
        return;
      }
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setErrorMessage('Authentication required');
        console.log('[profile] saveChanges aborted: no access token');
        return;
      }

      const payload = {
        name: studentInfo.name,
        regNo: studentInfo.regNo,
        collegeName: studentInfo.collegeName,
        department: studentInfo.department,
        phone: studentInfo.phone,
        year: studentInfo.year,
        section: studentInfo.section,
      };

      // Debug logs for request
      console.log('[profile] PUT /api/users/profile payload:', payload);
      console.log('[profile] Authorization present:', !!token);

      const response = await axios.put('/api/users/profile', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[profile] update response:', response && response.data ? response.data : response);

      // Consider success when backend signals success or returns profile
      const ok = response && response.data && (response.data.success === true || !!response.data.profile);
      if (ok) {
        // Update local state immediately with the updated values
        setStudentInfo(prev => ({
          ...prev,
          name: payload.name,
          regNo: payload.regNo,
          collegeName: payload.collegeName,
          department: payload.department,
          phone: payload.phone,
          year: payload.year,
          section: payload.section,
        }));

        // Refresh the cached user profile in context so UI shows DB-updated values
        try {
          if (typeof refreshUser === 'function') {
            await refreshUser();
            console.log('[profile] refreshUser() completed');
          }
        } catch (refreshErr) {
          console.warn('[profile] refreshUser failed', refreshErr);
        }

        // Notify user and update UI
        console.log('[profile] Profile update successful for', payload.regNo || payload.name || '(unknown)');
        setSuccessMessage(response.data.message || 'Profile updated successfully!');
        setIsEditing(prev => ({ ...prev, [section]: false }));
        setErrorMessage('');

        if (section === 'security') {
          setSecuritySettings(prev => ({
            ...prev,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          }));
        }
      } else {
        // Backend didn't confirm persistence
        console.warn('[profile] Profile update did not return success:', response?.data);
        alert('Profile update submitted but server did not confirm persistence. Check console for details.');
        setErrorMessage(response?.data?.message || 'Update not confirmed by server');
      }

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = (section: 'personal' | 'security') => {
    setIsEditing(prev => ({ ...prev, [section]: false }));
    setErrorMessage('');

    if (section === 'security') {
      setSecuritySettings(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    }
  };

  const renderPersonalTab = () => (
    <div className="pts-fade-in">
      <div className="pts-form-container">
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#9768E1', border: '3px solid #9768E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '40px' }}>
              {studentInfo.name?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div>
              <h3 style={{ margin: '0 0 8px 0', color: '#523C48', fontSize: '1.5rem' }}>{studentInfo.name || 'Student Name'}</h3>
              <p style={{ margin: '0', color: '#A4878D', fontSize: '0.95rem' }}>{studentInfo.email}</p>
            </div>
          </div>

          {!isEditing.personal ? (
            <div>
              <div className="pts-form-grid">
                <div>
                  <label className="pts-form-label">Full Name</label>
                  <div className="pts-form-display">{studentInfo.name}</div>
                </div>
                <div>
                  <label className="pts-form-label">Email</label>
                  <div className="pts-form-display">{studentInfo.email}</div>
                </div>
                <div>
                  <label className="pts-form-label">Phone</label>
                  <div className="pts-form-display">{studentInfo.phone || 'N/A'}</div>
                </div>
                <div>
                  <label className="pts-form-label">Registration Number</label>
                  <div className="pts-form-display">{studentInfo.regNo || 'N/A'}</div>
                </div>
                <div>
                  <label className="pts-form-label">College Name</label>
                  <div className="pts-form-display">{studentInfo.collegeName || 'N/A'}</div>
                </div>
                <div>
                  <label className="pts-form-label">Department</label>
                  <div className="pts-form-display">{studentInfo.department || 'N/A'}</div>
                </div>
                <div>
                  <label className="pts-form-label">Year</label>
                  <div className="pts-form-display">{studentInfo.year || 'N/A'}</div>
                </div>
                <div>
                  <label className="pts-form-label">Section</label>
                  <div className="pts-form-display">{studentInfo.section || 'N/A'}</div>
                </div>
                <div>
                  <label className="pts-form-label">Enrollment Date</label>
                  <div className="pts-form-display">{studentInfo.enrollmentDate}</div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="pts-form-grid">
                <div>
                  <label className="pts-form-label">Full Name *</label>
                  <input
                    type="text"
                    value={studentInfo.name}
                    onChange={(e) => handleInfoChange('name', e.target.value)}
                    className="pts-form-input"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <label className="pts-form-label">Email (Read-only)</label>
                  <input
                    type="email"
                    value={studentInfo.email}
                    className="pts-form-input"
                    disabled
                    readOnly
                  />
                </div>
                <div>
                  <label className="pts-form-label">Phone</label>
                  <input
                    type="tel"
                    value={studentInfo.phone}
                    onChange={(e) => handleInfoChange('phone', e.target.value)}
                    className="pts-form-input"
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <label className="pts-form-label">Registration Number</label>
                  <input
                    type="text"
                    value={studentInfo.regNo}
                    onChange={(e) => handleInfoChange('regNo', e.target.value)}
                    className="pts-form-input"
                    placeholder="Enter your registration number"
                  />
                </div>
                <div>
                  <label className="pts-form-label">College Name</label>
                  <input
                    type="text"
                    value={studentInfo.collegeName}
                    onChange={(e) => handleInfoChange('collegeName', e.target.value)}
                    className="pts-form-input"
                    placeholder="Enter your college name"
                  />
                </div>
                <div>
                  <label className="pts-form-label">Department</label>
                  <input
                    type="text"
                    value={studentInfo.department}
                    onChange={(e) => handleInfoChange('department', e.target.value)}
                    className="pts-form-input"
                    placeholder="Enter your department"
                  />
                </div>
                <div>
                  <label className="pts-form-label">Year</label>
                  <input
                    type="text"
                    value={studentInfo.year}
                    onChange={(e) => handleInfoChange('year', e.target.value)}
                    className="pts-form-input"
                    placeholder="Enter your year"
                  />
                </div>
                <div>
                  <label className="pts-form-label">Section</label>
                  <input
                    type="text"
                    value={studentInfo.section}
                    onChange={(e) => handleInfoChange('section', e.target.value)}
                    className="pts-form-input"
                    placeholder="Enter your section"
                  />
                </div>
                <div>
                  <label className="pts-form-label">Enrollment Date</label>
                  <input
                    type="date"
                    value={studentInfo.enrollmentDate}
                    onChange={(e) => handleInfoChange('enrollmentDate', e.target.value)}
                    className="pts-form-input"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => saveChanges('personal')}
                  className="pts-btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => cancelEdit('personal')}
                  className="pts-btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="pts-fade-in">
      <div className="pts-form-container">
        <h3 className="pts-form-title">Password & Security</h3>

        {!isEditing.security ? (
          <div>
            <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '25px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#523C48', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} /> Security Settings
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e9ecef' }}>
                  <span style={{ color: '#523C48' }}>Two-Factor Authentication</span>
                  <span style={{ color: securitySettings.twoFactorEnabled ? '#27ae60' : '#e74c3c' }}>
                    {securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e9ecef' }}>
                  <span style={{ color: '#523C48' }}>Email Notifications</span>
                  <span style={{ color: securitySettings.emailNotifications ? '#27ae60' : '#e74c3c' }}>
                    {securitySettings.emailNotifications ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => toggleEdit('security')}
              className="pts-btn-primary"
            >
              Change Security Settings
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '25px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#523C48' }}>Change Password</h4>
              <div className="pts-form-grid">
                <div>
                  <label className="pts-form-label">Current Password</label>
                  <input
                    type="password"
                    value={securitySettings.currentPassword}
                    onChange={(e) => handleSecurityChange('currentPassword', e.target.value)}
                    className="pts-form-input"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="pts-form-label">New Password</label>
                  <input
                    type="password"
                    value={securitySettings.newPassword}
                    onChange={(e) => handleSecurityChange('newPassword', e.target.value)}
                    className="pts-form-input"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="pts-form-label">Confirm Password</label>
                  <input
                    type="password"
                    value={securitySettings.confirmPassword}
                    onChange={(e) => handleSecurityChange('confirmPassword', e.target.value)}
                    className="pts-form-input"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>

            <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '25px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#523C48' }}>Security Settings</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={securitySettings.twoFactorEnabled}
                    onChange={(e) => handleSecurityChange('twoFactorEnabled', e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ color: '#523C48' }}>Enable Two-Factor Authentication</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={securitySettings.emailNotifications}
                    onChange={(e) => handleSecurityChange('emailNotifications', e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ color: '#523C48' }}>Email Security Notifications</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => saveChanges('security')}
                className="pts-btn-primary"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Security Settings'}
              </button>
              <button
                type="button"
                onClick={() => cancelEdit('security')}
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

  const renderActivityTab = () => (
    <div className="pts-fade-in">
      <div className="pts-form-container">
        <h3 className="pts-form-title">Account Activity</h3>
        <p style={{ color: '#A4878D', marginBottom: '25px' }}>Recent activities on your account</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {activityLog.map((activity) => (
            <div key={activity.id} style={{ padding: '20px', border: '1px solid #e9ecef', borderRadius: '8px', background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#523C48' }}>{activity.action}</h4>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: '#A4878D', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={14} /> {activity.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading || loadingProfile) return <div>Loading...</div>;

  return (
    <div className="profile-page">
      <h2>Student Profile</h2>
      
      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          Personal Information
        </button>
        <button 
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security Settings
        </button>
        <button 
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity Log
        </button>
      </div>

      {successMessage && <div className="pts-success">{successMessage}</div>}
      {errorMessage && <div className="pts-error">{errorMessage}</div>}

      <div className="pts-form-container">
        <div style={{ display: 'flex', gap: '10px', marginBottom: '0', flexWrap: 'wrap' }}>
          {([
            { key: 'personal' as const, label: 'Personal Info', icon: <User size={16} /> },
            { key: 'security' as const, label: 'Security', icon: <Lock size={16} /> },
            { key: 'activity' as const, label: 'Activity Log', icon: <BarChart3 size={16} /> },
          ] as const).map(tab => (
            <button
              key={tab.key}
              className={activeTab === tab.key ? 'pts-btn-primary' : 'pts-btn-secondary'}
              onClick={() => {
                setActiveTab(tab.key);
                setErrorMessage('');
                if (tab.key !== 'activity' && isEditing[tab.key]) { cancelEdit(tab.key); }
              }}
              style={{ marginBottom: '10px' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {tab.icon} {tab.label}
              </span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: '20px' }}>
          {activeTab === 'personal' && renderPersonalTab()}
          {activeTab === 'security' && renderSecurityTab()}
          {activeTab === 'activity' && renderActivityTab()}
        </div>
      </div>
    </div>
  );
};

export default Profile;
