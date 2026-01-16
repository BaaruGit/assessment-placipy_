import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import DashboardHome from '../components/DashboardHome';
import Assessments from '../components/Assessments';
import ResultsReports from '../components/ResultsReports';
import Profile from '../components/Profile';
import Notifications from '../components/Notifications';
import AssessmentTaking from '../components/AssessmentTaking';
import AssessmentSuccess from '../components/AssessmentSuccess';
import AssessmentSubmitted from './AssessmentSubmitted';
import ResultDetail from './ResultDetail';
import '../styles/Dashboard.css';
import NotificationPopup from '../components/NotificationPopup';
import NotificationBell from '../components/NotificationBell';
import type { Notification } from '../../services/notification.service';
import AuthService from '../../services/auth.service';
import { useUser } from '../../contexts/UserContext';

// Wrapper component to pass assessmentId to AssessmentTaking
const AssessmentTakingWrapper: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  return <AssessmentTaking key={assessmentId} />;
};

// Student Dashboard Component
const StudentDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isAssessmentActive, setIsAssessmentActive] = useState(false);
  const [activePopup, setActivePopup] = useState<Notification | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Listen for newNotification events from NotificationContext to show popup
  useEffect(() => {
    const handleNewNotification = (event: CustomEvent) => {
      if (event && event.detail) {
        setActivePopup(event.detail as Notification);
      }
    };

    window.addEventListener('newNotification', handleNewNotification as EventListener);
    return () => {
      window.removeEventListener('newNotification', handleNewNotification as EventListener);
    };
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

  const handleNavigation = (path: string, id: string) => {
    setActiveTab(id);
    navigate(path);
    setSidebarOpen(false);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Handle window resize to update mobile state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const { user } = useUser();

  if (isLoading) {
    return <div className="loading">Verifying access...</div>;
  }

  return (
    <div className={`student-dashboard ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>

      {/* Sidebar Navigation */}
      {!isAssessmentActive && (
        <nav className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-header-content">
              <button className="hamburger-menu inside" onClick={toggleSidebar}>
                <span></span>
                <span></span>
                <span></span>
              </button>
              <h2 className="sidebar-title">Student Portal</h2>
            </div>
          </div>
          <ul className="sidebar-menu">
            {navItems.map((item) => (
              <li key={item.id}>
                <div
                  className={`sidebar-link ${activeTab === item.id ? 'active' : ''} sidebar-link-${item.id}`}
                  onClick={() => handleNavigation(item.path, item.id)}
                >
                  <span className="sidebar-label">{item.label}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="sidebar-footer">
            <button className="logout-btn" onClick={handleLogout}>
              <span className="sidebar-label">Logout</span>
            </button>
          </div>
        </nav>
      )}

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* Welcome board - Hidden during active assessment */}
        {!isAssessmentActive && (
          <header className="dashboard-header">
            <div className="dashboard-header-content">
              <div className="dashboard-header-left">
                {!sidebarOpen && (
                  <button className="hamburger-menu" onClick={toggleSidebar}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </button>
                )}
                <h1 className="dashboard-header-title">
                  {user?.name ? `Welcome, ${user.name}!` : 'Welcome, Student!'}
                </h1>
              </div>
              <div className="user-info">
                <NotificationBell />
                <Link to="/student/profile" className="profile-btn" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                  <div className="user-avatar-first-letter">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="user-details">
                    <p className="name">{user?.name || 'Profile'}</p>
                  </div>
                </Link>
              </div>
            </div>
          </header>
        )}

        <div className="dashboard-content">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/results" element={<ResultsReports />} />
            <Route path="/results/:attemptId" element={<ResultDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/assessment-taking" element={<AssessmentTaking />} />
            <Route path="/assessment-taking/:assessmentId" element={<AssessmentTakingWrapper />} />
            <Route path="/assessment-success" element={<AssessmentSuccess />} />
            <Route path="/assessment-submitted" element={<AssessmentSubmitted />} />
          </Routes>
        </div>
      </main>

      {activePopup && (
        <NotificationPopup
          notification={activePopup}
          onClose={() => setActivePopup(null)}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
