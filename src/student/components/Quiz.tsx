import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Question {
  id: number;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctAnswer: number;
  selectedAnswer?: number;
}

const Quiz: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  
  // This would normally come from an API or props
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 1,
      question: 'What is the output of the following code?',
      codeSnippet: 'console.log(2 + "2" + 2);',
      options: ['4', '6', '222', '22'],
      correctAnswer: 2
    },
    {
      id: 2,
      question: 'Which of the following is not a JavaScript data type?',
      options: ['String', 'Boolean', 'Undefined', 'Float'],
      correctAnswer: 3
    },
    {
      id: 3,
      question: 'What does the `===` operator do?',
      options: [
        'Compares values for equality with type conversion',
        'Assigns a value to a variable',
        'Compares values for equality without type conversion',
        'Checks if a variable is defined'
      ],
      correctAnswer: 2
    }
  ]);

  useEffect(() => {
    // In a real app, you would fetch the quiz questions here
    // const fetchQuiz = async () => {
    //   const response = await fetch(`/api/assessments/${id}/questions`);
    //   const data = await response.json();
    //   setQuestions(data.questions);
    // };
    // fetchQuiz();
  }, [id]);

  const handleAnswerSelect = (selectedAnswer: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex].selectedAnswer = selectedAnswer;
    setQuestions(updatedQuestions);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Calculate score
      const correctAnswers = questions.filter(
        (question) => question.selectedAnswer === question.correctAnswer
      ).length;
      setScore(Math.round((correctAnswers / questions.length) * 100));
      setShowScore(true);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    // In a real app, submit the answers to the server
    // await fetch(`/api/assessments/${id}/submit`, {
    //   method: 'POST',
    //   body: JSON.stringify({ answers: questions.map(q => q.selectedAnswer) })
    // });
    navigate('/student/results');
  };

  if (showScore) {
    return (
      <div className="quiz-container">
        <div className="score-section">
          <h2>Quiz Completed!</h2>
          <p>Your score: {score}%</p>
          <button onClick={handleSubmit} className="submit-btn">
            View Results
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2>Question {currentQuestionIndex + 1} of {questions.length}</h2>
        <div className="progress-bar">
          <div 
            className="progress" 
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="question-section">
        <h3>{currentQuestion.question}</h3>
        {currentQuestion.codeSnippet && (
          <pre className="code-snippet">
            <code>{currentQuestion.codeSnippet}</code>
          </pre>
        )}
      </div>

      <div className="options-section">
        {currentQuestion.options.map((option, index) => (
          <button
            key={index}
            className={`option-btn ${
              currentQuestion.selectedAnswer === index ? 'selected' : ''
            }`}
            onClick={() => handleAnswerSelect(index)}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="navigation-buttons">
        <button 
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className="nav-btn"
        >
          Previous
        </button>
        <button 
          onClick={handleNextQuestion}
          className="nav-btn next-btn"
        >
          {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default Quiz;
