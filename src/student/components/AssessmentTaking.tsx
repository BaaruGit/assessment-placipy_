import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './AssessmentTaking.css';
import judge0Service, { type SubmissionResult } from '../../services/judge0.service';
import StudentAssessmentService from '../../services/student.assessment.service';
import ResultsService from '../../services/results.service';
import { useUser } from '../../contexts/UserContext';
import AuthService from '../../services/auth.service';
import SkeletonLoader from './SkeletonLoader';

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
  console.log('=== AssessmentTaking Component Rendered ===');
  // Get assessmentId from URL params
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  // State for assessment data
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for tabs
  const [activeTab, setActiveTab] = useState<'mcq' | 'coding'>('mcq');
  // State for tracking focus loss (replaces tab switch count)
  const [focusLossCount, setFocusLossCount] = useState<number>(0);
  // State for focus loss warnings
  // Removed focus loss warning state variables as per requirement  const [focusLossWarningMessage, setFocusLossWarningMessage] = useState<string>('');
  const [focusLossWarningType, setFocusLossWarningType] = useState<'first' | 'second' | 'third'>('first');
  
  // Updated handleTabChange function (no longer tracks tab switches)
  const handleTabChange = (newTab: 'mcq' | 'coding') => {
    // Simply change the active tab without counting as a focus loss
    setActiveTab(newTab);
  };

  // State for showing language selection alert
  const [showLanguageAlert, setShowLanguageAlert] = useState<boolean>(true);

  // State for timer
  const [timeLeft, setTimeLeft] = useState<number>(0); // Start with 0, will be set by assessment config
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
 // State for showing submit button after 20 minutes (keeping for compatibility)
const [showSubmitButton, setShowSubmitButton] = useState<boolean>(false);

// State to track if 25% of assessment time has passed to enable submit button
const [isSubmitEnabled, setIsSubmitEnabled] = useState<boolean>(false);
  
  // Debug log for showSubmitButton state changes
  useEffect(() => {
    console.log('showSubmitButton state changed:', showSubmitButton);
  }, [showSubmitButton]);

  // Debug log for isSubmitEnabled state changes
useEffect(() => {
  console.log('isSubmitEnabled state changed:', isSubmitEnabled);
}, [isSubmitEnabled]);
  
  // Debug log for timeLeft state changes
  useEffect(() => {
    console.log('timeLeft state changed:', timeLeft);
  }, [timeLeft]);
  
  // Debug log for focusLossCount state changes
  useEffect(() => {
    console.log('focusLossCount state changed:', focusLossCount);
  }, [focusLossCount]);

  // Debug log for component mount/unmount
  useEffect(() => {
    console.log('=== AssessmentTaking Component Mounted ===');
    return () => {
      console.log('=== AssessmentTaking Component Unmounting ===');
    };
  }, []);

  // State for showing test cases dropdown
  const [showTestCases, setShowTestCases] = useState<boolean>(false);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);
  const autoRunTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedData = useRef(false); // To prevent multiple API calls
  const isLeavingRef = useRef(false); // To track if user is leaving the page
  const hasFocusedRef = useRef<boolean>(false); // To track if user has focused on the page
  const isSubmittingRef = useRef<boolean>(false); // To track if we're submitting
  const focusListenersAttachedRef = useRef<boolean>(false); // To track if focus listeners are attached

  // Add new state for time validation
  const [isAssessmentStarted, setIsAssessmentStarted] = useState<boolean>(false);
  const [isAssessmentEnded, setIsAssessmentEnded] = useState<boolean>(false);
  const [serverTime, setServerTime] = useState<Date | null>(null);

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

  // Strict focus loss detection effect
  useEffect(() => {
    console.log('=== Focus Loss Detection Effect Mounted ===');
    if (!assessmentData || submitted) {
      console.log('Skipping focus loss detection - no assessment data or already submitted');
      return;
    }

    // Prevent multiple attachments of event listeners
    if (focusListenersAttachedRef.current) {
      console.log('Focus listeners already attached, skipping');
      return;
    }

    // Set initial focus state when user first interacts with the page
    const setInitialFocus = () => {
      console.log('=== Initial Focus Event ===');
      if (!hasFocusedRef.current) {
        console.log('Setting initial focus state to true');
        hasFocusedRef.current = true;
        // Remove these event listeners after initial focus is set
        document.removeEventListener('mousedown', setInitialFocus);
        document.removeEventListener('keydown', setInitialFocus);
        document.removeEventListener('touchstart', setInitialFocus);
      } else {
        console.log('Initial focus already set');
      }
      console.log('=== End Initial Focus Event ===');
    };

    const handleVisibilityChange = () => {
      console.log('=== Visibility Change ===');
      console.log('Document visibility state:', document.visibilityState);
      console.log('Has focused ref:', hasFocusedRef.current);
      if (document.visibilityState === 'hidden' && hasFocusedRef.current) {
        console.log('Tab switch detected - document hidden');
        handleFocusLoss();
      } else if (document.visibilityState === 'visible') {
        console.log('Tab switch detected - document visible');
      }
      console.log('=== End Visibility Change ===');
    };

    const handleBlur = () => {
      console.log('=== Blur Event ===');
      console.log('Window blur detected, hasFocusedRef:', hasFocusedRef.current);
      // Only count as focus loss if the page had focus previously
      if (hasFocusedRef.current) {
        console.log('Focus loss detected via blur');
        handleFocusLoss();
      }
      console.log('=== End Blur Event ===');
    };

    const handleFocus = () => {
      console.log('=== Focus Event ===');
      console.log('Window focus detected, hasFocusedRef before:', hasFocusedRef.current);
      // Set focus state when window gains focus
      if (!hasFocusedRef.current) {
        console.log('Setting focus state to true in handleFocus');
        hasFocusedRef.current = true;
      }
      console.log('=== End Focus Event ===');
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      console.log('=== Before Unload Event ===');
      // Mark that we're submitting to prevent focus loss counting
      isSubmittingRef.current = true;
      console.log('=== End Before Unload Event ===');
    };

    // Initialize focus state to false - we'll set it to true when user first interacts
    console.log('=== Initializing Focus State ===');
    console.log('Initial document.visibilityState:', document.visibilityState);
    // Note: hasFocusedRef.current is initialized as false and will be set to true when user interacts
    console.log('hasFocusedRef.current initialized as:', hasFocusedRef.current);
    
    // But if the document is already visible, we can set focus state to true
    if (document.visibilityState === 'visible') {
      console.log('Document is visible, setting hasFocusedRef.current to true');
      hasFocusedRef.current = true;
    }
    console.log('Final hasFocusedRef.current:', hasFocusedRef.current);
    console.log('=== End Initializing Focus State ===');

    // Add event listeners for initial focus detection
    console.log('Adding initial focus event listeners');
    document.addEventListener('mousedown', setInitialFocus);
    document.addEventListener('keydown', setInitialFocus);
    document.addEventListener('touchstart', setInitialFocus);
    
    // Add other event listeners
    console.log('Adding focus tracking event listeners');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Mark listeners as attached
    focusListenersAttachedRef.current = true;

    return () => {
      console.log('=== Focus Loss Detection Effect Unmounting ===');
      // Clean up event listeners
      console.log('Cleaning up focus tracking event listeners');
      document.removeEventListener('mousedown', setInitialFocus);
      document.removeEventListener('keydown', setInitialFocus);
      document.removeEventListener('touchstart', setInitialFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Mark listeners as detached
      focusListenersAttachedRef.current = false;
      console.log('Finished cleaning up event listeners');
      console.log('=== Focus Loss Detection Effect Unmounted ===');
    };
  }, [assessmentData, submitted]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    // Prevent double submission
    if (isSubmitting || submitted) {
      console.log('Preventing double submission - already submitting or submitted');
      return;
    }
    
    // Mark that we're submitting to prevent counting as leaving
    isLeavingRef.current = true;
    isSubmittingRef.current = true;
    
    // Ensure we have valid assessment data
    if (!assessmentData || !assessmentId) {
      console.log('Cannot submit - no assessment data or ID');
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
  }, [assessmentData, assessmentId, code, codingChallenges, isSubmitting, mcqAnswers, navigate, selectedLanguage, submitted, successfulExecutions, timeLeft, user]);

  // Handle focus loss event - removed warning flow
  const handleFocusLoss = useCallback(() => {
    console.log('=== Focus Loss Event Detected ===');
    console.log('Current focusLossCount:', focusLossCount);
    console.log('isSubmittingRef.current:', isSubmittingRef.current);
    console.log('hasFocusedRef.current:', hasFocusedRef.current);
    
    // Don't count focus loss if we're already submitting
    if (isSubmittingRef.current) {
      console.log('Skipping focus loss - already submitting');
      return;
    }
    
    // Don't count focus loss if we haven't entered the assessment yet
    if (!hasFocusedRef.current) {
      console.log('Skipping focus loss - not focused yet');
      return;
    }

    // Simply increment the focus loss count without showing warnings
    const newCount = focusLossCount + 1;
    console.log('New focus loss count:', newCount);
    setFocusLossCount(newCount);
    
    console.log('=== End Focus Loss Event ===');
  }, [focusLossCount, handleSubmit]);
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
  }, [currentCodingIndex, selectedLanguage]);

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

          // Handle nested assessment data structure from the service
          const assessmentSource = response.data.assessment || response.data;
          
          // Set assessment data - ensure proper structure
          const assessmentDataFormatted = {
            ...response.data,
            // Ensure we have the right structure for assessment data
            assessmentId: assessmentSource.assessmentId || response.data.assessmentId || response.data.id || assessmentId,
            title: assessmentSource.title || response.data.title || response.data.name || 'Untitled Assessment',
            configuration: assessmentSource.configuration || response.data.configuration || {
              duration: assessmentSource.configuration?.duration || response.data.configuration?.duration || assessmentSource.duration || response.data.duration || 60,
              maxAttempts: assessmentSource.configuration?.maxAttempts || response.data.configuration?.maxAttempts || assessmentSource.maxAttempts || response.data.maxAttempts || 1,
              passingScore: assessmentSource.configuration?.passingScore || response.data.configuration?.passingScore || assessmentSource.passingScore || response.data.passingScore || 50,
              randomizeQuestions: assessmentSource.configuration?.randomizeQuestions || response.data.configuration?.randomizeQuestions || assessmentSource.randomizeQuestions || response.data.randomizeQuestions || false,
              totalQuestions: assessmentSource.configuration?.totalQuestions || response.data.configuration?.totalQuestions || assessmentSource.totalQuestions || response.data.totalQuestions || (assessmentSource.questions || response.data.questions ? (assessmentSource.questions || response.data.questions).length : 0)
            },
            scheduling: assessmentSource.scheduling || response.data.scheduling || {
              startDate: assessmentSource.scheduling?.startDate || response.data.scheduling?.startDate || assessmentSource.startDate || response.data.startDate || new Date().toISOString(),
              endDate: assessmentSource.scheduling?.endDate || response.data.scheduling?.endDate || assessmentSource.endDate || response.data.endDate || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              timezone: assessmentSource.scheduling?.timezone || response.data.scheduling?.timezone || assessmentSource.timezone || response.data.timezone || 'Asia/Kolkata'
            },
            questions: assessmentSource.questions || response.data.questions || []
          };
          
          // Log timezone information for debugging
          const startDate = new Date(assessmentDataFormatted.scheduling?.startDate);
          const endDate = new Date(assessmentDataFormatted.scheduling?.endDate);
          console.log('Assessment timezone info:', {
            timezone: assessmentDataFormatted.scheduling?.timezone,
            startDate: assessmentDataFormatted.scheduling?.startDate,
            endDate: assessmentDataFormatted.scheduling?.endDate,
            startDateParsed: startDate.toISOString(),
            endDateParsed: endDate.toISOString(),
            startDateIndia: convertToIndiaTime(startDate).toLocaleString('en-US'),
            endDateIndia: convertToIndiaTime(endDate).toLocaleString('en-US')
          });
          
          console.log('Raw response data:', response.data);
          console.log('Formatted assessment data:', assessmentDataFormatted);
          console.log('Configuration duration:', assessmentDataFormatted.configuration?.duration);
          console.log('Calculated duration seconds:', (assessmentDataFormatted.configuration?.duration || 60) * 60);
          
          setAssessmentData(assessmentDataFormatted);
          
          // Set initial time from assessment configuration
          if (assessmentDataFormatted.configuration?.duration !== undefined && assessmentDataFormatted.configuration?.duration !== null) {
            const durationMinutes = assessmentDataFormatted.configuration.duration;
            const durationSeconds = durationMinutes * 60;
            console.log('Setting timeLeft from configuration duration:', durationMinutes, 'minutes =', durationSeconds, 'seconds');
            setTimeLeft(durationSeconds); // Convert minutes to seconds
          } else {
            console.log('Setting default timeLeft: 3600 seconds (60 minutes)');
            setTimeLeft(3600); // Default to 60 minutes
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
        handleTabChange('coding')
      }
      // Otherwise, if we have MCQ questions, default to mcq tab
      else if (mcqQuestions.length > 0) {
        handleTabChange('mcq')
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

  // Timer effect - handle the actual timer countdown
  useEffect(() => {
    console.log('Timer effect triggered', {
      assessmentData: !!assessmentData,
      isAssessmentStarted,
      isAssessmentEnded,
      timeLeft,
      serverTime: serverTime?.toISOString()
    });
    
    // Only start timer if we have assessment data, assessment has started and hasn't ended
    if (!assessmentData || !isAssessmentStarted || isAssessmentEnded || submitted) {
      console.log('Not starting timer - no assessment data, not started, already ended, or already submitted');
      if (timerRef.current) {
        console.log('Clearing existing timer');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Don't start timer if timeLeft is 0 or negative, or if assessment hasn't started
    if (timeLeft <= 0 || !isAssessmentStarted) {
      console.log('Not starting timer - timeLeft is 0 or negative, or assessment has not started');
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    console.log('Starting timer interval with timeLeft:', timeLeft);
    
    // Clear any existing timer
    if (timerRef.current) {
      console.log('Clearing existing timer interval');
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        // Persist timer state to localStorage
        if (assessmentData?.assessmentId) {
          try {
            const storageKey = `assessment_timer_${assessmentData.assessmentId}`;
            const timerData = {
              timeLeft: prev - 1,
              timestamp: Date.now()
            };
            localStorage.setItem(storageKey, JSON.stringify(timerData));
          } catch (e) {
            console.error('Error persisting timer to localStorage:', e);
          }
        }
        
        if (prev <= 1) {
          console.log('Timer reached zero');
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // Auto-submit if the assessment is actually started and being taken,
          // or if the assessment has ended but was never marked as started (edge case)
          if ((isAssessmentStarted && !isAssessmentEnded && !submitted) || (!isAssessmentStarted && !submitted)) {
            console.log('Auto-submitting assessment because time is up');
            handleSubmit();
          } else {
            console.log('Not auto-submitting - assessment already submitted');
          }
          return 0;
        }
        console.log('Timer tick, new timeLeft:', prev - 1);
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        console.log('Clearing timer interval on cleanup');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (autoRunTimeoutRef.current) {
        clearTimeout(autoRunTimeoutRef.current);
      }
    };
  }, [assessmentData, isAssessmentStarted, isAssessmentEnded, submitted, timeLeft, handleSubmit]);  // Add useEffect to periodically sync with server time
  useEffect(() => {
    const syncTime = async () => {
      try {
        // In a real implementation, you would call an API endpoint to get server time
        // For now, we'll use client time but in production you should sync with server
        setServerTime(new Date());
      } catch (error) {
        console.warn('Could not sync with server time, using client time');
        setServerTime(new Date());
      }
    };

    // Sync immediately
    syncTime();

    // Sync every 5 minutes
    const interval = setInterval(syncTime, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

// Add useEffect to show submit button after a percentage of the assessment time (for compatibility)
useEffect(() => {
  if (!assessmentData || loading) return;
  
  // Get assessment duration in seconds
  const assessmentDuration = (assessmentData.configuration?.duration || 60) * 60;
  
  // Calculate when to show submit button based on assessment duration
  // For shorter assessments, show button sooner (higher percentage)
  // For longer assessments, show button later (lower percentage)
  let showButtonAfterPercentage;
  if (assessmentDuration <= 5 * 60) {  // 5 minutes or less
    showButtonAfterPercentage = 0.66; // Show after 66% (e.g., 2 min for 3 min test)
  } else if (assessmentDuration <= 30 * 60) {  // 30 minutes or less
    showButtonAfterPercentage = 0.5; // Show after 50%
  } else {  // Longer assessments
    showButtonAfterPercentage = 0.33; // Show after 33% (e.g., 20 min for 60 min test)
  }
  
  const showButtonAfterSeconds = Math.floor(assessmentDuration * showButtonAfterPercentage);
  
  console.log('Setting up submit button timer:', { 
    assessmentDuration, 
    showButtonAfterPercentage, 
    showButtonAfterSeconds 
  });
  
  // Show submit button after calculated time
  const timer = setTimeout(() => {
    console.log('Showing submit button after', showButtonAfterSeconds, 'seconds');
    setShowSubmitButton(true);
  }, showButtonAfterSeconds * 1000);
  
  // Don't clear the timer on component re-render - only clear when component unmounts
  return () => {
    console.log('Clearing submit button timer');
    clearTimeout(timer);
  };
}, [assessmentData, loading]);

// Add useEffect to enable submit button after 25% of the assessment time
useEffect(() => {
  if (!assessmentData || loading) return;
  
  console.log('Setting up submit button enable timer based on 25% of assessment duration');
  
  // Get assessment duration in minutes
  const assessmentDurationInMinutes = assessmentData.configuration?.duration || 60;
  
  // Calculate 25% of the assessment duration
  const enableAfterPercentage = 0.25; // 25%
  const enableAfterMinutes = assessmentDurationInMinutes * enableAfterPercentage;
  const enableAfterMs = enableAfterMinutes * 60 * 1000; // Convert to milliseconds
  
  console.log('Submit button enable settings:', { 
    assessmentDurationInMinutes, 
    enableAfterPercentage, 
    enableAfterMinutes,
    enableAfterMs 
  });
  
  // Enable submit button after calculated time (25% of assessment duration)
  const timer = setTimeout(() => {
    console.log('Enabling submit button after', enableAfterMinutes, 'minutes (25% of assessment)');
    setIsSubmitEnabled(true);
  }, enableAfterMs);
  
  // Clear the timer when component unmounts or assessment data changes
  return () => {
    console.log('Clearing submit button enable timer');
    clearTimeout(timer);
  };
}, [assessmentData, loading]); // Include both dependencies

  // Add useEffect to handle assessment timing logic
  useEffect(() => {
    if (!assessmentData || loading) return;
    
    // Check for persisted timer state
    let persistedTimeLeft = null;
    let persistedTimestamp = null;
    if (assessmentData.assessmentId) {
      try {
        const storageKey = `assessment_timer_${assessmentData.assessmentId}`;
        const storedTimer = localStorage.getItem(storageKey);
        if (storedTimer) {
          const timerData = JSON.parse(storedTimer);
          // Check if the stored timer is still valid (not older than 1 hour)
          if (Date.now() - timerData.timestamp < 60 * 60 * 1000) {
            persistedTimeLeft = timerData.timeLeft;
            persistedTimestamp = timerData.timestamp;
            console.log('Loaded persisted timer state:', persistedTimeLeft);
          } else {
            // Clear expired timer
            localStorage.removeItem(storageKey);
          }
        }
      } catch (e) {
        console.error('Error loading persisted timer state:', e);
      }
    }    
    const now = serverTime || new Date();    
    // Handle scheduling if present
    if (assessmentData.scheduling) {
      // Parse dates - they're already in ISO format with timezone info
      let startDate = new Date(assessmentData.scheduling.startDate);
      let endDate = new Date(assessmentData.scheduling.endDate);
      
      console.log('Assessment timing check:', {
        now: now.toISOString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        nowLocale: convertToIndiaTime(now).toLocaleString('en-US'),
        startLocale: convertToIndiaTime(startDate).toLocaleString('en-US'),
        endLocale: convertToIndiaTime(endDate).toLocaleString('en-US'),
        hasStarted: now >= startDate,
        hasEnded: now >= endDate
      });
      
      // If assessment hasn't started yet (with 1 second tolerance)
      if (now < new Date(startDate.getTime() - 1000)) {
        console.log('Assessment has not started yet');
        if (isAssessmentStarted) {
          setIsAssessmentStarted(false);
        }
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setTimeLeft(0);
        return;
      }
      
      // If assessment has ended
      if (now >= endDate) {
        console.log('Assessment has ended');
        if (!isAssessmentEnded) {
          setIsAssessmentEnded(true);
          setTimeLeft(0);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // Auto-submit if the assessment was started and not yet submitted, 
          // or if the assessment has ended but was never marked as started (edge case)
          if ((isAssessmentStarted && !submitted) || (!isAssessmentStarted && !submitted)) {
            console.log('Auto-submitting assessment because time has ended');
            handleSubmit();
          } else {
            console.log('Not auto-submitting - assessment already submitted');
          }
        }
        return;
      }
      
      // Assessment should be active now (with 1 second tolerance)
      if (!isAssessmentStarted && now >= new Date(startDate.getTime() - 1000)) {
        console.log('Starting assessment now');
        setIsAssessmentStarted(true);
        
        // If we have a persisted timer state, use it adjusted for elapsed time
        if (persistedTimeLeft !== null && persistedTimestamp !== null) {
          // Calculate elapsed time since timer was persisted
          const elapsedTime = Math.floor((Date.now() - persistedTimestamp) / 1000);
          // Adjust the persisted time left by elapsed time, but don't go below 0
          const adjustedTimeLeft = Math.max(0, persistedTimeLeft - elapsedTime);
          console.log('Resuming timer from persisted state:', {
            persistedTimeLeft,
            elapsedTime,
            adjustedTimeLeft
          });
          setTimeLeft(adjustedTimeLeft);
        } else {
          // Set timer based on configuration duration
          if (assessmentData.configuration?.duration !== undefined && assessmentData.configuration?.duration !== null) {
            const durationMinutes = assessmentData.configuration.duration;
            const durationSeconds = durationMinutes * 60;
            console.log('Setting timer to configured duration:', durationMinutes, 'minutes =', durationSeconds, 'seconds');
            setTimeLeft(durationSeconds);
          } else {
            // Calculate remaining time based on end time
            const timeUntilEnd = Math.floor((endDate.getTime() - now.getTime()) / 1000);
            console.log('Setting timer based on end time:', timeUntilEnd);
            setTimeLeft(Math.min(timeUntilEnd, 3600)); // Cap at 60 minutes
          }
        }
      }
    } else {
      // No scheduling, just use configuration duration
      if (!isAssessmentStarted) {
        setIsAssessmentStarted(true);
        // If we have a persisted timer state, use it adjusted for elapsed time
        if (persistedTimeLeft !== null && persistedTimestamp !== null) {
          // Calculate elapsed time since timer was persisted
          const elapsedTime = Math.floor((Date.now() - persistedTimestamp) / 1000);
          // Adjust the persisted time left by elapsed time, but don't go below 0
          const adjustedTimeLeft = Math.max(0, persistedTimeLeft - elapsedTime);
          console.log('Resuming timer from persisted state (no scheduling):', {
            persistedTimeLeft,
            elapsedTime,
            adjustedTimeLeft
          });
          setTimeLeft(adjustedTimeLeft);
        } else {
          if (assessmentData.configuration?.duration !== undefined && assessmentData.configuration?.duration !== null) {
            const durationMinutes = assessmentData.configuration.duration;
            const durationSeconds = durationMinutes * 60;
            console.log('Setting timer to configured duration (no scheduling):', durationMinutes, 'minutes =', durationSeconds, 'seconds');
            setTimeLeft(durationSeconds);
          } else {
            console.log('Setting default timer (no scheduling): 3600 seconds');
            setTimeLeft(3600); // Default to 60 minutes
          }
        }
      }
    }
  }, [assessmentData, loading, isAssessmentStarted, isAssessmentEnded, serverTime]);  // Helper function to convert UTC date to Asia/Kolkata time
  const convertToIndiaTime = (date: Date): Date => {
    // India Standard Time is UTC+5:30
    return new Date(date.getTime() + (date.getTimezoneOffset() * 60000) + (5.5 * 3600000));
  };
  
  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    console.log('Formatting time:', { seconds, mins, secs, formattedTime });
    return formattedTime;
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
          handleTabChange('coding')
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



  // Render loading state with skeleton loader
  if (loading) {
    return (
      <div className="assessment-taking-container">
        <SkeletonLoader type="assessment" count={1} />
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

  // Check if assessment has started
  if (assessmentData.scheduling) {
    const now = serverTime || new Date();
    // Parse dates - they're already in ISO format with timezone info
    let startDate = new Date(assessmentData.scheduling.startDate);
    let endDate = new Date(assessmentData.scheduling.endDate);
    
    console.log('Timezone-aware date comparison:', {
      now: now.toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      nowLocale: convertToIndiaTime(now).toLocaleString('en-US'),
      startLocale: convertToIndiaTime(startDate).toLocaleString('en-US'),
      endLocale: convertToIndiaTime(endDate).toLocaleString('en-US')
    });
    
    // If assessment hasn't started yet (with 1 second tolerance)
    if (now < new Date(startDate.getTime() - 1000)) {
      const timeUntilStart = Math.floor((startDate.getTime() - now.getTime()) / 1000);
      const hours = Math.floor(timeUntilStart / 3600);
      const minutes = Math.floor((timeUntilStart % 3600) / 60);
      const seconds = timeUntilStart % 60;
      
      return (
        <div className="assessment-taking-container">
          <div className="info-container">
            <h2>Assessment Not Started</h2>
            <p>This assessment will start on {convertToIndiaTime(startDate).toLocaleString('en-US')}.</p>
            <p>Time until start: {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</p>
          </div>
        </div>
      );
    }
    
    // If assessment has ended
    if (now >= endDate) {
      // Auto-submit if the assessment was started and not yet submitted, 
      // or if the assessment has ended but was never marked as started (edge case)
      if ((isAssessmentStarted && !submitted) || (!isAssessmentStarted && !submitted)) {
        console.log('Auto-submitting assessment in render section because time has ended');
        handleSubmit();
      } else {
        console.log('Not auto-submitting in render section - assessment already submitted');
      }
      
      return (
        <div className="assessment-taking-container">
          <div className="info-container">
            <h2>Assessment Ended</h2>
            <p>This assessment ended on {convertToIndiaTime(endDate).toLocaleString('en-US')}.</p>
            <p>You can no longer take this assessment.</p>
          </div>
        </div>
      );
    }
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
      {/* Header with timer, navigation buttons, and coding controls */}
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
            onClick={() => mcqQuestions.length > 0 && handleTabChange('mcq')}
            disabled={mcqQuestions.length === 0}
          >
            MCQ
          </button>
          <button
            className={`section-btn ${activeTab === 'coding' ? 'active' : ''} ${codingChallenges.length === 0 ? 'disabled' : ''}`}
            onClick={() => codingChallenges.length > 0 && handleTabChange('coding')}
            disabled={codingChallenges.length === 0}
          >
            Coding
          </button>

          {/* Language selector and Run button for coding challenges */}
          {activeTab === 'coding' && (
            <>
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
                disabled={isLoading}
              >
                {isLoading ? 'Running...' : 'Run Code'}
              </button>
            </>
          )}

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

                                {/* Small submit button that is always visible but only enabled after 25% of assessment time */}
                <button
                  className="submit-btn small"
                  onClick={handleSubmit}
                  disabled={!isSubmitEnabled || isSubmitting || submitted}
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

      {/* Focus Loss Warning Modal - removed as per requirement */}
    </div>
  );
};

export default AssessmentTaking;
