import React, { useEffect, useRef } from 'react';
import { useUser } from '../../contexts/UserContext';

const DashboardHome: React.FC = () => {
  const { user } = useUser();
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

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="dashboard-home">
      {/* Welcome banner styled similar to PTO */}
      <div
        className="welcome-banner"
        style={{
          background: 'linear-gradient(135deg, #9768E1 0%, #523C48 100%)',
          borderRadius: '16px',
          padding: '28px',
          minHeight: '160px',
          marginBottom: '24px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 25px rgba(151, 104, 225, 0.15)',
        }}
      >
        {/* Animated background (floating circles) */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.7 }}>
          <FloatingCircles />
        </div>

        <div style={{ zIndex: 1, position: 'relative' }}>
          <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '10px' }}>{currentDate}</div>
                  <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>
                    Welcome back, {/** prefer the real user name from context */}
                    {user?.name ? ` ${user.name}` : ' Student'}!
                  </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '1rem', opacity: 0.95 }}>
            You have <strong>3</strong> active assessments awaiting your action.
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
        <div
          className="chart-container"
          style={{ position: 'relative', padding: '0 0 8px 0' }}
        >
          {/* Bars */}
          <div
            className="performance-bars"
            style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', height: '260px' }}
          >
            {performanceData.map((subject, index) => {
              const clamped = Math.max(0, Math.min(100, subject.score));
              return (
                <div
                  key={index}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
                >
                  {/* value label */}
                  <div style={{ marginBottom: '6px', color: '#111827', fontSize: '12px' }}>{clamped}%</div>
                  <div
                    className="bar-fill"
                    style={{
                      height: `${clamped}%`,
                      width: '48px',
                      background: '#9768E1',
                      borderRadius: '8px 8px 0 0',
                      transition: 'transform 160ms ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    }}
                  ></div>
                  <span className="subject-name" style={{ marginTop: '10px', fontSize: '13px', color: '#111827' }}>{subject.subject}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;

// Simple floating circles canvas background
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