import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import DashboardHome from '../components/DashboardHome';
import Colleges from '../components/Colleges';
import Officers from '../components/Officers';

import Settings from '../components/Settings';
import '../styles/AdminDashboardRefactored.css';
import AuthService from '../../services/auth.service';
import AdminService from '../../services/admin.service';

const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [adminProfile, setAdminProfile] = useState<any>(null);

  // Navigation items
  const navItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', path: '/company-admin' },
    { id: 'colleges', label: 'Colleges', path: '/company-admin/colleges' },
    { id: 'officers', label: 'Officers', path: '/company-admin/officers' },
    { id: 'settings', label: 'Settings', path: '/company-admin/settings' },
  ], []);

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

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
  }, [location, navItems]);

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

  const handleNavigation = (path: string, id: string) => {
    setActiveTab(id);
    navigate(path);
    setSidebarOpen(false);
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
    <div className={`ad-dashboard ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>

      {/* Sidebar Navigation */}
      <nav className={`ad-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="ad-sidebar-header">
          <div className="ad-sidebar-header-content">
            <h2 className="ad-sidebar-title">Company Admin</h2>
            <button className="ad-sidebar-close-btn" onClick={closeSidebar} aria-label="Close sidebar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <ul className="ad-sidebar-menu">
          {navItems.map((item) => (
            <li key={item.id}>
              <div
                className={`ad-sidebar-link ${activeTab === item.id ? 'active' : ''} ad-sidebar-link-${item.id}`}
                onClick={() => handleNavigation(item.path, item.id)}
                style={{ cursor: 'pointer' }} // Ensure pointer cursor
              >
                <span className="ad-sidebar-label">{item.label}</span>
              </div>
            </li>
          ))}
        </ul>
        
        {/* Sidebar Footer with Logout Button */}
        <div className="ad-sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && <div className="ad-sidebar-overlay" onClick={closeSidebar}></div>}

      {/* Main Content Area */}
      <main className="ad-main">
        <header className="ad-header">
          <div className="ad-header-content">
            <div className="ad-header-left">
              {!sidebarOpen && (
                <button className="ad-hamburger-menu" onClick={toggleSidebar}>
                  <span></span>
                  <span></span>
                  <span></span>
                </button>
              )}
              <h1 className="ad-header-title">
                {activeTab === 'dashboard' ? 'Overview' : navItems.find(i => i.id === activeTab)?.label}
              </h1>
            </div>


          </div>
        </header>

        <div className="ad-content">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/colleges" element={<Colleges />} />
            <Route path="/officers" element={<Officers />} />
            
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;