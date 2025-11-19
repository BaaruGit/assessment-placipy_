import React, { useState } from "react";
import AssessmentService from "../services/assessment.service";

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  marks: number;
}

interface AssessmentData {
  title: string;
  description: string;
  duration: number;
  totalMarks: number;
  instructions: string;
  department: string;
  difficulty: string;
  category: string;
  questions: Question[];
}

const AssessmentCreation: React.FC = () => {
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({
    title: "",
    description: "",
    duration: 60,
    totalMarks: 100,
    instructions: "",
    department: "",
    difficulty: "medium",
    category: "",
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: 0,
    text: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    marks: 1
  });

  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const departments = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "All Departments"];
  // Updated categories to match requirements
  const categories = ["MCQ's", "Aptitude", "Programming (Any Language)"];

  const handleInputChange = (field: string, value: string | number) => {
    setAssessmentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQuestionChange = (field: string, value: string | number | string[], index?: number) => {
    if (field === "options" && typeof index === 'number') {
      const newOptions = [...currentQuestion.options];
      newOptions[index] = value as string;
      setCurrentQuestion(prev => ({
        ...prev,
        options: newOptions
      }));
    } else {
      setCurrentQuestion(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const addQuestion = () => {
    if (!currentQuestion.text.trim()) {
      alert("Please enter a question text");
      return;
    }

    // For MCQ's and Aptitude, validate options
    if (assessmentData.category === "MCQ's" || assessmentData.category === "Aptitude") {
      if (currentQuestion.options.some(option => !option.trim())) {
        alert("Please fill all options");
        return;
      }
    }

    const newQuestion: Question = {
      ...currentQuestion,
      id: Date.now()
    };

    setAssessmentData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));

    // Reset form
    setCurrentQuestion({
      id: 0,
      text: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      marks: 1
    });

    setShowQuestionForm(false);
  };

  const removeQuestion = (id: number) => {
    setAssessmentData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== CREATE ASSESSMENT CLICKED ===');
    console.log('Questions count:', assessmentData.questions.length);
    console.log('Assessment data:', assessmentData);
    
    if (assessmentData.questions.length === 0) {
      alert("Please add at least one question");
      return;
    }

    // Validate questions based on category
    for (const question of assessmentData.questions) {
      if (!question.text.trim()) {
        alert("Please enter text for all questions");
        return;
      }

      // For MCQ's and Aptitude, validate options
      if (assessmentData.category === "MCQ's" || assessmentData.category === "Aptitude") {
        if (question.options.some(option => !option.trim())) {
          alert("Please fill all options for MCQ and Aptitude questions");
          return;
        }
      }
    }

    try {
      setIsSubmitting(true);
      const response = await AssessmentService.createAssessment(assessmentData);
      console.log('Assessment created successfully:', response);
      setSuccessMessage("Assessment created successfully!");
      
      // Reset form
      setAssessmentData({
        title: "",
        description: "",
        duration: 60,
        totalMarks: 100,
        instructions: "",
        department: "",
        difficulty: "medium",
        category: "",
        questions: []
      });
      
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error: any) {
      console.error("❌ Failed to create assessment:", error);
      alert(error.message || "Failed to create assessment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pts-fade-in">
      {successMessage && (
        <div className="pts-success">
          {successMessage}
        </div>
      )}

      <div className="pts-form-container">
        <h2 className="pts-form-title">Create New Assessment</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="pts-form-grid">
            <div className="pts-form-group">
              <label className="pts-form-label">Assessment Title *</label>
              <input
                type="text"
                className="pts-form-input"
                placeholder="Enter assessment title"
                value={assessmentData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
              />
            </div>

            <div className="pts-form-group">
              <label className="pts-form-label">Department *</label>
              <select
                className="pts-form-select"
                value={assessmentData.department}
                onChange={(e) => handleInputChange("department", e.target.value)}
                required
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="pts-form-group">
              <label className="pts-form-label">Category *</label>
              <select
                className="pts-form-select"
                value={assessmentData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="pts-form-group">
              <label className="pts-form-label">Difficulty Level</label>
              <select
                className="pts-form-select"
                value={assessmentData.difficulty}
                onChange={(e) => handleInputChange("difficulty", e.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="pts-form-group">
              <label className="pts-form-label">Duration (minutes) *</label>
              <input
                type="number"
                className="pts-form-input"
                placeholder="Enter duration"
                min="1"
                value={assessmentData.duration}
                onChange={(e) => handleInputChange("duration", parseInt(e.target.value) || 0)}
                required
              />
            </div>

            <div className="pts-form-group">
              <label className="pts-form-label">Total Marks *</label>
              <input
                type="number"
                className="pts-form-input"
                placeholder="Enter total marks"
                min="1"
                value={assessmentData.totalMarks}
                onChange={(e) => handleInputChange("totalMarks", parseInt(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div className="pts-form-group">
            <label className="pts-form-label">Description</label>
            <textarea
              className="pts-form-textarea"
              placeholder="Enter assessment description"
              value={assessmentData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="pts-form-group">
            <label className="pts-form-label">Instructions</label>
            <textarea
              className="pts-form-textarea"
              placeholder="Enter assessment instructions"
              value={assessmentData.instructions}
              onChange={(e) => handleInputChange("instructions", e.target.value)}
              rows={3}
            />
          </div>

          {/* Questions Section */}
          <div className="pts-form-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 className="pts-form-subtitle">Questions</h3>
              <button
                type="button"
                className="pts-btn-secondary"
                onClick={() => setShowQuestionForm(true)}
                disabled={!assessmentData.category}
                title={!assessmentData.category ? "Please select a category first" : ""}
              >
                Add Question
              </button>
            </div>

            {assessmentData.questions.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                {assessmentData.questions.map((question, index) => (
                  <div key={question.id} style={{ 
                    background: "white", 
                    padding: "20px", 
                    borderRadius: "8px", 
                    marginBottom: "15px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ color: "#523C48", margin: "0 0 10px 0" }}>
                          Question {index + 1} ({question.marks} marks)
                        </h4>
                        <p style={{ color: "#523C48", margin: "0 0 15px 0" }}>{question.text}</p>
                        
                        {/* Show options only for MCQ's and Aptitude categories */}
                        {(assessmentData.category === "MCQ's" || assessmentData.category === "Aptitude") && (
                          <>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                              {question.options.map((option, optIndex) => (
                                <div key={optIndex} style={{ 
                                  padding: "8px", 
                                  background: question.correctAnswer === optIndex ? "#d4edda" : "#f8f9fa",
                                  borderRadius: "4px",
                                  border: question.correctAnswer === optIndex ? "1px solid #28a745" : "1px solid #dee2e6"
                                }}>
                                  <strong>{String.fromCharCode(65 + optIndex)}.</strong> {option}
                                  {question.correctAnswer === optIndex && (
                                    <span style={{ 
                                      background: "#28a745", 
                                      color: "white", 
                                      padding: "2px 6px", 
                                      borderRadius: "4px", 
                                      fontSize: "0.8rem",
                                      marginLeft: "8px"
                                    }}>
                                      Correct
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        
                        {/* For Programming questions, show a simple indicator */}
                        {assessmentData.category === "Programming (Any Language)" && (
                          <div style={{ 
                            padding: "10px", 
                            background: "#e9ecef", 
                            borderRadius: "4px",
                            fontStyle: "italic"
                          }}>
                            Programming Question (No options)
                          </div>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        className="pts-btn-danger"
                        onClick={() => removeQuestion(question.id)}
                        style={{ marginLeft: "15px" }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {assessmentData.questions.length === 0 && (
              <div style={{ 
                textAlign: "center", 
                padding: "40px", 
                background: "#f8f9fa", 
                borderRadius: "8px",
                border: "2px dashed #dee2e6"
              }}>
                <p style={{ color: "#6c757d", margin: 0 }}>
                  No questions added yet. Click "Add Question" to start adding questions.
                </p>
              </div>
            )}
          </div>

          {/* Add Question Form Modal */}
          {showQuestionForm && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000
            }}>
              <div style={{
                background: "white",
                padding: "30px",
                borderRadius: "8px",
                width: "90%",
                maxWidth: "600px",
                maxHeight: "90vh",
                overflowY: "auto"
              }}>
                <h3 style={{ color: "#523C48", marginTop: 0 }}>
                  Add New Question
                </h3>
                
                <div className="pts-form-group">
                  <label className="pts-form-label">Question Text *</label>
                  <textarea
                    className="pts-form-textarea"
                    placeholder="Enter your question here"
                    value={currentQuestion.text}
                    onChange={(e) => handleQuestionChange("text", e.target.value)}
                    rows={3}
                    required
                  />
                </div>

                {/* Show options only for MCQ's and Aptitude categories */}
                {(assessmentData.category === "MCQ's" || assessmentData.category === "Aptitude") && (
                  <>
                    <div className="pts-form-grid">
                      {currentQuestion.options.map((option, index) => (
                        <div className="pts-form-group" key={index}>
                          <label className="pts-form-label">Option {String.fromCharCode(65 + index)} *</label>
                          <input
                            type="text"
                            className="pts-form-input"
                            placeholder={`Enter option ${String.fromCharCode(65 + index)}`}
                            value={option}
                            onChange={(e) => handleQuestionChange("options", e.target.value, index)}
                            required
                          />
                        </div>
                      ))}
                    </div>

                    <div className="pts-form-group">
                      <label className="pts-form-label">Correct Answer *</label>
                      <select
                        className="pts-form-select"
                        value={currentQuestion.correctAnswer}
                        onChange={(e) => handleQuestionChange("correctAnswer", parseInt(e.target.value))}
                        required
                      >
                        <option value="">Select Correct Answer</option>
                        {currentQuestion.options.map((option, index) => (
                          <option key={index} value={index}>
                            {String.fromCharCode(65 + index)}. {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="pts-form-group">
                  <label className="pts-form-label">Marks *</label>
                  <input
                    type="number"
                    className="pts-form-input"
                    placeholder="Enter marks"
                    min="1"
                    value={currentQuestion.marks}
                    onChange={(e) => handleQuestionChange("marks", parseInt(e.target.value) || 1)}
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="pts-btn-secondary"
                    onClick={() => setShowQuestionForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="pts-btn-primary"
                    onClick={addQuestion}
                  >
                    Add Question
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "30px" }}>
            <button
              type="button"
              className="pts-btn-secondary"
              onClick={() => {
                // Reset form
                setAssessmentData({
                  title: "",
                  description: "",
                  duration: 60,
                  totalMarks: 100,
                  instructions: "",
                  department: "",
                  difficulty: "medium",
                  category: "",
                  questions: []
                });
              }}
            >
              Reset
            </button>
            <button
              type="submit"
              className="pts-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Assessment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssessmentCreation;