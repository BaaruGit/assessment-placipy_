import React from 'react';
import { 
  FaUsers, 
  FaBuilding, 
  FaClipboardList, 
  FaChartLine,
  FaCalendarAlt,
  FaBell
} from 'react-icons/fa';


const DashboardHome: React.FC = () => {
  // Mock data - in real app, this would come from API
  const stats = [
    { 
      title: 'Total Students', 
      value: '2,450', 
      change: '+120 this month',
      icon: FaUsers,
      color: '#9768E1'
    },
    { 
      title: 'Departments', 
      value: '12', 
      change: 'Active departments',
      icon: FaBuilding,
      color: '#9768E1'
    },
    { 
      title: 'Active Assessments', 
      value: '8', 
      change: '5 ongoing, 3 upcoming',
      icon: FaClipboardList,
      color: '#9768E1'
    },
    { 
      title: 'Avg Performance', 
      value: '78%', 
      change: '+5% from last month',
      icon: FaChartLine,
      color: '#9768E1'
    },
  ];

  const departments = [
    { name: 'Computer Science', students: 450, assessments: 3, performance: 82 },
    { name: 'Electronics', students: 380, assessments: 2, performance: 75 },
    { name: 'Mechanical', students: 420, assessments: 4, performance: 79 },
    { name: 'Civil', students: 310, assessments: 2, performance: 73 },
  ];

  const upcomingTests = [
    { id: 1, name: 'Aptitude Test - CS', date: '2025-11-15', department: 'Computer Science', students: 450 },
    { id: 2, name: 'Technical Assessment - ECE', date: '2025-11-18', department: 'Electronics', students: 380 },
    { id: 3, name: 'Mock Interview - All', date: '2025-11-20', department: 'All Departments', students: 1560 },
  ];

  const ongoingTests = [
    { id: 1, name: 'Programming Test', department: 'Computer Science', participants: 320, duration: '2 hours' },
    { id: 2, name: 'Circuit Design', department: 'Electronics', participants: 250, duration: '1.5 hours' },
  ];

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="pto-dashboard-home">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-content">
          <div className="welcome-date">{currentDate}</div>
          <h1 className="welcome-title">Welcome back, PTO!</h1>
          <p className="welcome-subtitle">Always stay updated in your student portal.</p>
        </div>
        <div className="welcome-illustration">
          <FaUsers size={120} color="#ffffff" opacity={0.3} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-section">
        <h2 className="section-title">Overview</h2>
        <div className="stats-grid">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="stat-card">
                <div className="stat-icon-wrapper" style={{ backgroundColor: stat.color + '20' }}>
                  <IconComponent size={24} color={stat.color} />
                </div>
                <div className="stat-content">
                  <h3 className="stat-title">{stat.title}</h3>
                  <p className="stat-value">{stat.value}</p>
                  <p className="stat-change">{stat.change}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Department Performance */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Department Performance</h2>
          <button className="see-all-btn">See all</button>
        </div>
        <div className="departments-grid">
          {departments.map((dept, index) => (
            <div key={index} className="department-card">
              <div className="department-header">
                <FaBuilding size={20} color="#9768E1" />
                <h3 className="department-name">{dept.name}</h3>
              </div>
              <div className="department-stats">
                <div className="dept-stat-item">
                  <span className="dept-stat-label">Students:</span>
                  <span className="dept-stat-value">{dept.students}</span>
                </div>
                <div className="dept-stat-item">
                  <span className="dept-stat-label">Assessments:</span>
                  <span className="dept-stat-value">{dept.assessments}</span>
                </div>
                <div className="dept-stat-item">
                  <span className="dept-stat-label">Performance:</span>
                  <span className="dept-stat-value">{dept.performance}%</span>
                </div>
              </div>
              <div className="performance-bar-wrapper">
                <div className="performance-bar">
                  <div 
                    className="performance-fill" 
                    style={{ width: `${dept.performance}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming and Ongoing Tests */}
      <div className="tests-section">
        <div className="tests-column">
          <div className="section-header">
            <h2 className="section-title">Upcoming Tests</h2>
            <button className="see-all-btn">See all</button>
          </div>
          <div className="tests-list">
            {upcomingTests.map((test) => (
              <div key={test.id} className="test-card">
                <div className="test-icon">
                  <FaCalendarAlt size={18} color="#9768E1" />
                </div>
                <div className="test-content">
                  <h4 className="test-name">{test.name}</h4>
                  <p className="test-detail">{test.department}</p>
                  <p className="test-date">Date: {test.date}</p>
                  <p className="test-students">{test.students} students</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="tests-column">
          <div className="section-header">
            <h2 className="section-title">Ongoing Tests</h2>
            <button className="see-all-btn">See all</button>
          </div>
          <div className="tests-list">
            {ongoingTests.map((test) => (
              <div key={test.id} className="test-card ongoing">
                <div className="test-icon">
                  <FaClipboardList size={18} color="#9768E1" />
                </div>
                <div className="test-content">
                  <h4 className="test-name">{test.name}</h4>
                  <p className="test-detail">{test.department}</p>
                  <p className="test-participants">{test.participants} participating</p>
                  <p className="test-duration">Duration: {test.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Notice */}
      <div className="notice-section">
        <div className="section-header">
          <h2 className="section-title">Daily Notice</h2>
          <button className="see-all-btn">See all</button>
        </div>
        <div className="notices-card">
          <div className="notice-item">
            <div className="notice-icon">
              <FaBell size={18} color="#9768E1" />
            </div>
            <div className="notice-content">
              <h4 className="notice-title">Assessment Deadline Reminder</h4>
              <p className="notice-text">
                All placement assessments for November must be completed by November 30th. 
                Please ensure all students are notified.
              </p>
              <button className="see-more-btn">See more</button>
            </div>
          </div>
          <div className="notice-item">
            <div className="notice-icon">
              <FaBell size={18} color="#9768E1" />
            </div>
            <div className="notice-content">
              <h4 className="notice-title">New Assessment Format</h4>
              <p className="notice-text">
                Starting December, all assessments will follow the new format. 
                Review the updated guidelines in the Assessment Management section.
              </p>
              <button className="see-more-btn">See more</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;

