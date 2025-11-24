import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

interface Assessment {
  id: string;
  title: string;
  category: string;
  startTime: number;
  totalQuestions: number;
  durationMinutes: number;
  status: 'upcoming' | 'active' | 'completed';
}

// Helper function to generate random assessments
const generateAssessments = (min: number, max: number): Assessment[] => {
  const categories = ['JavaScript', 'Python', 'Java', 'C++', 'React', 'Node.js'];
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  
  return Array.from({ length: count }, (_, i) => ({
    id: `assess-${i + 1}`,
    title: `Assessment ${i + 1}`,
    category: categories[Math.floor(Math.random() * categories.length)],
    startTime: Date.now() + (Math.random() * 30 * 24 * 60 * 60 * 1000), // Within next 30 days
    totalQuestions: Math.floor(Math.random() * 10) + 5, // 5-15 questions
    durationMinutes: Math.floor(Math.random() * 30) + 30, // 30-60 minutes
    status: ['upcoming', 'active', 'completed'][Math.floor(Math.random() * 3)] as 'upcoming' | 'active' | 'completed'
  }));
};

const Assessments: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showLiveInfo, setShowLiveInfo] = useState(false);
  const [liveInfo] = useState({
    link: 'https://example.com/live-assessment',
    password: 'PLCY-7842'
  });
  
  // Generate demo assessments using Faker (configurable counts)
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const generated = generateAssessments(6, 8);
    setAllAssessments(generated);
  }, []);

  const filteredAssessments = activeFilter === 'all'
    ? allAssessments
    : allAssessments.filter(assessment => assessment.category.toLowerCase() === activeFilter);

  const uniqueSubjects = Array.from(new Set(allAssessments.map(a => a.category.toLowerCase())));

  const handleAttendTest = (assessment: Assessment) => {
    // Navigate to the assessment taking page
    navigate('/student/assessment-taking');
  };

  // Get status badge style based on status
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'active':
        return { background: '#DCFCE7', color: '#166534' }; // Green for active
      case 'completed':
        return { background: '#E5E7EB', color: '#4B5563' }; // Gray for completed
      case 'upcoming':
      default:
        return { background: '#E0F2FE', color: '#075985' }; // Blue for upcoming
    }
  };

  // Get button style and text based on status
  const getButtonConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { 
          text: 'Start Assessment', 
          style: { background: '#10B981', color: 'white' },
          disabled: false
        };
      case 'upcoming':
        return { 
          text: 'Coming Soon', 
          style: { background: '#E5E7EB', color: '#6B7280', cursor: 'not-allowed' },
          disabled: true
        };
      case 'completed':
      default:
        return { 
          text: 'View Results', 
          style: { background: '#6B7280', color: 'white' },
          disabled: false
        };
    }
  };

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
      {filteredAssessments.map(assessment => {
        const statusStyle = getStatusBadgeStyle(assessment.status);
        const buttonConfig = getButtonConfig(assessment.status);
        
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
                ...statusStyle
              }}>
                {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
              </span>
            </div>

            <div style={{ padding: '16px', flexGrow: 1 }}>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: '0 0 8px 0', color: '#6B7280', fontSize: '14px' }}>Category</p>
                <p style={{ margin: 0, fontWeight: 500 }}>{assessment.category}</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: '#6B7280', fontSize: '12px' }}>Questions</p>
                  <p style={{ margin: 0, fontWeight: 500 }}>{assessment.totalQuestions}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: '#6B7280', fontSize: '12px' }}>Duration</p>
                  <p style={{ margin: 0, fontWeight: 500 }}>{assessment.durationMinutes} mins</p>
                </div>
              </div>

              <div>
                <p style={{ margin: '0 0 4px 0', color: '#6B7280', fontSize: '12px' }}>Starts</p>
                <p style={{ margin: 0, fontWeight: 500, fontSize: '14px' }}>
                  {new Date(assessment.startTime).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
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
      })}
    </div>
  </div>
  );
};

export default Assessments;