import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Calendar, BarChart3, Users } from "lucide-react";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAssessments: 0,
    activeAssessments: 0,
    totalStudents: 0,
    completedToday: 0
  });

  const [recentActivities] = useState([
    { id: 1, action: "New assessment 'React Fundamentals' created", time: "2 hours ago", type: "creation" },
    { id: 2, action: "Assessment 'JavaScript Basics' scheduled for CSE batch", time: "3 hours ago", type: "schedule" },
    { id: 3, action: "45 students completed 'Python Quiz'", time: "5 hours ago", type: "completion" },
    { id: 4, action: "Analytics report generated for October", time: "1 day ago", type: "report" },
  ]);

  const [quickActions] = useState([
    {
      title: "Create New Assessment",
      description: "Design and create a new assessment with questions and settings",
      action: "create",
      icon: <FileText size={24} />
    },
    {
      title: "Schedule Assessment", 
      description: "Schedule existing assessments for specific batches and dates",
      action: "schedule",
      icon: <Calendar size={24} />
    },
    {
      title: "View Analytics",
      description: "Analyze student performance and generate detailed reports",
      action: "stats", 
      icon: <BarChart3 size={24} />
    },
    {
      title: "Manage Students",
      description: "View and manage student enrollments and batch assignments",
      action: "students",
      icon: <Users size={24} />
    }
  ]);

  // Simulate loading data
  useEffect(() => {
    const loadStats = () => {
      setStats({
        totalAssessments: 24,
        activeAssessments: 8,
        totalStudents: 156,
        completedToday: 23
      });
    };

    setTimeout(loadStats, 500);
  }, []);

  const handleQuickAction = (action: string) => {
    // Navigate to respective pages using React Router
    console.log(`Quick action: ${action}`);
    
    switch(action) {
      case 'create':
        navigate('/pts/create');
        break;
      case 'schedule':
        navigate('/pts/schedule');
        break;
      case 'stats':
        navigate('/pts/stats');
        break;
      case 'students':
        navigate('/pts/students');
        break;
      default:
        alert(`${action} functionality coming soon!`);
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="pts-fade-in">
      {/* Welcome Banner with Animated Bubbles */}
      <div
        className="pts-welcome-container"
        style={{
          background: 'linear-gradient(135deg, #9768E1 0%, #523C48 100%)',
          borderRadius: '15px',
          padding: '28px',
          minHeight: '160px',
          marginBottom: '24px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated background (floating circles) */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.7 }}>
          <FloatingCircles />
        </div>

        <div style={{ zIndex: 1, position: 'relative' }}>
          <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '10px' }}>{currentDate}</div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>Welcome to PTS Dashboard</h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '1rem', opacity: 0.95 }}>
            Manage assessments, track student progress, and generate insights for better placement training.
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

      {/* Statistics Cards */}
      <div className="pts-stats-grid">
        <div className="pts-stat-card">
          <h3>Total Assessments</h3>
          <div className="pts-stat-value">{stats.totalAssessments}</div>
          <div className="pts-stat-change">+4 from last month</div>
        </div>
        <div className="pts-stat-card">
          <h3>Active Assessments</h3>
          <div className="pts-stat-value">{stats.activeAssessments}</div>
          <div className="pts-stat-change">Currently running</div>
        </div>
        <div className="pts-stat-card">
          <h3>Enrolled Students</h3>
          <div className="pts-stat-value">{stats.totalStudents}</div>
          <div className="pts-stat-change">Across all batches</div>
        </div>
        <div className="pts-stat-card">
          <h3>Completed Today</h3>
          <div className="pts-stat-value">{stats.completedToday}</div>
          <div className="pts-stat-change">Assessment submissions</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pts-actions-section">
        <h2>Quick Actions</h2>
        <div className="pts-actions-grid">
          {quickActions.map((action, index) => (
            <div key={index} className="pts-action-card" onClick={() => handleQuickAction(action.action)}>
              <h3>{action.icon} {action.title}</h3>
              <p>{action.description}</p>
              <button className="pts-action-btn">
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="pts-activity-section">
        <h2>Recent Activity</h2>
        <div className="pts-activity-list">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="pts-activity-item">
              <div className="pts-activity-info">
                <h4>{activity.action}</h4>
                <p>Activity type: {activity.type}</p>
              </div>
              <div className="pts-activity-time">{activity.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

// Floating circles canvas background animation
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
      'rgba(151,104,225,0.35)', // primary purple
      'rgba(228,213,248,0.35)', // light purple
      'rgba(255,255,255,0.25)'
    ];

    // Initialize circles
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

      // Soft vignette
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
        // Move
        c.x += c.dx * (dt / 16);
        c.y += c.dy * (dt / 16);

        // Wrap around edges for continuous motion
        if (c.x - c.r > parent.clientWidth) c.x = -c.r;
        if (c.x + c.r < 0) c.x = parent.clientWidth + c.r;
        if (c.y - c.r > parent.clientHeight) c.y = -c.r;
        if (c.y + c.r < 0) c.y = parent.clientHeight + c.r;

        // Draw
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.fill();

        // Subtle outline
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