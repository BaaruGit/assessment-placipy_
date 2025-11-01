import React from 'react';

const DashboardHome: React.FC = () => {
  // Mock data
  const stats = [
    { title: 'Active Tests', value: 3, change: '+2 from last week' },
    { title: 'Completed Tests', value: 12, change: '+3 from last month' },
    { title: 'Average Score', value: '82%', change: '+5% improvement' },
    { title: 'Ranking', value: '5th', change: 'In your department' },
  ];

  const assessments = [
    { id: 1, name: 'Mathematics Quiz', status: 'active', progress: 60 },
    { id: 2, name: 'Physics Test', status: 'upcoming', progress: 0 },
    { id: 3, name: 'Chemistry Exam', status: 'completed', progress: 100 },
  ];

  const performanceData = [
    { subject: 'Mathematics', score: 85 },
    { subject: 'Physics', score: 78 },
    { subject: 'Chemistry', score: 92 },
    { subject: 'Biology', score: 88 },
  ];

  return (
    <div className="dashboard-home">
      {/* Welcome container with primary color */}
      <div className="welcome-container">
        <h1>Welcome to Your Dashboard</h1>
        <p>John Doe, you have 3 active assessments waiting for you.</p>
        
      </div>

      

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div className="stat-card" key={index}>
            <h3>{stat.title}</h3>
            <p className="stat-value">{stat.value}</p>
            <p className="stat-change">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="assessments-section">
        <h2>Recent Assessments</h2>
        <div className="assessments-list">
          {assessments.map(assessment => (
            <div className="assessment-card" key={assessment.id}>
              <div className="assessment-header">
                <h3>{assessment.name}</h3>
                <span className={`status-badge ${assessment.status}`}>
                  {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                </span>
              </div>
              <div className="progress-container">
                <span>Progress:</span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${assessment.progress}%` }}
                  ></div>
                </div>
                <span>{assessment.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="performance-section">
        <h2>Performance Summary</h2>
        <div className="chart-container">
          <div className="performance-bars">
            {performanceData.map((subject, index) => (
              <div className="performance-bar" key={index}>
                <div 
                  className="bar-fill" 
                  style={{ height: `${subject.score}%` }}
                ></div>
                <span className="subject-name">{subject.subject}</span>
                <span className="score-value">{subject.score}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;