import React, { useState, useEffect, useMemo, memo } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaBuilding,
  FaUser,
  FaClipboardList,
  FaUserGraduate,
  FaChartBar,
  FaUserCircle,
  FaSignOutAlt,
  FaSearch,
  FaBell
} from 'react-icons/fa';
import DashboardHome from '../components/DashboardHome';
import DepartmentManagement from '../components/DepartmentManagement';
import StaffManagement from '../components/StaffManagement';
import AssessmentManagement from '../components/AssessmentManagement';
import StudentManagement from '../components/StudentManagement';
import ReportsAnalytics from '../components/ReportsAnalytics';
import Profile from '../components/Profile';
import '../styles/Dashboard.css';
import { useUser } from '../../contexts/UserContext';

const PTODashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsCount] = useState(3);

  const navItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', path: '/pto', icon: FaTachometerAlt },
    { id: 'departments', label: 'Departments', path: '/pto/departments', icon: FaBuilding },
    { id: 'staff', label: 'Staff Management', path: '/pto/staff', icon: FaUser },
    { id: 'assessments', label: 'Assessments', path: '/pto/assessments', icon: FaClipboardList },
    { id: 'students', label: 'Students', path: '/pto/students', icon: FaUserGraduate },
    { id: 'reports', label: 'Reports & Analytics', path: '/pto/reports', icon: FaChartBar },
    { id: 'profile', label: 'Profile', path: '/pto/profile', icon: FaUserCircle },
  ], []);

  useEffect(() => {
    const currentPath = location.pathname;
    const matchedItem = navItems.find(item => {
      if (item.path === '/pto' && (currentPath === '/pto' || currentPath === '/pto/')) return true;
      if (item.path !== '/pto' && currentPath.startsWith(item.path)) return true;
      return false;
    });
    if (matchedItem) {
      setActiveTab(matchedItem.id);
    } else {
      setActiveTab('dashboard');
    }
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

  // Profile dropdown content with loading state
  const profileDropdownContent = useMemo(() => {
    if (loading) {
      return (
        <div className="profile-header">
          <h3>Loading...</h3>
          <p>Placement Training Officer</p>
        </div>
      );
    }

    return (
      <>
        <div className="profile-header">
          <h3>{user?.name || 'John Smith'}</h3>
          <p>{user?.role || 'Placement Training Officer'}</p>
        </div>
        <div className="profile-content">
          <Link
            to="/pto/profile"
            className="profile-link"
            onClick={() => setProfileDropdownOpen(false)}
          >
            View Profile
          </Link>
          <button className="logout-btn-small" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </>
    );
  }, [user, loading, handleLogout]);

  return (
    <div className="pto-dashboard">
      {/* Hamburger Menu Button (Mobile) */}
      <button className="hamburger-menu" onClick={toggleSidebar}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Sidebar Navigation */}
      <nav className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <FaUserCircle size={48} color="#ffffff" />
          </div>
          <h2>PTO Portal</h2>
        </div>
        <ul className="sidebar-menu">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    closeSidebar();
                  }}
                >
                  <IconComponent className="sidebar-icon" />
                  <span className="sidebar-label">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={() => {
            handleLogout();
            closeSidebar();
          }}>
            <FaSignOutAlt className="sidebar-icon" />
            <span className="sidebar-label">Logout</span>
          </button>
        </div>
      </nav>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      {/* Main Content Area */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-search">
            <FaSearch className="search-icon" />
            <input type="text" placeholder="Search..." className="search-input" />
          </div>
          <div className="header-actions">
            <div className="notification-bell" title="Notifications">
              <FaBell />
              {notificationsCount > 0 && (
                <span className="notification-badge">{notificationsCount}</span>
              )}
            </div>
            <div className="profile-dropdown-container">
              <div
                className="user-avatar"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <FaUserCircle size={32} color="#9768E1" />
              </div>
              {profileDropdownOpen && (
                <div className="profile-dropdown">
                  {profileDropdownContent}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          <Routes>
            <Route index element={<DashboardHome />} />
            <Route path="departments" element={<DepartmentManagement />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="assessments" element={<AssessmentManagement />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="reports" element={<ReportsAnalytics />} />
            <Route path="profile" element={<Profile />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default memo(PTODashboard);