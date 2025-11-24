import React, { useEffect, useState } from 'react';
import { FaFileExcel, FaFilePdf, FaFilter } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import PTOService from '../../services/pto.service';
import AnalyticsService from '../../services/analytics.service';

const ReportsAnalytics: React.FC = () => {
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [reportType, setReportType] = useState('department');

  const [departments, setDepartments] = useState<string[]>(['all']);

  const [departmentPerformanceData, setDeptPerf] = useState<Array<{ name: string; students: number; avgScore: number; completed: number }>>([]);
  const [studentAnalyticsData, setStudentAnalyticsData] = useState<Array<{ name: string; accuracy: number; attempts: number }>>([]);
  const [attendanceData, setAttendanceData] = useState<Array<{ assessment: string; total: number; attended: number; completion: number }>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const dash = await PTOService.getDashboard();
        const perf = dash.departmentPerformance.map((d: any) => ({ name: String(d?.code ?? d?.name ?? ''), students: Number(d?.students ?? 0), avgScore: Number(d?.avgScore ?? 0), completed: Number(d?.completed ?? 0) }));
        setDeptPerf(perf);
        const names = Array.from(new Set(perf.map(p => p.name))).map(n => String(n));
        setDepartments(['all', ...names]);

        const studentsResp = await AnalyticsService.getStudentAnalytics();
        const studentsRows = Array.isArray((studentsResp as any)?.data) ? (studentsResp as any).data : (Array.isArray(studentsResp) ? studentsResp : []);
        setStudentAnalyticsData(studentsRows.map((row: any) => ({
          name: String(row?.name ?? row?.week ?? row?.label ?? ''),
          accuracy: Number(row?.accuracy ?? row?.avgAccuracy ?? row?.score ?? 0),
          attempts: Number(row?.attempts ?? row?.totalAttempts ?? row?.count ?? 0)
        })));

        const assessResp = await AnalyticsService.getAssessmentAnalytics();
        const assessRows = Array.isArray((assessResp as any)?.data) ? (assessResp as any).data : (Array.isArray(assessResp) ? assessResp : []);
        setAttendanceData(assessRows.map((row: any) => ({
          assessment: String(row?.assessment ?? row?.title ?? row?.name ?? ''),
          total: Number(row?.total ?? row?.totalStudents ?? 0),
          attended: Number(row?.attended ?? row?.present ?? row?.participants ?? 0),
          completion: Number(row?.completion ?? row?.completionRate ?? 0)
        })));
      } catch (e: any) {
        console.error(e);
      } finally {
        // no-op
      }
    };
    load();
  }, []);

  const topPerformers = [
    { rank: 1, name: 'Alice Johnson', department: 'CS', score: 95, tests: 5 },
    { rank: 2, name: 'Diana Prince', department: 'ME', score: 92, tests: 6 },
    { rank: 3, name: 'Bob Williams', department: 'CS', score: 88, tests: 4 },
    { rank: 4, name: 'Charlie Brown', department: 'ECE', score: 85, tests: 3 },
    { rank: 5, name: 'Eve Davis', department: 'CE', score: 82, tests: 2 },
  ];

  const handleExport = (format: 'excel' | 'pdf') => {
    if (format === 'excel') {
      exportToExcel();
    } else if (format === 'pdf') {
      exportToPDF();
    }
  };

  const exportToExcel = () => {
    // Create CSV content (Excel compatible)
    let csvContent = '';
    
    if (reportType === 'department') {
      csvContent = 'Department,Total Students,Average Score,Completed Tests\n';
      filteredData.forEach(dept => {
        csvContent += `${dept.name},${dept.students},${dept.avgScore},${dept.completed}\n`;
      });
    } else if (reportType === 'student') {
      csvContent = 'Rank,Name,Department,Average Score,Tests Taken\n';
      topPerformers.forEach(performer => {
        csvContent += `${performer.rank},${performer.name},${performer.department},${performer.score},${performer.tests}\n`;
      });
    } else if (reportType === 'attendance') {
      csvContent = 'Assessment,Total Students,Attended,Completion Rate\n';
      attendanceData.forEach(item => {
        csvContent += `${item.assessment},${item.total},${item.attended},${item.completion}%\n`;
      });
    }

    // Create blob and download (CSV format - Excel compatible)
    // Add BOM for UTF-8 to ensure Excel opens it correctly
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    // Create PDF content using browser print functionality
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #523C48; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #9768E1; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Performance Report</h1>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
        <p>Department: ${selectedDepartment === 'all' ? 'All Departments' : selectedDepartment}</p>
    `;

    if (reportType === 'department') {
      htmlContent += `
        <table>
          <thead>
            <tr>
              <th>Department</th>
              <th>Total Students</th>
              <th>Average Score</th>
              <th>Completed Tests</th>
            </tr>
          </thead>
          <tbody>
      `;
      filteredData.forEach(dept => {
        htmlContent += `
          <tr>
            <td>${dept.name}</td>
            <td>${dept.students}</td>
            <td>${dept.avgScore}%</td>
            <td>${dept.completed}</td>
          </tr>
        `;
      });
      htmlContent += '</tbody></table>';
    } else if (reportType === 'student') {
      htmlContent += `
        <table>
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
      `;
      topPerformers.forEach(performer => {
        htmlContent += `
          <tr>
            <td>${performer.rank}</td>
            <td>${performer.name}</td>
            <td>${performer.department}</td>
            <td>${performer.score}%</td>
            <td>${performer.tests}</td>
          </tr>
        `;
      });
      htmlContent += '</tbody></table>';
    } else if (reportType === 'attendance') {
      htmlContent += `
        <table>
          <thead>
            <tr>
              <th>Assessment</th>
              <th>Total Students</th>
              <th>Attended</th>
              <th>Completion Rate</th>
            </tr>
          </thead>
          <tbody>
      `;
      attendanceData.forEach(item => {
        htmlContent += `
          <tr>
            <td>${item.assessment}</td>
            <td>${item.total}</td>
            <td>${item.attended}</td>
            <td>${item.completion}%</td>
          </tr>
        `;
      });
      htmlContent += '</tbody></table>';
    }

    htmlContent += `
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const filteredData = selectedDepartment === 'all' 
    ? departmentPerformanceData 
    : departmentPerformanceData.filter(d => d.name === selectedDepartment);

  return (
    <div className="pto-component-page">
      {/* Export Buttons */}
      <div className="action-buttons-section">
        <button className="export-btn" onClick={() => handleExport('excel')}>
          <FaFileExcel /> Export Excel
        </button>
        <button className="export-btn" onClick={() => handleExport('pdf')}>
          <FaFilePdf /> Export PDF
        </button>
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

