import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AdminService, { type DashboardStats } from '../../services/admin.service';

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

  // Real data from API or fallback to default
  const stats = dashboardStats ? [
    { title: 'Total Colleges', value: dashboardStats.totalColleges, icon: '🏫' },
    { title: 'Total Officers', value: dashboardStats.totalOfficers, icon: '👤' },
    { title: 'Total Students', value: dashboardStats.totalStudents, icon: '🎓' },
    { title: 'Active Assessments', value: dashboardStats.activeAssessments, icon: '📝' },
  ] : [
    { title: 'Total Colleges', value: 0, icon: '🏫' },
    { title: 'Total Officers', value: 0, icon: '👤' },
    { title: 'Total Students', value: 0, icon: '🎓' },
    { title: 'Active Assessments', value: 0, icon: '📝' },
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

  if (loading) {
    return (
      <div className="admin-dashboard-home">
        <div className="admin-loading-state">
          <div className="admin-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard-home">
        <div className="admin-error-state">
          <p>❌ Error loading dashboard: {error}</p>
          <button className="admin-btn-primary" onClick={loadDashboardData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-home">
      {/* Refresh Button */}
      <div className="admin-dashboard-header">
        <button className="admin-btn-secondary" onClick={loadDashboardData}>
          🔄 Refresh Data
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
  );
};

export default DashboardHome;

