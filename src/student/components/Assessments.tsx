import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import SkeletonLoader from './SkeletonLoader';
import Pagination from './Pagination';

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
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'completed', or subject name
  const [currentPage, setCurrentPage] = useState(1);
  
  // State for real assessments
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);
  // Store attempted assessments with completion timestamps
  const [attemptedAssessments, setAttemptedAssessments] = useState<Map<string, Date>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useUser();
  
  const PAGE_SIZE = 8; // Define page size for pagination

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
        
        // Get list of attempted assessment IDs with completion dates
        const results = resultsResponse?.data || resultsResponse || [];
        const attemptedMap = new Map<string, Date>();
        
        if (Array.isArray(results)) {
          results.forEach((result: any) => {
            if (result.assessmentId) {
              // Use submittedAt if available, otherwise use current date
              const completionDate = result.submittedAt ? new Date(result.submittedAt) : new Date();
              attemptedMap.set(result.assessmentId, completionDate);
            }
          });
        }
        
        setAttemptedAssessments(attemptedMap);
        
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
    ? allAssessments.filter(assessment => {
        // Only include non-completed assessments in "all" filter
        const isAttempted = attemptedAssessments.has(assessment.assessmentId);
        return !isAttempted;
      })
    : activeFilter === 'completed'
    ? allAssessments.filter(assessment => {
        const isAttempted = attemptedAssessments.has(assessment.assessmentId);
        if (!isAttempted) return false; // Only include completed assessments
        
        // Check if they were completed within the last 10 days
        const completionDate = attemptedAssessments.get(assessment.assessmentId)!;
        const daysSinceCompletion = (Date.now() - completionDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCompletion <= 10; // Only include completed assessments within last 10 days
      })
    : allAssessments.filter(assessment => {
        const matchesCategory = assessment.category.map(cat => cat.toLowerCase()).includes(activeFilter);
        const isAttempted = attemptedAssessments.has(assessment.assessmentId);
        
        if (!matchesCategory) return false; // Must match category
        
        // For subject filters, exclude completed assessments
        if (isAttempted) return false;
        
        return matchesCategory;
      });

  // Pagination logic for filtered assessments
  const totalItems = filteredAssessments.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedAssessments = filteredAssessments.slice(startIndex, startIndex + PAGE_SIZE);

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
    
    // Check if assessment has started
    const now = new Date();
    const startDate = new Date(assessment.scheduling.startDate);
    const endDate = new Date(assessment.scheduling.endDate);
    
    if (now < startDate) {
      alert(`This assessment will start at ${startDate.toLocaleString()}`);
      return;
    }
    
    if (now > endDate) {
      alert('This assessment has ended.');
      return;
    }
    
    // Navigate to the assessment taking page with the assessment ID
    navigate(`/student/assessment-taking/${assessment.assessmentId}`);
  };

  // Get status badge style based on status and timing
  const getStatusBadgeStyle = (assessment: Assessment) => {
    const now = new Date();
    const startDate = new Date(assessment.scheduling.startDate);
    const endDate = new Date(assessment.scheduling.endDate);
    const hasStarted = now >= startDate;
    const hasEnded = now > endDate;
    
    if (hasEnded) {
      return { background: '#FEE2E2', color: '#991B1B' }; // Red for ended
    }
    
    if (!hasStarted) {
      return { background: '#FEF3C7', color: '#92400E' }; // Yellow for upcoming
    }
    
    // Assessment is active (has started but not ended)
    switch (assessment.status) {
      case 'ACTIVE':
        return { background: '#DCFCE7', color: '#166534' }; // Green for active
      case 'COMPLETED':
        return { background: '#E5E7EB', color: '#4B5563' }; // Gray for completed
      default:
        return { background: '#E0F2FE', color: '#075985' }; // Blue for other statuses
    }
  };

  // Get button style and text based on status and attempt status
  const getButtonConfig = (assessment: Assessment) => {
    const isAttempted = attemptedAssessments.has(assessment.assessmentId);
    const completionDate = attemptedAssessments.get(assessment.assessmentId);
    const { status, isPublished, scheduling } = assessment;
    const now = new Date();
    
    // If already attempted, show "Completed" button
    if (isAttempted) {
      return { 
        text: 'Completed', 
        style: { background: '#4B5563', color: 'white' },
        disabled: false
      };
    }
    
    // Check if assessment has started
    const startDate = new Date(scheduling.startDate);
    const endDate = new Date(scheduling.endDate);
    const hasStarted = now >= startDate;
    const hasEnded = now > endDate;
    
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
    
    // Check if assessment has ended
    if (hasEnded) {
      return { 
        text: 'Ended', 
        style: { background: '#EF4444', color: 'white', cursor: 'not-allowed' },
        disabled: true
      };
    }
    
    // Check if assessment hasn't started yet
    if (!hasStarted) {
      const startTime = startDate.toLocaleString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
      });
      return { 
        text: `Starts at ${startTime}`, 
        style: { background: '#F59E0B', color: 'white', cursor: 'not-allowed' },
        disabled: true
      };
    }
    
    // Assessment has started and is active
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

  // Render loading state with skeleton loader
  if (loading) {
    return (
      <div className="assessments-page" style={{ padding: '20px' }}>
        <h2 style={{ marginBottom: '24px' }}>Programming Assessments</h2>
        <div className="filters" style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '8px 16px',
            background: '#f8f9fa',
            width: '120px',
            height: '36px',
            animation: 'loading 1.5s infinite'
          }}></div>
          <div style={{
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '8px 16px',
            background: '#f8f9fa',
            width: '120px',
            height: '36px',
            animation: 'loading 1.5s infinite'
          }}></div>
        </div>
        <div className="assessments-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
          width: '100%'
        }}>
          <div style={{
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            height: '300px'
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                height: '24px',
                width: '150px',
                background: '#f0f0f0',
                borderRadius: '4px',
                animation: 'loading 1.5s infinite'
              }}></div>
              <div style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                height: '24px',
                width: '80px',
                background: '#f0f0f0',
                animation: 'loading 1.5s infinite'
              }}></div>
            </div>
            <div style={{ padding: '16px', flexGrow: 1 }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  height: '16px',
                  width: '80px',
                  background: '#f0f0f0',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  animation: 'loading 1.5s infinite'
                }}></div>
                <div style={{
                  height: '20px',
                  width: '120px',
                  background: '#f0f0f0',
                  borderRadius: '4px',
                  animation: 'loading 1.5s infinite'
                }}></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{
                    height: '12px',
                    width: '60px',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    animation: 'loading 1.5s infinite'
                  }}></div>
                  <div style={{
                    height: '16px',
                    width: '50px',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    animation: 'loading 1.5s infinite'
                  }}></div>
                </div>
                <div>
                  <div style={{
                    height: '12px',
                    width: '60px',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    animation: 'loading 1.5s infinite'
                  }}></div>
                  <div style={{
                    height: '16px',
                    width: '50px',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    animation: 'loading 1.5s infinite'
                  }}></div>
                </div>
              </div>
              <div>
                <div style={{
                  height: '12px',
                  width: '70px',
                  background: '#f0f0f0',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  animation: 'loading 1.5s infinite'
                }}></div>
                <div style={{
                  height: '16px',
                  width: '100px',
                  background: '#f0f0f0',
                  borderRadius: '4px',
                  animation: 'loading 1.5s infinite'
                }}></div>
              </div>
            </div>
            <div style={{ padding: '16px', borderTop: '1px solid #E5E7EB' }}>
              <div style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#f0f0f0',
                height: '36px',
                animation: 'loading 1.5s infinite'
              }}></div>
            </div>
          </div>
          <div style={{
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            height: '300px'
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                height: '24px',
                width: '150px',
                background: '#f0f0f0',
                borderRadius: '4px',
                animation: 'loading 1.5s infinite'
              }}></div>
              <div style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                height: '24px',
                width: '80px',
                background: '#f0f0f0',
                animation: 'loading 1.5s infinite'
              }}></div>
            </div>
            <div style={{ padding: '16px', flexGrow: 1 }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  height: '16px',
                  width: '80px',
                  background: '#f0f0f0',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  animation: 'loading 1.5s infinite'
                }}></div>
                <div style={{
                  height: '20px',
                  width: '120px',
                  background: '#f0f0f0',
                  borderRadius: '4px',
                  animation: 'loading 1.5s infinite'
                }}></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{
                    height: '12px',
                    width: '60px',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    animation: 'loading 1.5s infinite'
                  }}></div>
                  <div style={{
                    height: '16px',
                    width: '50px',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    animation: 'loading 1.5s infinite'
                  }}></div>
                </div>
                <div>
                  <div style={{
                    height: '12px',
                    width: '60px',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    animation: 'loading 1.5s infinite'
                  }}></div>
                  <div style={{
                    height: '16px',
                    width: '50px',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    animation: 'loading 1.5s infinite'
                  }}></div>
                </div>
              </div>
              <div>
                <div style={{
                  height: '12px',
                  width: '70px',
                  background: '#f0f0f0',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  animation: 'loading 1.5s infinite'
                }}></div>
                <div style={{
                  height: '16px',
                  width: '100px',
                  background: '#f0f0f0',
                  borderRadius: '4px',
                  animation: 'loading 1.5s infinite'
                }}></div>
              </div>
            </div>
            <div style={{ padding: '16px', borderTop: '1px solid #E5E7EB' }}>
              <div style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#f0f0f0',
                height: '36px',
                animation: 'loading 1.5s infinite'
              }}></div>
            </div>
          </div>
        </div>
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
        <button 
          className={`filter-btn ${activeFilter === 'completed' ? 'active' : ''}`}
          style={{
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '8px 16px',
            background: activeFilter === 'completed' ? '#9768E1' : '#FFFFFF',
            color: activeFilter === 'completed' ? '#FFFFFF' : '#111827',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: activeFilter === 'completed' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
          }}
          onClick={() => setActiveFilter('completed')}
        >
          Completed
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

      {/* Live Assessment button removed as per user request */}

    <div className="assessments-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
      gap: '16px',
      width: '100%'
    }}>
      {filteredAssessments.length === 0 ? (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
          <h3>No assessments found</h3>
          <p>There are currently no assessments available.</p>
        </div>
      ) : (
        paginatedAssessments.map(assessment => {
          const statusStyle = getStatusBadgeStyle(assessment);
          const buttonConfig = getButtonConfig(assessment);
          const isAttempted = attemptedAssessments.has(assessment.assessmentId);
          
          // Get status text based on timing
          const getStatusText = (assessment: Assessment) => {
            if (isAttempted) return 'Completed';
            
            const now = new Date();
            const startDate = new Date(assessment.scheduling.startDate);
            const endDate = new Date(assessment.scheduling.endDate);
            
            if (now > endDate) return 'Ended';
            if (now < startDate) return 'Upcoming';
            return assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1).toLowerCase();
          };
          
          return (
            <div key={assessment.id} style={{
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}>
              <div style={{
                padding: '12px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0, fontSize: '14px', color: '#111827' }}>{assessment.title}</h3>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '10px',
                  fontWeight: 600,
                  ...(isAttempted ? { background: '#DBEAFE', color: '#1E40AF' } : statusStyle)
                }}>
                  {getStatusText(assessment)}
                </span>
              </div>

              <div style={{ padding: '12px', flexGrow: 1 }}>
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ margin: '0 0 8px 0', color: '#6B7280', fontSize: '14px' }}>Category</p>
                  <p style={{ margin: 0, fontWeight: 500 }}>
                    {assessment.category.join(', ') || 'Not specified'}
                  </p>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
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
                
                <div style={{ marginTop: '8px' }}>
                  <p style={{ margin: '0 0 4px 0', color: '#6B7280', fontSize: '12px' }}>Created Date</p>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: '14px' }}>
                    {assessment.createdAt ? new Date(assessment.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
              
              <div style={{ padding: '12px', borderTop: '1px solid #E5E7EB' }}>
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
    
    {/* Add pagination controls */}
    {totalPages > 1 && (
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
        <Pagination
          currentPage={safeCurrentPage}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    )}
  </div>
  );
};

export default Assessments;