import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ResultsService from '../../services/results.service';
import '../styles/Dashboard.css';

const ResultDetail: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      if (!attemptId) {
        setError('Attempt ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await ResultsService.getResultDetail(attemptId);
        if (response.success) {
          setResult(response.data);
        } else {
          setError('Failed to fetch result: ' + (response.message || 'Unknown error'));
        }
      } catch (err: any) {
        console.error('Error fetching result detail:', err);
        setError(err.message || 'Failed to fetch result detail');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Loading Result...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button 
          onClick={() => navigate('/student/results')}
          style={{
            padding: '10px 20px',
            background: '#9768E1',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          Back to Results
        </button>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Result not found</h2>
        <button 
          onClick={() => navigate('/student/results')}
          style={{
            padding: '10px 20px',
            background: '#9768E1',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          Back to Results
        </button>
      </div>
    );
  }

  // Format time spent
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <button 
          onClick={() => navigate('/student/results')}
          style={{
            padding: '8px 16px',
            background: '#f0f0f0',
            color: '#333',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          ← Back to Results
        </button>
        <h1 style={{ margin: '0', color: '#333' }}>Result Details</h1>
      </div>

      {/* Score & Percentage */}
      <div style={{
        background: 'white',
        borderRadius: '10px',
        padding: '30px',
        marginBottom: '20px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Score & Percentage</h2>
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Score</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#9768E1' }}>
              {result.score || 0} / {result.maxScore || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Percentage</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#9768E1' }}>
              {result.percentage || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div style={{
        background: 'white',
        borderRadius: '10px',
        padding: '30px',
        marginBottom: '20px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Statistics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Correct</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>
              {result.numCorrect || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Incorrect</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>
              {result.numIncorrect || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Unattempted</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#999' }}>
              {result.numUnattempted || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Accuracy</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9768E1' }}>
              {result.accuracy || 0}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Time Spent</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
              {formatTime(result.timeSpentSeconds || 0)}
            </div>
          </div>

        </div>
      </div>

      {/* Section Scores */}
      {result.entity_marks && Object.keys(result.entity_marks).length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '10px',
          padding: '30px',
          marginBottom: '20px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Section Scores</h2>
          <div style={{ display: 'flex', gap: '40px' }}>
            {Object.entries(result.entity_marks).map(([section, score]: [string, any]) => (
              <div key={section}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>{section}</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9768E1' }}>
                  {score || 0}
                </div>
              </div>
            ))}

          </div>
        </div>
      )}

      {/* Answers */}
      {result.answers && result.answers.length > 0 && (
        <div
          style={{
            background: 'white',
            borderRadius: '10px',
            padding: '30px',
            marginBottom: '20px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          }}
        >
          <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Answers</h2>

          <div className="answers-table-wrapper" role="region" aria-label="Answer breakdown table">
            <table className="answers-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Your Answer</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {result.answers.map((answer: any, index: number) => {
                  const hasSelection = answer.selected && answer.selected.length > 0;
                  const status =
                    answer.isCorrect && hasSelection
                      ? 'Correct'
                      : !answer.isCorrect && hasSelection
                      ? 'Incorrect'
                      : 'Unattempted';

                  const statusClass =
                    status === 'Correct'
                      ? 'status-correct'
                      : status === 'Incorrect'
                      ? 'status-incorrect'
                      : 'status-unattempted';

                  return (
                    <tr key={index}>
                      <td>
                        <div className="answer-question-cell">
                          <div className="answer-question-label">
                            Question {index + 1}
                          </div>
                          {answer.questionText && (
                            <div className="answer-question-text">
                              {answer.questionText}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {hasSelection ? (
                          <span className="answer-text">
                            {answer.selected.join(', ')}
                          </span>
                        ) : (
                          <span className="answer-text answer-text-muted">
                            No answer selected
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`status-pill ${statusClass}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultDetail;

