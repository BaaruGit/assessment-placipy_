import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AdminService from '../../services/admin.service';
import * as XLSX from '@e965/xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AssessmentResult {
  assessmentId: string;
  studentEmail: string;
  studentName: string;
  department: string;
  score: number;
  maxScore: number;
  percentage: number;
  accuracy: number;
  submittedAt: string;
}

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);
  const [performanceOverview, setPerformanceOverview] = useState<any>(null);
  const [departmentPerformance, setDepartmentPerformance] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<string>('all');
  const [assessmentStats, setAssessmentStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        setBackendStatus('online');
        loadReportsData();
      } else {
        setBackendStatus('offline');
        setError('Backend server is not responding. Please start the server.');
      }
    } catch (err) {
      setBackendStatus('offline');
      setError('Cannot connect to backend server. Please ensure it is running on port 3000.');
      console.error('Backend connection error:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAssessment && selectedAssessment !== 'all') {
      loadAssessmentStats(selectedAssessment);
    }
  }, [selectedAssessment]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading assessment analytics data...');

      const [results, overview, deptPerf] = await Promise.all([
        AdminService.getAssessmentResults(),
        AdminService.getPerformanceOverview(),
        AdminService.getDepartmentPerformance()
      ]);

      console.log('Assessment Results:', results);
      console.log('Performance Overview:', overview);
      console.log('Department Performance:', deptPerf);

      setAssessmentResults(results || []);
      setPerformanceOverview(overview || {});
      setDepartmentPerformance(deptPerf || []);

      if (!results || results.length === 0) {
        setError('No assessment results found. Please ensure assessments have been completed.');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load reports data';
      setError(errorMessage);
      console.error('Error loading reports:', err);
      console.error('Error details:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const loadAssessmentStats = async (assessmentId: string) => {
    try {
      const stats = await AdminService.getAssessmentStats(assessmentId);
      setAssessmentStats(stats);
    } catch (err: any) {
      console.error('Error loading assessment stats:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (backendStatus === 'offline') {
      await checkBackendConnection();
    } else {
      await loadReportsData();
    }
    setRefreshing(false);
  };

  // Get unique assessments for filter
  const uniqueAssessments = ['all', ...Array.from(new Set(assessmentResults.map(r => r.assessmentId)))];

  // Process data for charts
  const scoreDistributionData = selectedAssessment === 'all' && assessmentStats
    ? assessmentStats.scoreDistribution
    : [
        { label: '0-20%', count: assessmentResults.filter(r => r.percentage <= 20 && (selectedAssessment === 'all' || r.assessmentId === selectedAssessment)).length },
        { label: '21-40%', count: assessmentResults.filter(r => r.percentage > 20 && r.percentage <= 40 && (selectedAssessment === 'all' || r.assessmentId === selectedAssessment)).length },
        { label: '41-60%', count: assessmentResults.filter(r => r.percentage > 40 && r.percentage <= 60 && (selectedAssessment === 'all' || r.assessmentId === selectedAssessment)).length },
        { label: '61-80%', count: assessmentResults.filter(r => r.percentage > 60 && r.percentage <= 80 && (selectedAssessment === 'all' || r.assessmentId === selectedAssessment)).length },
        { label: '81-100%', count: assessmentResults.filter(r => r.percentage > 80 && (selectedAssessment === 'all' || r.assessmentId === selectedAssessment)).length }
      ];

  const assessmentBreakdownData = performanceOverview?.assessmentBreakdown?.map((a: any) => ({
    name: a.assessmentId.replace('ASSESS_', ''),
    attempts: a.totalAttempts,
    avgScore: Math.round(a.averageScore)
  })) || [];

  const deptChartData = departmentPerformance.map(dept => ({
    name: dept.department,
    avgScore: Math.round(dept.averageScore),
    students: dept.totalStudents,
    passRate: Math.round(dept.passRate)
  }));

  const performanceColors = ['#9768E1', '#E4D5F8', '#D0BFE7', '#523C48', '#FBFAFB'];

  const handleExportExcel = async () => {
    if (exportingExcel) return;
    
    try {
      setExportingExcel(true);
      
      // Create workbook with multiple sheets
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Performance Overview
      const overviewData = [{
        'Total Results': performanceOverview?.totalResults || 0,
        'Average Score': performanceOverview?.averageScore || 0,
        'Average Accuracy': performanceOverview?.averageAccuracy || 0,
        'Pass Rate (%)': performanceOverview?.passRate || 0,
        'Generated On': new Date().toLocaleString()
      }];
      
      const ws1 = XLSX.utils.json_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Overview');
      
      // Sheet 2: Department Performance
      const deptData = departmentPerformance.map(dept => ({
        'Department': dept.department,
        'Total Students': dept.totalStudents,
        'Total Attempts': dept.totalAttempts,
        'Average Score': Math.round(dept.averageScore * 100) / 100,
        'Highest Score': dept.highestScore,
        'Lowest Score': dept.lowestScore,
        'Pass Rate (%)': dept.passRate
      }));
      
      const ws2 = XLSX.utils.json_to_sheet(deptData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Department Performance');
      
      // Sheet 3: Top Performers
      if (performanceOverview?.topPerformers) {
        const topPerformersData = performanceOverview.topPerformers.map((p: any, idx: number) => ({
          'Rank': idx + 1,
          'Student Name': p.name,
          'Email': p.email,
          'Department': p.department,
          'Average Score': Math.round(p.averageScore * 100) / 100,
          'Total Attempts': p.totalAttempts
        }));
        
        const ws3 = XLSX.utils.json_to_sheet(topPerformersData);
        XLSX.utils.book_append_sheet(wb, ws3, 'Top Performers');
      }
      
      // Sheet 4: All Results
      const resultsData = assessmentResults.map(result => ({
        'Assessment ID': result.assessmentId,
        'Student Name': result.studentName,
        'Email': result.studentEmail,
        'Department': result.department,
        'Score': result.score,
        'Max Score': result.maxScore,
        'Percentage': result.percentage,
        'Accuracy': result.accuracy,
        'Submitted At': new Date(result.submittedAt).toLocaleString()
      }));
      
      const ws4 = XLSX.utils.json_to_sheet(resultsData);
      XLSX.utils.book_append_sheet(wb, ws4, 'All Results');
      
      // Generate filename with timestamp
      const fileName = `Assessment_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Download the file
      XLSX.writeFile(wb, fileName);
      
      alert('Excel report exported successfully!');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel report. Please try again.');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    if (exportingPDF) return;
    
    try {
      setExportingPDF(true);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let yPosition = margin;
      
      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Assessment Analytics Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Date
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;
      
      // Performance Overview Section
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Performance Overview', margin, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const overviewText = [
        `Total Results: ${performanceOverview?.totalResults || 0}`,
        `Average Score: ${performanceOverview?.averageScore || 0}%`,
        `Average Accuracy: ${performanceOverview?.averageAccuracy || 0}%`,
        `Pass Rate: ${performanceOverview?.passRate || 0}%`
      ];
      
      overviewText.forEach(text => {
        pdf.text(text, margin, yPosition);
        yPosition += 8;
      });
      
      yPosition += 10;
      
      // Department Performance Table
      if (departmentPerformance.length > 0) {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Department Performance', margin, yPosition);
        yPosition += 10;
        
        const deptColumns = ['Department', 'Students', 'Avg Score', 'Pass Rate'];
        const deptRows = departmentPerformance.map(dept => [
          dept.department,
          dept.totalStudents.toString(),
          `${Math.round(dept.averageScore)}%`,
          `${Math.round(dept.passRate)}%`
        ]);
        
        autoTable(pdf, {
          head: [deptColumns],
          body: deptRows,
          startY: yPosition,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 10,
            cellPadding: 3,
          },
          headStyles: {
            fillColor: [151, 104, 225],
            textColor: 255,
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          }
        });
        
        yPosition = (pdf as any).lastAutoTable?.finalY + 20 || yPosition + 50;
      }
      
      // Top Performers
      if (performanceOverview?.topPerformers && performanceOverview.topPerformers.length > 0) {
        if (yPosition > 200) {
          pdf.addPage();
          yPosition = margin;
        }
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Top 10 Performers', margin, yPosition);
        yPosition += 10;
        
        const performerColumns = ['Rank', 'Name', 'Department', 'Avg Score'];
        const performerRows = performanceOverview.topPerformers.slice(0, 10).map((p: any, idx: number) => [
          (idx + 1).toString(),
          p.name,
          p.department,
          `${Math.round(p.averageScore)}%`
        ]);
        
        autoTable(pdf, {
          head: [performerColumns],
          body: performerRows,
          startY: yPosition,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 10,
            cellPadding: 3,
          },
          headStyles: {
            fillColor: [151, 104, 225],
            textColor: 255,
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          }
        });
      }
      
      // Generate filename with timestamp
      const fileName = `Assessment_Analytics_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Download the PDF
      pdf.save(fileName);
      
      alert('PDF report exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF report. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Assessment Analytics & Reports</h2>
          <div className="admin-status-indicator">
            {backendStatus === 'checking' && <span className="status-badge checking">🔄 Checking connection...</span>}
            {backendStatus === 'online' && <span className="status-badge online">✅ Backend Online</span>}
            {backendStatus === 'offline' && <span className="status-badge offline">❌ Backend Offline</span>}
          </div>
        </div>
        <div className="admin-export-buttons">
          <select 
            className="admin-assessment-filter"
            value={selectedAssessment}
            onChange={(e) => setSelectedAssessment(e.target.value)}
          >
            <option value="all">All Assessments</option>
            {uniqueAssessments.filter(a => a !== 'all').map(assessmentId => (
              <option key={assessmentId} value={assessmentId}>{assessmentId}</option>
            ))}
          </select>
          <button 
            className="admin-btn-export" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
          <button 
            className="admin-btn-export" 
            onClick={handleExportExcel}
            disabled={exportingExcel || loading}
          >
            {exportingExcel ? '📊 Exporting...' : '📊 Export Excel'}
          </button>
          <button 
            className="admin-btn-export" 
            onClick={handleExportPDF}
            disabled={exportingPDF || loading}
          >
            {exportingPDF ? '📄 Exporting...' : '📄 Export PDF'}
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {!loading && !error && assessmentResults.length === 0 && (
        <div className="admin-info-banner">
          <h3>📊 No Assessment Data Available</h3>
          <p>There are currently no assessment results to display. This could be because:</p>
          <ul>
            <li>No assessments have been completed yet</li>
            <li>The backend server may not be running (Status: <strong>{backendStatus}</strong>)</li>
            <li>Database connection issues</li>
          </ul>
          <p><strong>Steps to resolve:</strong></p>
          <ol>
            <li><strong>Start Backend Server:</strong> Open terminal in <code>backend/</code> folder and run <code>npm start</code></li>
            <li><strong>Check Port:</strong> Ensure backend is running on <code>http://localhost:3000</code></li>
            <li><strong>Verify Data:</strong> Check that DynamoDB has assessment results with SK pattern <code>RESULT#ASSESSMENT#*</code></li>
            <li><strong>Check Console:</strong> Open browser DevTools (F12) and check Console tab for error details</li>
          </ol>
          <button className="admin-btn-primary" onClick={handleRefresh}>
            🔄 Check Connection & Reload
          </button>
        </div>
      )}

      {loading ? (
        <div className="admin-loading">
          <div className="spinner"></div>
          <p>Loading assessment analytics...</p>
        </div>
      ) : assessmentResults.length > 0 ? (

      <div className="admin-reports-container">
        {/* Summary Cards */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ backgroundColor: '#9768E1' }}>📊</div>
            <div className="admin-stat-info">
              <h3>{performanceOverview?.totalResults || 0}</h3>
              <p>Total Results</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ backgroundColor: '#E4D5F8' }}>📈</div>
            <div className="admin-stat-info">
              <h3>{performanceOverview?.averageScore || 0}%</h3>
              <p>Average Score</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ backgroundColor: '#D0BFE7' }}>🎯</div>
            <div className="admin-stat-info">
              <h3>{performanceOverview?.passRate || 0}%</h3>
              <p>Pass Rate</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ backgroundColor: '#523C48' }}>⏱️</div>
            <div className="admin-stat-info">
              <h3>{Math.floor((performanceOverview?.averageTimeSpent || 0) / 60)}m</h3>
              <p>Avg Time Spent</p>
            </div>
          </div>
        </div>

        <div className="admin-reports-grid">
          {/* Score Distribution Chart */}
          <div className="admin-chart-card">
            <h3 className="admin-chart-title">Score Distribution</h3>
            {scoreDistributionData && scoreDistributionData.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoreDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D0BFE7" />
                  <XAxis dataKey="label" stroke="#523C48" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#523C48" style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FBFAFB',
                      border: '1px solid #D0BFE7',
                      borderRadius: '8px',
                      color: '#523C48'
                    }}
                  />
                  <Bar dataKey="count" fill="#9768E1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="admin-empty-chart">
                <p>No score distribution data available</p>
              </div>
            )}
          </div>

          {/* Assessment Breakdown */}
          <div className="admin-chart-card">
            <h3 className="admin-chart-title">Assessment Performance</h3>
            {assessmentBreakdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={assessmentBreakdownData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D0BFE7" />
                  <XAxis dataKey="name" stroke="#523C48" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#523C48" style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FBFAFB',
                      border: '1px solid #D0BFE7',
                      borderRadius: '8px',
                      color: '#523C48'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="attempts" fill="#E4D5F8" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="avgScore" fill="#9768E1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="admin-empty-chart">
                <p>No assessment data available</p>
              </div>
            )}
          </div>

          {/* Department Performance Chart */}
          <div className="admin-chart-card">
            <h3 className="admin-chart-title">Department Performance</h3>
            {deptChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deptChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#D0BFE7" />
                  <XAxis type="number" stroke="#523C48" style={{ fontSize: '11px' }} />
                  <YAxis dataKey="name" type="category" stroke="#523C48" style={{ fontSize: '10px' }} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FBFAFB',
                      border: '1px solid #D0BFE7',
                      borderRadius: '8px',
                      color: '#523C48'
                    }}
                  />
                  <Bar dataKey="avgScore" fill="#9768E1" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="admin-empty-chart">
                <p>No department data available</p>
              </div>
            )}
          </div>

          {/* Pass Rate Pie Chart */}
          <div className="admin-chart-card">
            <h3 className="admin-chart-title">Pass/Fail Distribution</h3>
            {performanceOverview && performanceOverview.totalResults > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Passed', value: Math.round((performanceOverview.passRate / 100) * performanceOverview.totalResults), color: '#9768E1' },
                      { name: 'Failed', value: Math.round(((100 - performanceOverview.passRate) / 100) * performanceOverview.totalResults), color: '#E4D5F8' }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[{ color: '#9768E1' }, { color: '#E4D5F8' }].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="admin-empty-chart">
                <p>No data available</p>
              </div>
            )}
          </div>

          {/* Top Performers Table */}
          <div className="admin-chart-card admin-chart-card-wide">
            <h3 className="admin-chart-title">🏆 Top 10 Performers</h3>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Avg Score</th>
                    <th>Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {(performanceOverview?.topPerformers || []).slice(0, 10).map((performer: any, index: number) => (
                    <tr key={index}>
                      <td>
                        <span className="admin-rank-badge">#{index + 1}</span>
                      </td>
                      <td>{performer.name}</td>
                      <td>{performer.department}</td>
                      <td>
                        <div className="admin-progress-container">
                          <div className="admin-progress-bar">
                            <div
                              className="admin-progress-fill"
                              style={{ width: `${performer.averageScore}%` }}
                            ></div>
                          </div>
                          <span>{Math.round(performer.averageScore)}%</span>
                        </div>
                      </td>
                      <td>{performer.totalAttempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!performanceOverview?.topPerformers || performanceOverview.topPerformers.length === 0) && (
                <div className="admin-empty-state">No top performers data available</div>
              )}
            </div>
          </div>

          {/* Department Performance Table */}
          <div className="admin-chart-card admin-chart-card-wide">
            <h3 className="admin-chart-title">Department Statistics</h3>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Students</th>
                    <th>Attempts</th>
                    <th>Avg Score</th>
                    <th>Pass Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentPerformance.map((dept, index) => (
                    <tr key={index}>
                      <td>{dept.department}</td>
                      <td>{dept.totalStudents}</td>
                      <td>{dept.totalAttempts}</td>
                      <td>{Math.round(dept.averageScore)}%</td>
                      <td>{Math.round(dept.passRate)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {departmentPerformance.length === 0 && (
                <div className="admin-empty-state">No department data available</div>
              )}
            </div>
          </div>
        </div>
      </div>
      ) : null}
    </div>
  );
};

export default Reports;