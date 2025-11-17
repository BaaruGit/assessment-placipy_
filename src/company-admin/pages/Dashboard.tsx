import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import DashboardHome from '../components/DashboardHome';
import Colleges from '../components/Colleges';
import Officers from '../components/Officers';
import Reports from '../components/Reports';
import Settings from '../components/Settings';
import Profile from '../components/Profile';
import '../styles/AdminDashboard.css';
import AuthService from '../../services/auth.service';

const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/company-admin' },
    { id: 'colleges', label: 'Colleges', path: '/company-admin/colleges' },
    { id: 'officers', label: 'Officers', path: '/company-admin/officers' },
    { id: 'reports', label: 'Reports', path: '/company-admin/reports' },
    { id: 'settings', label: 'Settings', path: '/company-admin/settings' },
  ];

  // Verify user role on component mount
  useEffect(() => {
    const verifyRole = async () => {
      try {
        if (!AuthService.isAuthenticated()) {
          navigate('/');
          return;
        }

        const token = AuthService.getAccessToken();
        if (!token) {
          navigate('/');
          return;
        }

        const userRole = await AuthService.getUserRole(token);
        if (userRole !== 'Administrator') {
          navigate('/unauthorized');
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Role verification failed:', error);
        navigate('/');
      }
    };

    verifyRole();
  }, [navigate]);

  // Update active tab based on current location
  useEffect(() => {
    const currentPath = location.pathname;

    // Find exact match first
    const exactMatch = navItems.find(item => item.path === currentPath);
    if (exactMatch) {
      setActiveTab(exactMatch.id);
      return;
    }

    // Special cases for root paths
    if (currentPath === '/company-admin' || currentPath === '/company-admin/') {
      setActiveTab('dashboard');
      return;
    }

    // Default to dashboard if no match
    setActiveTab('dashboard');
  }, [location]);

  const handleLogout = () => {
    AuthService.logout();
    navigate('/');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  if (isLoading) {
    return <div className="loading">Verifying access...</div>;
  }

  return (
    <div className="admin-dashboard">
      {/* Hamburger Menu Button (Visible on mobile) */}
      <button className="admin-hamburger-menu" onClick={toggleSidebar}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Sidebar Navigation */}
      <nav className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <h2>Company Admin</h2>
        </div>
        <ul className="admin-sidebar-menu">
          {navItems.map((item) => (
            <li key={item.id}>
              <Link
                to={item.path}
                className={`admin-sidebar-link ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  closeSidebar();
                }}
              >
                <span className="admin-sidebar-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="admin-sidebar-footer">
          <button className="admin-logout-btn" onClick={() => {
            handleLogout();
            closeSidebar();
          }}>
            <span className="admin-sidebar-label">Logout</span>
          </button>
        </div>
      </nav>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && <div className="admin-sidebar-overlay" onClick={closeSidebar}></div>}

      {/* Main Content Area */}
      <main className="admin-main">
        <header className="admin-header">
          <h1>Company Admin Dashboard</h1>
          <Link to="/company-admin/profile" className="admin-profile-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
              <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
            </svg>
          </Link>
        </header>

        <div className="admin-content">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/colleges" element={<Colleges />} />
            <Route path="/officers" element={<Officers />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;