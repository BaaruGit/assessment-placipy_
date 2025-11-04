import React, { useState } from 'react';
import { FaChartBar, FaChartLine, FaFileExcel, FaFilePdf, FaDownload, FaFilter } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const ReportsAnalytics: React.FC = () => {
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [reportType, setReportType] = useState('department');

  const departments = ['all', 'Computer Science', 'Electronics', 'Mechanical', 'Civil'];

  // Mock data for charts
  const departmentPerformanceData = [
    { name: 'CS', students: 450, avgScore: 82, completed: 380 },
    { name: 'ECE', students: 380, avgScore: 75, completed: 320 },
    { name: 'ME', students: 420, avgScore: 79, completed: 360 },
    { name: 'CE', students: 310, avgScore: 73, completed: 280 },
  ];

  const studentAnalyticsData = [
    { name: 'Week 1', accuracy: 75, attempts: 120 },
    { name: 'Week 2', accuracy: 78, attempts: 145 },
    { name: 'Week 3', accuracy: 82, attempts: 150 },
    { name: 'Week 4', accuracy: 80, attempts: 138 },
  ];

  const attendanceData = [
    { assessment: 'Test 1', total: 450, attended: 380, completion: 84 },
    { assessment: 'Test 2', total: 450, attended: 365, completion: 81 },
    { assessment: 'Test 3', total: 450, attended: 395, completion: 88 },
    { assessment: 'Test 4', total: 450, attended: 340, completion: 76 },
  ];

  const topPerformers = [
    { rank: 1, name: 'Alice Johnson', department: 'CS', score: 95, tests: 5 },
    { rank: 2, name: 'Diana Prince', department: 'ME', score: 92, tests: 6 },
    { rank: 3, name: 'Bob Williams', department: 'CS', score: 88, tests: 4 },
    { rank: 4, name: 'Charlie Brown', department: 'ECE', score: 85, tests: 3 },
    { rank: 5, name: 'Eve Davis', department: 'CE', score: 82, tests: 2 },
  ];

  const handleExport = (format: 'excel' | 'pdf') => {
    alert(`Exporting ${reportType} report as ${format.toUpperCase()}...`);
  };

  const filteredData = selectedDepartment === 'all' 
    ? departmentPerformanceData 
    : departmentPerformanceData.filter(d => d.name === selectedDepartment.substring(0, 3));

  return (
    <div className="pto-component-page">
      <div className="page-header">
        <h2 className="page-title">
          <FaChartBar className="page-icon" />
          Reports & Analytics
        </h2>
        <div className="header-actions">
          <div className="export-buttons">
            <button className="export-btn" onClick={() => handleExport('excel')}>
              <FaFileExcel /> Export Excel
            </button>
            <button className="export-btn" onClick={() => handleExport('pdf')}>
              <FaFilePdf /> Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <FaFilter className="filter-icon" />
          <label>Department:</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept === 'all' ? 'All Departments' : dept}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Report Type:</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="department">Department Performance</option>
            <option value="student">Student Analytics</option>
            <option value="attendance">Attendance Report</option>
          </select>
        </div>
      </div>

      {/* Department-wise Performance */}
      {reportType === 'department' && (
        <div className="reports-section">
          <div className="section-header">
            <h3 className="section-title">Department-wise Performance</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="students" fill="#9768E1" name="Total Students" />
                <Bar dataKey="avgScore" fill="#E4D5F8" name="Avg Score" />
                <Bar dataKey="completed" fill="#A4878D" name="Completed Tests" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="stats-cards">
            {filteredData.map((dept, idx) => (
              <div key={idx} className="stat-card">
                <h4>{dept.name} Department</h4>
                <div className="stat-details">
                  <div className="stat-item">
                    <span className="stat-label">Total Students:</span>
                    <span className="stat-value">{dept.students}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Average Score:</span>
                    <span className="stat-value">{dept.avgScore}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Completed Tests:</span>
                    <span className="stat-value">{dept.completed}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student-level Analytics */}
      {reportType === 'student' && (
        <div className="reports-section">
          <div className="section-header">
            <h3 className="section-title">Student-level Analytics</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={studentAnalyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="accuracy" stroke="#9768E1" name="Accuracy %" />
                <Line type="monotone" dataKey="attempts" stroke="#E4D5F8" name="Attempts" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="top-performers-section">
            <h3 className="section-title">Top Performers</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Average Score</th>
                    <th>Tests Taken</th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformers.map((performer) => (
                    <tr key={performer.rank}>
                      <td>
                        <span className={`rank-badge rank-${performer.rank}`}>
                          {performer.rank}
                        </span>
                      </td>
                      <td>{performer.name}</td>
                      <td>{performer.department}</td>
                      <td>
                        <span className={`score-badge ${performer.score >= 90 ? 'high' : performer.score >= 80 ? 'medium' : 'low'}`}>
                          {performer.score}%
                        </span>
                      </td>
                      <td>{performer.tests}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Attendance and Completion Reports */}
      {reportType === 'attendance' && (
        <div className="reports-section">
          <div className="section-header">
            <h3 className="section-title">Attendance and Completion Reports</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="assessment" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#E4D5F8" name="Total Students" />
                <Bar dataKey="attended" fill="#9768E1" name="Attended" />
                <Bar dataKey="completion" fill="#A4878D" name="Completion %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="attendance-table">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Assessment</th>
                    <th>Total Students</th>
                    <th>Attended</th>
                    <th>Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.assessment}</td>
                      <td>{item.total}</td>
                      <td>{item.attended}</td>
                      <td>
                        <div className="completion-bar">
                          <div 
                            className="completion-fill" 
                            style={{ width: `${item.completion}%` }}
                          ></div>
                          <span className="completion-text">{item.completion}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsAnalytics;

