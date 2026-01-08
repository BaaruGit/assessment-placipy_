import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { Download } from 'lucide-react';
import AnalyticsService from '../services/analytics.service';
import { useUser } from '../contexts/UserContext';
import { getStudentByEmail } from '../services/student.service';

interface StudentPerformance {
  id: number;
  name: string;
  rollNo: string;
  department: string;
  batch: string;
  assessmentsTaken: number;
  averageScore: number;
  totalMarks: number;
  rank: number;
  lastActive: string;
}



interface AssessmentAnalytics {
  assessmentTitle: string;
  date: string;
  totalParticipants: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  completionRate: number;
  email?: string;
  studentEmail?: string;
  assessmentId?: string;
  submittedAt?: string;
  percentage?: number;
  score?: number;
  maxScore?: number;
  Name?: string;
  department?: string;
  rollNumber?: string;
  studentEmails?: string;
}

const StudentStats: React.FC = () => {
  const [selectedView, setSelectedView] = useState<'overview' | 'assessments'>('overview');
  
  const [topPerformers, setTopPerformers] = useState<StudentPerformance[]>([]);
  const [assessmentAnalytics, setAssessmentAnalytics] = useState<AssessmentAnalytics[]>([]);
  const [rawResults, setRawResults] = useState<any[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<any>({});
  // Performance trends are no longer needed for the new assessment participation chart
  // The assessmentAnalytics data will be used directly for the new chart
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrichedStudentData, setEnrichedStudentData] = useState<any[]>([]);
  
  const { user, loading: userLoading } = useUser();

  // Fetch real data from backend
  useEffect(() => {
    const fetchAnalytics = async () => {
      // Wait for user context to be loaded
      if (userLoading) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch student analytics data
        const analyticsResponse = await AnalyticsService.getStudentAnalytics();
        const analyticsData = analyticsResponse.data || {};
        
        // Process the analytics data from the updated endpoint
        
        // Set top performers
        setTopPerformers(analyticsData.topPerformers || []);
        
        // Set assessment analytics
        setAssessmentAnalytics(analyticsData.assessments || []);
        
        // Set raw results for attempt report
        setRawResults(analyticsData.rawResults || []);
        
        // Store the analytics summary data from backend
        setAnalyticsSummary(analyticsData);
        

        
        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching analytics:', error);
        setError(error.message || 'Failed to load analytics data');
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [userLoading]);

  // Fetch roll numbers for attempt report students
  useEffect(() => {
    const fetchStudentRollNumbers = async () => {
      if (rawResults.length === 0) {
        setEnrichedStudentData([]);
        return;
      }
      
      // Group attempts by student (email)
      const attemptsByStudent: Record<string, any[]> = {};
      rawResults.forEach((result: any) => {
        const email = result.email || result.studentEmail || 'Unknown';
        if (!attemptsByStudent[email]) {
          attemptsByStudent[email] = [];
        }
        attemptsByStudent[email].push(result);
      });
      
      // Create student data with roll numbers fetched from student management
      const studentDataPromises = Object.entries(attemptsByStudent)
        .map(async ([email, results]) => {
          let rollNumber = 'N/A';
          try {
            // Fetch student details from student management system
            const studentDetails = await getStudentByEmail(email);
            rollNumber = studentDetails.rollNumber || 'N/A';
          } catch (error) {
            console.warn(`Could not fetch roll number for ${email}:`, error);
            // Fallback to any roll number in the results if available
            rollNumber = results[0]?.rollNumber || 'N/A';
          }
          
          return {
            email,
            rollNumber,
            attempts: results.length,
            totalScore: results.reduce((sum, r) => sum + (r.percentage || 0), 0),
            averageScore: results.length > 0 ? 
              results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length : 0
          };
        });
      
      // Wait for all student data to be fetched
      const studentData = await Promise.all(studentDataPromises);
      
      // Sort and limit to top 10 students
      const sortedStudentData = studentData
        .sort((a, b) => b.attempts - a.attempts)
        .slice(0, 10);
        
      setEnrichedStudentData(sortedStudentData);
    };
    
    fetchStudentRollNumbers();
  }, [rawResults]);

  const getOverallStats = () => {
    // Use data directly from the backend analytics response
    // The backend already returns the correct aggregated data
    
    // Use values from backend if available, otherwise calculate from frontend data
    const totalStudents = analyticsSummary.totalStudents || topPerformers.length;
    const totalActive = analyticsSummary.activeStudents || topPerformers.filter(student => student.assessmentsTaken > 0).length;
    const totalAssessments = analyticsSummary.totalAssessments || topPerformers.reduce((sum, student) => sum + student.assessmentsTaken, 0);
    const avgScore = analyticsSummary.avgScore || (totalActive > 0 ? topPerformers.reduce((sum, student) => sum + (student.averageScore || 0), 0) / totalActive : 0);
    
    return {
      totalStudents,
      totalActive,
      totalAssessments,
      avgScore: Math.round(avgScore * 10) / 10,
      participationRate: totalStudents > 0 ? Math.round((totalActive / totalStudents) * 100 * 10) / 10 : 0
    };
  };

  const overallStats = getOverallStats();

  const COLORS = ['#9768E1', '#523C48', '#A4878D', '#E4D5F8', '#D0BFE7'];

  const handleExportStudents = () => {
    try {
      // Create CSV content
      let csvContent = "Name,Roll No,Department,Average Score,Assessments Taken\n";
      
      topPerformers.forEach(student => {
        csvContent += `${student.name},${student.rollNo},${student.department},${student.averageScore},${student.assessmentsTaken}\n`;
      });
      
      // Add top performers section
      csvContent += "\nTop Performers\n";
      csvContent += "Rank,Name,Roll No,Department,Average Score,Assessments Taken\n";
      
      topPerformers.forEach(student => {
        csvContent += `${student.rank},${student.name},${student.rollNo},${student.department},${student.averageScore},${student.assessmentsTaken}\n`;
      });
      
      // Add assessment analytics section
      csvContent += "\nAssessment Analytics\n";
      csvContent += "Assessment Title,Date,Participants,Average Score,Highest Score,Lowest Score\n";
      
      assessmentAnalytics.forEach(assessment => {
        csvContent += `${assessment.assessmentTitle},${assessment.date},${assessment.totalParticipants},${assessment.averageScore},${assessment.highestScore},${assessment.lowestScore}\n`;
      });
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'student_analytics.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const renderOverviewTab = () => (
    <div className="pts-fade-in">
      {/* Key Metrics */}
      <div className="pts-stats-grid">
        <div className="pts-stat-card">
          <h3>Total Students</h3>
          <div className="pts-stat-value">{overallStats.totalStudents}</div>
          <div className="pts-stat-change">All students</div>
        </div>
        <div className="pts-stat-card">
          <h3>Active Students</h3>
          <div className="pts-stat-value">{overallStats.totalActive}</div>
          <div className="pts-stat-change">{overallStats.participationRate}% of total</div>
        </div>
        <div className="pts-stat-card">
          <h3>Total Assessments</h3>
          <div className="pts-stat-value">{overallStats.totalAssessments}</div>
          <div className="pts-stat-change">Taken by students</div>
        </div>
        <div className="pts-stat-card">
          <h3>Average Score</h3>
          <div className="pts-stat-value">{overallStats.avgScore}%</div>
          <div className="pts-stat-change">Overall average</div>
        </div>
      </div>

      {/* Assessment Participation Trend */}
      <div className="pts-form-container">
        <h3 className="pts-form-title">Top Assessment Participation Trend</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={assessmentAnalytics
              .map(assessment => ({
                name: assessment.assessmentTitle,
                participants: assessment.totalParticipants
              }))
              .sort((a, b) => b.participants - a.participants)
              .slice(0, 10)
            }
            margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }} 
              angle={-45} 
              textAnchor="end" 
              height={100} 
            />
            <YAxis type="number" domain={[0, 10]} tickCount={6} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="participants" fill="#9768E1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ marginTop: "10px", fontSize: "0.9rem", color: "#A4878D", fontStyle: "italic" }}>
          Note: Shows the top 10 assessments by student participation count
        </div>
      </div>

      {/* Performance Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
        <div className="pts-form-container">
          <h3 className="pts-form-title">Top Performers</h3>
          <div style={{ maxHeight: "250px", overflowY: "auto" }}>
            {topPerformers.slice(0, 5).map((student: StudentPerformance, index: number) => (
              <div key={student.id} style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                padding: "10px",
                borderBottom: "1px solid #e9ecef",
                backgroundColor: index < 3 ? "#f8f9fa" : "transparent"
              }}>
                <div>
                  <div style={{ fontWeight: "600", color: "#523C48" }}>
                    #{student.rank} {student.name}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#A4878D" }}>
                    {student.department} • {student.rollNo}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: "600", color: "#9768E1" }}>
                    {student.averageScore}%
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#A4878D" }}>
                    {student.assessmentsTaken} tests
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );



  const renderAssessmentsTab = () => {
    // Calculate attempt report data
    const totalAttempts = rawResults.length;
    
    // Group attempts by student (email) - needed for stats
    const attemptsByStudent: Record<string, any[]> = {};
    rawResults.forEach((result: any) => {
      const email = result.email || result.studentEmail || 'Unknown';
      if (!attemptsByStudent[email]) {
        attemptsByStudent[email] = [];
      }
      attemptsByStudent[email].push(result);
    });
    
    // Group attempts by assessment
    const attemptsByAssessment: Record<string, any[]> = {};
    rawResults.forEach((result: any) => {
      const assessmentId = result.assessmentId || result.assessmentTitle || 'Unknown';
      if (!attemptsByAssessment[assessmentId]) {
        attemptsByAssessment[assessmentId] = [];
      }
      attemptsByAssessment[assessmentId].push(result);
    });
    
    // Group attempts by date (for trend analysis)
    const attemptsByDate: Record<string, any[]> = {};
    rawResults.forEach((result: any) => {
      const date = result.submittedAt ? new Date(result.submittedAt).toLocaleDateString() : 'Unknown';
      if (!attemptsByDate[date]) {
        attemptsByDate[date] = [];
      }
      attemptsByDate[date].push(result);
    });
    
    // Prepare data for charts
    const trendData = Object.entries(attemptsByDate)
      .map(([date, results]) => ({ date, count: results.length }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Use enriched student data with roll numbers from student management
    const studentData = enrichedStudentData;
    
    const assessmentData = Object.entries(attemptsByAssessment)
      .map(([assessmentId, results]) => ({
        assessmentId,
        attempts: results.length,
        totalScore: results.reduce((sum, r) => sum + (r.percentage || 0), 0),
        averageScore: results.length > 0 ? 
          results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length : 0,
        studentEmails: [...new Set(results.map(r => r.email || r.studentEmail || 'Unknown'))].join(', ')
      }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 10); // Top 10 assessments
    
    return (
      <div className="pts-fade-in">
        <div className="pts-form-container">
          <h3 className="pts-form-title">Assessment-wise </h3>
          
          {/* Attempt Overview Stats - using PTO style */}
          <div className="stats-cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "30px" }}>
            <div className="stat-card" style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              border: "1px solid #e9ecef",
              minHeight: "120px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              <div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "1.3rem", fontWeight: "600", color: "#523C48" }}>Total Attempts</h4>
                <div style={{ fontSize: "1.7rem", fontWeight: "bold", color: "#9768E1", marginBottom: "4px" }}>{totalAttempts}</div>
              </div>
              <div style={{ fontSize: "1rem", color: "#A4878D" }}>
                All assessment attempts
              </div>
            </div>
                      
            <div className="stat-card" style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              border: "1px solid #e9ecef",
              minHeight: "120px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              <div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "1.3rem", fontWeight: "600", color: "#523C48" }}>Active Students</h4>
                <div style={{ fontSize: "1.7rem", fontWeight: "bold", color: "#9768E1", marginBottom: "4px" }}>{Object.keys(attemptsByStudent).length}</div>
              </div>
              <div style={{ fontSize: "1rem", color: "#A4878D" }}>
                Who attempted assessments
              </div>
            </div>
                      
            <div className="stat-card" style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              border: "1px solid #e9ecef",
              minHeight: "120px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              <div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "1.3rem", fontWeight: "600", color: "#523C48" }}>Assessments</h4>
                <div style={{ fontSize: "1.7rem", fontWeight: "bold", color: "#9768E1", marginBottom: "4px" }}>{Object.keys(attemptsByAssessment).length}</div>
              </div>
              <div style={{ fontSize: "1rem", color: "#A4878D" }}>
                With at least one attempt
              </div>
            </div>
                      
            <div className="stat-card" style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              border: "1px solid #e9ecef",
              minHeight: "120px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              <div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "1.3rem", fontWeight: "600", color: "#523C48" }}>Avg. Attempts/Student</h4>
                <div style={{ fontSize: "1.7rem", fontWeight: "bold", color: "#9768E1", marginBottom: "4px" }}>
                  {Object.keys(attemptsByStudent).length > 0 ? 
                    Math.round((totalAttempts / Object.keys(attemptsByStudent).length) * 100) / 100 : 0}
                </div>
              </div>
              <div style={{ fontSize: "1rem", color: "#A4878D" }}>
                Per active student
              </div>
            </div>
          </div>
          
          {/* Attempt Trend Chart */}
          <h3 className="pts-form-title" style={{ marginTop: "30px" }}>Attempt Trend</h3>
          <div className="chart-container" style={{
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            border: "1px solid #e9ecef",
            padding: "20px",
            marginBottom: "30px"
          }}>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={100} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#9768E1" fill="#E4D5F8" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Attempts by Student */}
          <h3 className="pts-form-title" style={{ marginTop: "30px" }}>Top Students by Attempts</h3>
          <div className="table-container" style={{
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            border: "1px solid #e9ecef",
            overflow: "hidden",
            marginBottom: "30px",
            maxWidth: "700px"  /* Expanded to accommodate new column */
          }}>
            <table className="data-table" style={{
              width: "100%",
              borderCollapse: "collapse"
            }}>
              <thead style={{
                backgroundColor: "#9768E1",
                color: "white"
              }}>
                <tr>
                  <th style={{ padding: "16px", textAlign: "left", width: "40%", fontSize: "1.1rem" }}>Student Email</th>
                  <th style={{ padding: "16px", textAlign: "center", width: "30%", fontSize: "1.1rem" }}>Roll No</th>
                  <th style={{ padding: "16px", textAlign: "center", width: "30%", fontSize: "1.1rem" }}>Attempts</th>

                </tr>
              </thead>
              <tbody>
                {studentData.length > 0 ? (
                  studentData.map((student, index) => (
                    <tr key={index} style={{
                      backgroundColor: index % 2 === 0 ? "#f9f9f9" : "white",
                      borderBottom: "1px solid #ddd"
                    }}>
                      <td style={{ padding: "16px", wordBreak: "break-word", fontSize: "1rem" }}>{student.email}</td>
                      <td style={{ padding: "16px", textAlign: "center", fontSize: "1rem" }}>{student.rollNumber}</td>
                      <td style={{ padding: "16px", textAlign: "center", fontWeight: "600", color: "#9768E1", fontSize: "1rem" }}>{student.attempts}</td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{
                      padding: "40px",
                      textAlign: "center",
                      fontStyle: "italic",
                      color: "#A4878D"
                    }}>
                      No student attempts recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Assessment-wise Pass/Fail Analysis */}
          <h3 className="pts-form-title" style={{ marginTop: "30px" }}>Assessment-wise Pass/Fail Analysis</h3>
          <div className="table-container" style={{
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            border: "1px solid #e9ecef",
            overflow: "hidden",
            marginBottom: "30px",
            maxWidth: "1400px"
          }}>
            <table className="data-table" style={{
              width: "100%",
              borderCollapse: "collapse"
            }}>
              <thead style={{
                backgroundColor: "#9768E1",
                color: "white"
              }}>
                <tr>
                  <th style={{ padding: "16px", textAlign: "left", width: "25%", fontSize: "1.1rem" }}>Assessment</th>
                  <th style={{ padding: "16px", textAlign: "left", width: "25%", fontSize: "1.1rem" }}>Student</th>
                  <th style={{ padding: "16px", textAlign: "center", width: "15%", fontSize: "1.1rem" }}>Score</th>
                  <th style={{ padding: "16px", textAlign: "center", width: "15%", fontSize: "1.1rem" }}>Pass/Fail</th>
                  <th style={{ padding: "16px", textAlign: "center", width: "20%", fontSize: "1.1rem" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rawResults.length > 0 ? (
                  rawResults.map((result, index) => {
                    // Determine pass/fail based on score
                    const score = result.percentage || (result.score && result.maxScore ? 
                      (result.score / result.maxScore) * 100 : 0);
                    const isPass = score >= 50; // Assuming 50% is the pass threshold
                    
                    return (
                      <tr key={index} style={{
                        backgroundColor: index % 2 === 0 ? "#f9f9f9" : "white",
                        borderBottom: "1px solid #ddd"
                      }}>
                        <td style={{ padding: "16px", wordBreak: "break-word", fontSize: "1rem" }}>{result.assessmentTitle || result.assessmentId || 'N/A'}</td>
                        <td style={{ padding: "16px", wordBreak: "break-word", fontSize: "1rem" }}>{result.email || result.studentEmail || 'N/A'}</td>
                        <td style={{ padding: "16px", textAlign: "center", fontWeight: "600", fontSize: "1rem" }}>{score.toFixed(2)}%</td>
                        <td style={{ padding: "16px", textAlign: "center" }}>
                          <span style={{
                            padding: "6px 10px",
                            borderRadius: "4px",
                            backgroundColor: isPass ? "#d4edda" : "#f8d7da",
                            color: isPass ? "#155724" : "#721c24",
                            fontSize: "1rem"
                          }}>
                            {isPass ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                        <td style={{ padding: "16px", textAlign: "center" }}>
                          <span style={{
                            padding: "6px 10px",
                            borderRadius: "4px",
                            backgroundColor: score >= 90 ? "#d1ecf1" : score >= 75 ? "#d4edda" : score >= 60 ? "#fff3cd" : "#f8d7da",
                            color: score >= 90 ? "#0c5460" : score >= 75 ? "#155724" : score >= 60 ? "#856404" : "#721c24",
                            fontSize: "1rem"
                          }}>
                            {score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Average' : 'Below Average'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{
                      padding: "40px",
                      textAlign: "center",
                      fontStyle: "italic",
                      color: "#A4878D"
                    }}>
                      No assessment results recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="pts-fade-in">
        {/* Skeleton for Tab Navigation */}
        <div className="pts-form-container" style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "10px", marginBottom: "0", flexWrap: "wrap" }}>
            <div className="pts-skeleton pts-skeleton-button" style={{ width: "100px", height: "36px", marginBottom: "10px" }}></div>
            <div className="pts-skeleton pts-skeleton-button" style={{ width: "120px", height: "36px", marginBottom: "10px" }}></div>
            <div className="pts-skeleton pts-skeleton-button" style={{ width: "100px", height: "36px", marginBottom: "10px", marginLeft: "auto" }}></div>
          </div>
        </div>
        
        {/* Skeleton for Overview Tab */}
        {selectedView === 'overview' && (
          <div className="pts-fade-in">
            {/* Skeleton for Key Metrics */}
            <div className="pts-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "30px" }}>
              <div className="pts-skeleton pts-stat-card" style={{ padding: "20px", borderRadius: "8px", minHeight: "120px" }}>
                <div className="pts-skeleton pts-skeleton-text" style={{ height: "24px", width: "80%", marginBottom: "10px" }}></div>
                <div className="pts-skeleton pts-skeleton-number" style={{ height: "32px", width: "60%", marginBottom: "10px" }}></div>
                <div className="pts-skeleton pts-skeleton-text" style={{ height: "18px", width: "70%" }}></div>
              </div>
              <div className="pts-skeleton pts-stat-card" style={{ padding: "20px", borderRadius: "8px", minHeight: "120px" }}>
                <div className="pts-skeleton pts-skeleton-text" style={{ height: "24px", width: "80%", marginBottom: "10px" }}></div>
                <div className="pts-skeleton pts-skeleton-number" style={{ height: "32px", width: "60%", marginBottom: "10px" }}></div>
                <div className="pts-skeleton pts-skeleton-text" style={{ height: "18px", width: "70%" }}></div>
              </div>
              <div className="pts-skeleton pts-stat-card" style={{ padding: "20px", borderRadius: "8px", minHeight: "120px" }}>
                <div className="pts-skeleton pts-skeleton-text" style={{ height: "24px", width: "80%", marginBottom: "10px" }}></div>
                <div className="pts-skeleton pts-skeleton-number" style={{ height: "32px", width: "60%", marginBottom: "10px" }}></div>
                <div className="pts-skeleton pts-skeleton-text" style={{ height: "18px", width: "70%" }}></div>
              </div>
              <div className="pts-skeleton pts-stat-card" style={{ padding: "20px", borderRadius: "8px", minHeight: "120px" }}>
                <div className="pts-skeleton pts-skeleton-text" style={{ height: "24px", width: "80%", marginBottom: "10px" }}></div>
                <div className="pts-skeleton pts-skeleton-number" style={{ height: "32px", width: "60%", marginBottom: "10px" }}></div>
                <div className="pts-skeleton pts-skeleton-text" style={{ height: "18px", width: "70%" }}></div>
              </div>
            </div>
            
            {/* Skeleton for Chart */}
            <div className="pts-form-container" style={{ marginBottom: "30px" }}>
              <div className="pts-skeleton pts-skeleton-text" style={{ height: "24px", width: "80%", marginBottom: "20px" }}></div>
              <div className="pts-skeleton" style={{ width: "100%", height: "400px", borderRadius: "8px" }}></div>
            </div>
            
            {/* Skeleton for Top Performers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
              <div className="pts-form-container">
                <div className="pts-skeleton pts-skeleton-text" style={{ height: "24px", width: "60%", marginBottom: "20px" }}></div>
                <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                  {[...Array(5)].map((_, index) => (
                    <div key={index} style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      padding: "10px",
                      borderBottom: "1px solid #e9ecef",
                    }}>
                      <div>
                        <div className="pts-skeleton pts-skeleton-text" style={{ height: "20px", width: "120px", marginBottom: "8px" }}></div>
                        <div className="pts-skeleton pts-skeleton-text" style={{ height: "16px", width: "100px" }}></div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="pts-skeleton pts-skeleton-number" style={{ height: "20px", width: "60px", marginBottom: "8px" }}></div>
                        <div className="pts-skeleton pts-skeleton-text" style={{ height: "16px", width: "80px" }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Skeleton for Assessments Tab */}
        {selectedView === 'assessments' && (
          <div className="pts-fade-in">
            <div className="pts-form-container">
              {/* Skeleton for Stats Cards */}
              <div className="stats-cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "30px" }}>
                <div className="pts-skeleton stat-card" style={{
                  padding: "20px",
                  borderRadius: "8px",
                  minHeight: "120px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}>
                  <div>
                    <div className="pts-skeleton pts-skeleton-text" style={{ height: "24px", width: "80%", marginBottom: "8px" }}></div>
                    <div className="pts-skeleton pts-skeleton-number" style={{ height: "32px", width: "60%", marginBottom: "4px" }}></div>
                  </div>
                  <div className="pts-skeleton pts-skeleton-text" style={{ height: "18px", width: "70%" }}></div>
                </div>
                <div className="pts-skeleton stat-card" style={{
                  padding: "20px",
                  borderRadius: "8px",
                  minHeight: "120px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}>
                  <div>
                    <div className="pts-skeleton pts-skeleton-text" style={{ height: "24px", width: "80%", marginBottom: "8px" }}></div>
                    <div className="pts-skeleton pts-skeleton-number" style={{ height: "32px", width: "60%", marginBottom: "4px" }}></div>
                  </div>
                  <div className="pts-skeleton pts-skeleton-text" style={{ height: "18px", width: "70%" }}></div>
                </div>
                <div className="pts-skeleton stat-card" style={{
                  padding: "20px",
                  borderRadius: "8px",
                  minHeight: "120px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}>
                  <div>
                    <div className="pts-skeleton pts-skeleton-text" style={{ height: "24px", width: "80%", marginBottom: "8px" }}></div>
                    <div className="pts-skeleton pts-skeleton-number" style={{ height: "32px", width: "60%", marginBottom: "4px" }}></div>
                  </div>
                  <div className="pts-skeleton pts-skeleton-text" style={{ height: "18px", width: "70%" }}></div>
                </div>
                <div className="pts-skeleton stat-card" style={{
                  padding: "20px",
                  borderRadius: "8px",
                  minHeight: "120px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}>
                  <div>
                    <div className="pts-skeleton pts-skeleton-text" style={{ height: "24px", width: "80%", marginBottom: "8px" }}></div>
                    <div className="pts-skeleton pts-skeleton-number" style={{ height: "32px", width: "60%", marginBottom: "4px" }}></div>
                  </div>
                  <div className="pts-skeleton pts-skeleton-text" style={{ height: "18px", width: "70%" }}></div>
                </div>
              </div>
              
              {/* Skeleton for Chart */}
              <div className="pts-skeleton pts-skeleton-text" style={{ height: "24px", width: "60%", marginBottom: "20px" }}></div>
              <div className="chart-container" style={{
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "30px"
              }}>
                <div className="pts-skeleton" style={{ width: "100%", height: "400px" }}></div>
              </div>
              
              {/* Skeleton for Table */}
              <div className="pts-skeleton pts-skeleton-text" style={{ height: "24px", width: "60%", marginBottom: "20px" }}></div>
              <div className="table-container" style={{
                borderRadius: "8px",
                overflow: "hidden",
                marginBottom: "30px",
                maxWidth: "700px"
              }}>
                <div className="pts-skeleton" style={{ width: "100%", height: "300px" }}></div>
              </div>
              
              {/* Skeleton for Assessment Analysis Table */}
              <div className="pts-skeleton pts-skeleton-text" style={{ height: "24px", width: "60%", marginBottom: "20px" }}></div>
              <div className="table-container" style={{
                borderRadius: "8px",
                overflow: "hidden",
                marginBottom: "30px",
                maxWidth: "1400px"
              }}>
                <div className="pts-skeleton" style={{ width: "100%", height: "400px" }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="pts-fade-in" style={{ padding: "20px", textAlign: "center", color: "red" }}>
        <div>Error loading analytics: {error}</div>
        <button 
          onClick={() => window.location.reload()} 
          style={{ marginTop: "10px", padding: "8px 16px", backgroundColor: "#9768E1", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="pts-fade-in">
      {/* Tab Navigation */}
      <div className="pts-form-container">
        <div style={{ display: "flex", gap: "10px", marginBottom: "0", flexWrap: "wrap" }}>
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'assessments', label: 'Attempt Report' },
          ].map(tab => (
            <button
              key={tab.key}
              className={selectedView === tab.key ? "pts-btn-primary" : "pts-btn-secondary"}
              onClick={() => setSelectedView(tab.key as any)}
              style={{ marginBottom: "10px" }}
            >
              {tab.label}
            </button>
          ))}
          {/* Export Button */}
          <button className="pts-btn-secondary" onClick={handleExportStudents} style={{ marginBottom: "10px", marginLeft: "auto" }}>
            <Download size={18} /> Export Data
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {selectedView === 'overview' && renderOverviewTab()}

      {selectedView === 'assessments' && renderAssessmentsTab()}
    </div>
  );
};

export default StudentStats;