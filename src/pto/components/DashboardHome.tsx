import React, { useState, useEffect, useRef } from 'react';
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
      type RawTest = { id: string; name: string; department?: string; date?: string; duration?: number };
      const ongoingCards: AssessmentCard[] = (data.ongoingTests as RawTest[]).map((t) => ({ id: t.id, title: t.name, subject: t.department || 'All', startTime: t.date || '', duration: `${t.duration || 0} mins`, status: 'ongoing' }));
      const upcomingCards: AssessmentCard[] = (data.upcomingTests as RawTest[]).map((t) => ({ id: t.id, title: t.name, subject: t.department || 'All', startTime: t.date || '', duration: `${t.duration || 0} mins`, status: 'upcoming' }));
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
      <div className="pto-welcome-banner" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.7 }}>
          <FloatingCircles />
        </div>
        <div className="pto-welcome-content" style={{ position: 'relative', zIndex: 1 }}>
          <h1 className="pto-welcome-title">Welcome to PTO Dashboard</h1>
          <p className="pto-welcome-subtitle">
            Manage Departments, Staff, Assessments & Student Performance.
          </p>
        </div>
        <div aria-hidden="true" style={{ position: 'absolute', right: 24, opacity: 0.15, zIndex: 0 }}>
          <div style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.1))'
          }} />
        </div>
      </div>

      

      {/* KPI Cards - Matching Image Style */}
      <div className="pto-kpi-section">
        <div className="pto-kpi-grid">
          {kpiCards.map((card, index) => (
            <div
              key={index}
              className="pto-kpi-card pto-fade-in"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="pto-kpi-label">{card.label}</div>
              <div className="pto-kpi-value">{card.value}</div>
              <div className="pto-kpi-change">{card.change}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Department Performance Analytics */}
      <div className="pto-analytics-section">
        <h2 className="pto-section-title pto-fade-in">Performance by Department</h2>
        <div className="pto-chart-card pto-slide-in">
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
            {assessments.filter(a => a.status === 'ongoing').map((test, idx) => (
              <div
                key={test.id}
                className="test-card ongoing pto-fade-in"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
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
            {assessments.filter(a => a.status === 'upcoming').map((test, idx) => (
              <div
                key={test.id}
                className="test-card pto-fade-in"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
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

const FloatingCircles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const circlesRef = useRef<Array<{ x: number; y: number; r: number; dx: number; dy: number; color: string }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      const parent = canvas.parentElement!;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(parent.clientWidth * dpr);
      canvas.height = Math.floor(parent.clientHeight * dpr);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const colors = [
      'rgba(151,104,225,0.35)',
      'rgba(228,213,248,0.35)',
      'rgba(255,255,255,0.25)'
    ];

    const init = () => {
      circlesRef.current = [];
      const parent = canvas.parentElement!;
      const count = Math.max(12, Math.min(24, Math.floor(parent.clientWidth / 60)));
      for (let i = 0; i < count; i++) {
        const r = 14 + Math.random() * 36;
        circlesRef.current.push({
          x: Math.random() * parent.clientWidth,
          y: Math.random() * parent.clientHeight,
          r,
          dx: (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1),
          dy: (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1),
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };
    init();

    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(32, t - last);
      last = t;

      const parent = canvas.parentElement!;
      ctx.clearRect(0, 0, parent.clientWidth, parent.clientHeight);

      const grd = ctx.createRadialGradient(
        parent.clientWidth * 0.8,
        parent.clientHeight * 0.2,
        20,
        parent.clientWidth * 0.8,
        parent.clientHeight * 0.2,
        Math.max(parent.clientWidth, parent.clientHeight)
      );
      grd.addColorStop(0, 'rgba(255,255,255,0.08)');
      grd.addColorStop(1, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, parent.clientWidth, parent.clientHeight);

      for (const c of circlesRef.current) {
        c.x += c.dx * (dt / 16);
        c.y += c.dy * (dt / 16);

        if (c.x - c.r > parent.clientWidth) c.x = -c.r;
        if (c.x + c.r < 0) c.x = parent.clientWidth + c.r;
        if (c.y - c.r > parent.clientHeight) c.y = -c.r;
        if (c.y + c.r < 0) c.y = parent.clientHeight + c.r;

        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.fill();

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      resize();
      init();
    });
    ro.observe(canvas.parentElement!);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
};

