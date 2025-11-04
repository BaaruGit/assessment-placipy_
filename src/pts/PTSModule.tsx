import React, { useState, useMemo, memo } from "react";
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from "./Dashboard";
import AssessmentCreation from "./AssessmentCreation";
import AssessmentScheduling from "./AssessmentScheduling";
import StudentStats from "./StudentStats";
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
    { id: 'create', label: 'Create Assessment', path: '/pts/create' },
    { id: 'schedule', label: 'Assessment Scheduling', path: '/pts/schedule' },
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
    <div className="pts-dashboard">
      {/* Hamburger Menu Button */}
      <button className="pts-hamburger-menu" onClick={toggleSidebar}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Sidebar Navigation */}
      <nav className={`pts-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="pts-sidebar-header">
          <h2>PTS Portal</h2>
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

      {/* Main Content Area */}
      <div className="pts-main-content">
        {/* Header */}
        <header className="pts-header">
          <h1 className="pts-header-title">
            {navItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
          </h1>
          <div
            className="pts-user-info"
            onClick={() => handleNavigation('/pts/profile', 'profile')}
            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            title="Go to Profile Settings"
          >
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"
              alt="Profile"
              className="pts-user-avatar"
            />
            {userInfo}
          </div>
        </header>

        {/* Content Container */}
        <main className="pts-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<AssessmentCreation />} />
            <Route path="/schedule" element={<AssessmentScheduling />} />
            <Route path="/stats" element={<StudentStats />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default memo(PTSModule);