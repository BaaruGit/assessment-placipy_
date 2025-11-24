import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import DashboardHome from '../components/DashboardHome';
import Assessments from '../components/Assessments';
import ResultsReports from '../components/ResultsReports';
import Profile from '../components/Profile';
import Notifications from '../components/Notifications';
import AssessmentTaking from '../components/AssessmentTaking';
import '../styles/Dashboard.css';
import AuthService from '../../services/auth.service';
import { useUser } from '../../contexts/UserContext';

// Student Dashboard Component
const StudentDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssessmentActive, setIsAssessmentActive] = useState(false);

  // Navigation items (removed profile)
  const navItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', path: '/student' },
    { id: 'assessments', label: 'Assessments', path: '/student/assessments' },
    { id: 'results', label: 'Results & Reports', path: '/student/results' },
    { id: 'notifications', label: 'Notifications', path: '/student/notifications' },
  ], []);

  // Listen for messages from child components
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'ASSESSMENT_COMPLETED') {
        setIsAssessmentActive(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Check if we're on the assessment taking page
  useEffect(() => {
    if (location.pathname.includes('/assessment-taking')) {
      setIsAssessmentActive(true);
    } else {
      setIsAssessmentActive(false);
    }
  }, [location.pathname]);

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
        if (userRole !== 'Student') {
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

    // Handle both /student and /dashboard paths
    const normalizedPath = currentPath.replace('/dashboard', '/student');

    // Find exact match first
    const exactMatch = navItems.find(item => item.path === normalizedPath);
    if (exactMatch) {
      setActiveTab(exactMatch.id);
      return;
    }

    // Special cases for root paths
    if (normalizedPath === '/student' || normalizedPath === '/student/') {
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

  const { user } = useUser();

  if (isLoading) {
    return <div className="loading">Verifying access...</div>;
  }

  return (
    <div className="student-dashboard">
      {/* Hamburger Menu Button (Visible on mobile) */}
      <button className="hamburger-menu" onClick={toggleSidebar}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Sidebar Navigation - Hidden during active assessment */}
      {!isAssessmentActive && (
        <nav className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2>Student Portal</h2>
          </div>
          <ul className="sidebar-menu">
            {navItems.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={`sidebar-link ${activeTab === item.id ? 'active' : ''} sidebar-link-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    closeSidebar();
                  }}
                >
                  <span className="sidebar-label">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="sidebar-footer">
            <button className="logout-btn" onClick={() => {
              handleLogout();
              closeSidebar();
            }}>
              <span className="sidebar-label">Logout</span>
            </button>
          </div>
        </nav>
      )}

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && !isAssessmentActive && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* Welcome board - Hidden during active assessment */}
        {!isAssessmentActive && (
          <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>{user?.name ? `Welcome, ${user.name}!` : 'Welcome, Student!'}</h1>
            <Link to="/student/profile" className="profile-btn" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#9768E1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </div>
              <span style={{ color: '#523C48' }}>{user?.name || 'Profile'}</span>
            </Link>
          </header>
        )}

        <div className="dashboard-content">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/results" element={<ResultsReports />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/assessment-taking" element={<AssessmentTaking />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;