import React, { useState, useEffect, useMemo, memo } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaBuilding,
  FaUser,
  FaClipboardList,
  FaUserGraduate,
  FaChartBar,
  FaUserCircle,
  FaSignOutAlt,
} from "react-icons/fa";
import { useUser } from "../../contexts/UserContext";

import DashboardHome from "../components/DashboardHome";
import DepartmentManagement from "../components/DepartmentManagement";
import StaffManagement from "../components/StaffManagement";
import AssessmentManagement from "../components/AssessmentManagement";
import StudentManagement from "../components/StudentManagement";
import ReportsAnalytics from "../components/ReportsAnalytics";
import Profile from "../components/Profile";

import "../styles/Dashboard.css";

const PTODashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useUser();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  


  /* ✅ Nav Items */
  const navItems = useMemo(
    () => [
      { id: "dashboard", label: "Dashboard", path: "/pto", icon: FaTachometerAlt },
      { id: "departments", label: "Departments", path: "/pto/departments", icon: FaBuilding },
      { id: "staff", label: "Staff Management", path: "/pto/staff", icon: FaUser },
      { id: "assessments", label: "Assessments", path: "/pto/assessments", icon: FaClipboardList },
      { id: "students", label: "Students", path: "/pto/students", icon: FaUserGraduate },
      { id: "reports", label: "Reports & Analytics", path: "/pto/reports", icon: FaChartBar },
      { id: "profile", label: "Profile", path: "/pto/profile", icon: FaUserCircle },
    ],
    []
  );

  /* ✅ Activate tab on URL change */
  useEffect(() => {
    const currentPath = location.pathname;

    if (currentPath === "/") {
      navigate("/pto", { replace: true });
      return;
    }

    const matchedItem = navItems.find((item) => {
      if (item.path === "/pto" && (currentPath === "/pto" || currentPath === "/pto/"))
        return true;
      if (item.path !== "/pto" && currentPath.startsWith(item.path)) return true;
      return false;
    });

    setActiveTab(matchedItem ? matchedItem.id : "dashboard");
  }, [location, navItems]);

  /* ✅ Logout */
  const handleLogout = () => navigate("/");

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const [avatarUrl, setAvatarUrl] = useState<string>(
    (typeof window !== 'undefined' ? localStorage.getItem('ptoProfilePictureUrl') : null) ||
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'
  );

  useEffect(() => {
    const update = () => {
      const url = localStorage.getItem('ptoProfilePictureUrl');
      if (url) setAvatarUrl(url);
    };
    update();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'ptoProfilePictureUrl') update();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);


  return (
    <div className="pto-dashboard">
      {/* ✅ Mobile Hamburger */}
      <button className="hamburger-menu" onClick={toggleSidebar}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* ✅ Sidebar */}
      <nav className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <FaUserCircle size={48} color="#ffffff" />
          </div>
          <h2>PTO Portal</h2>
        </div>

        <ul className="sidebar-menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={`sidebar-link ${activeTab === item.id ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    closeSidebar();
                  }}
                >
                  <Icon className="sidebar-icon" />
                  <span className="sidebar-label">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-footer">
          <button
            className="logout-btn"
            onClick={() => {
              handleLogout();
              closeSidebar();
            }}
          >
            <FaSignOutAlt className="sidebar-icon" />
            <span className="sidebar-label">Logout</span>
          </button>
        </div>
      </nav>

      {/* ✅ Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      {/* ✅ MAIN - Matching  Structure Exactly */}
      <div className="pto-main-content">
        {/* Header - Full Width, No Padding on Parent */}
        <header className="pto-header">
          <h1 className="pto-header-title">
            {navItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
          </h1>
          <div
            className="pto-user-info"
            onClick={() => navigate('/pto/profile')}
            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            title="Go to Profile Settings"
          >
            <img
              src={avatarUrl}
              alt="Profile"
              className="pto-user-avatar"
            />
            <div className="pto-user-details">
              <p className="pto-user-name">{loading ? 'Loading...' : (user?.name || 'PTO Administrator')}</p>
              <p className="pto-user-role">PTO</p>
            </div>
          </div>
        </header>

        {/* Content Container - With Padding */}
        <main className="pto-content">
          <Routes>
            <Route index element={<DashboardHome />} />
            <Route path="departments" element={<DepartmentManagement />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="assessments" element={<AssessmentManagement />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="reports" element={<ReportsAnalytics />} />
            <Route path="profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default memo(PTODashboard);
