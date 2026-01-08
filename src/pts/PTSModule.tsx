import React, { useState, useMemo, memo } from "react";
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from "./Dashboard";
import AssessmentCreation from "./AssessmentCreation";
import StudentStats from "./StudentStats";
import StudentManagement from "./StudentManagement";
import Profile from "./Profile";
import './styles/PTSDashboard.css';
import { useUser } from '../contexts/UserContext';

const PTSModule: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Navigation items
  const navItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', path: '/pts' },
    { id: 'create', label: 'Assessment Creation and Scheduling', path: '/pts/create' },
    // Removed Assessment Scheduling as it's now integrated into Assessment Creation
    { id: 'students', label: 'Student Management', path: '/pts/students' },
    { id: 'stats', label: 'Student Analytics', path: '/pts/stats' },
    { id: 'profile', label: 'Profile Settings', path: '/pts/profile' },
  ], []);

  // Update active tab based on current location
  React.useEffect(() => {
    const currentPath = location.pathname;

    // Find exact match first
    const exactMatch = navItems.find(item => item.path === currentPath);
    if (exactMatch) {
      setActiveTab(exactMatch.id);
      return;
    }

    // Special cases for root paths
    if (currentPath === '/pts' || currentPath === '/pts/') {
      setActiveTab('dashboard');
      return;
    }

    // Default to dashboard if no match
    setActiveTab('dashboard');
  }, [location, navItems]);

  const handleLogout = () => {
    navigate('/');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleNavigation = (path: string, id: string) => {
    setActiveTab(id);
    navigate(path);
    setSidebarOpen(false);
  };

  // Display loading state or user info
  const userInfo = useMemo(() => {
    if (loading) {
      return (
        <div className="pts-user-details">
          <p className="name">Loading...</p>
          <p className="role">PTS</p>
        </div>
      );
    }

    return (
      <div className="pts-user-details">
        <p className="name">{user?.name || 'PTS Administrator'}</p>
        <p className="role">{user?.role || 'PTS'}</p>
      </div>
    );
  }, [user, loading]);

  return (
    <div className={`pts-dashboard ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Sidebar Navigation */}
      <nav className={`pts-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="pts-sidebar-header">
          <div className="pts-sidebar-header-content">
            <button className="pts-hamburger-menu inside" onClick={toggleSidebar}>
              <span></span>
              <span></span>
              <span></span>
            </button>

            <h2 className="pts-sidebar-title">PTS Portal</h2>
          </div>
        </div>
        <ul className="pts-sidebar-menu">
          {navItems.map((item) => (
            <li key={item.id}>
              <div
                className={`pts-sidebar-link ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path, item.id)}
              >
                {item.label}
              </div>
            </li>
          ))}
        </ul>
        <div className="pts-logout-section">
          <button className="pts-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && <div className="pts-sidebar-overlay" onClick={closeSidebar}></div>}

      {/* Main Content Area */}
      <div className="pts-main-content">
        {/* Header */}
        <header className="pts-header">
          <div className="pts-header-content">
            <div className="pts-header-left">
              {!sidebarOpen && (
                <button className="pts-hamburger-menu" onClick={toggleSidebar}>
                  <span></span>
                  <span></span>
                  <span></span>
                </button>
              )}
              <h1 className="pts-header-title">
                {navItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
              </h1>
            </div>
            <div
              className="pts-user-info"
              onClick={() => handleNavigation('/pts/profile', 'profile')}
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              title="Go to Profile Settings"
            >
              <div
                className="pts-user-avatar-first-letter"
              >
                {user?.name?.charAt(0) || 'U'}
              </div>
              {userInfo}
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="pts-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<AssessmentCreation />} />
            <Route path="/students" element={<StudentManagement />} />
            <Route path="/stats" element={<StudentStats />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default memo(PTSModule);