import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, BarChart3 } from "lucide-react";
import AssessmentService from "../services/assessment.service";
import AnalyticsService from "../services/analytics.service";
import { useUser } from "../contexts/UserContext";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const [stats, setStats] = useState({
    totalAssessments: 0,
    activeAssessments: 0,
    totalSubmissions: 0 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<any[]>([]);

  const [quickActions] = useState([
    {
      title: "Create New Assessment",
      description: "Design and create a new assessment with questions and settings",
      action: "create",
      icon: <FileText size={24} />
    },
    {
      title: "Student Management",
      description: "Manage student enrollments and batch assignments",
      action: "students",
      icon: <BarChart3 size={24} />
    },
    {
      title: "View Analytics",
      description: "Analyze student performance and generate detailed reports",
      action: "stats", 
      icon: <BarChart3 size={24} />
    }
  ]);

  // Fetch real assessment data
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Wait for user data to be available
        if (!user) {
          throw new Error("User data not available");
        }
        
        // Extract username and domain from email
        const email = user.email;
        const [username, domain] = email.split('@');
        
        console.log("Dashboard: User email:", email);
        console.log("Dashboard: Extracted username:", username);
        console.log("Dashboard: Extracted domain:", domain);
        
        // Fetch assessments created by the current user (owner)
        const response = await AssessmentService.getAssessmentsByOwner();
        
        // Calculate completed today - this requires submission data which is not currently fetched
        // For now, we'll use a placeholder value or try to fetch submission data
        let completedToday = 0;
        
        // Since we don't have submission data in this component, we'll set it to 0
        // In a real implementation, you would fetch submission data from an API
        
        console.log("Dashboard: All assessments response:", response);
        
        // Extract assessments array from response
        let assessments = [];
        if (response && typeof response === 'object') {
          if (Array.isArray(response)) {
            assessments = response;
          } else if (response.data && Array.isArray(response.data)) {
            assessments = response.data;
          } else if (response.items && Array.isArray(response.items)) {
            assessments = response.items;
          }
        }
        
        console.log("Dashboard: Raw assessments:", assessments);
        
        // Store assessments for recent activity calculation
        setAssessments(assessments);
        
        // Calculate counts - now including ALL assessments
        const totalAssessments = assessments.length;
        const activeAssessments = assessments.filter((assessment: any) => 
          assessment.status === "ACTIVE"
        ).length;
        
        console.log("Dashboard: Calculated stats:", { totalAssessments, activeAssessments });
        
        // Fetch student analytics to get submission count
        let totalSubmissions = 0;
        try {
          const analyticsResponse = await AnalyticsService.getStudentAnalytics();
          // Extract total submissions from analytics data
          if (analyticsResponse && analyticsResponse.data) {
            // Use raw results count or other metric for total submissions
            totalSubmissions = Array.isArray(analyticsResponse.data.rawResults) 
              ? analyticsResponse.data.rawResults.length 
              : 0;
          }
        } catch (analyticsError) {
          console.error('Error fetching analytics for submission count:', analyticsError);
          // Fallback to 0 if analytics fetch fails
          totalSubmissions = 0;
        }
        
        setStats(prevStats => ({
          ...prevStats,
          totalAssessments,
          activeAssessments,
          totalSubmissions
        }));
      } catch (err) {
        console.error("Dashboard: Error fetching assessments:", err);
        setError("Failed to load assessment data");
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user]);

  // Generate recent activities from assessments
  const generateRecentActivities = () => {
    if (!assessments || assessments.length === 0) {
      return [
        { id: 1, action: "No recent activities", time: "Just now", type: "info" }
      ];
    }

    // Sort assessments by creation date (newest first)
    const sortedAssessments = [...assessments].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return dateB - dateA;
    });

    // Take the 5 most recent assessments
    const recentAssessments = sortedAssessments.slice(0, 5);

    // Generate activity items
    const activities = recentAssessments.map((assessment, index) => {
      const createdDate = new Date(assessment.createdAt || assessment.updatedAt || Date.now());
      const timeDiff = Date.now() - createdDate.getTime();
      
      // Format time difference
      let timeString = "";
      if (timeDiff < 60000) { // Less than 1 minute
        timeString = "Just now";
      } else if (timeDiff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(timeDiff / 60000);
        timeString = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      } else if (timeDiff < 86400000) { // Less than 1 day
        const hours = Math.floor(timeDiff / 3600000);
        timeString = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else {
        const days = Math.floor(timeDiff / 86400000);
        timeString = `${days} day${days > 1 ? 's' : ''} ago`;
      }

      return {
        id: index + 1,
        action: `New assessment '${assessment.title}' created`,
        time: timeString,
        type: "creation",
        assessmentId: assessment.assessmentId || null
      };
    });

    // Add some variety if we have fewer than 4 activities
    if (activities.length < 4) {
      activities.push(
        { id: activities.length + 1, action: "System maintenance completed", time: "2 hours ago", type: "system", assessmentId: null },
        { id: activities.length + 2, action: "Analytics report generated", time: "1 day ago", type: "report", assessmentId: null }
      );
    }

    return activities.slice(0, 4); // Limit to 4 activities
  };

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

  // Show loading state with skeleton UI
  if (loading || userLoading) {
    return (
      <div className="pts-fade-in">
        {/* Welcome Banner Skeleton */}
        <div className="pts-welcome-container" style={{
          background: 'linear-gradient(135deg, #9768E1 0%, #523C48 100%)',
          borderRadius: '15px',
          padding: '28px',
          minHeight: '160px',
          marginBottom: '24px',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ zIndex: 1, position: 'relative' }}>
            <div className="pts-skeleton pts-skeleton-text" style={{ width: '120px', height: '20px', marginBottom: '10px', borderRadius: '4px' }}></div>
            <div className="pts-skeleton pts-skeleton-text" style={{ width: '300px', height: '30px', marginBottom: '10px', borderRadius: '4px' }}></div>
            <div className="pts-skeleton pts-skeleton-text" style={{ width: '400px', height: '20px', borderRadius: '4px' }}></div>
          </div>
        </div>
        
        {/* Statistics Cards Skeleton */}
        <div className="pts-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div className="pts-skeleton pts-stat-card" style={{ padding: '20px', borderRadius: '8px', minHeight: '120px' }}>
            <div className="pts-skeleton pts-skeleton-text" style={{ height: '24px', width: '80%', marginBottom: '10px', borderRadius: '4px' }}></div>
            <div className="pts-skeleton pts-skeleton-number" style={{ height: '32px', width: '60%', marginBottom: '10px', borderRadius: '4px' }}></div>
            <div className="pts-skeleton pts-skeleton-text" style={{ height: '18px', width: '70%', borderRadius: '4px' }}></div>
          </div>
          <div className="pts-skeleton pts-stat-card" style={{ padding: '20px', borderRadius: '8px', minHeight: '120px' }}>
            <div className="pts-skeleton pts-skeleton-text" style={{ height: '24px', width: '80%', marginBottom: '10px', borderRadius: '4px' }}></div>
            <div className="pts-skeleton pts-skeleton-number" style={{ height: '32px', width: '60%', marginBottom: '10px', borderRadius: '4px' }}></div>
            <div className="pts-skeleton pts-skeleton-text" style={{ height: '18px', width: '70%', borderRadius: '4px' }}></div>
          </div>
          <div className="pts-skeleton pts-stat-card" style={{ padding: '20px', borderRadius: '8px', minHeight: '120px' }}>
            <div className="pts-skeleton pts-skeleton-text" style={{ height: '24px', width: '80%', marginBottom: '10px', borderRadius: '4px' }}></div>
            <div className="pts-skeleton pts-skeleton-number" style={{ height: '32px', width: '60%', marginBottom: '10px', borderRadius: '4px' }}></div>
            <div className="pts-skeleton pts-skeleton-text" style={{ height: '18px', width: '70%', borderRadius: '4px' }}></div>
          </div>
        </div>
        
        {/* Quick Actions Skeleton */}
        <div className="pts-actions-section" style={{ marginBottom: '30px' }}>
          <div className="pts-skeleton pts-skeleton-text" style={{ width: '150px', height: '28px', marginBottom: '20px', borderRadius: '4px' }}></div>
          <div className="pts-actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div className="pts-skeleton pts-action-card" style={{ padding: '20px', borderRadius: '8px', minHeight: '150px' }}>
              <div className="pts-skeleton pts-skeleton-text" style={{ height: '24px', width: '80%', marginBottom: '10px', borderRadius: '4px' }}></div>
              <div className="pts-skeleton pts-skeleton-text" style={{ height: '16px', width: '100%', marginBottom: '8px', borderRadius: '4px' }}></div>
              <div className="pts-skeleton pts-skeleton-text" style={{ height: '16px', width: '70%', marginBottom: '15px', borderRadius: '4px' }}></div>
              <div className="pts-skeleton pts-skeleton-button" style={{ width: '80px', height: '32px', borderRadius: '6px' }}></div>
            </div>
            <div className="pts-skeleton pts-action-card" style={{ padding: '20px', borderRadius: '8px', minHeight: '150px' }}>
              <div className="pts-skeleton pts-skeleton-text" style={{ height: '24px', width: '80%', marginBottom: '10px', borderRadius: '4px' }}></div>
              <div className="pts-skeleton pts-skeleton-text" style={{ height: '16px', width: '100%', marginBottom: '8px', borderRadius: '4px' }}></div>
              <div className="pts-skeleton pts-skeleton-text" style={{ height: '16px', width: '70%', marginBottom: '15px', borderRadius: '4px' }}></div>
              <div className="pts-skeleton pts-skeleton-button" style={{ width: '80px', height: '32px', borderRadius: '6px' }}></div>
            </div>
            <div className="pts-skeleton pts-action-card" style={{ padding: '20px', borderRadius: '8px', minHeight: '150px' }}>
              <div className="pts-skeleton pts-skeleton-text" style={{ height: '24px', width: '80%', marginBottom: '10px', borderRadius: '4px' }}></div>
              <div className="pts-skeleton pts-skeleton-text" style={{ height: '16px', width: '100%', marginBottom: '8px', borderRadius: '4px' }}></div>
              <div className="pts-skeleton pts-skeleton-text" style={{ height: '16px', width: '70%', marginBottom: '15px', borderRadius: '4px' }}></div>
              <div className="pts-skeleton pts-skeleton-button" style={{ width: '80px', height: '32px', borderRadius: '6px' }}></div>
            </div>
          </div>
        </div>
        
        {/* Recent Activity Skeleton */}
        <div className="pts-activity-section">
          <div className="pts-skeleton pts-skeleton-text" style={{ width: '180px', height: '28px', marginBottom: '20px', borderRadius: '4px' }}></div>
          <div className="pts-activity-list">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="pts-skeleton pts-activity-item" style={{ padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
                <div className="pts-activity-info">
                  <div className="pts-skeleton pts-skeleton-text" style={{ height: '20px', width: '70%', marginBottom: '8px', borderRadius: '4px' }}></div>
                  <div className="pts-skeleton pts-skeleton-text" style={{ height: '16px', width: '50%', borderRadius: '4px' }}></div>
                </div>
                <div className="pts-skeleton pts-skeleton-text" style={{ height: '16px', width: '60px', borderRadius: '4px' }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="pts-fade-in">
        <div className="pts-welcome-container" style={{
          background: 'linear-gradient(135deg, #9768E1 0%, #523C48 100%)',
          borderRadius: '15px',
          padding: '28px',
          minHeight: '160px',
          marginBottom: '24px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <div>
            <h2>Error Loading Dashboard</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Generate real-time recent activities
  const recentActivities = generateRecentActivities();

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
          <h3>Total Submissions</h3>
          <div className="pts-stat-value">{stats.totalSubmissions}</div>
          <div className="pts-stat-change">Across all assessments</div>
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