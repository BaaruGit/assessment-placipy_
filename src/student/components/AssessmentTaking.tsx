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
  console.log('=== AssessmentTaking Component Rendered ===');

  // Helper function to convert UTC date to Asia/Kolkata time
  const convertToIndiaTime = (date: Date): Date => {
    // India Standard Time is UTC+5:30
    return new Date(date.getTime() + (date.getTimezoneOffset() * 60000) + (5.5 * 3600000));
  };

  // Get assessmentId from URL params
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();

  // Fetch student profile to get roll number
  useEffect(() => {
    const fetchStudentProfile = async () => {
      if (user?.email) {
        try {
          // const profile = await getStudentByEmail(user.email);
          // setStudentProfile(profile); // Commenting out as studentProfile is not used
        } catch (error) {
          console.error('Error fetching student profile:', error);
        }
      }
    };

    fetchStudentProfile();
  }, [user?.email]);

  // State for assessment data
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for tabs
  const [activeTab, setActiveTab] = useState<'mcq' | 'coding'>('mcq');
  // State for tracking focus loss (replaces tab switch count)
  const [focusLossCount, setFocusLossCount] = useState<number>(0);
  // State for focus loss warnings
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string>('');

  // Updated handleTabChange function (no longer tracks tab switches)
  const handleTabChange = (newTab: 'mcq' | 'coding') => {
    // Simply change the active tab without counting as a focus loss
    setActiveTab(newTab);
  };

  // Fullscreen toggle function
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      // Enter fullscreen mode
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      // Exit fullscreen mode
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Other component logic...

  // State for timer
  const [timeLeft, setTimeLeft] = useState<number>(0); // Start with 0, will be set by assessment config


  // State for MCQ section
  const [currentMCQIndex, setCurrentMCQIndex] = useState<number>(0);
  const [mcqAnswers, setMcqAnswers] = useState<{ [key: string]: number }>({});

  // State for coding section
  const [currentCodingIndex, setCurrentCodingIndex] = useState<number>(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('select');
  const [code, setCode] = useState<{ [key: string]: { [key: string]: string } }>({});
  const [executionResult, setExecutionResult] = useState<{ [key: string]: SubmissionResult }>({});
  const [testCaseResults, setTestCaseResults] = useState<{ [key: string]: { passed: boolean, actualOutput: string, expectedOutput: string, input: string }[] }>({});
  // const [allTestCasesPassed, setAllTestCasesPassed] = useState<boolean>(false); // Commenting out unused state // Commenting out unused state
  // State to track which coding challenges have been successfully executed without errors
  const [successfulExecutions, setSuccessfulExecutions] = useState<Record<string, boolean>>({});
  const [isAutoRunEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // State for assessment completion
  // // const [isAssessmentCompleted, setIsAssessmentCompleted] = useState<boolean>(false); // Commenting out unused state // Commenting out unused state
  const [submitted, setSubmitted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // State for showing language selection alert
  const [showLanguageAlert, setShowLanguageAlert] = useState<boolean>(false);
  // State for showing submit button after 20 minutes (keeping for compatibility)
  const [showSubmitButton, setShowSubmitButton] = useState<boolean>(false);

  // State for fullscreen mode
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // State for sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Submit button is now always enabled

  // Debug log for showSubmitButton state changes
  useEffect(() => {
    console.log('showSubmitButton state changed:', showSubmitButton);
  }, [showSubmitButton]);


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
  // // const [showTestCases, setShowTestCases] = useState<boolean>(false); // Commenting out unused state // Commenting out unused state

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);
  const autoRunTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedData = useRef(false); // To prevent multiple API calls
  const isLeavingRef = useRef<boolean>(false); // To track if user is leaving the page
  const hasFocusedRef = useRef<boolean>(false); // To track if user has focused on the page
  const isSubmittingRef = useRef<boolean>(false); // To track if we're submitting
  const focusListenersAttachedRef = useRef<boolean>(false); // To track if focus listeners are attached
  const focusLossTimeoutRef = useRef<NodeJS.Timeout | null>(null); // To debounce focus loss events

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
      const mcqAnswersArray: Array<{ questionId: string; selected: string[]; isCorrect: boolean }> = [];
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
      const codingAnswersArray: Array<{ questionId: string; selected: string[]; isCorrect: boolean }> = [];
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
    } catch (error: unknown) {
      console.error('Error saving assessment result:', error);

      setIsSubmitting(false);
      setSubmitted(false);

      // Provide more specific error messages
      let errorMessage = 'Assessment completed but there was an error saving your results.';

      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response?: { data?: { message?: string; error?: string }; status?: number } };
        const serverMessage = errorResponse.response?.data?.message || errorResponse.response?.data?.error || 'Unknown server error';
        errorMessage = `Error: ${serverMessage}`;

        if (errorResponse.response?.status === 401) {
          errorMessage = 'Your session has expired. Please log in again to save your results.';
        } else if (errorResponse.response?.status === 404) {
          errorMessage = 'API endpoint not found. Please check if backend server is running.';
        } else if (errorResponse.response?.status === 500) {
          errorMessage = `Server error: ${serverMessage}. Please check backend logs.`;
        }
      } else if (error && typeof error === 'object' && 'request' in error) {
        // Request was made but no response received
        errorMessage = 'Cannot connect to server. Please check:\n1. Backend server is running on port 3000\n2. Your internet connection\n3. Check browser console for details';
      } else if (error && typeof error === 'object' && 'message' in error && (error.message as string)?.includes('Network Error') || (error && typeof error === 'object' && 'code' in error && (error.code as string) === 'ERR_NETWORK')) {
        errorMessage = 'Network error. Please check:\n1. Backend server is running\n2. CORS is configured correctly\n3. Check browser console for details';
      } else {
        const errorObj = error as { message?: string };
        errorMessage = `Error: ${errorObj.message || 'Unknown error occurred'}`;
      }

      console.error('Final error message:', errorMessage);
      alert(errorMessage);
    }
  }, [assessmentData, assessmentId, code, codingChallenges, isSubmitting, mcqAnswers, mcqQuestions, navigate, selectedLanguage, submitted, successfulExecutions, timeLeft, user]);

  // Handle focus loss event with warning system
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

    // Clear any existing timeout to prevent duplicate counting
    if (focusLossTimeoutRef.current) {
      clearTimeout(focusLossTimeoutRef.current);
    }

    // Use a timeout to debounce and ensure only one focus loss is counted per tab switch
    focusLossTimeoutRef.current = setTimeout(() => {
      // Increment the focus loss count
      const newCount = focusLossCount + 1;
      console.log('New focus loss count:', newCount);
      setFocusLossCount(newCount);

      // Show warning for first 4 times, auto-submit on 5th time
      if (newCount <= 4) {
        const remainingWarnings = 5 - newCount;
        const message = `Warning! You have switched tabs ${newCount} time(s). ${remainingWarnings} more warning(s) remaining before auto-submission. Please stay on the assessment tab.`;
        setWarningMessage(message);
        setShowWarningModal(true);
      } else if (newCount === 5) {
        // Auto-submit on 5th focus loss
        const message = 'You have switched tabs 5 times. Your assessment will be auto-submitted now.';
        setWarningMessage(message);
        setShowWarningModal(true);
        
        // Auto-submit after showing the message
        setTimeout(() => {
          handleSubmit();
        }, 2000);
      }

      console.log('=== End Focus Loss Event ===');
    }, 100); // 100ms debounce to prevent duplicate counting
  }, [focusLossCount, handleSubmit]);

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

    // Disable copy, and paste functionality (but allow right-click)
    const handleCopy = (e: ClipboardEvent) => {
      console.log('Copy prevented');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    const handlePaste = (e: ClipboardEvent) => {
      console.log('Paste prevented');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    const handleCut = (e: ClipboardEvent) => {
      console.log('Cut prevented');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    const handleSelectStart = (e: Event) => {
      console.log('Select start prevented');
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleDragStart = (e: DragEvent) => {
      console.log('Drag start prevented');
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Disable keyboard shortcuts for copy, paste, cut, select all
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+A (select all)
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Prevent Ctrl+C (copy)
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Prevent Ctrl+V (paste)
      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Prevent Ctrl+X (cut)
      if (e.ctrlKey && e.key === 'x') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Prevent Ctrl+U (view source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Prevent F12 (developer tools)
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Prevent Ctrl+Shift+I (developer tools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Prevent Ctrl+Shift+J (developer tools)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Prevent Ctrl+Shift+C (developer tools)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
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

    const handleBeforeUnload = () => {
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

    // Add copy/paste prevention event listeners (but allow right-click)
    console.log('Adding copy/paste prevention event listeners');
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);

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
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Clean up focus loss timeout
      if (focusLossTimeoutRef.current) {
        clearTimeout(focusLossTimeoutRef.current);
      }
      
      // Mark listeners as detached
      focusListenersAttachedRef.current = false;
      console.log('Finished cleaning up event listeners');
      console.log('=== Focus Loss Detection Effect Unmounted ===');
    };
  }, [assessmentData, submitted, handleFocusLoss]);

  
  // Get current challenge safely
  const currentChallenge = codingChallenges[currentCodingIndex];

  // Preprocess React code to make it runnable in a Node.js environment
  const preprocessReactCode = (code: string): string => {
    if (!code.trim()) return code;

    // Simple approach: Remove JSX syntax and extract JavaScript logic
    try {
      // Remove comments first
      const cleanCode = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

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

    } catch {
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

      // Always run test cases first if they exist, then run with custom/example input
      if (currentChallenge.testCases && currentChallenge.testCases.length > 0) {
        // Run all test cases
        await runTestCases(currentCode);

        // After running test cases, also run with example input if requested
        if (inputType !== 'test') {
          let input = '';
          if (inputType === 'example' && currentChallenge.examples && currentChallenge.examples[0]) {
            input = currentChallenge.examples[0].input;
          }

          // Execute code using Judge0 service for additional output
          const result = await judge0Service.executeCode(currentCode, selectedLanguage, input);

          setExecutionResult(prev => ({
            ...prev,
            [currentChallenge.questionId]: {
              ...prev[currentChallenge.questionId],
              exampleOutput: result.stdout || '',
              exampleError: result.stderr || result.compile_output || ''
            }
          }));
        }
      } else {
        // No test cases, run with specified input type
        let input = '';
        if (inputType === 'example' && currentChallenge.examples && currentChallenge.examples[0]) {
          input = currentChallenge.examples[0].input;
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
  }, [currentChallenge, code, selectedLanguage]);

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
          const processedInput = testCase.input;

          // For Python and JavaScript, convert array string to actual array if needed
          if ((selectedLanguage === 'python' || selectedLanguage === 'javascript') &&
            testCase.input.startsWith('[') && testCase.input.endsWith(']')) {
            // Input is already in correct format for these languages
          }

          const result = await judge0Service.executeCode(codeToTest, selectedLanguage, processedInput);

          // Check for compilation errors first
          if (result.compile_output) {
            // If there's a compilation error, show it in the actual output
            results.push({
              passed: false,
              actualOutput: `❌ Compilation Error:\n${result.compile_output}`,
              expectedOutput: testCase.expectedOutput,
              input: testCase.input
            });
            continue; // Skip to next test case
          }

          // Check for runtime errors
          if (result.stderr) {
            results.push({
              passed: false,
              actualOutput: `❌ Runtime Error:\n${result.stderr}`,
              expectedOutput: testCase.expectedOutput,
              input: testCase.input
            });
            continue; // Skip to next test case
          }

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


      // Mark as successful execution if no compilation or runtime errors
      setSuccessfulExecutions(prev => ({
        ...prev,
        [currentChallenge.questionId]: true
      }));

      // Show result in execution panel
      setExecutionResult(prev => ({
        ...prev,
        [currentChallenge.questionId]: {
          status: { id: results.every(result => result.passed) ? 3 : 4, description: results.every(result => result.passed) ? 'All Tests Passed' : 'Some Tests Failed' },
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

            // Also set the assessment as started if there's no scheduling (for backward compatibility)
            if (!assessmentDataFormatted.scheduling || !assessmentDataFormatted.scheduling.startDate) {
              setIsAssessmentStarted(true);
              console.log('Assessment started automatically (no scheduling)');
            }
          } else {
            console.log('Setting default timeLeft: 3600 seconds (60 minutes)');
            setTimeLeft(3600); // Default to 60 minutes

            // Also set the assessment as started if there's no scheduling (for backward compatibility)
            if (!assessmentDataFormatted.scheduling || !assessmentDataFormatted.scheduling.startDate) {
              setIsAssessmentStarted(true);
              console.log('Assessment started automatically with default time');
            }
          }
          setLoading(false);
        } else {
          throw new Error(response.message || 'Failed to fetch assessment data');
        }
      } catch (error: unknown) {
        console.error('Error fetching assessment data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load assessment. Please try again.';
        setError(errorMessage);
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
    { id: 'select', name: 'Select Language' },
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
      setCode(prevCode => {
        const newCode = { ...prevCode };
        let hasChanges = false;

        codingChallenges.forEach(challenge => {
          if (challenge.questionId && !newCode[challenge.questionId]) {
            newCode[challenge.questionId] = {};
            languages.forEach(lang => {
              // Use starter code if available, otherwise empty string
              newCode[challenge.questionId][lang.id] = challenge.starterCode || '';
            });
            hasChanges = true;
          }
        });

        // Only update state if there are new challenges to initialize
        return hasChanges ? newCode : prevCode; // Return new state if changes, otherwise previous
      });

      setTestCaseResults(prevResults => {
        const newResults = { ...prevResults };
        let updated = false;

        codingChallenges.forEach(challenge => {
          if (challenge.questionId && !newResults[challenge.questionId]) {
            // Initialize empty test case results
            newResults[challenge.questionId] = [];
            updated = true;
          }
        });

        return updated ? newResults : prevResults;
      });
    }
  }, [codingChallenges]); // Removed languages from dependency to prevent unnecessary re-renders

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

    // Don't start timer if timeLeft is 0 or negative
    if (timeLeft <= 0) {
      console.log('Not starting timer - timeLeft is 0 or negative');
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
        // Handle invalid time values
        if (isNaN(prev) || prev <= 0) {
          console.log('Invalid time value in timer tick:', prev);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }

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
  }, [assessmentData, isAssessmentStarted, isAssessmentEnded, submitted, handleSubmit, serverTime]); // Added serverTime to fix exhaustive-deps warning

  // Add useEffect to periodically sync with server time
  useEffect(() => {
    const syncTime = async () => {
      try {
        // In a real implementation, you would call an API endpoint to get server time
        // For now, we'll use client time but in production you should sync with server
        setServerTime(new Date());
      } catch (error) {
        console.warn('Could not sync with server time, using client time', error);
        setServerTime(new Date());
      }
    };

    // Sync immediately
    syncTime();

    // Sync every 5 minutes
    const interval = setInterval(syncTime, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Effect to ensure timer display updates consistently
  useEffect(() => {
    if (timeLeft <= 0 && timerRef.current) {
      // Clear timer when time is up
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [timeLeft]);

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
      const startDate = new Date(assessmentData.scheduling.startDate);
      const endDate = new Date(assessmentData.scheduling.endDate);

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
        console.log('Assessment has ended - showing ended state without auto-submit');
        if (!isAssessmentEnded) {
          setIsAssessmentEnded(true);
          setTimeLeft(0);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // Do NOT auto-submit for ended assessments - they should only appear in completed tab
          // Only auto-submit if timer runs out during an active assessment session
        }
        return;
      }

      // Assessment should be active now (with 1 second tolerance)
      // Check if assessment has started and timer needs to be initialized
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
      // For assessments without scheduling, ensure they start automatically
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

  }, [assessmentData, loading, isAssessmentStarted, isAssessmentEnded, serverTime, handleSubmit, submitted]);  // Dependencies kept for proper assessment timing

  // Separate effect to handle timer initialization when assessment starts
  useEffect(() => {
    if (isAssessmentStarted && assessmentData && timeLeft === 0 && assessmentData.configuration?.duration && !submitted) {
      // Initialize timer when assessment starts but timeLeft is still 0
      const durationMinutes = assessmentData.configuration.duration;
      const durationSeconds = durationMinutes * 60;
      console.log('Initializing timer after assessment started:', durationMinutes, 'minutes =', durationSeconds, 'seconds');
      setTimeLeft(durationSeconds);
    }
  }, [isAssessmentStarted, assessmentData, timeLeft, submitted]);

  // Format time for display
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) {
      console.log('Invalid time value received:', seconds);
      return '00:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    console.log('Formatting time:', { seconds, mins, secs, formattedTime });
    return formattedTime;
  };

  // Force re-render timer display every second to ensure it stays up to date
  const [, forceUpdate] = React.useState({});
  useEffect(() => {
    const timerDisplayInterval = setInterval(() => {
      // Force a re-render to update the timer display
      forceUpdate({});
    }, 1000);

    return () => {
      clearInterval(timerDisplayInterval);
    };
  }, []);


  // Format assessment ID to remove prefix and add custom format
  const formatAssessmentId = (id: string): string => {
    if (!id) return 'Assessment';
    // Extract the number from various prefixes like ASSESS_IT_, ASSESS_CE_, etc.
    const match = id.match(/ASSESS_[A-Z]+_(\d+)/);
    if (match) {
      // Return in format 'Assessment -X' where X is the extracted number
      return `Assessment -${parseInt(match[1])}`;
    }
    // Fallback: if no match, just return the original ID
    return id;
  };

  // Handle MCQ answer selection
  const handleMCQAnswerSelect = (optionIndex: number) => {
    console.log('MCQ Answer Selected:', {
      optionIndex,
      currentQuestionId: mcqQuestions[currentMCQIndex]?.questionId,
      currentQuestion: mcqQuestions[currentMCQIndex]
    });

    const questionId = mcqQuestions[currentMCQIndex]?.questionId;
    if (!questionId) {
      return;
    }

    setMcqAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
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

    // Check if language is not selected
    if (selectedLanguage === 'select') {
      setShowLanguageAlert(true);
      // Hide the alert after 3 seconds
      setTimeout(() => {
        setShowLanguageAlert(false);
      }, 3000);
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

  // Check if assessment has started
  if (assessmentData.scheduling) {
    const now = serverTime || new Date();
    // Parse dates - they're already in ISO format with timezone info
    const startDate = new Date(assessmentData.scheduling.startDate);
    const endDate = new Date(assessmentData.scheduling.endDate);

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
      console.log('Assessment has ended - showing ended state without auto-submit');
      return (
        <div className="st-assessment-taking-container">
          <div className="st-info-container">
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
      <div className="st-assessment-taking-container">
        <div className="st-error-container">
          <h2>No Questions Available</h2>
          <p>This assessment does not contain any questions yet.</p>
          <button
            onClick={() => window.location.reload()}
            className="st-retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="st-dashboard-content">
      {/* Header */}
      <div className="st-assessment-header">
        <div className="st-header-left">
          <div className="st-assessment-title">
            {assessmentData ? assessmentData.title : 'Assessment'}
          </div>
        </div>

        <div className="st-timer-section">
          {timeLeft !== null && (
            <span className={`st-timer ${timeLeft < 300 ? 'warning' : ''}`}>
              {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>

        <div className="st-header-controls">
          <button
            className="st-fullscreen-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="st-header-section-buttons">
        <button
          className={`st-section-btn ${activeTab === 'mcq' ? 'active' : ''}`}
          onClick={() => setActiveTab('mcq')}
        >
          Technical ({mcqQuestions.length})
        </button>
        <button
          className={`st-section-btn ${activeTab === 'coding' ? 'active' : ''}`}
          onClick={() => setActiveTab('coding')}
        >
          Coding ({codingChallenges.length})
        </button>
      </div>

      {/* Main Content (Split View with Sidebar) */}
      <div className="st-main-content">

        {/* MCQ Section Content */}
        {activeTab === 'mcq' && (
          <div className="st-question-container">
            <div className="st-question-content">
              <div className="st-question-text">
                <span style={{ color: '#6B7280', fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>
                  Question {currentMCQIndex + 1} of {mcqQuestions.length}
                </span>
                {mcqQuestions[currentMCQIndex]?.question}
              </div>

              <div className="st-options-container">
                {mcqQuestions[currentMCQIndex]?.options.map((option: MCQOption | string, index: number) => {
                  const questionId = mcqQuestions[currentMCQIndex]?.questionId;
                  const isSelected = questionId ? mcqAnswers[questionId] === index : false;

                  return (
                    <div
                      key={index}
                      className={`st-option-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => !submitted && questionId && handleMCQAnswerSelect(index)}
                    >
                      <div className="st-radio-button">
                        {isSelected && <div className="st-radio-button-inner" />}
                      </div>
                      <span className="st-option-text">
                        {typeof option === 'string' ? option : option.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Coding Section Content */}
        {activeTab === 'coding' && (
          <div className="st-coding-section">
            {/* Left: Problem & Test Cases */}
            <div className="st-problem-section">
              <div className="st-coding-header">
                <h2 className="st-challenge-title">
                  {codingChallenges[currentCodingIndex]?.question || 'Coding Problem'}
                </h2>
              </div>

                   <div className="st-coding-content-scrollable">
                <div className="st-problem-description">
                  {codingChallenges[currentCodingIndex]?.question}
                </div>

                    {codingChallenges[currentCodingIndex]?.examples && codingChallenges[currentCodingIndex].examples.length > 0 && (
                  <div className="st-examples">
                    <span className="st-example-label">Examples</span>
                    {codingChallenges[currentCodingIndex].examples!.map((ex, idx) => (
                      <div key={idx} className="st-example-item">
                        <div style={{ marginBottom: '4px' }}><strong>Input:</strong> {ex.input}</div>
                        <div><strong>Output:</strong> {ex.output}</div>
                      </div>              ))}
                  </div>
                )}

                {/* Test Cases Section */}
                {codingChallenges[currentCodingIndex]?.testCases && codingChallenges[currentCodingIndex]?.testCases.length > 0 && (
                  <div className="st-test-cases-section">
                    <span className="st-test-case-header">Test Cases</span>
                    <div className="st-test-cases-container">
                      {codingChallenges[currentCodingIndex]?.testCases.map((testCase, index) => (
                        <div key={index} className="st-test-case-item">
                          <div className="st-test-case-header">
                            <span className="st-test-case-number">Test Case {index + 1}</span>
                          </div>
                          <div className="st-test-case-content">
                            {testCase.description && (
                              <div className="st-test-case-description">
                                <strong>Description:</strong>
                                <pre className="st-test-case-preformatted">{testCase.description}</pre>
                              </div>
                            )}
                            <div className="st-test-case-input">
                              <strong>Input:</strong>
                              <pre className="st-test-case-preformatted">{testCase.input}</pre>
                            </div>
                            <div className="st-test-case-output">
                              <strong>Expected Output:</strong>
                              <pre className="st-test-case-preformatted">{testCase.expectedOutput}</pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Editor & Output */}
            <div className="st-right-column">
              <div className="st-editor-section">
                <div className="st-editor-header">
                  <div style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>main.{selectedLanguage === 'python' ? 'py' : selectedLanguage === 'java' ? 'java' : selectedLanguage === 'cpp' ? 'cpp' : 'js'}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      className="st-language-selector"
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                    >
                      {languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <button className="st-run-btn" style={{ padding: '4px 12px', minWidth: 'auto', fontSize: '0.85rem' }} onClick={() => runCode('custom')} disabled={isLoading}>
                      {isLoading ? 'Running...' : 'Run'}
                    </button>
                    <button className="st-run-btn" style={{ padding: '4px 12px', minWidth: 'auto', fontSize: '0.85rem', background: '#10B981' }} onClick={() => runCode('test')} disabled={isLoading}>
                      Submit Code
                    </button>
                  </div>
                </div>
                <textarea
                  ref={codeEditorRef}
                  className="st-code-editor"
                  value={code[codingChallenges[currentCodingIndex]?.questionId]?.[selectedLanguage] || ''}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  spellCheck={false}
                />
                
                {/* Language Selection Alert */}
                {showLanguageAlert && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#EF4444',
                    color: 'white',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    animation: 'slideIn 0.3s ease-out'
                  }}>
                    ⚠️ Please select a programming language before editing the code
                  </div>
                )}
              </div>

              {/* Execution Output */}
              <div className="st-output-section">
                <div className="st-result-header">Console / Output</div>
                <div className="st-result-content">
                  {executionResult[codingChallenges[currentCodingIndex]?.questionId]?.compile_output && (
                    <div style={{ color: '#EF4444', marginBottom: '10px' }}>
                      <strong>Compilation Error:</strong>
                      <pre style={{ background: 'transparent', padding: 0, color: '#FCA5A5' }}>{executionResult[codingChallenges[currentCodingIndex]?.questionId]?.compile_output}</pre>
                    </div>
                  )}
                  {executionResult[codingChallenges[currentCodingIndex]?.questionId]?.stderr && (
                    <div style={{ color: '#EF4444', marginBottom: '10px' }}>
                      <strong>Runtime Error:</strong>
                      <pre style={{ background: 'transparent', padding: 0, color: '#FCA5A5' }}>{executionResult[codingChallenges[currentCodingIndex]?.questionId]?.stderr}</pre>
                    </div>
                  )}

                  {testCaseResults[codingChallenges[currentCodingIndex]?.questionId] && (
                    <div>
                      <div style={{ marginBottom: '8px', color: '#10B981' }}>
                        {testCaseResults[codingChallenges[currentCodingIndex]?.questionId].filter(t => t.passed).length} / {testCaseResults[codingChallenges[currentCodingIndex]?.questionId].length} Tests Passed
                      </div>
                      {testCaseResults[codingChallenges[currentCodingIndex]?.questionId].map((res, i) => (
                        <div key={i} style={{ marginBottom: '8px', padding: '8px', background: '#252526', borderRadius: '4px', borderLeft: res.passed ? '3px solid #10B981' : '3px solid #EF4444' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#E5E7EB' }}>Test {i + 1}</span>
                            <span style={{ color: res.passed ? '#10B981' : '#EF4444' }}>{res.passed ? 'PASS' : 'FAIL'}</span>
                          </div>
                          <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#9CA3AF' }}>
                            <div><strong>Input:</strong> {res.input}</div>
                            <div><strong>Expected:</strong> {res.expectedOutput}</div>
                            <div><strong>Actual:</strong> {res.actualOutput}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {executionResult[codingChallenges[currentCodingIndex]?.questionId]?.exampleOutput && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #333' }}>
                      <strong style={{ display: 'block', marginBottom: '8px', color: '#E5E7EB' }}>Output:</strong>
                      <pre style={{ background: 'transparent', padding: 0 }}>{executionResult[codingChallenges[currentCodingIndex]?.questionId]?.exampleOutput}</pre>
                    </div>
                  )}

                  {executionResult[codingChallenges[currentCodingIndex]?.questionId]?.stdout &&
                    !testCaseResults[codingChallenges[currentCodingIndex]?.questionId] &&
                    !executionResult[codingChallenges[currentCodingIndex]?.questionId]?.exampleOutput && (
                      <pre style={{ background: 'transparent', padding: 0 }}>{executionResult[codingChallenges[currentCodingIndex]?.questionId]?.stdout}</pre>
                    )}

                  {!executionResult[codingChallenges[currentCodingIndex]?.questionId]?.compile_output &&
                    !executionResult[codingChallenges[currentCodingIndex]?.questionId]?.stderr &&
                    !testCaseResults[codingChallenges[currentCodingIndex]?.questionId] &&
                    !executionResult[codingChallenges[currentCodingIndex]?.questionId]?.exampleOutput &&
                    !executionResult[codingChallenges[currentCodingIndex]?.questionId]?.stdout && (
                      <div style={{ color: '#6B7280', fontStyle: 'italic' }}>Run code to see output...</div>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Question Palette Sidebar */}
        <div className={`st-sidebar-wrapper ${!isSidebarOpen ? 'closed' : ''}`} style={{ position: 'relative' }}>
          <button
            className="st-sidebar-toggle-btn"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            )}
          </button>

          <div className="st-sidebar-header-content">
            <div className="st-sidebar-assessment-title">Question Palette</div>
            <div className="st-sidebar-section-info">
              {activeTab === 'mcq' ? 'Technical Section' : 'Coding Section'}
            </div>
          </div>
          <div className="st-questions-grid">
            {activeTab === 'mcq' ? (
              mcqQuestions.map((q, idx) => {
                const isAnswered = mcqAnswers[q.questionId] !== undefined;
                const isCurrent = currentMCQIndex === idx;
                return (
                  <div
                    key={q.questionId}
                    className={`st-question-circle ${isAnswered ? 'answered' : ''} ${isCurrent ? 'current' : ''}`}
                    onClick={() => setCurrentMCQIndex(idx)}
                  >
                    {idx + 1}
                  </div>
                );
              })
            ) : (
              codingChallenges.map((q, idx) => {
                const hasCode = (code[q.questionId]?.[selectedLanguage] || '').length > 0;
                const isCurrent = currentCodingIndex === idx;
                return (
                  <div
                    key={q.questionId}
                    className={`st-question-circle ${hasCode ? 'answered' : ''} ${isCurrent ? 'current' : ''}`}
                    onClick={() => setCurrentCodingIndex(idx)}
                  >
                    {idx + 1}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="st-navigation-container">
        <div className="st-navigation-buttons">
          {activeTab === 'mcq' ? (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="st-nav-btn prev"
                onClick={() => setCurrentMCQIndex(prev => Math.max(0, prev - 1))}
                disabled={currentMCQIndex === 0}
              >
                Previous
              </button>
              <button
                className="st-clear-response-btn"
                onClick={() => {
                  const qId = mcqQuestions[currentMCQIndex]?.questionId;
                  if (qId) {
                    const newAns = { ...mcqAnswers };
                    delete newAns[qId];
                    setMcqAnswers(newAns);
                  }
                }}
              >
                Clear
              </button>
            </div>
          ) : (
            <button
              className="st-nav-btn prev"
              onClick={() => setCurrentCodingIndex(prev => Math.max(0, prev - 1))}
              disabled={currentCodingIndex === 0}
            >
              Previous
            </button>
          )}

          {activeTab === 'mcq' ? (
            <button
              className="st-nav-btn next"
              onClick={() => setCurrentMCQIndex(prev => Math.min(mcqQuestions.length - 1, prev + 1))}
              disabled={currentMCQIndex === mcqQuestions.length - 1}
            >
              Next
            </button>
          ) : (
            <button
              className="st-nav-btn next"
              onClick={() => setCurrentCodingIndex(prev => Math.min(codingChallenges.length - 1, prev + 1))}
              disabled={currentCodingIndex === codingChallenges.length - 1}
            >
              Next
            </button>
          )}

          <button
            className="st-submit-btn small"
            onClick={handleSubmit}
            disabled={isSubmitting || submitted}
          >
            {isSubmitting ? 'Submitting...' : 'Finish Test'}
          </button>
        </div>
      </div>

       {/* Warning Modal for Tab Switching */}
      {showWarningModal && (
      <div style={{
          position: 'fixed',
         top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
           borderRadius: '8px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
            color: '#F59E0B'
            }}>
              ⚠️
            </div>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#1F2937',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Tab Switching Detected
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              color: '#6B7280',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              {warningMessage}
            </p>
            <button
              onClick={() => setShowWarningModal(false)}
              style={{
                backgroundColor: '#3B82F6',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => {
              //  e.currentTarget.style.backgroundColor = '#2563EB';
              }}
              onMouseOut={(e) => {
              //  e.currentTarget.style.backgroundColor = '#3B82F6';
              }}
            >
              I Understand
            </button>
        </div>
        </div>
      )}

    </div>
  );
};

export default AssessmentTaking;
