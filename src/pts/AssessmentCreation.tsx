import React, { useState, useEffect, useRef } from "react";
import AssessmentService from "../services/assessment.service";
import { useUser } from '../contexts/UserContext';

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
}

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number | string | string[]; // Updated to support array format
  marks: number;
  testCases?: TestCase[]; // Add test cases for programming questions
  subcategory?: string; // Add subcategory (replacing mcqSubcategory)
  language?: string; // Add language field for programming questions
  starterCode?: string; // Add starter code for programming questions
  questionId?: string; // Add questionId to match backend format
  questionNumber?: number; // Add questionNumber to match backend format
  points?: number; // Add points to match backend format
  difficulty?: string; // Add difficulty to match backend format
  entityType?: string; // Add entityType to match backend format
  category?: string; // Add category to match backend format
}

interface ReferenceMaterial {
  id: string;
  name: string;
  url: string;
  type: 'pdf' | 'video' | 'link';
}

interface AssessmentData {
  title: string;
  description: string;
  duration: number;
  instructions: string;
  department: string;
  difficulty: string;
  category: string[];
  questions: Question[];
  referenceMaterials: ReferenceMaterial[];
  status: string;
  // Add new fields to match the sample structure
  type: string;
  domain: string;
  configuration: {
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
  target: {
    departments: string[];
    years: number[];
  };
  stats: {
    avgScore: number;
    completed: number;
    highestScore: number;
    totalParticipants: number;
  };
  entities: Array<{
    type: string;
    subcategories?: string[];
    description?: string;
  }>;
  isPublished: boolean;
}

const AssessmentCreation: React.FC = () => {
  const { user } = useUser(); // Get user context
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({
    title: "",
    description: "",
    duration: 60,
    instructions: "",
    department: user?.department || "",
    difficulty: "",
    category: ["MCQ", "Coding"], // Initialize with both categories
    questions: [],
    referenceMaterials: [],
    status: "ACTIVE",
    type: "DEPARTMENT_WISE",
    domain: "ksrce.ac.in",
    configuration: {
      maxAttempts: 2,
      passingScore: 60,
      randomizeQuestions: true,
      totalQuestions: 0
    },
    scheduling: {
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      timezone: "Asia/Kolkata"
    },
    target: {
      departments: [],
      years: [3, 4]
    },
    stats: {
      avgScore: 0,
      completed: 0,
      highestScore: 0,
      totalParticipants: 0
    },
    entities: [],
    isPublished: false
  });

  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: 0,
    text: "",
    options: ["", "", "", ""],
    correctAnswer: [], // Initialize as empty array
    marks: 1,
    subcategory: "", // Updated from mcqSubcategory
    starterCode: "", // Initialize starter code
    testCases: [], // Initialize test cases
    questionId: "", // Initialize questionId
    questionNumber: 0, // Initialize questionNumber
    points: 1, // Initialize points
    difficulty: "MEDIUM", // Initialize difficulty
    entityType: "mcq", // Initialize entityType
    category: "MCQ" // Initialize category
  });

  const [currentReferenceMaterial, setCurrentReferenceMaterial] = useState<ReferenceMaterial>({
    id: "",
    name: "",
    url: "",
    type: "pdf"
  });

  const [currentTestCase, setCurrentTestCase] = useState<TestCase>({
    id: "",
    input: "",
    expectedOutput: ""
  });
  const [showTestCaseForm, setShowTestCaseForm] = useState(false);
  const [testCaseQuestionId, setTestCaseQuestionId] = useState<number | null>(null);
  const [showMcqForm, setShowMcqForm] = useState(false);
  const [showProgrammingForm, setShowProgrammingForm] = useState(false);
  const [showReferenceMaterialForm, setShowReferenceMaterialForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Assessment toggle state
  const [showAssessments, setShowAssessments] = useState(false);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [assessmentsPerPage] = useState(7);
  const [currentAssessments, setCurrentAssessments] = useState<any[]>([]);
  
  // Add CSV import state variables
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Update current assessments when assessments or page changes
  useEffect(() => {
    const indexOfLastAssessment = currentPage * assessmentsPerPage;
    const indexOfFirstAssessment = indexOfLastAssessment - assessmentsPerPage;
    const current = assessments.slice(indexOfFirstAssessment, indexOfLastAssessment);
    setCurrentAssessments(current);
  }, [assessments, currentPage, assessmentsPerPage]);

  const departments = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "All Departments"];
  
  // Get the user's department from their profile
  const userDepartment = user?.department || "";
  // Updated categories to match requirements
  const categories = ["MCQ", "Coding"];

  // Subcategories for MCQ - including all four types
  const mcqSubcategories = ["ALL", "Technical", "Aptitude", "Verbal"];

  // Status options
  const statusOptions = ["active", "inactive"];

  const handleInputChange = (field: string, value: string | number | string[]) => {
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

  const handleReferenceMaterialChange = (field: string, value: string) => {
    setCurrentReferenceMaterial(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestCaseChange = (field: string, value: string | number) => {
    setCurrentTestCase(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSchedulingChange = (field: string, value: string) => {
    setAssessmentData(prev => ({
      ...prev,
      scheduling: {
        ...prev.scheduling,
        [field]: value
      }
    }));
  };

  // Helper function to combine date and time into ISO string
  const combineDateTime = (date: string, time: string, period: string) => {
    if (!date || !time) {
      // Return current date/time if not provided
      return new Date().toISOString();
    }

    // Convert 12-hour format to 24-hour format
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    // Format as ISO string
    const dateTime = new Date(`${date}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
    return dateTime.toISOString();
  };

  // Helper function to extract time components from ISO string
  const extractTimeComponents = (isoString: string) => {
    if (!isoString) return { date: '', time: '', period: 'AM' };

    const dateObj = new Date(isoString);
    const date = dateObj.toISOString().split('T')[0];
    let hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';

    // Convert to 12-hour format
    if (hours === 0) hours = 12;
    if (hours > 12) hours -= 12;

    const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    return { date, time, period };
  };

  // Initialize date components with proper fallback
  const initialStartDate = extractTimeComponents(assessmentData.scheduling.startDate || new Date().toISOString());
  const initialEndDate = extractTimeComponents(assessmentData.scheduling.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

  // State for separate date/time inputs
  const [startDateComponents, setStartDateComponents] = useState(initialStartDate);
  const [endDateComponents, setEndDateComponents] = useState(initialEndDate);

  // Initialize date/time components on component mount and when scheduling data changes
  useEffect(() => {
    setStartDateComponents(extractTimeComponents(assessmentData.scheduling.startDate));
    setEndDateComponents(extractTimeComponents(assessmentData.scheduling.endDate));
  }, [assessmentData.scheduling.startDate, assessmentData.scheduling.endDate]);

  // Update handlers for separate date/time inputs
  const handleStartDateChange = (date: string) => {
    const newComponents = { ...startDateComponents, date };
    setStartDateComponents(newComponents);
    const isoString = combineDateTime(newComponents.date, newComponents.time, newComponents.period);
    handleSchedulingChange('startDate', isoString);
  };

  const handleStartTimeChange = (time: string) => {
    const newComponents = { ...startDateComponents, time };
    setStartDateComponents(newComponents);
    const isoString = combineDateTime(newComponents.date, newComponents.time, newComponents.period);
    handleSchedulingChange('startDate', isoString);
  };

  const handleStartPeriodChange = (period: string) => {
    const newComponents = { ...startDateComponents, period };
    setStartDateComponents(newComponents);
    const isoString = combineDateTime(newComponents.date, newComponents.time, newComponents.period);
    handleSchedulingChange('startDate', isoString);
  };

  const handleEndDateChange = (date: string) => {
    const newComponents = { ...endDateComponents, date };
    setEndDateComponents(newComponents);
    const isoString = combineDateTime(newComponents.date, newComponents.time, newComponents.period);
    handleSchedulingChange('endDate', isoString);
  };

  const handleEndTimeChange = (time: string) => {
    const newComponents = { ...endDateComponents, time };
    setEndDateComponents(newComponents);
    const isoString = combineDateTime(newComponents.date, newComponents.time, newComponents.period);
    handleSchedulingChange('endDate', isoString);
  };

  const handleEndPeriodChange = (period: string) => {
    const newComponents = { ...endDateComponents, period };
    setEndDateComponents(newComponents);
    const isoString = combineDateTime(newComponents.date, newComponents.time, newComponents.period);
    handleSchedulingChange('endDate', isoString);
  };

  // CSV Import/Export Functions
  // Parse CSV string into array of objects
  const parseCSV = (csvString: string): any[] => {
    const lines = csvString.split('\n').filter(line => line.trim() !== '');

    if (lines.length <= 1) {
      return [];
    }

    // Parse headers
    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));

    // Parse data rows
    const dataRows = lines.slice(1);
    const result = [];

    for (const row of dataRows) {
      if (!row.trim()) continue;

      // Simple CSV parsing - handles quoted values
      const values: string[] = [];
      let currentValue = '';
      let inQuotes = false;

      for (let i = 0; i < row.length; i++) {
        const char = row[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim().replace(/"/g, ''));
          currentValue = '';
        } else {
          currentValue += char;
        }
      }

      // Add the last value
      values.push(currentValue.trim().replace(/"/g, ''));

      // Create object mapping headers to values
      const rowData: any = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });

      result.push(rowData);
    }

    return result;
  };

  // Convert array of objects to CSV string
  const convertToCSV = (data: any[]): string => {
    if (!data || data.length === 0) {
      return '';
    }

    // Determine headers
    const allHeaders = Object.keys(data[0]);

    // Create CSV content
    let csvContent = allHeaders.map(header => `"${header}"`).join(',') + '\n';

    // Add data rows
    data.forEach(row => {
      const values = allHeaders.map(header => {
        const value = row[header];
        if (value === null || value === undefined) {
          return '""';
        }
        // Escape quotes and wrap in quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvContent += values.join(',') + '\n';
    });

    return csvContent;
  };

  // Handle CSV file import
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportLoading(true);
      setImportResults(null);

      // Read CSV file
      const text = await file.text();
      const parsedData = parseCSV(text);

      if (parsedData.length === 0) {
        throw new Error('No data found in CSV file');
      }

      // Use the first row for single assessment import
      const rowData = parsedData[0];

      // Update assessment data with imported values
      setAssessmentData(prev => ({
        ...prev,
        title: rowData.Title || prev.title,
        description: rowData.Description || prev.description,
        department: rowData.Department || prev.department,
        duration: rowData.Duration ? parseInt(rowData.Duration) : prev.duration,
        difficulty: rowData.Difficulty || prev.difficulty,
        category: rowData.Category ? (Array.isArray(rowData.Category) ? rowData.Category : rowData.Category.split(';')) : prev.category,
        status: rowData.Status || prev.status,
        scheduling: {
          ...prev.scheduling,
          startDate: rowData.StartDate || prev.scheduling.startDate,
          endDate: rowData.EndDate || prev.scheduling.endDate,
          timezone: rowData.Timezone || prev.scheduling.timezone
        },
        configuration: {
          ...prev.configuration,
          maxAttempts: rowData.MaxAttempts ? parseInt(rowData.MaxAttempts) : prev.configuration.maxAttempts,
          passingScore: rowData.PassingScore ? parseInt(rowData.PassingScore) : prev.configuration.passingScore,
          randomizeQuestions: rowData.RandomizeQuestions ? rowData.RandomizeQuestions.toLowerCase() === 'true' : prev.configuration.randomizeQuestions
        }
      }));

      setImportResults({ success: 1, failed: 0, errors: [] });
      alert('Assessment imported successfully!');
    } catch (err: any) {
      console.error('Error importing CSV file:', err);
      setImportResults({ success: 0, failed: 1, errors: [err.message || 'Unknown error'] });
      alert('Failed to import assessment: ' + err.message);
    } finally {
      setImportLoading(false);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Export to CSV function
  const exportToCSV = async () => {
    try {
      // Create data array with current assessment data
      const exportData = [{
        Title: assessmentData.title,
        Description: assessmentData.description,
        Department: assessmentData.department,
        Duration: assessmentData.duration,
        Difficulty: assessmentData.difficulty,
        Category: assessmentData.category.join(';'),
        Status: assessmentData.status,
        StartDate: assessmentData.scheduling.startDate,
        EndDate: assessmentData.scheduling.endDate,
        Timezone: assessmentData.scheduling.timezone,
        MaxAttempts: assessmentData.configuration.maxAttempts,
        PassingScore: assessmentData.configuration.passingScore,
        RandomizeQuestions: assessmentData.configuration.randomizeQuestions
      }];

      // Convert to CSV
      const csvContent = convertToCSV(exportData);

      // Create blob and download using the service
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `assessment_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('Assessment exported successfully!');
    } catch (err: any) {
      console.error('Error exporting CSV:', err);
      alert('Failed to export assessment: ' + err.message);
    }
  };
  
  // Function to fetch assessments created by the current PTS
  const fetchAssessments = async () => {
    try {
      setLoadingAssessments(true);
      
      // Call the assessment service to get assessments
      // We'll use the assessment service to make an API call to fetch assessments
      // that belong to the current user based on ownerEmail and domain
      const response = await AssessmentService.getAssessmentsByOwner();
      
      // Update the assessments state
      setAssessments(response.data || []);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      alert('Failed to fetch assessments: ' + (error as Error).message);
      setAssessments([]); // Set to empty array on error
    } finally {
      setLoadingAssessments(false);
    }
  };
  
  // Toggle function for showing/hiding assessments
  const toggleAssessments = async () => {
    if (!showAssessments) {
      // Fetch assessments when showing for the first time
      await fetchAssessments();
    }
    setShowAssessments(!showAssessments);
  };
  
  // Function to delete an assessment
  const deleteAssessment = async (assessmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) {
      return;
    }
    
    try {
      await AssessmentService.deleteAssessment(assessmentId);
      
      // Remove the deleted assessment from the state
      setAssessments(prev => prev.filter(assessment => assessment.assessmentId !== assessmentId));
      
      // Show success message
      alert('Assessment deleted successfully!');
      
      // Refresh the list
      await fetchAssessments();
    } catch (error) {
      console.error('Error deleting assessment:', error);
      alert('Failed to delete assessment: ' + (error as Error).message);
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const addQuestion = () => {
    if (!currentQuestion.text.trim()) {
      alert("Please enter a question text");
      return;
    }

    // Check if we're adding an MCQ question
    if (showMcqForm) {
      // Check if subcategory is selected for MCQ
      if (!currentQuestion.subcategory) {
        alert("Please select a subcategory for MCQ");
        return;
      }

      // Create MCQ question with proper structure
      const newMcqQuestion: Question = {
        ...currentQuestion,
        id: Date.now(),
        questionId: `Q_${String(assessmentData.questions.length + 1).padStart(3, '0')}`,
        questionNumber: assessmentData.questions.length + 1,
        points: currentQuestion.marks,
        difficulty: assessmentData.difficulty || "MEDIUM",
        entityType: "mcq",
        category: "MCQ",
        language: "", // Empty string for MCQ questions
        starterCode: "", // Empty string for MCQ questions
        testCases: [], // Empty array for MCQ questions,
        // Convert correctAnswer to proper array format
        correctAnswer: Array.isArray(currentQuestion.correctAnswer)
          ? currentQuestion.correctAnswer
          : typeof currentQuestion.correctAnswer === 'number'
            ? [String.fromCharCode(65 + currentQuestion.correctAnswer)]
            : currentQuestion.correctAnswer
              ? [currentQuestion.correctAnswer]
              : []
      };

      setAssessmentData(prev => ({
        ...prev,
        questions: [...prev.questions, newMcqQuestion]
      }));

      // Reset form
      setCurrentQuestion({
        id: 0,
        text: "",
        options: ["", "", "", ""],
        correctAnswer: [], // Reset to empty array
        marks: 1,
        subcategory: "", // Reset subcategory
        starterCode: "", // Reset starter code
        testCases: [], // Reset test cases
        questionId: "", // Reset questionId
        questionNumber: 0, // Reset questionNumber
        points: 1, // Reset points
        difficulty: "MEDIUM", // Reset difficulty
        entityType: "mcq", // Reset entityType
        category: "MCQ" // Reset category
      });

      setShowMcqForm(false);
    }
    // Check if we're adding a Programming question
    else if (showProgrammingForm) {
      // Create Programming question with proper structure
      const newProgrammingQuestion: Question = {
        ...currentQuestion,
        id: Date.now(),
        questionId: `Q_${String(assessmentData.questions.length + 1).padStart(3, '0')}`,
        questionNumber: assessmentData.questions.length + 1,
        points: currentQuestion.marks,
        difficulty: assessmentData.difficulty || "MEDIUM",
        entityType: "coding",
        category: "PROGRAMMING",
        options: ["", "", "", ""], // Default empty options for programming
        correctAnswer: [], // Updated to empty array format
        subcategory: "" // Empty string for programming questions
      };

      setAssessmentData(prev => ({
        ...prev,
        questions: [...prev.questions, newProgrammingQuestion]
      }));

      // Reset form
      setCurrentQuestion({
        id: 0,
        text: "",
        options: ["", "", "", ""],
        correctAnswer: [], // Reset to empty array
        marks: 1,
        subcategory: "", // Reset subcategory
        starterCode: "", // Reset starter code
        testCases: [], // Reset test cases
        questionId: "", // Reset questionId
        questionNumber: 0, // Reset questionNumber
        points: 1, // Reset points
        difficulty: "MEDIUM", // Reset difficulty
        entityType: "coding", // Reset entityType
        category: "PROGRAMMING" // Reset category
      });

      setShowProgrammingForm(false);
    }
  };

  const removeQuestion = (id: number) => {
    setAssessmentData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id)
    }));
  };

  const addReferenceMaterial = () => {
    if (!currentReferenceMaterial.name.trim() || !currentReferenceMaterial.url.trim()) {
      alert("Please enter both name and URL for the reference material");
      return;
    }

    // Validate URL format
    try {
      new URL(currentReferenceMaterial.url);
    } catch {
      alert("Please enter a valid URL (e.g., https://example.com/material.pdf)");
      return;
    }

    const newReferenceMaterial: ReferenceMaterial = {
      ...currentReferenceMaterial,
      id: Date.now().toString()
    };

    setAssessmentData(prev => ({
      ...prev,
      referenceMaterials: [...prev.referenceMaterials, newReferenceMaterial]
    }));

    // Reset form
    setCurrentReferenceMaterial({
      id: "",
      name: "",
      url: "",
      type: "pdf"
    });

    setShowReferenceMaterialForm(false);
  };

  const removeReferenceMaterial = (id: string) => {
    setAssessmentData(prev => ({
      ...prev,
      referenceMaterials: prev.referenceMaterials.filter(r => r.id !== id)
    }));
  };

  const addTestCase = (questionId: number) => {
    if (!currentTestCase.input.trim() || !currentTestCase.expectedOutput.trim()) {
      alert("Please enter both input and expected output");
      return;
    }

    const newTestCase: TestCase = {
      ...currentTestCase,
      id: Date.now().toString()
    };

    setAssessmentData(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId
          ? { ...q, testCases: [...(q.testCases || []), newTestCase] }
          : q
      )
    }));

    // Reset form
    setCurrentTestCase({
      id: "",
      input: "",
      expectedOutput: ""
    });

    setShowTestCaseForm(false);
    setTestCaseQuestionId(null);
  };

  const removeTestCase = (questionId: number, testCaseId: string) => {
    setAssessmentData(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId
          ? { ...q, testCases: q.testCases?.filter(tc => tc.id !== testCaseId) }
          : q
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('=== Submitting Assessment ===');
      console.log('Current assessmentData:', JSON.stringify(assessmentData, null, 2));
      console.log('Current scheduling data:', assessmentData.scheduling);

      // Validate required fields
      if (!assessmentData.title.trim()) {
        alert("Please enter an assessment title");
        setIsSubmitting(false);
        return;
      }

      if (!assessmentData.department) {
        alert("Please select a department");
        setIsSubmitting(false);
        return;
      }

      if (assessmentData.questions.length === 0) {
        alert("Please add at least one question");
        setIsSubmitting(false);
        return;
      }

      // Validate all questions
      for (const question of assessmentData.questions) {
        if (!question.text.trim()) {
          alert("Please enter text for all questions");
          setIsSubmitting(false);
          return;
        }

        // Check if this is an MCQ question by seeing if it has meaningful options
        if (question.hasOwnProperty('options') && question.options && question.options.length > 0 && question.options.some(opt => opt.trim() !== "")) {
          // This is an MCQ question with actual options
          if (question.options.some(opt => !opt.trim())) {
            alert("Please fill all options for MCQ questions");
            setIsSubmitting(false);
            return;
          }
          if (!question.subcategory) {
            alert("Please select a subcategory for all MCQ questions");
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Analyze questions to determine entity types and subcategories
      const entities: any[] = [];
      const mcqSubcategories = new Set<string>();
      let hasCoding = false;
      let mcqCount = 0;
      let codingCount = 0;

      // Analyze questions to determine entity types and subcategories
      assessmentData.questions.forEach((question) => {
        // Check if this is an MCQ question by seeing if it has meaningful options
        if (question.hasOwnProperty('options') && question.options && question.options.length > 0 && question.options.some(opt => opt.trim() !== "")) {
          // This is an MCQ question with actual options
          mcqCount++;
          const subcategory = question.subcategory || 'technical';
          mcqSubcategories.add(subcategory);
        } else if (question.starterCode && question.starterCode.trim() !== "") {
          // This is a Coding question
          hasCoding = true;
          codingCount++;
        }
      });

      // Add MCQ entity with proper batching (50 questions per batch)
      if (mcqCount > 0) {
        const mcqBatches = Math.ceil(mcqCount / 50);
        for (let i = 1; i <= mcqBatches; i++) {
          entities.push({
            type: "MCQ",
            subcategories: Array.from(mcqSubcategories),
            batch: `mcq_batch_${i}`
          });
        }
      }

      // Add Coding entity (no batching limit)
      if (hasCoding) {
        entities.push({
          type: "Coding",
          description: "Programming questions",
          batch: `programming_batch_1`
        });
      }

      // Update totalQuestions in configuration before submitting
      // Treat created assessments as published so student notifications are triggered
      const assessmentDataToSend = {
        ...assessmentData,
        isPublished: true,
        configuration: {
          ...assessmentData.configuration,
          totalQuestions: assessmentData.questions.length
        },
        entities: entities,
        // Add createdBy and createdByName from user context
        ...(user && { 
          createdBy: user.email,
          createdByName: user.name
        }),
        // Add publishedAt since assessment is published on creation
        publishedAt: new Date().toISOString()
      };

      // Log the data being sent
      console.log('Sending assessment data to backend:', JSON.stringify(assessmentDataToSend, null, 2));
      console.log('Scheduling data in assessmentDataToSend:', assessmentDataToSend.scheduling);

      const response = await AssessmentService.createAssessment(assessmentDataToSend);
      console.log('Assessment created successfully:', response);
      setSuccessMessage("Assessment created successfully!");

      // Reset form
      setAssessmentData({
        title: "",
        description: "",
        duration: 60,
        instructions: "",
        department: "",
        difficulty: "",
        category: ["MCQ", "Coding"],
        questions: [],
        referenceMaterials: [],
        status: "ACTIVE",
        type: "DEPARTMENT_WISE",
        domain: "ksrce.ac.in",
        configuration: {
          maxAttempts: 2,
          passingScore: 60,
          randomizeQuestions: true,
          totalQuestions: 0
        },
        scheduling: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          timezone: "Asia/Kolkata"
        },
        target: {
          departments: [],
          years: [3, 4]
        },
        stats: {
          avgScore: 0,
          completed: 0,
          highestScore: 0,
          totalParticipants: 0
        },
        entities: [],
        isPublished: false
      });

      // Reset date/time components
      setStartDateComponents(extractTimeComponents(new Date().toISOString()));
      setEndDateComponents(extractTimeComponents(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()));

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

      {/* Hidden file input for CSV import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleImportCSV}
        style={{ display: 'none' }}
      />

      {/* Import Results */}
      {importResults && (
        <div
          style={{
            padding: '15px',
            marginBottom: '20px',
            background: importResults.failed > 0 ? '#f8d7da' : '#d4edda',
            color: importResults.failed > 0 ? '#721c24' : '#155724',
            borderRadius: '8px',
            border: `1px solid ${importResults.failed > 0 ? '#f5c6cb' : '#c3e6cb'}`
          }}
        >
          <div>
            Import Results: {importResults.success} successful, {importResults.failed} failed
          </div>
          {importResults.errors.length > 0 && (
            <details style={{ marginTop: '10px' }}>
              <summary>Errors</summary>
              <ul style={{ marginTop: '5px', maxHeight: '150px', overflowY: 'auto' }}>
                {importResults.errors.map((error, index) => (
                  <li key={index} style={{ fontSize: '0.9rem' }}>{error}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Import Loading Indicator */}
      {importLoading && (
        <div
          style={{
            padding: '15px',
            marginBottom: '20px',
            background: '#d1ecf1',
            color: '#0c5460',
            borderRadius: '8px',
            border: '1px solid #bee5eb'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Importing assessment...</span>
            <div style={{ width: '200px', height: '8px', background: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#0c5460',
                  animation: 'loading 1s infinite'
                }}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes loading {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>

      <div className="pts-section-card">
        {/* Toggle button for showing/hiding assessments */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginBottom: '20px' }}>
          <button
            className="pts-btn-primary"
            onClick={toggleAssessments}
          >
            {showAssessments ? 'Hide Assessments' : 'Show Assessments'}
          </button>
          <button
            className="pts-btn-secondary"
            onClick={() => {
              setShowAssessments(false);
              // Reset form when switching to create mode
              setAssessmentData({
                title: "",
                description: "",
                duration: 60,
                instructions: "",
                department: user?.department || "",
                difficulty: "",
                category: ["MCQ", "Coding"],
                questions: [],
                referenceMaterials: [],
                status: "ACTIVE",
                type: "DEPARTMENT_WISE",
                domain: "ksrce.ac.in",
                configuration: {
                  maxAttempts: 2,
                  passingScore: 60,
                  randomizeQuestions: true,
                  totalQuestions: 0
                },
                scheduling: {
                  startDate: new Date().toISOString(),
                  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  timezone: "Asia/Kolkata"
                },
                target: {
                  departments: [],
                  years: [3, 4]
                },
                stats: {
                  avgScore: 0,
                  completed: 0,
                  highestScore: 0,
                  totalParticipants: 0
                },
                entities: [],
                isPublished: false
              });
              // Reset date/time components
              setStartDateComponents(extractTimeComponents(new Date().toISOString()));
              setEndDateComponents(extractTimeComponents(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()));
              // Reset question forms
              setShowMcqForm(false);
              setShowProgrammingForm(false);
              // Reset current question
              setCurrentQuestion({
                id: 0,
                text: "",
                options: ["", "", "", ""],
                correctAnswer: [],
                marks: 1,
                subcategory: "",
                starterCode: "",
                testCases: []
              });
            }}
          >
            Create Assessment
          </button>
        </div>
        
        {/* Assessments table - shown when toggle is active */}
        {showAssessments && (
          <div style={{ marginBottom: '30px' }}>
            {loadingAssessments ? (
              <div>Loading assessments...</div>
            ) : assessments.length === 0 ? (
              <div className="pts-form-group">
                <p>No assessments found for this PTS</p>
              </div>
            ) : (
              <div className="table-container" style={{
                background: "white",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                border: "1px solid #e9ecef",
                overflow: "hidden"
              }}>
                <table className="data-table" style={{
                  width: "100%",
                  borderCollapse: "collapse"
                }}>
                  <thead style={{
                    backgroundColor: "#9768E1",
                    color: "white"
                  }}>
                    <tr>
                      <th style={{ padding: "12px", textAlign: "left" }}>Assessment ID</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Title</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Difficulty</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Categories</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>Questions</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Duration</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Scheduling</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAssessments.map((assessment, index) => {
                      const globalIndex = (currentPage - 1) * assessmentsPerPage + index;
                      return (
                        <tr key={assessment.assessmentId || globalIndex} style={{
                          backgroundColor: globalIndex % 2 === 0 ? "#f9f9f9" : "white",
                          borderBottom: "1px solid #ddd"
                        }}>
                          <td style={{ padding: "12px" }}>{assessment.assessmentId || 'N/A'}</td>
                          <td style={{ padding: "12px" }}>{assessment.title || 'N/A'}</td>
                          <td style={{ padding: "12px" }}>{assessment.difficulty || 'N/A'}</td>
                          <td style={{ padding: "12px" }}>{Array.isArray(assessment.category) ? assessment.category.join(', ') : assessment.category || 'N/A'}</td>
                          <td style={{ padding: "12px", textAlign: "center" }}>{assessment.configuration?.totalQuestions || 0}</td>
                          <td style={{ padding: "12px" }}>{assessment.duration || assessment.configuration?.duration || 'N/A'} min</td>
                          <td style={{ padding: "12px" }}>{new Date(assessment.scheduling?.startDate || '').toLocaleDateString() || 'N/A'}</td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <button
                              className="pts-btn-danger"
                              onClick={() => deleteAssessment(assessment.assessmentId)}
                              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* Add Import/Export buttons */}
        {showAssessments && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px' }}>
            <button
              className="pts-btn-secondary"
              onClick={triggerFileInput}
              disabled={importLoading}
            >
              Import CSV
            </button>
            <button
              className="pts-btn-secondary"
              onClick={exportToCSV}
            >
              Export CSV
            </button>
          </div>
        )}
        
        {/* Pagination Controls */}
        {showAssessments && assessments.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
            <button 
              className="pts-btn-secondary"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 16px',
                fontSize: '0.9rem',
                opacity: currentPage === 1 ? 0.5 : 1,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              {(() => {
                const totalPages = Math.ceil(assessments.length / assessmentsPerPage);
                const pages = [];
                
                // Show first page
                if (totalPages > 0) pages.push(1);
                
                // Show pages around current page
                const startPage = Math.max(2, currentPage - 1);
                const endPage = Math.min(totalPages - 1, currentPage + 1);
                
                for (let i = startPage; i <= endPage; i++) {
                  if (i !== pages[pages.length - 1]) pages.push(i);
                }
                
                // Show last page if not already included
                if (totalPages > 1 && !pages.includes(totalPages)) pages.push(totalPages);
                
                return pages.map(page => (
                  <button
                    key={page}
                    className="pts-btn-secondary"
                    onClick={() => setCurrentPage(page)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.9rem',
                      backgroundColor: currentPage === page ? '#9768E1' : 'white',
                      color: currentPage === page ? 'white' : '#374151',
                      border: currentPage === page ? '1px solid #9768E1' : '1px solid #d1d5db',
                      minWidth: '36px'
                    }}
                  >
                    {page}
                  </button>
                ));
              })()}
            </div>
            
            <button
              className="pts-btn-secondary"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(assessments.length / assessmentsPerPage)))}
              disabled={currentPage === Math.ceil(assessments.length / assessmentsPerPage) || assessments.length === 0}
              style={{
                padding: '8px 16px',
                fontSize: '0.9rem',
                opacity: currentPage === Math.ceil(assessments.length / assessmentsPerPage) || assessments.length === 0 ? 0.5 : 1,
                cursor: (currentPage === Math.ceil(assessments.length / assessmentsPerPage) || assessments.length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
            
            <div style={{ fontSize: '0.9rem', color: '#6b7280', marginLeft: '15px' }}>
              Page {currentPage} of {Math.ceil(assessments.length / assessmentsPerPage)}
            </div>
          </div>
        )}
        
        {/* Create Assessment Form - shown when toggle is inactive */}
        {!showAssessments && (
          <div>
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
              <div className="pts-form-display">
                {userDepartment || assessmentData.department || "Loading..."}
              </div>
              <input
                type="hidden"
                value={assessmentData.department}
                name="department"
              />
            </div>

            <div className="pts-form-group">
              <label className="pts-form-label">Categories *</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {categories.map((cat) => (
                  <label key={cat} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={assessmentData.category.includes(cat)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // Add category if not already present
                          if (!assessmentData.category.includes(cat)) {
                            handleInputChange("category", [...assessmentData.category, cat]);
                          }
                        } else {
                          // Remove category if present
                          handleInputChange("category", assessmentData.category.filter(c => c !== cat));
                        }
                      }}
                      style={{ marginRight: '5px' }}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            <div className="pts-form-group pts-short-field">
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

            <div className="pts-form-group pts-short-field">
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

            <div className="pts-form-group pts-short-field">
              <label className="pts-form-label">Status</label>
              <select
                className="pts-form-select"
                value={assessmentData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scheduling Section */}
          <div className="pts-section-card">
            <h3 className="pts-section-header">Scheduling</h3>
            <div className="pts-scheduling-group">
            <div className="pts-scheduling-row">
              <div className="pts-form-group">
                <label className="pts-form-label">Start Date *</label>
                <input
                  type="date"
                  className="pts-form-input"
                  value={startDateComponents.date}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  required
                />
              </div>

              <div className="pts-form-group">
                <label className="pts-form-label">Start Time *</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="time"
                    className="pts-form-input"
                    value={startDateComponents.time}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                  <select
                    className="pts-form-select"
                    value={startDateComponents.period}
                    onChange={(e) => handleStartPeriodChange(e.target.value)}
                    style={{ width: '80px' }}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              <div className="pts-form-group">
                <label className="pts-form-label">End Date *</label>
                <input
                  type="date"
                  className="pts-form-input"
                  value={endDateComponents.date}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  required
                />
              </div>

              <div className="pts-form-group">
                <label className="pts-form-label">End Time *</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="time"
                    className="pts-form-input"
                    value={endDateComponents.time}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                  <select
                    className="pts-form-select"
                    value={endDateComponents.period}
                    onChange={(e) => handleEndPeriodChange(e.target.value)}
                    style={{ width: '80px' }}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              <div className="pts-form-group">
                <label className="pts-form-label">Timezone *</label>
                <select
                  className="pts-form-select"
                  value={assessmentData.scheduling.timezone}
                  onChange={(e) => handleSchedulingChange("timezone", e.target.value)}
                  required
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                </select>
              </div>
            </div>
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

          <div className="pts-section-card">
            <h3 className="pts-section-header">Instructions</h3>
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
          </div>

          {/* Reference Materials Section */}
          <div className="pts-section-card">
            <h3 className="pts-section-header">Reference Materials</h3>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <button
                type="button"
                className="pts-btn-secondary"
                onClick={() => setShowReferenceMaterialForm(true)}
              >
                Add Reference Material
              </button>
            </div>

            {assessmentData.referenceMaterials.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                {assessmentData.referenceMaterials.map((material) => (
                  <div key={material.id} style={{
                    background: "white",
                    padding: "15px",
                    borderRadius: "8px",
                    marginBottom: "10px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <h4 style={{ color: "#523C48", margin: "0 0 5px 0" }}>
                        {material.name} ({material.type.toUpperCase()})
                      </h4>
                      <p style={{ color: "#523C48", margin: "0", fontSize: "0.9rem" }}>
                        <a
                          href={material.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            // Validate URL before opening
                            try {
                              new URL(material.url);
                            } catch {
                              e.preventDefault();
                              alert("Invalid URL format. Please check the reference material link.");
                            }
                          }}
                          style={{
                            color: "#007bff",
                            textDecoration: "underline",
                            cursor: "pointer"
                          }}
                        >
                          {material.url}
                        </a>
                      </p>
                    </div>

                    <button
                      type="button"
                      className="pts-btn-danger"
                      onClick={() => removeReferenceMaterial(material.id)}
                      style={{ marginLeft: "15px" }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {assessmentData.referenceMaterials.length === 0 && (
              <div className="pts-empty-state">
                <div className="pts-empty-state-icon">📚</div>
                <div className="pts-empty-state-text">No reference materials added yet. Click "Add Reference Material" to attach PDFs, videos, or links.</div>
              </div>
            )}
          </div>

          {/* Add Reference Material Form Modal */}
          {showReferenceMaterialForm && (
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
                  Add Reference Material
                </h3>

                <div className="pts-form-group">
                  <label className="pts-form-label">Name *</label>
                  <input
                    type="text"
                    className="pts-form-input"
                    placeholder="Enter reference material name"
                    value={currentReferenceMaterial.name}
                    onChange={(e) => handleReferenceMaterialChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="pts-form-group">
                  <label className="pts-form-label">URL *</label>
                  <input
                    type="url"
                    className="pts-form-input"
                    placeholder="Enter URL (e.g., https://example.com/material.pdf)"
                    value={currentReferenceMaterial.url}
                    onChange={(e) => handleReferenceMaterialChange("url", e.target.value)}
                    required
                  />
                </div>

                <div className="pts-form-group">
                  <label className="pts-form-label">Type *</label>
                  <select
                    className="pts-form-select"
                    value={currentReferenceMaterial.type}
                    onChange={(e) => handleReferenceMaterialChange("type", e.target.value)}
                    required
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="video">Video</option>
                    <option value="link">Web Link</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="pts-btn-secondary"
                    onClick={() => setShowReferenceMaterialForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="pts-btn-primary"
                    onClick={addReferenceMaterial}
                  >
                    Add Reference Material
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Questions Section */}
          <div className="pts-section-card">
            <h3 className="pts-section-header">Questions</h3>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                {assessmentData.category.includes("MCQ") && (
                  <button
                    type="button"
                    className="pts-btn-secondary"
                    onClick={() => {
                      setShowMcqForm(true);
                      setShowProgrammingForm(false);
                    }}
                  >
                    Add MCQ Question
                  </button>
                )}
                {assessmentData.category.includes("Coding") && (
                  <button
                    type="button"
                    className="pts-btn-secondary"
                    onClick={() => {
                      setShowProgrammingForm(true);
                      setShowMcqForm(false);
                    }}
                  >
                    Add Programming Question
                  </button>
                )}
                {!assessmentData.category.includes("MCQ") && !assessmentData.category.includes("Coding") && (
                  <div className="pts-empty-state">
                    <div className="pts-empty-state-icon">📝</div>
                    <div className="pts-empty-state-text">Select category to add questions</div>
                  </div>
                )}
              </div>
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
                          {question.subcategory && ` - ${question.subcategory}`}
                          {question.language && ` (${question.language})`}
                        </h4>
                        <p style={{ color: "#523C48", margin: "0 0 15px 0" }}>{question.text}</p>

                        {/* Show options only for MCQ questions */}
                        {question.hasOwnProperty('options') && question.options && question.options.length > 0 && question.options.some(opt => opt.trim() !== "") && (
                          <>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                              {question.options.map((option, optIndex) => (
                                <div key={optIndex} style={{
                                  padding: "8px",
                                  background: Array.isArray(question.correctAnswer) && question.correctAnswer.includes(String.fromCharCode(65 + optIndex)) ? "#d4edda" : "#f8f9fa",
                                  borderRadius: "4px",
                                  border: Array.isArray(question.correctAnswer) && question.correctAnswer.includes(String.fromCharCode(65 + optIndex)) ? "1px solid #28a745" : "1px solid #dee2e6"
                                }}>
                                  <strong>{String.fromCharCode(65 + optIndex)}.</strong> {option}
                                  {Array.isArray(question.correctAnswer) && question.correctAnswer.includes(String.fromCharCode(65 + optIndex)) && (
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

                        {/* For Programming questions, show starter code (without language) */}
                        {question.starterCode && question.starterCode.trim() !== "" && (
                          <div style={{
                            padding: "10px",
                            background: "#e9ecef",
                            borderRadius: "4px",
                            fontStyle: "italic",
                            marginBottom: "15px"
                          }}>
                            Programming Question
                            <div style={{
                              marginTop: "8px",
                              padding: "8px",
                              background: "#fff",
                              borderRadius: "4px",
                              fontFamily: "monospace",
                              fontSize: "0.9rem"
                            }}>
                              <strong>Starter Code:</strong>
                              <pre style={{ margin: "5px 0 0 0" }}>{question.starterCode}</pre>
                            </div>
                          </div>
                        )}

                        {/* Test Cases Section for Programming Questions - Only show for programming questions */}
                        {(question.starterCode && question.starterCode.trim() !== "") && (
                          <div style={{ marginTop: "15px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                              <h4 style={{ color: "#523C48", margin: 0 }}>Test Cases</h4>
                              <button
                                type="button"
                                className="pts-btn-secondary"
                                onClick={() => {
                                  setCurrentTestCase({
                                    id: "",
                                    input: "",
                                    expectedOutput: ""
                                  });
                                  setShowTestCaseForm(true);
                                  setTestCaseQuestionId(question.id); // Set the question ID for test cases
                                }}
                                style={{ padding: "5px 10px", fontSize: "0.9rem" }}
                              >
                                Add Test Case
                              </button>
                            </div>

                            <div style={{
                              background: "#f8f9fa",
                              borderRadius: "4px",
                              padding: "10px",
                              maxHeight: "200px",
                              overflowY: "auto"
                            }}>
                              {question.testCases && question.testCases.length > 0 ? (
                                question.testCases.map((testCase) => (
                                  <div key={testCase.id} style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "8px",
                                    borderBottom: "1px solid #dee2e6"
                                  }}>
                                    <div>
                                      <div><strong>Input:</strong> {testCase.input}</div>
                                      <div><strong>Expected Output:</strong> {testCase.expectedOutput}</div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                      <button
                                        type="button"
                                        className="pts-btn-danger"
                                        onClick={() => removeTestCase(question.id, testCase.id)}
                                        style={{ padding: "3px 8px", fontSize: "0.8rem" }}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p style={{ color: "#6c757d", margin: "0" }}>No test cases added yet</p>
                              )}
                            </div>
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

            {assessmentData.questions.length === 0 && assessmentData.category.length > 0 && (
              <div className="pts-empty-state">
                <div className="pts-empty-state-icon">❓</div>
                <div className="pts-empty-state-text">No questions added yet. Start by adding MCQ or Programming questions to build your assessment.</div>
              </div>
            )}
          </div>

          {/* Add MCQ Question Form Modal */}
          {showMcqForm && (
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
                  Add MCQ Question
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
                    value={Array.isArray(currentQuestion.correctAnswer) ? currentQuestion.correctAnswer[0] || "" : ""}
                    onChange={(e) => handleQuestionChange("correctAnswer", [e.target.value])}
                    required
                  >
                    <option value="">Select Correct Answer</option>
                    {currentQuestion.options.map((option, index) => (
                      <option key={index} value={String.fromCharCode(65 + index)}>
                        {String.fromCharCode(65 + index)}. {option}
                      </option>
                    ))}
                  </select>
                </div>

                {/* MCQ Subcategory Selection */}
                <div className="pts-form-group">
                  <label className="pts-form-label">MCQ Subcategory *</label>
                  <select
                    className="pts-form-select"
                    value={currentQuestion.subcategory || ""}
                    onChange={(e) => handleQuestionChange("subcategory", e.target.value)}
                    required
                  >
                    <option value="">Select Subcategory</option>
                    {mcqSubcategories.map((subcat) => (
                      <option key={subcat} value={subcat}>
                        {subcat}
                      </option>
                    ))}
                  </select>
                </div>

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
                    onClick={() => setShowMcqForm(false)}
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

          {/* Add Programming Question Form Modal */}
          {showProgrammingForm && (
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
                  Add Programming Question
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

                {/* Starter Code Section */}
                <div className="pts-form-group">
                  <label className="pts-form-label">Starter Code</label>
                  <textarea
                    className="pts-form-textarea"
                    placeholder="Enter starter code"
                    value={currentQuestion.starterCode || ""}
                    onChange={(e) => handleQuestionChange("starterCode", e.target.value)}
                    rows={4}
                  />
                </div>

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
                    onClick={() => setShowProgrammingForm(false)}
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

          {/* Add Test Case Form Modal */}
          {showTestCaseForm && (
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
                  Add Test Case
                </h3>

                <div className="pts-form-group">
                  <label className="pts-form-label">Input *</label>
                  <textarea
                    className="pts-form-textarea"
                    placeholder="Enter input for the test case"
                    value={currentTestCase.input}
                    onChange={(e) => handleTestCaseChange("input", e.target.value)}
                    rows={3}
                    required
                  />
                  <div style={{ fontSize: "0.8rem", color: "#6c757d", marginTop: "5px" }}>
                    This will be passed as standard input to the program
                  </div>
                </div>

                <div className="pts-form-group">
                  <label className="pts-form-label">Expected Output *</label>
                  <textarea
                    className="pts-form-textarea"
                    placeholder="Enter expected output"
                    value={currentTestCase.expectedOutput}
                    onChange={(e) => handleTestCaseChange("expectedOutput", e.target.value)}
                    rows={3}
                    required
                  />
                  <div style={{ fontSize: "0.8rem", color: "#6c757d", marginTop: "5px" }}>
                    This is what the program should output for the given input
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="pts-btn-secondary"
                    onClick={() => setShowTestCaseForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="pts-btn-primary"
                    onClick={() => {
                      // Add test case to the specified question
                      if (testCaseQuestionId !== null) {
                        addTestCase(testCaseQuestionId);
                      }
                    }}
                  >
                    Add Test Case
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
                  instructions: "",
                  department: "",
                  difficulty: "",
                  category: ["MCQ", "Coding"],
                  questions: [],
                  referenceMaterials: [],
                  status: "ACTIVE",
                  type: "DEPARTMENT_WISE",
                  domain: "ksrce.ac.in",
                  configuration: {
                    maxAttempts: 2,
                    passingScore: 60,
                    randomizeQuestions: true,
                    totalQuestions: 0
                  },
                  scheduling: {
                    startDate: new Date().toISOString(),
                    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    timezone: "Asia/Kolkata"
                  },
                  target: {
                    departments: [],
                    years: [3, 4]
                  },
                  stats: {
                    avgScore: 0,
                    completed: 0,
                    highestScore: 0,
                    totalParticipants: 0
                  },
                  entities: [],
                  isPublished: false
                });

                // Reset date/time components
                setStartDateComponents(extractTimeComponents(new Date().toISOString()));
                setEndDateComponents(extractTimeComponents(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()));

                // Reset question forms
                setShowMcqForm(false);
                setShowProgrammingForm(false);

                // Reset current question
                setCurrentQuestion({
                  id: 0,
                  text: "",
                  options: ["", "", "", ""],
                  correctAnswer: [],
                  marks: 1,
                  subcategory: "",
                  starterCode: "",
                  testCases: []
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
      )}
    </div>
  </div>
);
};

export default AssessmentCreation;