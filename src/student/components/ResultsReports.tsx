import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ResultsService from '../../services/results.service';
import StudentAssessmentService from '../../services/student.assessment.service';
import SkeletonLoader from './SkeletonLoader';
import Pagination from './Pagination';

const PAGE_SIZE = 8;

const ResultsReports: React.FC = () => {
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [assessmentsMap, setAssessmentsMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch results and assessments when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch results
        const resultsResponse = await ResultsService.getStudentResults();
        console.log('Results response:', resultsResponse);
        console.log('Response type:', typeof resultsResponse);
        console.log('Response keys:', resultsResponse ? Object.keys(resultsResponse) : 'null');
        
        // Handle different response formats for results
        let results = [];
        if (resultsResponse) {
          if (Array.isArray(resultsResponse)) {
            // Direct array response
            results = resultsResponse;
          } else if (resultsResponse.data) {
            // Response with data property
            results = Array.isArray(resultsResponse.data) ? resultsResponse.data : [];
          } else if (resultsResponse.success && resultsResponse.data) {
            // Response with success flag
            results = Array.isArray(resultsResponse.data) ? resultsResponse.data : [];
          }
        }
        
        console.log('Extracted results:', results);
        console.log('Results count:', results.length);
        
        // Fetch all assessments to get titles
        const assessmentsResponse = await StudentAssessmentService.getAllAssessments();
        console.log('Assessments response:', assessmentsResponse);
        
        // Create a map from assessment IDs to titles
        const assessments = Array.isArray(assessmentsResponse?.data) 
          ? assessmentsResponse.data 
          : Array.isArray(assessmentsResponse) 
          ? assessmentsResponse 
          : [];
        
        const assessmentsMap = new Map();
        assessments.forEach((assessment: any) => {
          if (assessment.assessmentId && assessment.title) {
            assessmentsMap.set(assessment.assessmentId, assessment.title);
          }
        });
        
        setAssessmentsMap(assessmentsMap);
        setTestResults(results);
        setCurrentPage(1);
        
      } catch (err: any) {
        console.error('Error fetching data:', err);
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        
        // Only show error if it's not a 404 (no results is not an error)
        if (err.response?.status !== 404) {
          const errorMessage = err.response?.data?.message || 
                              err.message || 
                              'Failed to fetch results. Please try again later.';
          setError(errorMessage);
        } else {
          // 404 means no results found, which is fine
          setTestResults([]);
          setAssessmentsMap(new Map());
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleViewResult = (result: any) => {
    // Navigate to result detail page with attemptId (SK)
    if (result.SK) {
      const encodedAttemptId = encodeURIComponent(result.SK);
      navigate(`/student/results/${encodedAttemptId}`);
    }
  };

  const totalItems = testResults.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedResults = testResults.slice(startIndex, startIndex + PAGE_SIZE);

  if (error) {
    return (
      <div className="results-reports-page">
        <div className="error-container">
          <h2>Error Loading Results</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="results-reports-page">
      <h2>Results &amp; Reports</h2>
      
      <div className="scores-tab">
        <h3>Your Test Scores</h3>

        {loading && (
          <div className="results-table-card">
            <div className="results-table-wrapper" aria-hidden="true">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Assessment</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Accuracy</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index} className="results-skeleton-row">
                      <td>
                        <div className="skeleton-line skeleton-line-title" />
                        <div className="skeleton-line skeleton-line-subtitle" />
                      </td>
                      <td><div className="skeleton-line skeleton-line-short" /></td>
                      <td><div className="skeleton-line skeleton-line-short" /></td>
                      <td><div className="skeleton-line skeleton-line-short" /></td>
                      <td><div className="skeleton-pill" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && testResults.length > 0 && (
          <div className="results-table-card">
            <div className="results-table-wrapper" role="region" aria-label="Assessment results table">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Assessment</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Accuracy</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedResults.map((result: any, index: number) => {
                    const title = assessmentsMap.get(result.assessmentId) || 'Assessment';
                    const submittedLabel = result.submittedAt
                      ? new Date(result.submittedAt).toLocaleString()
                      : 'Submission time not available';

                    return (
                      <tr key={index} className="results-row">
                        <td>
                          <div className="results-assessment-cell">
                            <div className="assessment-title">{title}</div>
                            <div className="assessment-submitted">
                              Submitted at {submittedLabel}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="score">
                            {result.score || 0} / {result.maxScore || 0}
                          </span>
                        </td>
                        <td>{result.percentage || 0}%</td>
                        <td>{result.accuracy || 0}%</td>
                        <td>
                          <button 
                            type="button"
                            onClick={() => handleViewResult(result)}
                            className="table-action-button"
                          >
                            View Result
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={safeCurrentPage}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {!loading && testResults.length === 0 && (
          <div className="results-empty-state">
            <h3>No results yet</h3>
            <p>
              Once you complete assessments, your scores and reports will appear here in a clear table view.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsReports;