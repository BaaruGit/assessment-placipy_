import React, { useState } from 'react';

const ResultsReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('scores');

  // Mock data for results
  const testResults = [
    { id: 1, testName: 'Mathematics Quiz', score: 85, rank: 5, totalStudents: 30, date: '2025-10-30' },
    { id: 2, testName: 'Physics Test', score: 78, rank: 12, totalStudents: 28, date: '2025-10-25' },
    { id: 3, testName: 'Chemistry Exam', score: 92, rank: 3, totalStudents: 32, date: '2025-10-20' },
  ];

  // Mock data for department rankings
  const departmentRankings = [
    { rank: 1, name: 'Alice Johnson', score: 95 },
    { rank: 2, name: 'Michael Chen', score: 92 },
    { rank: 3, name: 'Sarah Williams', score: 90 },
    { rank: 4, name: 'John Doe', score: 85 },
    { rank: 5, name: 'Emma Davis', score: 82 },
  ];

  // Mock detailed analysis data
  const detailedAnalysis = {
    testName: 'Mathematics Quiz',
    correctAnswers: 17,
    totalQuestions: 20,
    timeSpent: '45 minutes',
    feedback: 'Good work on algebra questions. Need to improve on geometry concepts.'
  };

  return (
    <div className="results-reports-page">
      <h2>Results & Reports</h2>
      
      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'scores' ? 'active' : ''}`}
          onClick={() => setActiveTab('scores')}
        >
          Scores & Ranks
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          Detailed Analysis
        </button>
        <button 
          className={`tab-btn ${activeTab === 'ranking' ? 'active' : ''}`}
          onClick={() => setActiveTab('ranking')}
        >
          Department Ranking
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'scores' && (
          <div className="scores-tab">
            <h3>Your Test Scores</h3>
            <div className="results-table">
              <div className="table-header">
                <div>Test Name</div>
                <div>Score</div>
                <div>Rank</div>
                <div>Date</div>
              </div>
              {testResults.map(result => (
                <div key={result.id} className="table-row">
                  <div>{result.testName}</div>
                  <div className="score">{result.score}%</div>
                  <div>#{result.rank}/{result.totalStudents}</div>
                  <div>{result.date}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="analysis-tab">
            <h3>Detailed Analysis: {detailedAnalysis.testName}</h3>
            <div className="analysis-content">
              <div className="stats-grid">
                <div className="stat-card">
                  <h4>Correct Answers</h4>
                  <p className="stat-value">{detailedAnalysis.correctAnswers}/{detailedAnalysis.totalQuestions}</p>
                </div>
                <div className="stat-card">
                  <h4>Time Spent</h4>
                  <p className="stat-value">{detailedAnalysis.timeSpent}</p>
                </div>
                <div className="stat-card">
                  <h4>Accuracy</h4>
                  <p className="stat-value">{Math.round((detailedAnalysis.correctAnswers/detailedAnalysis.totalQuestions)*100)}%</p>
                </div>
              </div>
              <div className="feedback-section">
                <h4>Feedback</h4>
                <p>{detailedAnalysis.feedback}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="ranking-tab">
            <h3>Department Ranking Board</h3>
            <div className="ranking-list">
              {departmentRankings.map(student => (
                <div 
                  key={student.rank} 
                  className={`ranking-item ${student.name === 'John Doe' ? 'current-student' : ''}`}
                >
                  <div className="rank">#{student.rank}</div>
                  <div className="name">{student.name}</div>
                  <div className="score">{student.score}%</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsReports;