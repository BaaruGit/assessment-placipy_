import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AdminService from '../../services/admin.service';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collegeReports, setCollegeReports] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [colleges, performance] = await Promise.all([
        AdminService.getCollegeReports(),
        AdminService.getPerformanceReport()
      ]);

      setCollegeReports(colleges);
      setPerformanceData(performance);
    } catch (err: any) {
      setError(err.message || 'Failed to load reports data');
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReportsData();
    setRefreshing(false);
  };

  // Process data for charts
  const collegePerformance = collegeReports.map(college => ({
    name: college.name,
    students: college.totalStudents || 0,
    assessments: college.totalAssessments || 0,
    completion: college.completionRate || 0
  }));

  const assessmentStats = performanceData?.monthlyStats || [];
  
  const statusData = performanceData?.statusDistribution ? [
    { name: 'Completed', value: performanceData.statusDistribution.completed || 0, color: '#9768E1' },
    { name: 'In Progress', value: performanceData.statusDistribution.inProgress || 0, color: '#E4D5F8' },
    { name: 'Pending', value: performanceData.statusDistribution.pending || 0, color: '#D0BFE7' },
  ] : [];

  const handleExportExcel = async () => {
    if (exportingExcel) return;
    
    try {
      setExportingExcel(true);
      
      // Create workbook with multiple sheets
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: College Performance Summary
      const collegeData = collegeReports.map(college => ({
        'College Name': college.name,
        'Total Students': college.totalStudents || 0,
        'Total Assessments': college.totalAssessments || 0,
        'Completion Rate (%)': Math.round((college.completionRate || 0) * 100),
        'Active Officers': college.activeOfficers || 0,
        'Status': college.active ? 'Active' : 'Inactive',
        'Created Date': college.createdAt ? new Date(college.createdAt).toLocaleDateString() : 'N/A'
      }));
      
      const ws1 = XLSX.utils.json_to_sheet(collegeData);
      XLSX.utils.book_append_sheet(wb, ws1, 'College Performance');
      
      // Sheet 2: Assessment Statistics
      if (performanceData?.monthlyStats) {
        const assessmentData = performanceData.monthlyStats.map((stat: any) => ({
          'Month': stat.month,
          'Total Assessments': stat.total,
          'Completed': stat.completed,
          'Completion Rate (%)': Math.round((stat.completed / stat.total) * 100) || 0
        }));
        
        const ws2 = XLSX.utils.json_to_sheet(assessmentData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Monthly Stats');
      }
      
      // Sheet 3: Overall Summary
      const summaryData = [{
        'Total Colleges': collegeReports.length,
        'Total Students': collegeReports.reduce((sum, c) => sum + (c.totalStudents || 0), 0),
        'Total Assessments': collegeReports.reduce((sum, c) => sum + (c.totalAssessments || 0), 0),
        'Average Completion Rate (%)': Math.round(
          collegeReports.reduce((sum, c) => sum + (c.completionRate || 0), 0) / collegeReports.length * 100
        ) || 0,
        'Generated On': new Date().toLocaleString()
      }];
      
      const ws3 = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Summary');
      
      // Generate filename with timestamp
      const fileName = `Assessment_Reports_${new Date().toISOString().split('T')[0]}.xlsx`;
      
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
      pdf.text('Assessment Platform - Reports', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Date
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;
      
      // Summary Section
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary', margin, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const summaryText = [
        `Total Colleges: ${collegeReports.length}`,
        `Total Students: ${collegeReports.reduce((sum, c) => sum + (c.totalStudents || 0), 0)}`,
        `Total Assessments: ${collegeReports.reduce((sum, c) => sum + (c.totalAssessments || 0), 0)}`,
        `Average Completion Rate: ${Math.round(
          collegeReports.reduce((sum, c) => sum + (c.completionRate || 0), 0) / collegeReports.length * 100
        )}%`
      ];
      
      summaryText.forEach(text => {
        pdf.text(text, margin, yPosition);
        yPosition += 8;
      });
      
      yPosition += 10;
      
      // College Performance Table
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('College Performance', margin, yPosition);
      yPosition += 10;
      
      const tableColumns = ['College Name', 'Students', 'Assessments', 'Completion %', 'Status'];
      const tableRows = collegeReports.map(college => [
        college.name,
        (college.totalStudents || 0).toString(),
        (college.totalAssessments || 0).toString(),
        `${Math.round((college.completionRate || 0) * 100)}%`,
        college.active ? 'Active' : 'Inactive'
      ]);
      
      // Add table using autoTable
      autoTable(pdf, {
        head: [tableColumns],
        body: tableRows,
        startY: yPosition,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });
      
      // Check if we need a new page for monthly stats
      const finalY = (pdf as any).lastAutoTable?.finalY || yPosition + 50;
      if (finalY > 200) {
        pdf.addPage();
        yPosition = margin;
      } else {
        yPosition = finalY + 20;
      }
      
      // Monthly Statistics (if available)
      if (performanceData?.monthlyStats && performanceData.monthlyStats.length > 0) {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Monthly Assessment Statistics', margin, yPosition);
        yPosition += 10;
        
        const monthlyColumns = ['Month', 'Total Assessments', 'Completed', 'Completion Rate'];
        const monthlyRows = performanceData.monthlyStats.map((stat: any) => [
          stat.month,
          stat.total.toString(),
          stat.completed.toString(),
          `${Math.round((stat.completed / stat.total) * 100) || 0}%`
        ]);
        
        autoTable(pdf, {
          head: [monthlyColumns],
          body: monthlyRows,
          startY: yPosition,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 10,
            cellPadding: 3,
          },
          headStyles: {
            fillColor: [52, 152, 219],
            textColor: 255,
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          }
        });
      }
      
      // Generate filename with timestamp
      const fileName = `Assessment_Reports_${new Date().toISOString().split('T')[0]}.pdf`;
      
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
        <h2 className="admin-page-title">Reports & Analytics</h2>
        <div className="admin-export-buttons">
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

      {loading ? (
        <div className="admin-loading">
          <div className="spinner"></div>
          <p>Loading reports data...</p>
        </div>
      ) : (

      <div className="admin-reports-grid">
        {/* College Performance Chart */}
        <div className="admin-chart-card">
          <h3 className="admin-chart-title">College Performance Overview</h3>
          {collegePerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={collegePerformance}>
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
              <Bar dataKey="students" fill="#9768E1" radius={[8, 8, 0, 0]} />
              <Bar dataKey="assessments" fill="#E4D5F8" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div className="admin-empty-chart">
              <p>No college performance data available</p>
            </div>
          )}
        </div>

        {/* Assessment Statistics */}
        <div className="admin-chart-card">
          <h3 className="admin-chart-title">Assessment Statistics (Last 6 Months)</h3>
          {assessmentStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={assessmentStats}>
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
              <Line type="monotone" dataKey="assessments" stroke="#9768E1" strokeWidth={2} />
              <Line type="monotone" dataKey="completions" stroke="#E4D5F8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          ) : (
            <div className="admin-empty-chart">
              <p>No assessment statistics available</p>
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="admin-chart-card">
          <h3 className="admin-chart-title">Assessment Status Distribution</h3>
          {statusData.length > 0 && statusData.some(item => item.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name}: ${((entry.value / statusData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          ) : (
            <div className="admin-empty-chart">
              <p>No status distribution data available</p>
            </div>
          )}
        </div>

        {/* Performance Table - Spans 2 columns */}
        <div className="admin-chart-card admin-chart-card-wide">
          <h3 className="admin-chart-title">College Completion Rates</h3>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>College Name</th>
                  <th>Students</th>
                  <th>Assessments</th>
                  <th>Completion %</th>
                </tr>
              </thead>
              <tbody>
                {collegePerformance.map((college, index) => (
                  <tr key={index}>
                    <td>{college.name}</td>
                    <td>{college.students}</td>
                    <td>{college.assessments}</td>
                    <td>
                      <div className="admin-progress-container">
                        <div className="admin-progress-bar">
                          <div
                            className="admin-progress-fill"
                            style={{ width: `${college.completion}%` }}
                          ></div>
                        </div>
                        <span>{college.completion}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Performing Officers */}
        <div className="admin-chart-card">
          <h3 className="admin-chart-title">Top Performing Officers</h3>
          <div className="admin-top-performers">
            {(performanceData?.topPerformers || []).map((officer: any, index: number) => (
              <div key={index} className="admin-performer-item">
                <div className="admin-performer-rank">#{index + 1}</div>
                <div className="admin-performer-info">
                  <div className="admin-performer-name">{officer.name}</div>
                  <div className="admin-performer-college">{officer.college}</div>
                </div>
                <div className="admin-performer-score">{officer.score}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default Reports;

