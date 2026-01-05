import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import Pagination from './Pagination';

import StudentAssessmentService from '../../services/student.assessment.service';
import './AssessmentTaking.css';

interface Assessment {
  id: string;
  assessmentId: string;
  title: string;
  category: string[];
  department?: string;
  description?: string;
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
  createdAt?: string;
  updatedAt?: string;
}

const StudentAssessments: React.FC = () => {
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'active' | 'completed'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { user } = useUser();
  
  const PAGE_SIZE = 8; // Define page size for pagination

  // Fetch assessments and results
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all assessments
        const assessmentsResponse = await StudentAssessmentService.getAllAssessments(
          user?.department && user?.email ? { department: user.department, clientDomain: user.email.split('@')[1] } : undefined
        );
        console.log('Fetched assessments:', assessmentsResponse);
        
        // Fetch student's results to determine completed assessments
        // Commented out since we removed the endpoint
        /*
        const resultsResponse = await ResultsService.getMyResults();
        console.log('Fetched results:', resultsResponse);
        */
        
        // Transform assessments data
        const transformedAssessments = assessmentsResponse.data.map((item: any) => ({
          id: item.assessmentId || item.id,
          assessmentId: item.assessmentId || item.id,
          title: item.title,
          category: item.category || [],
          department: item.department,
          description: item.description,
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
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }));
        
        setAllAssessments(transformedAssessments);
        setFilteredAssessments(transformedAssessments);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to fetch assessments');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.department]);

  // Filter assessments based on tab and search term
  useEffect(() => {
    const now = new Date();
    let filtered = allAssessments;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(assessment => 
        assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (assessment.department && assessment.department.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply tab filter
    switch (activeTab) {
      case 'upcoming':
        filtered = filtered.filter(assessment => 
          new Date(assessment.scheduling.startDate) > now
        );
        break;
      case 'active':
        filtered = filtered.filter(assessment => {
          const startDate = new Date(assessment.scheduling.startDate);
          const endDate = new Date(assessment.scheduling.endDate);
          return startDate <= now && endDate >= now && assessment.status === 'ACTIVE';
        });
        break;
      case 'completed':
        filtered = filtered.filter(assessment => 
          new Date(assessment.scheduling.endDate) < now || assessment.status === 'COMPLETED'
        );
        break;
    }

    setFilteredAssessments(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [allAssessments, activeTab, searchTerm]);

  // Pagination logic
  const totalItems = filteredAssessments.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedAssessments = filteredAssessments.slice(startIndex, startIndex + PAGE_SIZE);

  const handleTakeAssessment = (assessmentId: string) => {
    navigate(`/student/assessment/${assessmentId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="assessments-container">
        <div className="loading">Loading assessments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="assessments-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="assessments-container">
      <div className="assessments-header">
        <h2>My Assessments</h2>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search assessments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="tabs">
        <button 
          className={activeTab === 'upcoming' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming
        </button>
        <button 
          className={activeTab === 'active' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('active')}
        >
          Active
        </button>
        <button 
          className={activeTab === 'completed' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('completed')}
        >
          Completed
        </button>
      </div>

      <div className="assessments-grid">
        {filteredAssessments.length === 0 ? (
          <div className="no-assessments">
            No assessments found.
          </div>
        ) : (
          paginatedAssessments.map((assessment) => (
            <div key={assessment.id} className="assessment-card">
              <div className="assessment-header">
                <h3>{assessment.title}</h3>
                <span className={`status ${assessment.status.toLowerCase()}`}>
                  {assessment.status}
                </span>
              </div>
              
              <div className="assessment-details">
                {assessment.department && (
                  <p><strong>Department:</strong> {assessment.department}</p>
                )}
                
                {assessment.description && (
                  <p className="description">{assessment.description}</p>
                )}
                
                <div className="assessment-meta">
                  <p><strong>Duration:</strong> {assessment.configuration.duration} minutes</p>
                  <p><strong>Questions:</strong> {assessment.configuration.totalQuestions}</p>
                  <p><strong>Max Attempts:</strong> {assessment.configuration.maxAttempts}</p>
                </div>
                
                <div className="assessment-dates">
                  <p><strong>Starts:</strong> {formatDate(assessment.scheduling.startDate)}</p>
                  <p><strong>Ends:</strong> {formatDate(assessment.scheduling.endDate)}</p>
                </div>
              </div>
              
              <div className="assessment-actions">
                {activeTab === 'active' && (
                  <button 
                    className="take-assessment-btn"
                    onClick={() => handleTakeAssessment(assessment.assessmentId)}
                  >
                    Take Assessment
                  </button>
                )}
                
                {activeTab === 'upcoming' && (
                  <button className="upcoming-btn" disabled>
                    Starts Soon
                  </button>
                )}
                
                {activeTab === 'completed' && (
                  <button className="view-results-btn">
                    View Results
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
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

export default StudentAssessments;
