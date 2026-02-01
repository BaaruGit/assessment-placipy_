import React, { useEffect, useRef, useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import StudentAssessmentService from '../../services/student.assessment.service';
import ResultsService from '../../services/results.service';
import { useNotifications } from '../../contexts/useNotifications';
import { isToday, formatTimeHM } from '../../student/utils/timeUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DashboardHome: React.FC = () => {
  const { user } = useUser();
  const { addNotification } = useNotifications();
  const [activeAssessmentsCount, setActiveAssessmentsCount] = useState(0);
  const [completedAssessmentsCount, setCompletedAssessmentsCount] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  interface AssessmentResult {
    id?: string;
    assessmentId: string;
    name?: string;
    status?: string;
    score?: number;
    maxScore?: number;
    percentage?: number;
    submittedAt?: string;
    isResultPublished?: boolean;
  }

  // Helper function to convert assessment ID format
  const formatAssessmentId = (assessmentId: string) => {
    // Extract the number from assessment ID like "ASSESS_CE_004"
    const match = assessmentId.match(/(\d+)$/);
    if (match) {
      const number = parseInt(match[1], 10);
      return `Assessment-${number}`;
    }
    // Fallback to original ID if no number found
    return assessmentId;
  };

  const [recentAssessments, setRecentAssessments] = useState<AssessmentResult[]>([]);
  const [performanceData, setPerformanceData] = useState<Array<{ subject: string, score: number }>>([]);
  const [loading, setLoading] = useState(true);


  // Dynamic stats data
  const stats = [
    { title: 'Active Tests', value: activeAssessmentsCount, change: '' },
    { title: 'Completed Tests', value: completedAssessmentsCount, change: '' },
    { title: 'Average Score', value: `${averageScore}%`, change: '' },
  ];

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Fetch real-time dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all assessments to get active count
        const assessmentsResponse = await StudentAssessmentService.getAllAssessments(
          user?.department ? { department: user.department } : undefined
        );
        console.log('Fetched assessments:', assessmentsResponse);

        // Safely extract assessments array from response
        const assessments = Array.isArray(assessmentsResponse?.data)
          ? assessmentsResponse.data
          : Array.isArray(assessmentsResponse)
            ? assessmentsResponse
            : [];

        // Fetch student's results to determine attempted assessments
        const resultsResponse = await ResultsService.getStudentResults().catch(() => ({ success: true, data: [] }));
        console.log('Fetched results for dashboard:', resultsResponse);

        // Get list of attempted assessment IDs with completion dates
        const results = resultsResponse?.data || resultsResponse || [];
        const attemptedAssessments = new Map<string, Date>();

        if (Array.isArray(results)) {
          results.forEach((result: any) => {
            if (result.assessmentId) {
              const completionDate = result.submittedAt ? new Date(result.submittedAt) : new Date();
              attemptedAssessments.set(result.assessmentId, completionDate);
            }
          });
        }

        // Calculate active assessments count (matching 'all' filter logic in Assessments component)
        const now = new Date();
        const activeCount = assessments.filter((assessment: {
          scheduling?: { startDate: string; endDate: string };
          createdAt: string;
          status: string;
          assessmentId: string;
        }) => {
          const isAttempted = attemptedAssessments.has(assessment.assessmentId);

          // Check if assessment has ended based on date
          const endDate = new Date(assessment.scheduling?.endDate || new Date());
          const hasEnded = now > endDate;

          // Active assessments are those that are not attempted and not ended
          return !isAttempted && !hasEnded;
        }).length;

        setActiveAssessmentsCount(activeCount);

        // Calculate completed assessments count (matching 'completed' filter logic)
        const completedCount = assessments.filter((assessment: {
          scheduling?: { endDate: string };
          assessmentId: string;
        }) => {
          const isAttempted = attemptedAssessments.has(assessment.assessmentId);
          if (!isAttempted) return false;

          // Check if completed within last 5 days
          const completionDate = attemptedAssessments.get(assessment.assessmentId)!;
          const daysSinceCompletion = (Date.now() - completionDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceCompletion <= 5;
        }).length;

        // Frontend notifications: Today assessments and upcoming reminders
        try {
          const upcoming: Array<{ assessmentId: string; scheduledAt: string }> = [];
          interface AssessmentItem {
            [key: string]: unknown;
            scheduling?: { startDate: string; createdAt: string };
            assessmentId?: string;
            id?: string;
            status: string;
            createdAt: string;
            title?: string;
          }

          const items: AssessmentItem[] = assessments;
          items.forEach((a) => {
            const start = a?.scheduling?.startDate || a?.createdAt;
            const aid = a?.assessmentId || a?.id;
            if (!aid || !start) return;

            // Check for Today's Active Assessments
            // We use user.email to ensure we track 'seen' status per user
            // We remove 'sessionId' so this persists across logins for the same user
            if (user?.email && a.status === 'ACTIVE' && isToday(start)) {
              const flagKey = `notif_shown_${user.email}_${aid}`;

              if (!localStorage.getItem(flagKey)) {
                localStorage.setItem(flagKey, 'true');
                addNotification({
                  type: 'assessment_published',
                  title: 'New Assessment Today',
                  message: `Starts at ${formatTimeHM(start)}`,
                  link: `/student/assessments`,
                  priority: 'medium'
                });
              }
            }
            upcoming.push({ assessmentId: aid, scheduledAt: start });
          });
          localStorage.setItem('student_upcoming_assessments', JSON.stringify(upcoming));
        } catch (e) {
          console.error('Assessment notification logic failed', e);
        }

        // Fetch dashboard statistics (average score, recent assessments, performance)
        try {
          const statsResponse = await ResultsService.getDashboardStats();
          console.log('Fetched dashboard stats:', statsResponse);

          if (statsResponse.success && statsResponse.data) {
            // Use our calculated completed count instead of backend
            setCompletedAssessmentsCount(completedCount);
            setAverageScore(statsResponse.data.averageScore || 0);

            // Set recent assessments
            if (statsResponse.data.recentAssessments && Array.isArray(statsResponse.data.recentAssessments)) {
              // Map assessment IDs to titles from assessments list
              const assessmentsMap = new Map(
                assessments.map((a: { assessmentId: string; title: string }) => [a.assessmentId, a.title])
              );

              const recentWithTitles = statsResponse.data.recentAssessments.map((result: AssessmentResult) => ({
                ...result,
                name: assessmentsMap.get(result.assessmentId) || result.assessmentId,
                id: result.assessmentId
              }));

              setRecentAssessments(recentWithTitles);
            } else {
              setRecentAssessments([]);
            }

            // Set performance data (map assessment IDs to titles)
            if (statsResponse.data.performanceData && Array.isArray(statsResponse.data.performanceData)) {
              const assessmentsMap = new Map(
                assessments.map((a: { assessmentId: string; title: string }) => [a.assessmentId, a.title])
              );

              interface PerfData {
                assessmentId?: string;
                subject: string;
                score: number;
              }

              const performanceWithTitles = statsResponse.data.performanceData.map((perf: PerfData) => ({
                ...perf,
                subject: perf.assessmentId || perf.subject
              }));

              setPerformanceData(performanceWithTitles);
            } else {
              setPerformanceData([]);
            }

          }
        } catch (statsError: unknown) {
          console.log('Error fetching dashboard stats:', statsError);
          // Set defaults if stats fetch fails, but use our calculated completed count
          setCompletedAssessmentsCount(completedCount);
          setAverageScore(0);
          setRecentAssessments([]);
          setPerformanceData([]);
        }



      } catch (err: unknown) {
        console.error('Error fetching data:', err);
        if (err instanceof Error) {
          console.error('Error details:', {
            message: err.message,
            response: (err as { response?: { data?: string } }).response?.data || 'No response data',
            status: (err as { response?: { status?: number } }).response?.status || 'No status'
          });
        }

      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [addNotification, user]);

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



      <div className="std_stats-grid">
        {stats.map((stat, index) => (
          <div className="std_stat-card" key={index}>
            <h3>{stat.title}</h3>
            <p className="stat-value">{stat.value}</p>
            {stat.change && <p className="stat-change">{stat.change}</p>}
          </div>
        ))}
      </div>

      <div className="assessments-section">
        <h2>Recent Assessments</h2>
        <div className="assessments-list">
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading recent assessments...</div>
          ) : recentAssessments.length > 0 ? (
            recentAssessments.map(assessment => (
              <div className="assessment-card" key={assessment.id || assessment.assessmentId}>
                <div className="assessment-header">
                  <h3>{formatAssessmentId(assessment.assessmentId)}</h3>
                  <span className={`status-badge ${assessment.status || 'pending'}`}>
                    {(assessment.status || 'Pending').charAt(0).toUpperCase() + (assessment.status || 'Pending').slice(1)}
                  </span>
                </div>
                {assessment.submittedAt && (
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>
                    Submitted: {new Date(assessment.submittedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              No completed assessments yet. Complete assessments to see them here.
            </div>
          )}
        </div>
      </div>

      <div className="performance-section" style={{
        background: '#FFFFFF',
        borderRadius: '10px',
        padding: '0px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginTop: '24px',
        width: '1250px',
        marginLeft: '70px',
      }}>
        <h2 style={{ padding: '24px 24px 0', marginBottom: '24px', fontSize: '20px', fontWeight: 600, color: '#111827' }}>Performance Summary</h2>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading performance data...</div>
        ) : performanceData.length > 0 ? (
          <div style={{ width: '100%', padding: '0 24px 24px' }}>
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={performanceData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                  barSize={40}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="subject"
                    scale="point"
                    padding={{ left: 20, right: 20 }}
                    tickFormatter={(value) => formatAssessmentId(value)}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    tickMargin={10}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickCount={6}
                  />
                  <Tooltip
                    cursor={{ fill: '#F3F4F6' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    }}
                    itemStyle={{
                      color: '#111827',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                    formatter={(value: number | undefined) => [`${value ?? 0}%`, 'Score']}
                    labelStyle={{ marginBottom: '4px', color: '#6B7280', fontSize: '12px' }}
                    labelFormatter={(label) => formatAssessmentId(label)}
                  />
                  <Bar
                    dataKey="score"
                    fill="#9768E1"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666', background: '#F9FAFB', margin: '24px', borderRadius: '12px' }}>
            <p style={{ margin: 0, fontSize: '14px' }}>No performance data available yet.</p>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>Complete assessments to see your performance.</p>
          </div>
        )}
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
