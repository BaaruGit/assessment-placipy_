import React, { useState } from 'react';

const Assessments: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Mock data for assessments
  const allAssessments = [
    { 
      id: 1, 
      title: 'Mathematics Quiz', 
      subject: 'Mathematics',
      startTime: '2025-11-15 10:00 AM',
      duration: '60 minutes',
      instructions: 'Complete all questions. No calculators allowed.',
      status: 'active'
    },
    { 
      id: 2, 
      title: 'Physics Test', 
      subject: 'Physics',
      startTime: '2025-11-20 02:00 PM',
      duration: '90 minutes',
      instructions: 'Show all work for partial credit.',
      status: 'upcoming'
    },
    { 
      id: 3, 
      title: 'Chemistry Exam', 
      subject: 'Chemistry',
      startTime: '2025-10-30 09:00 AM',
      duration: '120 minutes',
      instructions: 'Multiple choice and essay questions.',
      status: 'completed'
    },
    { 
      id: 4, 
      title: 'Biology Midterm', 
      subject: 'Biology',
      startTime: '2025-11-25 11:00 AM',
      duration: '90 minutes',
      instructions: 'Bring pencil and eraser.',
      status: 'upcoming'
    },
  ];

  const filteredAssessments = activeFilter === 'all' 
    ? allAssessments 
    : allAssessments.filter(assessment => assessment.subject.toLowerCase() === activeFilter);

  const uniqueSubjects = Array.from(new Set(allAssessments.map(a => a.subject.toLowerCase())));

  const handleAttendTest = (assessmentId: number) => {
    alert(`Attending test #${assessmentId}`);
    // In a real app, this would navigate to the test page
  };

  const handleViewResults = (assessmentId: number) => {
    alert(`Viewing results for test #${assessmentId}`);
    // In a real app, this would navigate to the results page
  };

  return (
    <div className="assessments-page">
      <h2>Assessments</h2>
      
      <div className="filters">
        <button 
          className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All Assessments
        </button>
        {uniqueSubjects.map(subject => (
          <button 
            key={subject}
            className={`filter-btn ${activeFilter === subject ? 'active' : ''}`}
            onClick={() => setActiveFilter(subject)}
          >
            {subject.charAt(0).toUpperCase() + subject.slice(1)}
          </button>
        ))}
      </div>

      <div className="assessments-grid">
        {filteredAssessments.map(assessment => (
          <div key={assessment.id} className="assessment-card">
            <div className="card-header">
              <h3>{assessment.title}</h3>
              <span className={`status-badge ${assessment.status}`}>
                {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
              </span>
            </div>
            
            <div className="card-body">
              <p><strong>Subject:</strong> {assessment.subject}</p>
              <p><strong>Start Time:</strong> {assessment.startTime}</p>
              <p><strong>Duration:</strong> {assessment.duration}</p>
              <p><strong>Instructions:</strong> {assessment.instructions}</p>
            </div>
            
            <div className="card-actions">
              {assessment.status === 'active' && (
                <button 
                  className="attend-btn"
                  onClick={() => handleAttendTest(assessment.id)}
                >
                  Attend Test
                </button>
              )}
              
              {assessment.status === 'completed' && (
                <button 
                  className="results-btn"
                  onClick={() => handleViewResults(assessment.id)}
                >
                  View Results
                </button>
              )}
              
              {assessment.status === 'upcoming' && (
                <button className="upcoming-btn" disabled>
                  Upcoming
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Assessments;