import React, { useState, useEffect } from 'react';
import { 
  FaUsers, 
  FaBuilding, 
  FaClipboardList, 
  FaCalendarAlt
} from 'react-icons/fa';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import PTOService from '../../services/pto.service';
// Removed extra CTA nav cards per request

const DashboardHome: React.FC = () => {
  const [stats, setStats] = useState({
    totalAssessments: 0,
    activeAssessments: 0,
    totalStudents: 0,
    totalDepartments: 0,
    completedToday: 0
  });
  const [departmentPerformanceData, setDepartmentPerformanceData] = useState<Array<{ name: string; students: number; avgScore: number; completed: number }>>([]);
  const [assessments, setAssessments] = useState<Array<{ id: string; title: string; subject: string; startTime: string; duration: string; status: 'ongoing' | 'upcoming' }>>([]);

  useEffect(() => {
    const load = async () => {
      const data = await PTOService.getDashboard();
      setStats({
        totalAssessments: data.totalAssessments,
        activeAssessments: data.activeAssessments,
        totalStudents: data.totalStudents,
        totalDepartments: data.totalDepartments,
        completedToday: 0
      });
      setDepartmentPerformanceData(
        data.departmentPerformance.map(d => ({ name: d.code || d.name, students: d.students, avgScore: d.avgScore, completed: d.completed }))
      );
      type AssessmentCard = { id: string; title: string; subject: string; startTime: string; duration: string; status: 'ongoing' | 'upcoming' };
      const ongoingCards: AssessmentCard[] = data.ongoingTests.map((t: any) => ({ id: t.id, title: t.name, subject: t.department || 'All', startTime: t.date || '', duration: `${t.duration || 0} mins`, status: 'ongoing' }));
      const upcomingCards: AssessmentCard[] = data.upcomingTests.map((t: any) => ({ id: t.id, title: t.name, subject: t.department || 'All', startTime: t.date || '', duration: `${t.duration || 0} mins`, status: 'upcoming' }));
      setAssessments([...ongoingCards, ...upcomingCards]);
    };
    load();
  }, []);

  // KPI Cards matching PRD overview
  const kpiCards = [
    { 
      label: 'TOTAL STUDENTS', 
      value: stats.totalStudents, 
      change: 'Across all departments',
      icon: FaUsers
    },
    { 
      label: 'DEPARTMENTS', 
      value: stats.totalDepartments, 
      change: 'Active departments',
      icon: FaBuilding
    },
    { 
      label: 'TOTAL ASSESSMENTS', 
      value: stats.totalAssessments, 
      change: '+4 from last month',
      icon: FaClipboardList
    },
    { 
      label: 'ACTIVE ASSESSMENTS', 
      value: stats.activeAssessments, 
      change: 'Currently running',
      icon: FaCalendarAlt
    },
  ];

  return (
    <div className="pto-dashboard-home">
      <div className="pto-welcome-banner">
        <div className="pto-welcome-content">
          <h1 className="pto-welcome-title">Welcome to PTO Dashboard</h1>
          <p className="pto-welcome-subtitle">
            Manage Departments, Staff, Assessments & Student Performance.
          </p>
        </div>
      </div>

      

      {/* KPI Cards - Matching Image Style */}
      <div className="pto-kpi-section">
        <div className="pto-kpi-grid">
          {kpiCards.map((card, index) => (
            <div key={index} className="pto-kpi-card">
              <div className="pto-kpi-label">{card.label}</div>
              <div className="pto-kpi-value">{card.value}</div>
              <div className="pto-kpi-change">{card.change}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Department Performance Analytics */}
      <div className="pto-analytics-section">
        <h2 className="pto-section-title">Performance by Department</h2>
        <div className="pto-chart-card">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentPerformanceData}>
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
      </div>

      {/* Tests Overview */}
      <div className="tests-section">
        <div className="tests-column">
          <h2 className="pto-section-title">Ongoing Tests</h2>
          <div className="tests-list">
            {assessments.filter(a => a.status === 'ongoing').map(test => (
              <div key={test.id} className="test-card ongoing">
                <div className="test-icon">
                  <FaCalendarAlt size={18} color="#9768E1" />
                </div>
                <div className="test-content">
                  <div className="test-name">{test.title}</div>
                  <div className="test-detail"><strong>Department:</strong> {test.subject}</div>
                  <div className="test-date"><strong>Started:</strong> {test.startTime}</div>
                  <div className="test-duration"><strong>Duration:</strong> {test.duration}</div>
                </div>
              </div>
            ))}
            {assessments.filter(a => a.status === 'ongoing').length === 0 && (
              <div className="pto-empty-state">No ongoing tests</div>
            )}
          </div>
        </div>
        <div className="tests-column">
          <h2 className="pto-section-title">Upcoming Tests</h2>
          <div className="tests-list">
            {assessments.filter(a => a.status === 'upcoming').map(test => (
              <div key={test.id} className="test-card">
                <div className="test-icon">
                  <FaCalendarAlt size={18} color="#9768E1" />
                </div>
                <div className="test-content">
                  <div className="test-name">{test.title}</div>
                  <div className="test-detail"><strong>Department:</strong> {test.subject}</div>
                  <div className="test-date"><strong>Starts:</strong> {test.startTime}</div>
                  <div className="test-duration"><strong>Duration:</strong> {test.duration}</div>
                </div>
              </div>
            ))}
            {assessments.filter(a => a.status === 'upcoming').length === 0 && (
              <div className="pto-empty-state">No upcoming tests</div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default DashboardHome;

