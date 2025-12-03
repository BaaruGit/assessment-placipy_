import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './AssessmentTaking.css';
import judge0Service, { type SubmissionResult } from '../../services/judge0.service';
import StudentAssessmentService from '../../services/student.assessment.service';
import ResultsService from '../../services/results.service';
import { useUser } from '../../contexts/UserContext';
import AuthService from '../../services/auth.service';

// Define interfaces for assessment data
interface MCQOption {
  id: string;
  text: string;
}

interface MCQQuestion {
  questionId: string;
  question: string;
  options: MCQOption[];
  correctAnswer?: string[] | string;
  points?: number;
  difficulty?: string;
  subcategory?: string;
  examples?: { input: string; output: string }[];
}

interface TestCase {
  input: string;
  expectedOutput: string;
  description?: string;
}

interface CodingQuestion {
  questionId: string;
  question: string;
  starterCode?: string;
  testCases?: TestCase[];
  points?: number;
  difficulty?: string;
  subcategory?: string;
  examples?: { input: string; output: string }[];
}

interface AssessmentConfiguration {
  duration: number;
  maxAttempts: number;
  passingScore: number;
  randomizeQuestions: boolean;
  totalQuestions: number;
}

interface AssessmentEntity {
  type: string;
  batch: string;
  description?: string;
}

interface AssessmentScheduling {
  startDate: string;
  endDate: string;
  timezone: string;
}

interface AssessmentData {
  assessmentId: string;
  title: string;
  description: string;
  category: string[];
  configuration: AssessmentConfiguration;
  entities: AssessmentEntity[];
  scheduling: AssessmentScheduling;
  questions: (MCQQuestion | CodingQuestion)[];
  mcqQuestions?: MCQQuestion[];
  codingQuestions?: CodingQuestion[];
  allQuestions?: (MCQQuestion | CodingQuestion)[];
  department?: string; // Department chosen for the assessment
  departmentCode?: string; // Department code (e.g., "CSE", "ALL")
  // Add other fields as needed
}

const AssessmentTaking: React.FC = () => {
  // Get assessmentId from URL params
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();

  // State for assessment data
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for tabs
  const [activeTab, setActiveTab] = useState<'mcq' | 'coding'>('mcq');

  // State for showing language selection alert
  const [showLanguageAlert, setShowLanguageAlert] = useState<boolean>(true);

  // State for timer
  const [timeLeft, setTimeLeft] = useState<number>(60 * 60); // default 60 minutes in seconds, will be overridden by assessment config
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // State for MCQ section
  const [currentMCQIndex, setCurrentMCQIndex] = useState<number>(0);
  const [mcqAnswers, setMcqAnswers] = useState<{ [key: string]: number }>({});

  // State for coding section
  const [currentCodingIndex, setCurrentCodingIndex] = useState<number>(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');
  const [code, setCode] = useState<{ [key: string]: { [key: string]: string } }>({});
  const [executionResult, setExecutionResult] = useState<{ [key: string]: SubmissionResult }>({});
  const [testCaseResults, setTestCaseResults] = useState<{ [key: string]: { passed: boolean, actualOutput: string, expectedOutput: string, input: string }[] }>({});
  const [allTestCasesPassed, setAllTestCasesPassed] = useState<boolean>(false);
  // State to track which coding challenges have been successfully executed without errors
  const [successfulExecutions, setSuccessfulExecutions] = useState<Record<string, boolean>>({});
  const [isAutoRunEnabled, setIsAutoRunEnabled] = useState<boolean>(false); // Disable auto-run by default
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>('');

  // State for assessment completion
  const [isAssessmentCompleted, setIsAssessmentCompleted] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState(false);
  const [mcqResults, setMcqResults] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // State for showing test cases dropdown
  const [showTestCases, setShowTestCases] = useState<boolean>(false);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);
  const autoRunTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedData = useRef(false); // To prevent multiple API calls

  // Memoized function to extract questions
  const { mcqQuestions, codingChallenges } = React.useMemo(() => {
    if (!assessmentData) {
      return { mcqQuestions: [], codingChallenges: [] };
    }

    // Extract MCQ questions from assessment data
    const mcqQuestions: MCQQuestion[] = assessmentData?.mcqQuestions ||
      assessmentData?.questions?.filter((q): q is MCQQuestion => 'options' in q) || [];

    // Extract coding challenges from assessment data
    const codingChallenges: CodingQuestion[] = assessmentData?.codingQuestions ||
      assessmentData?.questions?.filter((q): q is CodingQuestion => 'starterCode' in q || 'testCases' in q) || [];

    return { mcqQuestions, codingChallenges };
  }, [assessmentData]);

  // Get current challenge safely
  const currentChallenge = codingChallenges[currentCodingIndex];

  // Preprocess React code to make it runnable in a Node.js environment
  const preprocessReactCode = (code: string): string => {
    if (!code.trim()) return code;

    // Simple approach: Remove JSX syntax and extract JavaScript logic
    try {
      // Remove comments first
      let cleanCode = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

      // Extract JavaScript logic by removing JSX tags but preserving the code structure
      // This is a simplified approach for basic React code testing

      // Extract function definitions (more comprehensive)
      const functionRegex = /(function\s+\w+\s*\([^)]*\)\s*{[\s\S]*?})|(const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{[\s\S]*?})|(let\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{[\s\S]*?})|(var\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{[\s\S]*?})/g;
      const functionMatches = cleanCode.match(functionRegex) || [];

      // Extract variable declarations
      const varRegex = /(const|let|var)\s+\w+\s*=\s*[^;]*;/g;
      const varMatches = cleanCode.match(varRegex) || [];

      // Extract console.log statements
      const logRegex = /console\.log\([^;]*\);/g;
      const logMatches = cleanCode.match(logRegex) || [];

      // Combine all extracted JavaScript
      let extractedJS = '';

      // Add functions
      if (functionMatches.length > 0) {
        extractedJS += functionMatches.join('\n\n') + '\n\n';
      }

      // Add variables
      if (varMatches.length > 0) {
        extractedJS += varMatches.join('\n') + '\n\n';
      }

      // Add console logs
      if (logMatches.length > 0) {
        extractedJS += logMatches.join('\n') + '\n\n';
      }

      // If we found JavaScript logic, execute it
      if (extractedJS.trim()) {
        return `
// Extracted JavaScript logic from React code
${extractedJS}
console.log("React JavaScript logic executed successfully");
`;
      }

      // Fallback: If no clear JavaScript logic found, just run the code with error handling
      // But first, try to make JSX compatible by commenting out JSX lines
      const lines = code.split('\n');
      const processedLines = lines.map(line => {
        // If line contains JSX tags, comment it out
        if (line.trim().startsWith('<') && line.includes('>')) {
          return '// ' + line; // Comment out JSX lines
        }
        return line;
      });

      return `
// Processed React code (JSX lines commented out)
try {
  ${processedLines.join('\n')}
  console.log("React code processed successfully");
} catch (error) {
  console.error("Error in React code:", error.message);
}
`;

    } catch (error) {
      // If all else fails, provide a safe fallback
      return `
console.log("React/JSX code detected:");
console.log("In a browser environment, this would render a React component");
console.log("Component content preview:");
console.log(\`${code.substring(0, 200)}${code.length > 200 ? '...' : ''}\`);
`;
    }
  };

  // Preprocess HTML code to make it runnable
  const preprocessHtmlCode = (code: string): string => {
    if (!code.trim()) return code;

    // Check if this is HTML with script tags
    const scriptMatches = code.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);

    if (scriptMatches && scriptMatches.length > 0) {
      // Extract JavaScript from script tags
      let jsCode = '';
      scriptMatches.forEach(match => {
        const innerCode = match.replace(/<script[^>]*>|<\/script>/gi, '').trim();
        if (innerCode) {
          jsCode += innerCode + '\n';
        }
      });

      if (jsCode.trim()) {
        return `
// Extracted JavaScript from HTML
try {
  ${jsCode}
  console.log("JavaScript from HTML executed successfully");
} catch (error) {
  console.error("Error in HTML JavaScript:", error.message);
}
`;
      }
    }

    // If no script tags or no executable JavaScript, treat as plain text
    return `
// HTML code detected
console.log("HTML content:");
console.log(\`${code.substring(0, 200)}${code.length > 200 ? '...' : ''}\`);
console.log("In a browser environment, this would render as HTML");
`;
  };

  // Run code function with proper type checking
  const runCode = useCallback(async (inputType: 'test' | 'example' | 'custom' = 'test') => {
    // Ensure we have a valid challenge
    if (!currentChallenge) {
      return;
    }

    // Get current code for the challenge and language
    let currentCode = code[currentChallenge.questionId]?.[selectedLanguage] || '';

    // Preprocess code for specific languages
    if (selectedLanguage === 'react') {
      // For React, we need to wrap the code in a basic React environment simulation
      // Since Judge0 can't run React directly, we'll convert it to runnable JavaScript
      currentCode = preprocessReactCode(currentCode);
    } else if (selectedLanguage === 'html') {
      // For HTML, we might want to wrap it in a basic HTML structure
      currentCode = preprocessHtmlCode(currentCode);
    }

    try {
      setIsLoading(true);

      if (inputType === 'test') {
        // Run all test cases
        await runTestCases(currentCode);
      } else {
        // Get input based on input type
        let input = '';
        if (inputType === 'example' && currentChallenge.examples && currentChallenge.examples[0]) {
          input = currentChallenge.examples[0].input;
        } else if (inputType === 'custom') {
          input = customInput;
        }

        // Execute code using Judge0 service
        const result = await judge0Service.executeCode(currentCode, selectedLanguage, input);

        setExecutionResult(prev => ({
          ...prev,
          [currentChallenge.questionId]: result
        }));

        // Mark as successful execution if no compilation or runtime errors
        if (!result.compile_output && !result.stderr) {
          setSuccessfulExecutions(prev => ({
            ...prev,
            [currentChallenge.questionId]: true
          }));
        } else {
          // Mark as unsuccessful execution if there are errors
          setSuccessfulExecutions(prev => ({
            ...prev,
            [currentChallenge.questionId]: false
          }));
        }
      }
    } catch (error) {
      // Provide a more user-friendly error message for rate limiting
      let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. The system is temporarily busy. Please wait a moment and try again.';
      } else if (errorMessage.includes('API key')) {
        errorMessage = 'Judge0 API is not configured properly. Please contact the system administrator.';
      } else if (errorMessage.includes('Failed to submit code')) {
        errorMessage = 'Failed to connect to the code execution service. Please check your internet connection and try again.';
      }

      setExecutionResult(prev => ({
        ...prev,
        [currentChallenge.questionId]: {
          status: { id: 0, description: 'Error' },
          stdout: '',
          stderr: errorMessage,
          compile_output: '',
          message: '',
          time: '',
          memory: 0
        }
      }));

      // Mark as unsuccessful execution due to error
      setSuccessfulExecutions(prev => ({
        ...prev,
        [currentChallenge.questionId]: false
      }));
    } finally {
      setIsLoading(false);
    }
  }, [currentChallenge, code, selectedLanguage, customInput]);

  // Utility function for delay
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // Run all test cases for current challenge
  const runTestCases = useCallback(async (codeToTest: string) => {
    try {
      const currentChallenge = codingChallenges[currentCodingIndex];
      if (!currentChallenge) return;

      // Check if testCases exist before accessing
      if (!currentChallenge.testCases) {
        // Mark as successful execution if no test cases
        setSuccessfulExecutions(prev => ({
          ...prev,
          [currentChallenge.questionId]: true
        }));
        return;
      }

      const results: { passed: boolean, actualOutput: string, expectedOutput: string, input: string }[] = [];

      // Run each test case with delay to avoid rate limiting
      for (let i = 0; i < currentChallenge.testCases.length; i++) {
        const testCase = currentChallenge.testCases[i];

        try {
          // Preprocess input for array inputs in specific languages
          let processedInput = testCase.input;

          // For Python and JavaScript, convert array string to actual array if needed
          if ((selectedLanguage === 'python' || selectedLanguage === 'javascript') &&
            testCase.input.startsWith('[') && testCase.input.endsWith(']')) {
            // Input is already in correct format for these languages
          }

          const result = await judge0Service.executeCode(codeToTest, selectedLanguage, processedInput);

          // Normalize output for comparison (remove trailing newlines and whitespace)
          const actualOutput = (result.stdout || '').trim();
          const expectedOutput = testCase.expectedOutput.trim();

          // Check if test case passed
          const passed = actualOutput === expectedOutput;

          results.push({
            passed,
            actualOutput,
            expectedOutput,
            input: testCase.input
          });

          // Add delay between test cases to avoid rate limiting (except for the last one)
          if (i < currentChallenge.testCases.length - 1) {
            await delay(1000); // 1 second delay
          }
        } catch (error) {
          let errorMessage = 'Error occurred';
          if (error instanceof Error) {
            // Provide more specific error messages
            if (error.message.includes('rate limit')) {
              errorMessage = 'Rate limit exceeded. Please wait before submitting more requests.';
            } else if (error.message.includes('submit code')) {
              errorMessage = 'Failed to submit code for execution. Check your code syntax.';
            } else if (error.message.includes('timeout')) {
              errorMessage = 'Code execution timed out.';
            } else if (error.message.includes('API key')) {
              errorMessage = 'Judge0 API is not configured properly. Please contact the system administrator.';
            } else {
              errorMessage = error.message;
            }
          }
          results.push({
            passed: false,
            actualOutput: errorMessage,
            expectedOutput: testCase.expectedOutput,
            input: testCase.input
          });

          // If it's a rate limit error, stop executing more test cases
          if (errorMessage.includes('rate limit') || errorMessage.includes('API key')) {
            break;
          }

          // Add delay between test cases to avoid rate limiting (except for the last one)
          if (i < currentChallenge.testCases.length - 1) {
            await delay(1000); // 1 second delay
          }
        }
      }

      // Update test case results
      setTestCaseResults(prev => ({
        ...prev,
        [currentChallenge.questionId]: results
      }));

      // Check if all test cases passed
      const allPassed = results.every(result => result.passed);
      setAllTestCasesPassed(allPassed);

      // Mark as successful execution if no compilation or runtime errors
      setSuccessfulExecutions(prev => ({
        ...prev,
        [currentChallenge.questionId]: true
      }));

      // Show result in execution panel
      setExecutionResult(prev => ({
        ...prev,
        [currentChallenge.questionId]: {
          status: { id: allPassed ? 3 : 4, description: allPassed ? 'All Tests Passed' : 'Some Tests Failed' },
          stdout: `Ran ${results.length} test cases. ${results.filter(r => r.passed).length} passed, ${results.filter(r => !r.passed).length} failed.`,
          stderr: '',
          compile_output: '',
          message: '',
          time: '',
          memory: 0
        }
      }));

    } catch (error) {
      // Provide a more user-friendly error message for rate limiting
      let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. The system is temporarily busy. Please wait a moment and try again.';
      } else if (errorMessage.includes('API key')) {
        errorMessage = 'Judge0 API is not configured properly. Please contact the system administrator.';
      } else if (errorMessage.includes('Failed to submit code')) {
        errorMessage = 'Failed to connect to the code execution service. Please check your internet connection and try again.';
      }

      setExecutionResult(prev => ({
        ...prev,
        [currentChallenge?.questionId || 'default']: {
          status: { id: 0, description: 'Error' },
          stdout: '',
          stderr: errorMessage,
          compile_output: '',
          message: '',
          time: '',
          memory: 0
        }
      }));

      // Mark as unsuccessful execution due to error
      if (currentChallenge?.questionId) {
        setSuccessfulExecutions(prev => ({
          ...prev,
          [currentChallenge.questionId]: false
        }));
      }
    } finally {
      setIsLoading(false);
    }
  }, [codingChallenges, currentCodingIndex, selectedLanguage]);

  // Fetch assessment data when component mounts or assessmentId changes
  useEffect(() => {
    // Prevent multiple calls to the API
    if (hasFetchedData.current || !assessmentId) {
      if (!assessmentId) {
        setError('Assessment ID is required');
      }
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        hasFetchedData.current = true; // Mark as fetched

        // Validate assessment ID before making API call
        if (!assessmentId) {
          setError('Assessment ID is required');
          setLoading(false);
          return;
        }

        console.log(`Fetching assessment data for ID: ${assessmentId}`);
        // Use the NEW endpoint to automatically fetch assessment with questions
        const response = await StudentAssessmentService.getAssessmentWithQuestions(assessmentId);

        if (response.success) {
          // Add additional validation to ensure we have the required data
          if (!response.data) {
            throw new Error('Invalid assessment data received from server');
          }

          // Set assessment data
          setAssessmentData(response.data);
          
          // Set initial time from assessment configuration
          if (response.data.configuration?.duration) {
            setTimeLeft(response.data.configuration.duration * 60); // Convert minutes to seconds
          } else {
            setTimeLeft(3600); // Default to 60 minutes
          }
          
          // Set initial language
          if (response.data.codingChallenges && response.data.codingChallenges.length > 0) {
            const firstChallenge = response.data.codingChallenges[0];
            if (firstChallenge.preferredLanguage) {
              setSelectedLanguage(firstChallenge.preferredLanguage);
            }
          }
          
          setLoading(false);
        } else {
          throw new Error(response.message || 'Failed to fetch assessment data');
        }
      } catch (error: any) {
        console.error('Error fetching assessment data:', error);
        setError(error.message || 'Failed to load assessment. Please try again.');
        setLoading(false);
      }
    };

    fetchData();
  }, [assessmentId, navigate]);

  // Set the active tab based on available questions
  useEffect(() => {
    if (assessmentData) {
      // If we have coding challenges, default to coding tab
      if (codingChallenges.length > 0) {
        setActiveTab('coding');
      }
      // Otherwise, if we have MCQ questions, default to mcq tab
      else if (mcqQuestions.length > 0) {
        setActiveTab('mcq');
      }
    }
  }, [assessmentData, codingChallenges.length, mcqQuestions.length]);

  // Languages supported by Judge0
  const languages = [
    { id: 'html', name: 'HTML' },
    { id: 'javascript', name: 'JavaScript' },
    { id: 'python', name: 'Python' },
    { id: 'java', name: 'Java' },
    { id: 'c', name: 'C' },
    { id: 'cpp', name: 'C++' },
    { id: 'csharp', name: 'C#' },
    { id: 'php', name: 'PHP' },
    { id: 'ruby', name: 'Ruby' },
    { id: 'go', name: 'Go' },
    { id: 'rust', name: 'Rust' },
    { id: 'react', name: 'React' },
    { id: 'flutter', name: 'Flutter' }
  ];

  // Initialize code state for each challenge and language
  useEffect(() => {
    if (codingChallenges.length > 0) {
      const initialCode: { [key: string]: { [key: string]: string } } = {};
      const initialTestCases: { [key: string]: { passed: boolean, actualOutput: string, expectedOutput: string, input: string }[] } = {};

      codingChallenges.forEach(challenge => {
        if (challenge.questionId) {
          initialCode[challenge.questionId] = {};
          languages.forEach(lang => {
            // Use starter code if available, otherwise empty string
            initialCode[challenge.questionId][lang.id] = challenge.starterCode || '';
          });

          // Initialize empty test case results
          initialTestCases[challenge.questionId] = [];
        }
      });

      setCode(initialCode);
      setTestCaseResults(initialTestCases);
    }
  }, [codingChallenges]); // Only depend on codingChallenges array

  // Ensure code state is properly initialized for current challenge and language
  useEffect(() => {
    // Check if code state exists for current challenge and language
    if (code && Object.keys(code).length > 0) {
      if (!code[codingChallenges[currentCodingIndex]?.questionId]) {
        setCode(prev => ({
          ...prev,
          [codingChallenges[currentCodingIndex]?.questionId]: {}
        }));
      } else if (!code[codingChallenges[currentCodingIndex]?.questionId][selectedLanguage]) {
        setCode(prev => ({
          ...prev,
          [codingChallenges[currentCodingIndex]?.questionId]: {
            ...prev[codingChallenges[currentCodingIndex]?.questionId],
            [selectedLanguage]: ''
          }
        }));
      }
    }
  }, [code, currentCodingIndex, selectedLanguage, codingChallenges]);

  // Timer effect
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Auto-submit when time is up
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoRunTimeoutRef.current) {
        clearTimeout(autoRunTimeoutRef.current);
      }
    };
  }, []);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      // Enter fullscreen
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Handle MCQ answer selection
  const handleMCQAnswerSelect = (optionIndex: number) => {
    console.log('MCQ Answer Selected:', {
      optionIndex,
      currentQuestionId: mcqQuestions[currentMCQIndex]?.questionId,
      currentQuestion: mcqQuestions[currentMCQIndex]
    });

    setMcqAnswers(prev => ({
      ...prev,
      [mcqQuestions[currentMCQIndex]?.questionId]: optionIndex
    }));
  };

  // Handle MCQ navigation (Save and Next button)
  const handleMCQNavigation = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      // Save current answer before moving to next question
      if (currentMCQIndex < mcqQuestions.length - 1) {
        // Move to next MCQ question
        setCurrentMCQIndex(prev => prev + 1);
      } else {
        // Reached the end of MCQ questions
        // Check if there are coding questions
        if (codingChallenges.length > 0) {
          // Switch to coding tab
          setActiveTab('coding');
          setCurrentCodingIndex(0);
        } else {
          // No coding questions, submit the assessment
          handleSubmit();
        }
      }
    } else if (direction === 'prev') {
      // Move to previous question
      if (currentMCQIndex > 0) {
        setCurrentMCQIndex(prev => prev - 1);
      }
    }
  };

  // Handle navigation between coding challenges
  const handleCodingNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentCodingIndex > 0) {
      setCurrentCodingIndex(currentCodingIndex - 1);
    } else if (direction === 'next' && currentCodingIndex < codingChallenges.length - 1) {
      setCurrentCodingIndex(currentCodingIndex + 1);
    }
  };

  // Handle code change with auto-run debounce
  const handleCodeChange = useCallback((newCode: string) => {
    // Check if the indices are valid
    if (currentCodingIndex < 0 || currentCodingIndex >= codingChallenges.length) {
      return;
    }

    // Ensure we have proper state structure
    setCode(prev => {
      const newState = { ...prev };

      // Ensure challenge exists
      if (!newState[codingChallenges[currentCodingIndex]?.questionId]) {
        newState[codingChallenges[currentCodingIndex]?.questionId] = {};
      }

      // Ensure language exists for this challenge
      if (!newState[codingChallenges[currentCodingIndex]?.questionId][selectedLanguage]) {
        newState[codingChallenges[currentCodingIndex]?.questionId][selectedLanguage] = '';
      }

      // Update the code
      newState[codingChallenges[currentCodingIndex]?.questionId][selectedLanguage] = newCode;

      return newState;
    });

    // If there was an error previously and user is typing, clear the error
    if (executionResult[codingChallenges[currentCodingIndex]?.questionId]?.stderr) {
      setExecutionResult(prev => {
        const newResult = { ...prev };
        delete newResult[codingChallenges[currentCodingIndex]?.questionId];
        return newResult;
      });
    }

    // Auto-run if enabled
    if (isAutoRunEnabled) {
      // Clear previous timeout
      if (autoRunTimeoutRef.current) {
        clearTimeout(autoRunTimeoutRef.current);
      }

      // Set new timeout
      autoRunTimeoutRef.current = setTimeout(() => {
        runCode('example');
      }, 800);
    }
  }, [currentCodingIndex, codingChallenges, selectedLanguage, executionResult, isAutoRunEnabled, runCode]);

  // Handle language selection and dismiss alert
  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    setShowLanguageAlert(false);
  };

  // Calculate MCQ score
  const calculateMCQScore = () => {
    let score = 0;
    let maxScore = 0;
    const answers: any = {};

    mcqQuestions.forEach((question, index) => {
      maxScore += question.points || 1;
      answers[question.questionId] = {
        selectedOption: mcqAnswers[question.questionId],
        correctOption: question.correctAnswer,
        points: question.points || 1
      };

      // Check if answer is correct by comparing selected option with correct answer
      if (mcqAnswers[question.questionId] !== undefined) {
        // Get the option ID (A, B, C, D) for the selected index
        const selectedOptionId = String.fromCharCode(65 + mcqAnswers[question.questionId]);

        // Check if the selected option matches any of the correct answers
        let isCorrect = false;
        if (Array.isArray(question.correctAnswer)) {
          isCorrect = question.correctAnswer.includes(selectedOptionId);
        } else if (typeof question.correctAnswer === 'string') {
          isCorrect = question.correctAnswer === selectedOptionId;
        }

        if (isCorrect) {
          score += question.points || 1;
        }

        // Store correctness for UI feedback
        answers[question.questionId].isCorrect = isCorrect;
      }
    });

    return { score, maxScore, answers };
  };

  // Handle submit
  const handleSubmit = async () => {
    // Prevent double submission
    if (isSubmitting || submitted) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Get user info from context or token
      let studentEmail = user?.email || '';
      let studentName = user?.name || '';

      // If not in context, try to get from token
      if (!studentEmail) {
        try {
          const token = AuthService.getAccessToken();
          if (token) {
            const userProfile = await AuthService.getUserProfile(token);
            studentEmail = userProfile.email || '';
            studentName = userProfile.name || '';
          }
        } catch (err) {
          console.error('Error getting user from token:', err);
        }
      }

      // Final fallback - decode JWT token to get email
      if (!studentEmail) {
        try {
          const token = AuthService.getAccessToken();
          if (token) {
            // Decode JWT token (simple base64 decode, no verification needed for email extraction)
            const payload = JSON.parse(atob(token.split('.')[1]));
            studentEmail = payload.email || payload['cognito:username'] || payload.username || payload.sub || '';
            studentName = payload.name || payload['cognito:name'] || `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || studentEmail;
          }
        } catch (err) {
          console.error('Error decoding token:', err);
        }
      }

      if (!studentEmail) {
        alert('User email not found. Please log in again.');
        setIsSubmitting(false);
        return;
      }

      // If name is still empty, use email
      if (!studentName) {
        studentName = studentEmail;
      }

      // Calculate MCQ answers in exact format
      const mcqAnswersArray: any[] = [];
      let mcqScore = 0;
      let mcqMaxScore = 0;
      let mcqCorrect = 0;
      let mcqIncorrect = 0;
      let mcqUnattempted = 0;

      mcqQuestions.forEach((question) => {
        mcqMaxScore += question.points || 1;
        const selectedIndex = mcqAnswers[question.questionId];

        // Get selected option IDs as array of strings
        let selected: string[] = [];
        if (selectedIndex !== undefined) {
          const optionId = String.fromCharCode(65 + selectedIndex); // A, B, C, D
          selected = [optionId];
        }

        // Check if correct
        let isCorrect = false;
        if (selectedIndex !== undefined) {
          const selectedOptionId = String.fromCharCode(65 + selectedIndex);
          if (Array.isArray(question.correctAnswer)) {
            isCorrect = question.correctAnswer.includes(selectedOptionId);
          } else if (typeof question.correctAnswer === 'string') {
            isCorrect = question.correctAnswer === selectedOptionId;
          }

          if (isCorrect) {
            mcqScore += question.points || 1;
            mcqCorrect++;
          } else {
            mcqIncorrect++;
          }
        } else {
          mcqUnattempted++;
        }

        mcqAnswersArray.push({
          questionId: question.questionId,
          selected: selected,
          isCorrect: isCorrect
        });
      });

      // Calculate coding answers (simplified - assume all coding questions are attempted if code exists)
      const codingAnswersArray: any[] = [];
      let codingScore = 0;
      let codingMaxScore = 0;
      let codingCorrect = 0;
      let codingIncorrect = 0;
      let codingUnattempted = 0;

      codingChallenges.forEach((challenge) => {
        codingMaxScore += challenge.points || 1;
        const challengeCode = code[challenge.questionId]?.[selectedLanguage] || '';
        const hasCode = challengeCode.trim().length > 0;
        const isSuccessful = successfulExecutions[challenge.questionId] || false;

        if (hasCode) {
          if (isSuccessful) {
            codingScore += challenge.points || 1;
            codingCorrect++;
          } else {
            codingIncorrect++;
          }
        } else {
          codingUnattempted++;
        }

        codingAnswersArray.push({
          questionId: challenge.questionId,
          selected: hasCode ? [challengeCode] : [],
          isCorrect: isSuccessful
        });
      });

      // Combine all answers
      const allAnswers = [...mcqAnswersArray, ...codingAnswersArray];

      // Calculate totals
      const totalScore = mcqScore + codingScore;
      const totalMaxScore = mcqMaxScore + codingMaxScore;
      const totalQuestions = mcqQuestions.length + codingChallenges.length;
      const numCorrect = mcqCorrect + codingCorrect;
      const numIncorrect = mcqIncorrect + codingIncorrect;
      const numUnattempted = mcqUnattempted + codingUnattempted;
      const accuracy = totalQuestions > 0 ? Math.round((numCorrect / totalQuestions) * 100) : 0;
      const percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
      const durationSeconds = (assessmentData?.configuration?.duration || 60) * 60;
      const timeSpentSeconds = Math.max(0, durationSeconds - timeLeft);

      // Prepare result data in EXACT schema
      // Get department from assessment first (the department chosen when creating the assessment)
      // Then fallback to user's department, then departmentCode, then 'Unknown'
      const department = assessmentData?.department ||
        assessmentData?.departmentCode ||
        user?.department ||
        'Unknown';

      const resultData = {
        assessmentId: assessmentId || assessmentData?.assessmentId || '',
        email: studentEmail,
        Name: studentName,
        department: department,
        answers: allAnswers,
        score: totalScore,
        maxScore: totalMaxScore,
        percentage: percentage,
        accuracy: accuracy,
        numCorrect: numCorrect,
        numIncorrect: numIncorrect,
        numUnattempted: numUnattempted,
        entity_marks: {
          MCQ: mcqScore,
          CODING: codingScore
        },
        timeSpentSeconds: timeSpentSeconds,
        submittedAt: new Date().toISOString()
      };

      // Validate required fields
      if (!resultData.assessmentId) {
        alert('Assessment ID is missing. Cannot submit.');
        setIsSubmitting(false);
        return;
      }

      // Store MCQ results for UI feedback
      setMcqResults(mcqAnswersArray.reduce((acc, ans) => {
        acc[ans.questionId] = ans;
        return acc;
      }, {} as any));
      setSubmitted(true);

      console.log('Submitting assessment result...', resultData);

      // Save result to database
      const saveResponse = await ResultsService.saveAssessmentResult(resultData);
      console.log('Save response:', saveResponse);

      // Get the SK (attemptId) from the response
      const attemptId = saveResponse?.data?.SK || saveResponse?.SK;
      console.log('Attempt ID (SK):', attemptId);

      console.log('Assessment result saved successfully, navigating to success page...');

      // Navigate to submission success page with attemptId
      navigate('/student/assessment-submitted', {
        state: {
          assessmentId: resultData.assessmentId,
          attemptId: attemptId // Pass SK so we can navigate directly to detail page
        }
      });

      setIsAssessmentCompleted(true);

      // Clear persisted timer for this assessment now that it is completed
      try {
        if (assessmentData?.assessmentId) {
          const storageKey = `assessment_timer_${assessmentData.assessmentId}`;
          localStorage.removeItem(storageKey);
        }
      } catch (e) {
        console.error('Error clearing persisted timer after submission:', e);
      }
      // Notify parent component that assessment is completed
      if (window.parent) {
        window.parent.postMessage({ type: 'ASSESSMENT_COMPLETED' }, '*');
      }
    } catch (error: any) {
      console.error('Error saving assessment result:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });

      setIsSubmitting(false);
      setSubmitted(false);

      // Provide more specific error messages
      let errorMessage = 'Assessment completed but there was an error saving your results.';

      if (error.response) {
        // Server responded with error
        const serverMessage = error.response.data?.message || error.response.data?.error || 'Unknown server error';
        errorMessage = `Error: ${serverMessage}`;

        if (error.response.status === 401) {
          errorMessage = 'Your session has expired. Please log in again to save your results.';
        } else if (error.response.status === 404) {
          errorMessage = 'API endpoint not found. Please check if backend server is running.';
        } else if (error.response.status === 500) {
          errorMessage = `Server error: ${serverMessage}. Please check backend logs.`;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Cannot connect to server. Please check:\n1. Backend server is running on port 3000\n2. Your internet connection\n3. Check browser console for details';
      } else if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check:\n1. Backend server is running\n2. CORS is configured correctly\n3. Check browser console for details';
      } else {
        errorMessage = `Error: ${error.message || 'Unknown error occurred'}`;
      }

      console.error('Final error message:', errorMessage);
      alert(errorMessage);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="assessment-taking-container">
        <div className="loading-container">
          <h2>Loading Assessment...</h2>
          <p>Please wait while we prepare your assessment.</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="assessment-taking-container">
        <div className="error-container">
          <h2>Error Loading Assessment</h2>
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

  // Render if no assessment data
  if (!assessmentData) {
    return (
      <div className="assessment-taking-container">
        <div className="error-container">
          <h2>Assessment Not Found</h2>
          <p>The requested assessment could not be found.</p>
        </div>
      </div>
    );
  }

  // Render if no questions
  if (assessmentData && (!assessmentData.questions || assessmentData.questions.length === 0)) {
    return (
      <div className="assessment-taking-container">
        <div className="error-container">
          <h2>No Questions Available</h2>
          <p>This assessment does not contain any questions yet.</p>
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
    <div className={`assessment-taking ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Header with timer and navigation buttons */}
      <div className="assessment-header">
        <div className="timer-section">
          <span className={`timer ${timeLeft < 300 ? 'warning' : ''}`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        <div className="header-controls">
          {/* Navigation buttons as tabs near timer */}
          <button
            className={`section-btn ${activeTab === 'mcq' ? 'active' : ''} ${mcqQuestions.length === 0 ? 'disabled' : ''}`}
            onClick={() => mcqQuestions.length > 0 && setActiveTab('mcq')}
            disabled={mcqQuestions.length === 0}
          >
            MCQ
          </button>
          <button
            className={`section-btn ${activeTab === 'coding' ? 'active' : ''} ${codingChallenges.length === 0 ? 'disabled' : ''}`}
            onClick={() => codingChallenges.length > 0 && setActiveTab('coding')}
            disabled={codingChallenges.length === 0}
          >
            Coding
          </button>

          <button
            className="fullscreen-btn"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTab === 'mcq' ? (
          <div className="mcq-section">
            <div className="mcq-header">
              <div className="progress-indicator">
                <span>Question {currentMCQIndex + 1} of {mcqQuestions.length}</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${((currentMCQIndex + 1) / mcqQuestions.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="question-container">
              <div className="question-content">
                <div className="question-text small">
                  {mcqQuestions[currentMCQIndex]?.question}
                </div>

                <div className="options-container small">
                  {mcqQuestions[currentMCQIndex]?.options.map((option, index) => {
                    // Check if this option should show feedback
                    const questionId = mcqQuestions[currentMCQIndex]?.questionId;
                    const showFeedback = submitted && mcqResults && mcqResults[questionId];
                    const isSelected = mcqAnswers[questionId] === index;
                    const isCorrectOption = Array.isArray(mcqQuestions[currentMCQIndex]?.correctAnswer)
                      ? mcqQuestions[currentMCQIndex]?.correctAnswer.includes(String.fromCharCode(65 + index))
                      : mcqQuestions[currentMCQIndex]?.correctAnswer === String.fromCharCode(65 + index);

                    let optionClass = "option-item";
                    if (showFeedback) {
                      if (isSelected && mcqResults[questionId].isCorrect) {
                        optionClass += " correct-answer";
                      } else if (isSelected && !mcqResults[questionId].isCorrect) {
                        optionClass += " incorrect-answer";
                      } else if (isCorrectOption) {
                        optionClass += " correct-answer";
                      }
                    }

                    return (
                      <div
                        key={index}
                        className={optionClass}
                        onClick={() => {
                          // Only allow selection if not submitted
                          if (!submitted) {
                            handleMCQAnswerSelect(index);
                          }
                        }}
                      >
                        <div className={`radio-button ${mcqAnswers[questionId] === index ? 'selected' : ''}`}>
                          {mcqAnswers[questionId] === index && <div className="radio-button-inner"></div>}
                        </div>
                        <span className="option-text">{option.text}</span>
                        {showFeedback && isSelected && mcqResults[questionId].isCorrect && (
                          <span className="feedback-icon correct">✓</span>
                        )}
                        {showFeedback && isSelected && !mcqResults[questionId].isCorrect && (
                          <span className="feedback-icon incorrect">✗</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Previous button on left side corner */}
            <button
              className="nav-btn prev left-corner"
              onClick={() => handleMCQNavigation('prev')}
              disabled={currentMCQIndex === 0}
            >
              Previous
            </button>

            {/* Save and Next button in the middle */}
            <button
              className="nav-btn next save-next"
              onClick={() => {
                // If on last MCQ question and no coding questions, submit
                if (currentMCQIndex === mcqQuestions.length - 1 && codingChallenges.length === 0) {
                  handleSubmit();
                } else {
                  handleMCQNavigation('next');
                }
              }}
              disabled={isSubmitting || submitted}
            >
              {isSubmitting ? 'Submitting...' : (currentMCQIndex === mcqQuestions.length - 1 && codingChallenges.length === 0 ? 'Submit' : 'Save and Next')}
            </button>

            {/* Submit button on right side corner - only show if no coding questions */}
            {codingChallenges.length === 0 && (
              <button
                className="submit-btn small right-corner"
                onClick={handleSubmit}
                disabled={isSubmitting || submitted}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        ) : (
          <div className="coding-section">
            <div className="coding-header">
              <h2 className="challenge-title">{codingChallenges[currentCodingIndex]?.question || 'Coding Challenge'}</h2>
            </div>

            {/* Language selection alert */}
            {showLanguageAlert && (
              <div className="language-alert-overlay">
                <div className="language-alert-modal">
                  <h3>Please Select a Programming Language</h3>
                  <p>Choose a language to start coding:</p>
                  <div className="language-options">
                    {languages.map(lang => (
                      <button
                        key={lang.id}
                        className="language-option-btn"
                        onClick={() => handleLanguageSelect(lang.id)}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                  <p className="note">You can change the language later using the dropdown in the header.</p>
                </div>
              </div>
            )}

            <div className="coding-content">
              {/* Left column - Problem description */}
              <div className="problem-section">
                <div className="problem-description">
                  {codingChallenges[currentCodingIndex]?.question || 'No description available'}
                </div>

                {codingChallenges[currentCodingIndex]?.examples && codingChallenges[currentCodingIndex]?.examples?.length > 0 && (
                  <div className="examples">
                    <h3>Examples:</h3>
                    {codingChallenges[currentCodingIndex]?.examples?.map((example, index) => (
                      <div key={index} className="example-item">
                        <div className="example-label">Example {index + 1}:</div>
                        <div className="example-content">
                          <strong>Input:</strong> {example.input}
                          <br />
                          <strong>Output:</strong> {example.output}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Test Cases Section */}
                {codingChallenges[currentCodingIndex]?.testCases && codingChallenges[currentCodingIndex]?.testCases.length > 0 && (
                  <div className="test-cases-section">
                    <h3>Test Cases:</h3>
                    <div className="test-cases-container">
                      {codingChallenges[currentCodingIndex]?.testCases.map((testCase, index) => (
                        <div key={index} className="test-case-item">
                          <div className="test-case-header">
                            <span className="test-case-number">Test Case {index + 1}</span>
                          </div>
                          <div className="test-case-content">
                            <div className="test-case-input">
                              <strong>Input:</strong>
                              <pre className="test-case-preformatted">{testCase.input}</pre>
                            </div>
                            <div className="test-case-output">
                              <strong>Expected Output:</strong>
                              <pre className="test-case-preformatted">{testCase.expectedOutput}</pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Execution output section - moved to be below test cases */}
                {(executionResult[codingChallenges[currentCodingIndex]?.questionId] || testCaseResults[codingChallenges[currentCodingIndex]?.questionId]) && (
                  <div className="output-section test-cases-section">
                    <div className="result-header">Execution Output</div>
                    <div className="result-content">
                      {executionResult[codingChallenges[currentCodingIndex]?.questionId]?.compile_output && (
                        <div className="error-output">
                          <strong>Compilation Error:</strong>
                          <pre>{executionResult[codingChallenges[currentCodingIndex]?.questionId]?.compile_output}</pre>
                        </div>
                      )}
                      {executionResult[codingChallenges[currentCodingIndex]?.questionId]?.stderr && (
                        <div className="error-output">
                          <strong>Runtime Error:</strong>
                          <pre>{executionResult[codingChallenges[currentCodingIndex]?.questionId]?.stderr}</pre>
                        </div>
                      )}
                      {executionResult[codingChallenges[currentCodingIndex]?.questionId]?.stdout && !testCaseResults[codingChallenges[currentCodingIndex]?.questionId] && (
                        <div className="result-output">
                          <strong>Output:</strong>
                          <pre>{executionResult[codingChallenges[currentCodingIndex]?.questionId]?.stdout}</pre>
                        </div>
                      )}
                      
                      {/* Test Case Results */}
                      {testCaseResults[codingChallenges[currentCodingIndex]?.questionId] && (
                        <div className="test-case-results">
                          <h3>Test Case Results:</h3>
                          {testCaseResults[codingChallenges[currentCodingIndex]?.questionId].map((result, index) => (
                            <div 
                              key={index} 
                              className={result.passed ? "test-case-passed" : "test-case-failed"}
                            >
                              <div className="test-case-header">
                                <span className="test-case-number">Test Case {index + 1}: {result.passed ? '✓ PASSED' : '✗ FAILED'}</span>
                              </div>
                              <div className="test-case-details">
                                <div className="test-case-input">
                                  <strong>Input:</strong>
                                  <pre>{result.input}</pre>
                                </div>
                                <div className="test-case-expected">
                                  <strong>Expected Output:</strong>
                                  <pre>{result.expectedOutput}</pre>
                                </div>
                                <div className="test-case-actual">
                                  <strong>Actual Output:</strong>
                                  <pre>{result.actualOutput}</pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right column - Code editor only */}
              <div className="right-column">
                <div className="editor-section">
                  <div className="editor-header">
                    <div>Code Editor</div>
                    <div className="editor-controls">
                      <select
                        className="language-selector"
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                      >
                        {languages.map(lang => (
                          <option key={lang.id} value={lang.id}>{lang.name}</option>
                        ))}
                      </select>
                      <button
                        className="control-btn run-btn"
                        onClick={() => runCode('test')}
                        disabled={isLoading || !code || !code[codingChallenges[currentCodingIndex]?.questionId] || !code[codingChallenges[currentCodingIndex]?.questionId][selectedLanguage] || code[codingChallenges[currentCodingIndex]?.questionId][selectedLanguage].trim() === ''}
                      >
                        {isLoading ? 'Running...' : 'Run Code'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    ref={codeEditorRef}
                    className="code-editor"
                    value={code[codingChallenges[currentCodingIndex]?.questionId]?.[selectedLanguage] || ''}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    onPaste={(e) => {
                      // Handle paste event to ensure proper scrolling
                      setTimeout(() => {
                        if (codeEditorRef.current) {
                          codeEditorRef.current.scrollTop = codeEditorRef.current.scrollHeight;
                        }
                      }, 10);
                    }}
                    onKeyDown={(e) => {
                      // Handle tab key for better code editing experience
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const { selectionStart, selectionEnd } = e.target as HTMLTextAreaElement;
                        const newValue =
                          code[codingChallenges[currentCodingIndex]?.questionId]?.[selectedLanguage].substring(0, selectionStart) +
                          '    ' +
                          code[codingChallenges[currentCodingIndex]?.questionId]?.[selectedLanguage].substring(selectionEnd);

                        handleCodeChange(newValue);

                        // Move cursor to after the inserted spaces
                        setTimeout(() => {
                          if (codeEditorRef.current) {
                            codeEditorRef.current.selectionStart = selectionStart + 4;
                            codeEditorRef.current.selectionEnd = selectionStart + 4;
                          }
                        }, 10);
                      }
                    }}
                    placeholder={selectedLanguage === 'java'
                      ? `Write your Java code here...
Example:
public class Main {
    public static void main(String[] args) {
        // Your code here
    }
}`
                      : selectedLanguage === 'python'
                        ? `Write your Python code here...
Example:
print("Hello, World!")`
                        : selectedLanguage === 'cpp'
                          ? `Write your C++ code here...
Example:
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`
                          : `Write your ${languages.find(l => l.id === selectedLanguage)?.name} code here...`}
                  />

                  {/* Custom input section */}
                  <div className="custom-input-section">
                    <h4>Custom Input:</h4>
                    <textarea
                      className="custom-input"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Enter custom input for your code here..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation buttons container - like a header */}
            <div className="navigation-container">
              <div className="navigation-buttons">
                <button
                  className="nav-btn prev"
                  onClick={() => handleCodingNavigation('prev')}
                  disabled={currentCodingIndex === 0}
                >
                  Previous Challenge
                </button>
                {/* Small submit button that is always visible but only enabled when code runs successfully */}
                <button
                  className="submit-btn small"
                  onClick={handleSubmit}
                  disabled={!successfulExecutions[codingChallenges[currentCodingIndex]?.questionId]}
                >
                  Submit
                </button>
                <button
                  className="nav-btn next"
                  onClick={() => handleCodingNavigation('next')}
                  disabled={currentCodingIndex === codingChallenges.length - 1}
                >
                  Next Challenge
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default AssessmentTaking;