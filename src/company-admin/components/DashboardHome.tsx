import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AdminService, { type DashboardStats } from '../../services/admin.service';
import { AdminSkeletonWrapper } from './SkeletonLoader';

const DashboardHome: React.FC = () => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await AdminService.getDashboardStats();
      setDashboardStats(stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // SVG Icons for stat cards
  const CollegeIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L1 9L5 11.18V17.18L12 21L19 17.18V11.18L21 10.09V17H23V9L12 3ZM17.82 9L12 11.72L6.18 9L12 6.28L17.82 9ZM17 15.99L12 18.72L7 15.99V12.27L12 14.72L17 12.27V15.99Z" fill="currentColor"/>
    </svg>
  );

  const OfficersIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C15.05 13.06 15.06 13.08 15.07 13.09C16.21 13.92 17 15.03 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="currentColor"/>
    </svg>
  );

  const StudentsIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3ZM5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z" fill="currentColor"/>
    </svg>
  );

  const AssessmentIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM7 10H9V17H7V10ZM11 7H13V17H11V7ZM15 13H17V17H15V13Z" fill="currentColor"/>
    </svg>
  );

  const RefreshIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z" fill="currentColor"/>
    </svg>
  );

  // Real data from API or fallback to default
  const stats = dashboardStats ? [
    { title: 'Total Colleges', value: dashboardStats.totalColleges, icon: <CollegeIcon /> },
    { title: 'Total Officers', value: dashboardStats.totalOfficers, icon: <OfficersIcon /> },
    { title: 'Total Students', value: dashboardStats.totalStudents, icon: <StudentsIcon /> },
    { title: 'Active Assessments', value: dashboardStats.activeAssessments, icon: <AssessmentIcon /> },
  ] : [
    { title: 'Total Colleges', value: 0, icon: <CollegeIcon /> },
    { title: 'Total Officers', value: 0, icon: <OfficersIcon /> },
    { title: 'Total Students', value: 0, icon: <StudentsIcon /> },
    { title: 'Active Assessments', value: 0, icon: <AssessmentIcon /> },
  ];

  // Use real top colleges data from API
  const topColleges = dashboardStats?.topColleges && dashboardStats.topColleges.length > 0
    ? dashboardStats.topColleges
    : [
        { name: 'No data', assessments: 0, students: 0, completedAssessments: 0 }
      ];

  const chartData = topColleges.map(college => ({
    name: college.name.length > 15 ? college.name.substring(0, 15) + '...' : college.name,
    Assessments: college.assessments,
    Students: college.students,
    Completed: college.completedAssessments
  }));

  return (
    <AdminSkeletonWrapper loading={loading} type="admin-dashboard">
      {error ? (
        <div className="admin-dashboard-home">
          <div className="admin-error-state">
            <p>❌ Error loading dashboard: {error}</p>
            <button className="admin-btn-primary" onClick={loadDashboardData}>
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-dashboard-home">
          {/* Refresh Button */}
          <div className="admin-dashboard-header">
            <button className="admin-btn-secondary" onClick={loadDashboardData}>
              <RefreshIcon /> Refresh
            </button>
          </div>

          {/* Stats Cards */}
          <div className="admin-stats-grid">
            {stats.map((stat, index) => (
              <div className="admin-stat-card" key={index}>
                <div className="admin-stat-icon">{stat.icon}</div>
                <div className="admin-stat-content">
                  <h3 className="admin-stat-title">{stat.title}</h3>
                  <p className="admin-stat-value">{stat.value.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chart Section */}
          <div className="admin-chart-section">
            <div className="admin-chart-card">
              <h2 className="admin-section-title">
                Top 5 Active Colleges
              </h2>
              {topColleges.length > 0 && topColleges[0].name !== 'No data' ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D0BFE7" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#523C48"
                      style={{ fontSize: '12px', fontWeight: 500 }}
                    />
                    <YAxis 
                      stroke="#523C48"
                      style={{ fontSize: '12px', fontWeight: 500 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#FBFAFB', 
                        border: '1px solid #D0BFE7',
                        borderRadius: '8px',
                        color: '#523C48'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Assessments" fill="#9768E1" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="Completed" fill="#E4D5F8" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="Students" fill="#D0BFE7" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="admin-empty-chart">
                  <p>No college data available. Add colleges and assessments to see statistics.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminSkeletonWrapper>
  );
};

export default DashboardHome;

