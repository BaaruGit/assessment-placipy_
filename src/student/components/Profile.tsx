﻿import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { User } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { useLocation } from 'react-router-dom';

interface StudentInfo {
  name: string;
  email: string;
  phone: string;
  regNo: string;
  rollNumber: string;
  department: string;
  enrollmentDate: string;
}



const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'personal'>('personal');
  const [isEditing, setIsEditing] = useState<{ personal: boolean }>({ personal: false });
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
    rollNumber: '',
    department: '',
    enrollmentDate: new Date().toISOString().split('T')[0]
  });




  const location = useLocation();

  // helper to safely read arbitrary attributes from the `user` object
  const getUserAttr = useCallback(<T,>(key: string): T | undefined => {
    return (user as unknown as Record<string, unknown>)?.[key] as T | undefined;
  }, [user]);

  const normalizeProfileData = useCallback((rawProfile: Record<string, unknown> | undefined) => {
    if (!rawProfile) return null;
    return {
      name: (rawProfile.name as string) || (rawProfile.firstName as string) || user?.name || '',
      email: (rawProfile.email as string) || user?.email || '',
      phone: (rawProfile.phone as string) || (rawProfile.mobile as string) || '',
      regNo: (rawProfile.regNo as string) || (rawProfile.registrationNumber as string) || '',
      rollNumber: (rawProfile.rollNumber as string) || '',
      department: (rawProfile.department as string) || '',
      enrollmentDate: (rawProfile.enrollmentDate as string) ||
        (rawProfile.joiningDate as string) ||
        new Date().toISOString().split('T')[0]
    };
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

      if (response.data) {
        const profileData = normalizeProfileData(response.data.profile || response.data.user);
        if (profileData) {
          setStudentInfo(profileData);
          setErrorMessage('');
          return;
        }
      }

      // fallback to context/user-derived values
      setStudentInfo(prev => ({
        ...prev,
        name: user?.name || prev.name,
        email: user?.email || prev.email,
        phone: getUserAttr<string>('phone') || prev.phone,
        regNo: getUserAttr<string>('regNo') || prev.regNo,
        rollNumber: getUserAttr<string>('rollNumber') || prev.rollNumber,
        department: user?.department || prev.department,
      }));
    } catch (error) {
      console.error('Failed to fetch student profile:', error);
      if (user) {
        setStudentInfo(prev => ({
          ...prev,
          name: user.name || prev.name,
          email: user.email || prev.email,
          phone: getUserAttr<string>('phone') || prev.phone,
          regNo: getUserAttr<string>('regNo') || getUserAttr<string>('rollNumber') || prev.regNo,
          department: user.department || prev.department,
        }));
      }
    } finally {
      setLoadingProfile(false);
    }
  }, [user, getUserAttr, normalizeProfileData]);

  

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



  const toggleEdit = (section: 'personal') => {
    setIsEditing(prev => ({ ...prev, [section]: !prev[section] }));
    setErrorMessage('');
  };

  const saveChanges = async (section: 'personal') => {
    if (section === 'personal') {
      if (!studentInfo.name.trim() || !studentInfo.email.trim()) {
        setErrorMessage('Name and Email are required');
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
        rollNumber: studentInfo.rollNumber,
        department: studentInfo.department,
        phone: studentInfo.phone,
      };

      // Debug logs for request
      console.log('[profile] PUT /api/users/profile payload:', payload);
      console.log('[profile] Authorization present:', !!token);

      const response = await axios.put('/api/users/profile', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[profile] update response:', response && response.data ? response.data : response);

      // Consider success when backend signals success or returns profile
      const updatedProfile = response?.data?.profile || response?.data?.user;
      const ok = response && response.data && (response.data.success === true || !!updatedProfile);
      if (ok) {
        // Update local state immediately with the updated values
        if (updatedProfile) {
          const normalized = normalizeProfileData(updatedProfile);
          if (normalized) {
            setStudentInfo(normalized);
          }
        } else {
          setStudentInfo(prev => ({
            ...prev,
            name: payload.name,
            regNo: payload.regNo,
            rollNumber: payload.rollNumber,
            department: payload.department,
            phone: payload.phone,
          }));
        }

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

  const cancelEdit = (section: 'personal') => {
    setIsEditing(prev => ({ ...prev, [section]: false }));
    setErrorMessage('');
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
                  <label className="pts-form-label">Roll Number</label>
                  <div className="pts-form-display">{studentInfo.rollNumber || 'N/A'}</div>
                </div>
                <div>
                  <label className="pts-form-label">Department</label>
                  <div className="pts-form-display">{studentInfo.department || 'N/A'}</div>
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
                  <label className="pts-form-label">Roll Number</label>
                  <input
                    type="text"
                    value={studentInfo.rollNumber}
                    onChange={(e) => handleInfoChange('rollNumber', e.target.value)}
                    className="pts-form-input"
                    placeholder="Enter your roll number"
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





  if (loading || loadingProfile) return <div>Loading...</div>;

  return (
    <div className="profile-page">
      <h2>Student Profile</h2>

      {successMessage && <div className="pts-success">{successMessage}</div>}
      {errorMessage && <div className="pts-error">{errorMessage}</div>}

      <div className="pts-form-container">
        <div style={{ display: 'flex', gap: '10px', marginBottom: '0', flexWrap: 'wrap' }}>
          {([
            { key: 'personal' as const, label: 'Personal Info', icon: <User size={16} /> },
          ] as const).map(tab => (
            <button
              key={tab.key}
              className={activeTab === tab.key ? 'pts-btn-primary' : 'pts-btn-secondary'}
              onClick={() => {
                setActiveTab(tab.key);
                setErrorMessage('');
                if (isEditing[tab.key]) { cancelEdit(tab.key); }
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
        </div>
      </div>
    </div>
  );
};

export default Profile;