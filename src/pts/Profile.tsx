import React, { useState, useEffect } from "react";
import { User, BarChart3, Calendar, Globe, Camera, Shield } from "lucide-react";
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

const Profile: React.FC = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'activity'>('personal');
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

  // Password Change State
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [isPasswordEditing, setIsPasswordEditing] = useState(false);

  // Initialize personal info with user context data from login and fetch complete profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (user && user.email) {
        try {
          // Fetch complete profile data from backend using fetch API
          const token = localStorage.getItem('accessToken');
          if (token) {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/profile`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            const profileData = result.user;
            
            // Split name into first and last name
            let firstName = "";
            let lastName = "";
            
            if (profileData.name) {
              const nameParts = profileData.name.trim().split(' ');
              if (nameParts.length > 0) {
                firstName = nameParts[0];
                lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
              }
            }
            
            setPersonalInfo({
              firstName: profileData.firstName || firstName || "",
              lastName: profileData.lastName || lastName || "",
              email: profileData.email || user.email,
              phone: profileData.phone || profileData.mobile || "",
              department: profileData.department || user.department || "",
              employeeId: profileData.employeeId || "",
              designation: profileData.designation || profileData.role || "PTS Administrator",
              joiningDate: profileData.joiningDate || user.joiningDate || ""
            });
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          
          // Fallback to user context data if API fails
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
      }
    };
    
    fetchProfile();
  }, [user]);



  // Activity Log State
  const [activityLog] = useState([
    { id: 1, action: "Changed password", timestamp: "2025-11-01 09:30 AM", ip: "192.168.1.100" },
    { id: 2, action: "Assessment tracking and management", timestamp: "2025-10-31 02:15 PM", ip: "192.168.1.100" },
    { id: 3, action: "Last login to system", timestamp: "2025-10-30 11:45 AM", ip: "192.168.1.101" },
  ]);



  const handlePersonalInfoChange = (field: keyof PersonalInfo, value: string) => {
    setPersonalInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = (field: keyof typeof passwordChange, value: string) => {
    setPasswordChange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordUpdate = async () => {
    if (!passwordChange.currentPassword || !passwordChange.newPassword || !passwordChange.confirmPassword) {
      setErrorMessage("All password fields are required");
      return;
    }

    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      setErrorMessage("New password and confirm password do not match");
      return;
    }

    if (passwordChange.newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters long");
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordChange.currentPassword,
          newPassword: passwordChange.newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update password');
      }

      setSuccessMessage("Password updated successfully!");
      // Reset password fields
      setPasswordChange({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setIsPasswordEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error('Password update error:', error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to update password");
    }
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
      if (section === 'personal') {
        if (!personalInfo.firstName.trim() || !personalInfo.lastName.trim() || !personalInfo.email.trim()) {
          throw new Error("First name, last name, and email are required");
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalInfo.email)) {
          throw new Error("Please enter a valid email address");
        }

        // Allow updating specific fields including phone number
        const profileDataToSend = {
          firstName: personalInfo.firstName,
          lastName: personalInfo.lastName,
          email: personalInfo.email,
          phone: personalInfo.phone,
          department: personalInfo.department
          // Note: designation and joiningDate are excluded and managed by system
        };
        console.log('Sending profile update:', profileDataToSend);
        const response = await ProfileService.updateProfile(profileDataToSend);
        console.log('Profile updated:', response);
      }

      setSuccessMessage(`${section.charAt(0).toUpperCase() + section.slice(1)} information updated successfully!`);
      setIsEditing(prev => ({
        ...prev,
        [section]: false
      }));

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
              <div className="pts-form-display">{personalInfo.phone || 'Not specified'}</div>
            )}
          </div>

          <div className="pts-form-group">
            <label className="pts-form-label">Department</label>
            <div className="pts-form-display" style={{ backgroundColor: '#f5f5f5' }}>
              {personalInfo.department}
            </div>
          </div>

          <div className="pts-form-group">
            <label className="pts-form-label">Designation</label>
            <div className="pts-form-display" style={{ backgroundColor: '#f5f5f5' }}>
              {personalInfo.designation}
            </div>
          </div>

          <div className="pts-form-group">
            <label className="pts-form-label">Joining Date</label>
            <div className="pts-form-display" style={{ backgroundColor: '#f5f5f5' }}>
              {personalInfo.joiningDate ? new Date(personalInfo.joiningDate).toLocaleDateString() : 'Not specified'}
            </div>
          </div>
        </div>


      </div>
    </div>
  );





  const renderSecurityTab = () => (
    <div className="pts-fade-in">
      <div className="pts-form-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
          <h3 className="pts-form-title">Change Password</h3>
          {!isPasswordEditing ? (
            <button
              className="pts-btn-primary"
              onClick={() => setIsPasswordEditing(true)}
            >
              Change Password
            </button>
          ) : (
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="pts-btn-secondary"
                onClick={() => {
                  setIsPasswordEditing(false);
                  setPasswordChange({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: ""
                  });
                  setErrorMessage("");
                }}
              >
                Cancel
              </button>
              <button
                className="pts-btn-primary"
                onClick={handlePasswordUpdate}
              >
                Update Password
              </button>
            </div>
          )}
        </div>

        {isPasswordEditing && (
          <div className="pts-form-grid">
            <div className="pts-form-group">
              <label className="pts-form-label">Current Password</label>
              <input
                type="password"
                className="pts-form-input"
                value={passwordChange.currentPassword}
                onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="pts-form-group">
              <label className="pts-form-label">New Password</label>
              <input
                type="password"
                className="pts-form-input"
                value={passwordChange.newPassword}
                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                placeholder="Enter new password (min 8 characters)"
              />
            </div>

            <div className="pts-form-group">
              <label className="pts-form-label">Confirm New Password</label>
              <input
                type="password"
                className="pts-form-input"
                value={passwordChange.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                placeholder="Confirm new password"
              />
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
          <button
            key={'personal'}
            className={activeTab === 'personal' ? "pts-btn-primary" : "pts-btn-secondary"}
            onClick={() => {
              setActiveTab('personal' as any);
              setErrorMessage("");
              // Cancel any active edits when switching tabs
              if (isEditing['personal']) {
                cancelEdit('personal');
              }
            }}
            style={{ marginBottom: "10px" }}
          >
            <User size={16} /> Personal Info
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'personal' && renderPersonalTab()}
      {/* Security and Activity tabs commented out for future implementation */}
      {/* {activeTab === 'security' && renderSecurityTab()}
      {activeTab === 'activity' && renderActivityTab()} */}
    </div>
  );
};
export default Profile;