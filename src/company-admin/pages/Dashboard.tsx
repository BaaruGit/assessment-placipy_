import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import DashboardHome from '../components/DashboardHome';
import Colleges from '../components/Colleges';
import Officers from '../components/Officers';
import Reports from '../components/Reports';
import Settings from '../components/Settings';
import '../styles/AdminDashboard.css';
import AuthService from '../../services/auth.service';
import AdminService from '../../services/admin.service';

const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

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

  // Load admin profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await AdminService.getAdminProfile();
        setAdminProfile(profile);
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };

    if (!isLoading) {
      loadProfile();
    }
  }, [isLoading]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const toggleProfileMenu = () => {
    setProfileMenuOpen(!profileMenuOpen);
  };

  const handleNavigateToSettings = () => {
    setProfileMenuOpen(false);
    navigate('/company-admin/settings');
  };

  const getInitials = (name: string) => {
    if (!name) return 'CA';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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
          
          {/* Profile Avatar with Dropdown */}
          <div className="admin-profile-container" ref={profileMenuRef}>
            <div className="admin-profile-avatar" onClick={toggleProfileMenu}>
              {adminProfile?.profilePicture ? (
                <img 
                  src={adminProfile.profilePicture} 
                  alt="Profile" 
                  className="admin-avatar-img"
                />
              ) : (
                <div className="admin-avatar-placeholder">
                  {getInitials(adminProfile?.name || adminProfile?.firstName || 'Admin')}
                </div>
              )}
            </div>
            
            {profileMenuOpen && (
              <div className="admin-profile-dropdown">
                <div className="admin-profile-info">
                  <h3>{adminProfile?.name || adminProfile?.firstName || 'Admin'}</h3>
                  <p>{adminProfile?.email || ''}</p>
                  <span className="admin-role-badge">Administrator</span>
                </div>
                <div className="admin-profile-divider"></div>
                <button 
                  className="admin-profile-menu-item"
                  onClick={handleNavigateToSettings}
                >
                  <span className="menu-icon">⚙️</span>
                  Settings & Profile
                </button>
                <button 
                  className="admin-profile-menu-item logout"
                  onClick={handleLogout}
                >
                  <span className="menu-icon">🚪</span>
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="admin-content">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/colleges" element={<Colleges />} />
            <Route path="/officers" element={<Officers />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;