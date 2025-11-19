import React, { useState, useEffect } from "react";
import { User, Lock, Settings, BarChart3, Calendar, Globe, Camera } from "lucide-react";
import { useUser } from "../contexts/UserContext";
import ProfileService from "../services/profile.service";

interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  employeeId: string;
  designation: string;
  joiningDate: string;
}

interface SecuritySettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  twoFactorEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

interface PreferencesSettings {
  theme: string;
  language: string;
  timezone: string;
  dateFormat: string;
  defaultAssessmentDuration: number;
  autoSave: boolean;
  emailDigest: string;
  notificationSound: boolean;
}

const Profile: React.FC = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'preferences' | 'activity'>('personal');
  const [isEditing, setIsEditing] = useState<{[key: string]: boolean}>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Personal Information State
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    employeeId: "",
    designation: "PTS Administrator",
    joiningDate: ""
  });

  // Initialize personal info with user context data from login
  useEffect(() => {
    if (user && user.email) {
      // Split name into first and last name
      let firstName = "";
      let lastName = "";
      
      if (user.name) {
        const nameParts = user.name.trim().split(' ');
        if (nameParts.length > 0) {
          firstName = nameParts[0];
          lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        }
      }
      
      setPersonalInfo(prev => ({
        ...prev,
        email: user.email,
        firstName,
        lastName,
        department: user.department || prev.department,
        joiningDate: user.joiningDate || prev.joiningDate
      }));
    }
  }, [user]);

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactorEnabled: true,
    emailNotifications: true,
    smsNotifications: false
  });

  // Preferences State
  const [preferences, setPreferences] = useState<PreferencesSettings>({
    theme: "light",
    language: "English",
    timezone: "America/Los_Angeles",
    dateFormat: "MM/DD/YYYY",
    defaultAssessmentDuration: 60,
    autoSave: true,
    emailDigest: "daily",
    notificationSound: true
  });

  // Activity Log State
  const [activityLog] = useState([
    { id: 1, action: "Created assessment 'React Fundamentals'", timestamp: "2025-11-01 09:30 AM", ip: "192.168.1.100" },
    { id: 2, action: "Updated profile information", timestamp: "2025-10-31 02:15 PM", ip: "192.168.1.100" },
    { id: 3, action: "Scheduled assessment for CSE batch", timestamp: "2025-10-30 11:45 AM", ip: "192.168.1.101" },
    { id: 4, action: "Generated analytics report", timestamp: "2025-10-29 04:20 PM", ip: "192.168.1.100" },
    { id: 5, action: "Changed password", timestamp: "2025-10-28 10:15 AM", ip: "192.168.1.102" },
  ]);

  const departments = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Mathematics", "Physics"];
  const designations = ["PTS Administrator", "Senior Administrator", "Assessment Coordinator", "Training Manager", "Academic Head"];
  const themes = ["light", "dark", "auto"];
  const languages = ["English", "Spanish", "French", "German", "Hindi"];
  const timezones = ["America/Los_Angeles", "America/New_York", "Europe/London", "Asia/Kolkata", "Australia/Sydney"];
  const dateFormats = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD", "DD-MMM-YYYY"];

  const handlePersonalInfoChange = (field: keyof PersonalInfo, value: string) => {
    setPersonalInfo(prev => ({
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

  const handlePreferencesChange = (field: keyof PreferencesSettings, value: any) => {
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
    setErrorMessage("");
  };

  const saveChanges = async (section: string) => {
    setIsSaving(true);
    setErrorMessage("");

    try {
      // Validation
      if (section === 'security') {
        if (securitySettings.newPassword && securitySettings.newPassword !== securitySettings.confirmPassword) {
          throw new Error("New passwords do not match");
        }
        if (securitySettings.newPassword && securitySettings.newPassword.length < 8) {
          throw new Error("Password must be at least 8 characters long");
        }
      }

      if (section === 'personal') {
        if (!personalInfo.firstName.trim() || !personalInfo.lastName.trim() || !personalInfo.email.trim()) {
          throw new Error("First name, last name, and email are required");
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalInfo.email)) {
          throw new Error("Please enter a valid email address");
        }
      }

      // Call real API based on section
      if (section === 'personal') {
        console.log('Sending profile update:', personalInfo);
        const response = await ProfileService.updateProfile(personalInfo);
        console.log('Profile updated:', response);
      } else if (section === 'preferences') {
        console.log('Sending preferences update:', preferences);
        const response = await ProfileService.updatePreferences(preferences);
        console.log('Preferences updated:', response);
      } else if (section === 'security') {
        // Update security settings (not password)
        const securityData = {
          twoFactorEnabled: securitySettings.twoFactorEnabled,
          emailNotifications: securitySettings.emailNotifications,
          smsNotifications: securitySettings.smsNotifications
        };
        console.log('Sending security update:', securityData);
        const response = await ProfileService.updateSecuritySettings(securityData);
        console.log('Security settings updated:', response);
      }

      setSuccessMessage(`${section.charAt(0).toUpperCase() + section.slice(1)} information updated successfully!`);
      setIsEditing(prev => ({
        ...prev,
        [section]: false
      }));

      // Reset security form if password was changed
      if (section === 'security' && securitySettings.newPassword) {
        setSecuritySettings(prev => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        }));
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);

    } catch (error) {
      console.error('Save error:', error);
      const errorMsg = error instanceof Error ? error.message : "An error occurred while saving";
      console.error('Error message:', errorMsg);
      setErrorMessage(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = (section: string) => {
    setIsEditing(prev => ({
      ...prev,
      [section]: false
    }));
    setErrorMessage("");
    
    // Reset security form
    if (section === 'security') {
      setSecuritySettings(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }));
    }
  };

  const renderPersonalTab = () => (
    <div className="pts-fade-in">
      <div className="pts-form-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
          <h3 className="pts-form-title">Personal Information</h3>
          {!isEditing.personal ? (
            <button
              className="pts-btn-primary"
              onClick={() => toggleEdit('personal')}
            >
              Edit Profile
            </button>
          ) : (
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="pts-btn-secondary"
                onClick={() => cancelEdit('personal')}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className="pts-btn-primary"
                onClick={() => saveChanges('personal')}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        {/* Profile Picture Section */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "30px", padding: "20px", background: "#f8f9fa", borderRadius: "12px" }}>
          <div style={{ position: "relative", marginRight: "20px" }}>
            {/* Avatar Circle with First Letter */}
            <div
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                border: "4px solid #9768E1",
                background: "linear-gradient(135deg, #9768E1 0%, #7B4FC4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "40px",
                fontWeight: "bold",
                color: "white",
                textTransform: "uppercase"
              }}
            >
              {personalInfo.firstName ? personalInfo.firstName.charAt(0) : "U"}
            </div>
            {isEditing.personal && (
              <div
                style={{
                  position: "absolute",
                  bottom: "0",
                  right: "0",
                  background: "#9768E1",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px"
                }}
                title="Profile Picture"
              >
                <Camera size={14} />
              </div>
            )}
          </div>
          <div>
            <h4 style={{ margin: "0 0 5px 0", color: "#523C48" }}>
              {personalInfo.firstName} {personalInfo.lastName}
            </h4>
            <p style={{ margin: "0", color: "#A4878D" }}>
              {personalInfo.designation} • {personalInfo.department}
            </p>
            <p style={{ margin: "5px 0 0 0", color: "#A4878D", fontSize: "0.9rem" }}>
              Employee ID: {personalInfo.employeeId}
            </p>
          </div>
        </div>

        {/* Basic Information */}
        <div className="pts-form-grid">
          <div className="pts-form-group">
            <label className="pts-form-label">First Name *</label>
            {isEditing.personal ? (
              <input
                type="text"
                className="pts-form-input"
                value={personalInfo.firstName}
                onChange={(e) => handlePersonalInfoChange('firstName', e.target.value)}
              />
            ) : (
              <div className="pts-form-display">{personalInfo.firstName}</div>
            )}
          </div>

          <div className="pts-form-group">
            <label className="pts-form-label">Last Name *</label>
            {isEditing.personal ? (
              <input
                type="text"
                className="pts-form-input"
                value={personalInfo.lastName}
                onChange={(e) => handlePersonalInfoChange('lastName', e.target.value)}
              />
            ) : (
              <div className="pts-form-display">{personalInfo.lastName}</div>
            )}
          </div>

          <div className="pts-form-group">
            <label className="pts-form-label">Email Address *</label>
            {isEditing.personal ? (
              <input
                type="email"
                className="pts-form-input"
                value={personalInfo.email}
                onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
              />
            ) : (
              <div className="pts-form-display">{personalInfo.email}</div>
            )}
          </div>

          <div className="pts-form-group">
            <label className="pts-form-label">Phone Number</label>
            {isEditing.personal ? (
              <input
                type="tel"
                className="pts-form-input"
                value={personalInfo.phone}
                onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
              />
            ) : (
              <div className="pts-form-display">{personalInfo.phone}</div>
            )}
          </div>

          <div className="pts-form-group">
            <label className="pts-form-label">Department</label>
            {isEditing.personal ? (
              <select
                className="pts-form-select"
                value={personalInfo.department}
                onChange={(e) => handlePersonalInfoChange('department', e.target.value)}
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            ) : (
              <div className="pts-form-display">{personalInfo.department}</div>
            )}
          </div>

          <div className="pts-form-group">
            <label className="pts-form-label">Designation</label>
            {isEditing.personal ? (
              <select
                className="pts-form-select"
                value={personalInfo.designation}
                onChange={(e) => handlePersonalInfoChange('designation', e.target.value)}
              >
                {designations.map(designation => (
                  <option key={designation} value={designation}>{designation}</option>
                ))}
              </select>
            ) : (
              <div className="pts-form-display">{personalInfo.designation}</div>
            )}
          </div>

          <div className="pts-form-group">
            <label className="pts-form-label">Employee ID</label>
            <div className="pts-form-display">{personalInfo.employeeId}</div>
          </div>

          <div className="pts-form-group">
            <label className="pts-form-label">Joining Date</label>
            <div className="pts-form-display">{new Date(personalInfo.joiningDate).toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="pts-fade-in">
      {/* Password Change Section */}
      <div className="pts-form-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
          <h3 className="pts-form-title">Password & Security</h3>
          {!isEditing.security ? (
            <button
              className="pts-btn-primary"
              onClick={() => toggleEdit('security')}
            >
              Change Password
            </button>
          ) : (
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="pts-btn-secondary"
                onClick={() => cancelEdit('security')}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className="pts-btn-primary"
                onClick={() => saveChanges('security')}
                disabled={isSaving}
              >
                {isSaving ? "Updating..." : "Update Password"}
              </button>
            </div>
          )}
        </div>

        {isEditing.security && (
          <div className="pts-form-grid">
            <div className="pts-form-group">
              <label className="pts-form-label">Current Password</label>
              <input
                type="password"
                className="pts-form-input"
                value={securitySettings.currentPassword}
                onChange={(e) => handleSecurityChange('currentPassword', e.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="pts-form-group">
              <label className="pts-form-label">New Password</label>
              <input
                type="password"
                className="pts-form-input"
                value={securitySettings.newPassword}
                onChange={(e) => handleSecurityChange('newPassword', e.target.value)}
                placeholder="Enter new password (min 8 characters)"
              />
            </div>

            <div className="pts-form-group">
              <label className="pts-form-label">Confirm New Password</label>
              <input
                type="password"
                className="pts-form-input"
                value={securitySettings.confirmPassword}
                onChange={(e) => handleSecurityChange('confirmPassword', e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
        )}
      </div>

      {/* Security Settings */}
      <div className="pts-form-container">
        <h3 className="pts-form-title">Security Settings</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "15px",
            background: "#f8f9fa",
            borderRadius: "8px"
          }}>
            <div>
              <h4 style={{ margin: "0 0 5px 0", color: "#523C48" }}>Two-Factor Authentication</h4>
              <p style={{ margin: "0", color: "#A4878D", fontSize: "0.9rem" }}>
                Add an extra layer of security to your account
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Toggle Switch */}
              <div
                onClick={() => handleSecurityChange('twoFactorEnabled', !securitySettings.twoFactorEnabled)}
                style={{
                  width: "50px",
                  height: "26px",
                  background: securitySettings.twoFactorEnabled 
                    ? "linear-gradient(135deg, #9768E1 0%, #E17668 100%)" 
                    : "#d1d5db",
                  borderRadius: "13px",
                  position: "relative",
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: securitySettings.twoFactorEnabled 
                    ? "0 4px 12px rgba(151, 104, 225, 0.4)" 
                    : "0 2px 4px rgba(0,0,0,0.1)"
                }}
              >
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    backgroundColor: "white",
                    borderRadius: "50%",
                    position: "absolute",
                    top: "2px",
                    left: securitySettings.twoFactorEnabled ? "26px" : "2px",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                    transform: securitySettings.twoFactorEnabled ? "scale(1.05)" : "scale(1)"
                  }}
                />
              </div>
              <span style={{ 
                color: securitySettings.twoFactorEnabled ? "#9768E1" : "#6c757d", 
                fontWeight: "500",
                transition: "color 0.3s ease"
              }}>
                {securitySettings.twoFactorEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "15px",
            background: "#f8f9fa",
            borderRadius: "8px"
          }}>
            <div>
              <h4 style={{ margin: "0 0 5px 0", color: "#523C48" }}>Email Notifications</h4>
              <p style={{ margin: "0", color: "#A4878D", fontSize: "0.9rem" }}>
                Receive security alerts via email
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Toggle Switch */}
              <div
                onClick={() => handleSecurityChange('emailNotifications', !securitySettings.emailNotifications)}
                style={{
                  width: "50px",
                  height: "26px",
                  background: securitySettings.emailNotifications 
                    ? "linear-gradient(135deg, #9768E1 0%, #E17668 100%)" 
                    : "#d1d5db",
                  borderRadius: "13px",
                  position: "relative",
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: securitySettings.emailNotifications 
                    ? "0 4px 12px rgba(151, 104, 225, 0.4)" 
                    : "0 2px 4px rgba(0,0,0,0.1)"
                }}
              >
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    backgroundColor: "white",
                    borderRadius: "50%",
                    position: "absolute",
                    top: "2px",
                    left: securitySettings.emailNotifications ? "26px" : "2px",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                    transform: securitySettings.emailNotifications ? "scale(1.05)" : "scale(1)"
                  }}
                />
              </div>
              <span style={{ 
                color: securitySettings.emailNotifications ? "#9768E1" : "#6c757d", 
                fontWeight: "500",
                transition: "color 0.3s ease"
              }}>
                {securitySettings.emailNotifications ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "15px",
            background: "#f8f9fa",
            borderRadius: "8px"
          }}>
            <div>
              <h4 style={{ margin: "0 0 5px 0", color: "#523C48" }}>SMS Notifications</h4>
              <p style={{ margin: "0", color: "#A4878D", fontSize: "0.9rem" }}>
                Receive security alerts via SMS
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Toggle Switch */}
              <div
                onClick={() => handleSecurityChange('smsNotifications', !securitySettings.smsNotifications)}
                style={{
                  width: "50px",
                  height: "26px",
                  background: securitySettings.smsNotifications 
                    ? "linear-gradient(135deg, #9768E1 0%, #E17668 100%)" 
                    : "#d1d5db",
                  borderRadius: "13px",
                  position: "relative",
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: securitySettings.smsNotifications 
                    ? "0 4px 12px rgba(151, 104, 225, 0.4)" 
                    : "0 2px 4px rgba(0,0,0,0.1)"
                }}
              >
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    backgroundColor: "white",
                    borderRadius: "50%",
                    position: "absolute",
                    top: "2px",
                    left: securitySettings.smsNotifications ? "26px" : "2px",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                    transform: securitySettings.smsNotifications ? "scale(1.05)" : "scale(1)"
                  }}
                />
              </div>
              <span style={{ 
                color: securitySettings.smsNotifications ? "#9768E1" : "#6c757d", 
                fontWeight: "500",
                transition: "color 0.3s ease"
              }}>
                {securitySettings.smsNotifications ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="pts-fade-in">
      <div className="pts-form-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
          <h3 className="pts-form-title">Application Preferences</h3>
          {!isEditing.preferences ? (
            <button
              className="pts-btn-primary"
              onClick={() => toggleEdit('preferences')}
            >
              Edit Preferences
            </button>
          ) : (
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="pts-btn-secondary"
                onClick={() => cancelEdit('preferences')}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className="pts-btn-primary"
                onClick={() => saveChanges('preferences')}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          )}
        </div>

        <div className="pts-form-grid">
          <div className="pts-form-group">
            <label className="pts-form-label">Theme</label>
            {isEditing.preferences ? (
              <select
                className="pts-form-select"
                value={preferences.theme}
                onChange={(e) => handlePreferencesChange('theme', e.target.value)}
              >
                {themes.map(theme => (
                  <option key={theme} value={theme}>
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="pts-form-display">
                {preferences.theme.charAt(0).toUpperCase() + preferences.theme.slice(1)}
              </div>
            )}
          </div>

          <div className="pts-form-group">
            <label className="pts-form-label">Language</label>
            {isEditing.preferences ? (
              <select
                className="pts-form-select"
                value={preferences.language}
                onChange={(e) => handlePreferencesChange('language', e.target.value)}
              >
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            ) : (
              <div className="pts-form-display">{preferences.language}</div>
            )}
          </div>

          <div className="pts-form-group">
            <label className="pts-form-label">Timezone</label>
            {isEditing.preferences ? (
              <select
                className="pts-form-select"
                value={preferences.timezone}
                onChange={(e) => handlePreferencesChange('timezone', e.target.value)}
              >
                {timezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            ) : (
              <div className="pts-form-display">{preferences.timezone}</div>
            )}
          </div>

          <div className="pts-form-group">
            <label className="pts-form-label">Date Format</label>
            {isEditing.preferences ? (
              <select
                className="pts-form-select"
                value={preferences.dateFormat}
                onChange={(e) => handlePreferencesChange('dateFormat', e.target.value)}
              >
                {dateFormats.map(format => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </select>
            ) : (
              <div className="pts-form-display">{preferences.dateFormat}</div>
            )}
          </div>
        </div>

        {/* Toggle Preferences */}
        <h4 style={{ color: "#523C48", marginTop: "30px", marginBottom: "20px" }}>Application Settings</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "15px",
            background: "#f8f9fa",
            borderRadius: "8px"
          }}>
            <div>
              <h4 style={{ margin: "0 0 5px 0", color: "#523C48" }}>Auto-Save</h4>
              <p style={{ margin: "0", color: "#A4878D", fontSize: "0.9rem" }}>
                Automatically save form data as you type
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Toggle Switch */}
              <div
                onClick={() => !isEditing.preferences ? null : handlePreferencesChange('autoSave', !preferences.autoSave)}
                style={{
                  width: "50px",
                  height: "26px",
                  background: preferences.autoSave 
                    ? "linear-gradient(135deg, #9768E1 0%, #E17668 100%)" 
                    : "#d1d5db",
                  borderRadius: "13px",
                  position: "relative",
                  cursor: isEditing.preferences ? "pointer" : "not-allowed",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: preferences.autoSave 
                    ? "0 4px 12px rgba(151, 104, 225, 0.4)" 
                    : "0 2px 4px rgba(0,0,0,0.1)",
                  opacity: isEditing.preferences ? 1 : 0.6
                }}
              >
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    backgroundColor: "white",
                    borderRadius: "50%",
                    position: "absolute",
                    top: "2px",
                    left: preferences.autoSave ? "26px" : "2px",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                    transform: preferences.autoSave ? "scale(1.05)" : "scale(1)"
                  }}
                />
              </div>
              <span style={{ 
                color: preferences.autoSave ? "#9768E1" : "#6c757d", 
                fontWeight: "500",
                transition: "color 0.3s ease"
              }}>
                {preferences.autoSave ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "15px",
            background: "#f8f9fa",
            borderRadius: "8px"
          }}>
            <div>
              <h4 style={{ margin: "0 0 5px 0", color: "#523C48" }}>Notification Sounds</h4>
              <p style={{ margin: "0", color: "#A4878D", fontSize: "0.9rem" }}>
                Play sounds for notifications and alerts
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Toggle Switch */}
              <div
                onClick={() => !isEditing.preferences ? null : handlePreferencesChange('notificationSound', !preferences.notificationSound)}
                style={{
                  width: "50px",
                  height: "26px",
                  background: preferences.notificationSound 
                    ? "linear-gradient(135deg, #9768E1 0%, #E17668 100%)" 
                    : "#d1d5db",
                  borderRadius: "13px",
                  position: "relative",
                  cursor: isEditing.preferences ? "pointer" : "not-allowed",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: preferences.notificationSound 
                    ? "0 4px 12px rgba(151, 104, 225, 0.4)" 
                    : "0 2px 4px rgba(0,0,0,0.1)",
                  opacity: isEditing.preferences ? 1 : 0.6
                }}
              >
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    backgroundColor: "white",
                    borderRadius: "50%",
                    position: "absolute",
                    top: "2px",
                    left: preferences.notificationSound ? "26px" : "2px",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                    transform: preferences.notificationSound ? "scale(1.05)" : "scale(1)"
                  }}
                />
              </div>
              <span style={{ 
                color: preferences.notificationSound ? "#9768E1" : "#6c757d", 
                fontWeight: "500",
                transition: "color 0.3s ease"
              }}>
                {preferences.notificationSound ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderActivityTab = () => (
    <div className="pts-fade-in">
      <div className="pts-form-container">
        <h3 className="pts-form-title">Account Activity</h3>
        <p style={{ color: "#A4878D", marginBottom: "25px" }}>
          Recent activities on your account for security monitoring
        </p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {activityLog.map((activity) => (
            <div key={activity.id} style={{
              padding: "20px",
              border: "1px solid #e9ecef",
              borderRadius: "8px",
              background: "white"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: "0 0 8px 0", color: "#523C48" }}>
                    {activity.action}
                  </h4>
                  <div style={{ display: "flex", gap: "20px", fontSize: "0.9rem", color: "#A4878D", alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <Calendar size={14} /> {activity.timestamp}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <Globe size={14} /> {activity.ip}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "30px", padding: "20px", background: "#fff3cd", borderRadius: "8px", border: "1px solid #ffeaa7" }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#856404" }}>Security Notice</h4>
          <p style={{ margin: "0", color: "#856404", fontSize: "0.9rem" }}>
            If you notice any suspicious activity, please contact the system administrator immediately.
            You can also enable two-factor authentication for enhanced security.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pts-fade-in">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="pts-success">
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="pts-error">
          {errorMessage}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="pts-form-container">
        <div style={{ display: "flex", gap: "10px", marginBottom: "0", flexWrap: "wrap" }}>
          {[
            { key: 'personal', label: 'Personal Info', icon: <User size={16} /> },
            { key: 'security', label: 'Security', icon: <Lock size={16} /> },
            { key: 'preferences', label: 'Preferences', icon: <Settings size={16} /> },
            { key: 'activity', label: 'Activity Log', icon: <BarChart3 size={16} /> },
          ].map(tab => (
            <button
              key={tab.key}
              className={activeTab === tab.key ? "pts-btn-primary" : "pts-btn-secondary"}
              onClick={() => {
                setActiveTab(tab.key as any);
                setErrorMessage("");
                // Cancel any active edits when switching tabs
                if (isEditing[tab.key]) {
                  cancelEdit(tab.key);
                }
              }}
              style={{ marginBottom: "10px" }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'personal' && renderPersonalTab()}
      {activeTab === 'security' && renderSecurityTab()}
      {activeTab === 'preferences' && renderPreferencesTab()}
      {activeTab === 'activity' && renderActivityTab()}
    </div>
  );
};
export default Profile;