import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';

import StudentAssessmentService from '../../services/student.assessment.service';
import ResultsService from '../../services/results.service';

// Define the Assessment interface based on the provided schema
interface Assessment {
  id: string;
  assessmentId: string;
  title: string;
  category: string[];
  configuration: {
    duration: number;
    maxAttempts: number;
    passingScore: number;
    randomizeQuestions: boolean;
    totalQuestions: number;
  };
  scheduling: {
    startDate: string;
    endDate: string;
    timezone: string;
  };
  status: string;
  isPublished: boolean;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  department: string;
  difficulty: string;
  description: string;
  entities: Array<{
    batch: string;
    description?: string;
    type: string;
  }>;
  stats: {
    avgScore: number;
    completed: number;
    highestScore: number;
    totalParticipants: number;
  };
  target: {
    years: any[];
  };
  type: string;
  updatedAt: string;
}

const Assessments: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showLiveInfo, setShowLiveInfo] = useState(false);
  const [liveInfo] = useState({
    link: 'https://example.com/live-assessment',
    password: 'PLCY-7842'
  });
  
  // State for real assessments
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);
  const [attemptedAssessments, setAttemptedAssessments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useUser();

  // Fetch real assessments from the backend and check for attempts
  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        setLoading(true);
        
        // Fetch assessments and results in parallel
        const [assessmentsResponse, resultsResponse] = await Promise.all([
          StudentAssessmentService.getAllAssessments(
            user?.department ? { department: user.department } : undefined
          ),
          ResultsService.getStudentResults().catch(() => ({ success: true, data: [] })) // Gracefully handle errors
        ]);
        
        console.log('Fetched assessments:', assessmentsResponse);
        console.log('Fetched results:', resultsResponse);
        
        // Get list of attempted assessment IDs
        const results = resultsResponse?.data || resultsResponse || [];
        const attemptedIds = new Set<string>();
        
        if (Array.isArray(results)) {
          results.forEach((result: any) => {
            if (result.assessmentId) {
              attemptedIds.add(result.assessmentId);
            }
          });
        }
        
        setAttemptedAssessments(attemptedIds);
        
        // Transform the data to match our interface
        const transformedAssessments = assessmentsResponse.data.map((item: any) => ({
          id: item.assessmentId,
          assessmentId: item.assessmentId,
          title: item.title,
          category: item.category || [],
          configuration: item.configuration || {
            duration: 60,
            maxAttempts: 1,
            passingScore: 50,
            randomizeQuestions: false,
            totalQuestions: 0
          },
          scheduling: item.scheduling || {
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            timezone: 'Asia/Kolkata'
          },
          status: item.status || 'ACTIVE',
          isPublished: item.isPublished || false,
          createdAt: item.createdAt || new Date().toISOString(),
          createdBy: item.createdBy || '',
          createdByName: item.createdByName || '',
          department: item.department || '',
          difficulty: item.difficulty || 'medium',
          description: item.description || '',
          entities: item.entities || [],
          stats: item.stats || {
            avgScore: 0,
            completed: 0,
            highestScore: 0,
            totalParticipants: 0
          },
          target: item.target || { years: [] },
          type: item.type || 'DEPARTMENT_WISE',
          updatedAt: item.updatedAt || new Date().toISOString()
        }));
        
        setAllAssessments(transformedAssessments);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching assessments:', err);
        setError('Failed to load assessments. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, [user?.department]);

  // Filter assessments based on active filter
  const filteredAssessments = activeFilter === 'all'
    ? allAssessments
    : allAssessments.filter(assessment => 
        assessment.category.map(cat => cat.toLowerCase()).includes(activeFilter)
      );

  // Get unique subjects/categories from assessments
  const uniqueSubjects = Array.from(
    new Set(
      allAssessments.flatMap(a => a.category).map(c => c.toLowerCase())
    )
  );

  const handleAttendTest = (assessment: Assessment) => {
    // Check if already attempted
    if (attemptedAssessments.has(assessment.assessmentId)) {
      // Directly navigate to results since we're removing resume functionality
      ResultsService.getStudentResults().then((response: any) => {
        const results = response?.data || response || [];
        const assessmentResult = results.find((r: any) => r.assessmentId === assessment.assessmentId);
        
        if (assessmentResult?.SK) {
          const encodedSK = encodeURIComponent(assessmentResult.SK);
          navigate(`/student/results/${encodedSK}`);
        } else {
          navigate('/student/results');
        }
      }).catch(() => {
        // If we can't check results, navigate to results page
        navigate('/student/results');
      });
      return;
    }
    
    // Navigate to the assessment taking page with the assessment ID
    navigate(`/student/assessment-taking/${assessment.assessmentId}`);
  };

  // Get status badge style based on status
  const getStatusBadgeStyle = (status: string) => {
    // Check if assessment is active based on current date
    const now = new Date();
    
    switch (status) {
      case 'ACTIVE':
        return { background: '#DCFCE7', color: '#166534' }; // Green for active
      case 'COMPLETED':
        return { background: '#E5E7EB', color: '#4B5563' }; // Gray for completed
      default:
        return { background: '#E0F2FE', color: '#075985' }; // Blue for upcoming
    }
  };

  // Get button style and text based on status and attempt status
  const getButtonConfig = (assessment: Assessment) => {
    const isAttempted = attemptedAssessments.has(assessment.assessmentId);
    const { status, isPublished } = assessment;
    const now = new Date();
    
    // If already attempted, show "View Results" button
    if (isAttempted) {
      return { 
        text: 'View Results', 
        style: { background: '#9768E1', color: 'white' },
        disabled: false
      };
    }
    
    // For testing purposes, allow access to assessments even if not published
    // In production, you might want to uncomment the following lines:
    /*
    if (!isPublished) {
      return { 
        text: 'Not Published', 
        style: { background: '#E5E7EB', color: '#6B7280', cursor: 'not-allowed' },
        disabled: true
      };
    }
    */
    
    // Always allow access for testing
    switch (status) {
      case 'ACTIVE':
        return { 
          text: 'Start Assessment', 
          style: { background: '#10B981', color: 'white' },
          disabled: false
        };
      default:
        return { 
          text: isPublished ? 'View Details' : 'View Details', 
          style: { background: '#6B7280', color: 'white' },
          disabled: false
        };
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="assessments-page" style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading Assessments...</h2>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="assessments-page" style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Error Loading Assessments</h2>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            background: '#9768E1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="assessments-page" style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '24px' }}>Programming Assessments</h2>
      
      <div className="filters" style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button 
          className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
          style={{
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '8px 16px',
            background: activeFilter === 'all' ? '#9768E1' : '#FFFFFF',
            color: activeFilter === 'all' ? '#FFFFFF' : '#111827',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: activeFilter === 'all' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
          }}
          onClick={() => setActiveFilter('all')}
        >
          All Assessments
        </button>
        {uniqueSubjects.map(subject => (
          <button 
            key={subject}
            className={`filter-btn ${activeFilter === subject ? 'active' : ''}`}
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '8px 16px',
              background: activeFilter === subject ? '#9768E1' : '#FFFFFF',
              color: activeFilter === subject ? '#FFFFFF' : '#111827',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: activeFilter === subject ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
            onClick={() => setActiveFilter(subject)}
          >
            {subject.charAt(0).toUpperCase() + subject.slice(1)}
          </button>
        ))}
      </div>

      {/* Floating Live Assessment button (bottom-right corner) */}
      <button
        onClick={() => setShowLiveInfo(true)}
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          zIndex: 50,
          background: '#9768E1',
          color: '#FFFFFF',
          border: 'none',
          padding: '12px 16px',
          borderRadius: '9999px',
          boxShadow: '0 10px 20px rgba(151,104,225,0.35)',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#9768E1'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#9768E1'; }}
      >
        Live Assessment
      </button>

      {/* Modal popup for link and password */}
      {showLiveInfo && (
        <div
          onClick={() => setShowLiveInfo(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(92vw, 520px)',
              background: '#FFFFFF',
              borderRadius: '14px',
              padding: '20px 20px 16px 20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Live Assessment Access</h3>
              <button
                onClick={() => setShowLiveInfo(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer' }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div style={{ marginTop: '12px' }}>
              <p style={{ margin: '8px 0' }}>
                <strong>Link:</strong> <a href={liveInfo.link} target="_blank" rel="noreferrer">{liveInfo.link}</a>
              </p>
              <p style={{ margin: '8px 0' }}>
                <strong>Password:</strong> {liveInfo.password}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <a
                href={liveInfo.link}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#4F46E5',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  padding: '8px 12px',
                  borderRadius: '8px'
                }}
              >
                Open Link
              </a>
              <button
                onClick={() => setShowLiveInfo(false)}
                style={{
                  background: '#F3F4F6',
                  color: '#111827',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
          </div>
        </div>
      </div>
    )}

    <div className="assessments-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px',
      width: '100%'
    }}>
      {filteredAssessments.length === 0 ? (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
          <h3>No assessments found</h3>
          <p>There are currently no assessments available.</p>
        </div>
      ) : (
        filteredAssessments.map(assessment => {
          const statusStyle = getStatusBadgeStyle(assessment.status);
          const buttonConfig = getButtonConfig(assessment);
          const isAttempted = attemptedAssessments.has(assessment.assessmentId);
          
          return (
            <div key={assessment.id} style={{
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}>
              <div style={{
                padding: '16px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>{assessment.title}</h3>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  ...(isAttempted ? { background: '#DBEAFE', color: '#1E40AF' } : statusStyle)
                }}>
                  {isAttempted ? 'Completed' : (assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1).toLowerCase())}
                </span>
              </div>

              <div style={{ padding: '16px', flexGrow: 1 }}>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 8px 0', color: '#6B7280', fontSize: '14px' }}>Category</p>
                  <p style={{ margin: 0, fontWeight: 500 }}>
                    {assessment.category.join(', ') || 'Not specified'}
                  </p>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', color: '#6B7280', fontSize: '12px' }}>Questions</p>
                    <p style={{ margin: 0, fontWeight: 500 }}>
                      {assessment.configuration.totalQuestions || 0}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px 0', color: '#6B7280', fontSize: '12px' }}>Duration</p>
                    <p style={{ margin: 0, fontWeight: 500 }}>
                      {assessment.configuration.duration || 60} mins
                    </p>
                  </div>
                </div>

                <div>
                  <p style={{ margin: '0 0 4px 0', color: '#6B7280', fontSize: '12px' }}>Department</p>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: '14px' }}>
                    {assessment.department || 'Not specified'}
                  </p>
                </div>
                
                <div style={{ marginTop: '12px' }}>
                  <p style={{ margin: '0 0 4px 0', color: '#6B7280', fontSize: '12px' }}>Created By</p>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: '14px' }}>
                    {assessment.createdByName || assessment.createdBy || 'Unknown'}
                  </p>
                </div>
              </div>
              
              <div style={{ padding: '16px', borderTop: '1px solid #E5E7EB' }}>
                <button 
                  onClick={() => handleAttendTest(assessment)}
                  disabled={buttonConfig.disabled}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 500,
                    cursor: buttonConfig.disabled ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.2s ease',
                    ...buttonConfig.style
                  }}
                >
                  {buttonConfig.text}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  </div>
  );
};

export default Assessments;