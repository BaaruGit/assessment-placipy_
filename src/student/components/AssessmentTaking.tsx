import React, { useState, useEffect, useRef } from 'react';
import './AssessmentTaking.css';
import judge0Service, { type SubmissionResult } from '../../services/judge0.service';

interface MCQQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface TestCase {
  input: string;
  expectedOutput: string;
  description?: string;
}

interface CodingChallenge {
  id: number;
  title: string;
  description: string;
  examples: { input: string; output: string }[];
  testCases: TestCase[];
}

const AssessmentTaking: React.FC = () => {
  console.log('AssessmentTaking component rendering');
  console.log('Initial state - currentCodingIndex:', 0, 'selectedLanguage:', 'javascript');
  
  // State for tabs
  const [activeTab, setActiveTab] = useState<'mcq' | 'coding'>('mcq');
  
  // State for showing language selection alert
  const [showLanguageAlert, setShowLanguageAlert] = useState<boolean>(true);
  
  // State for timer
  const [timeLeft, setTimeLeft] = useState<number>(60 * 60); // 60 minutes in seconds
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  // State for MCQ section
  const [currentMCQIndex, setCurrentMCQIndex] = useState<number>(0);
  const [mcqAnswers, setMcqAnswers] = useState<{[key: number]: number}>({});
  
  // State for coding section
  const [currentCodingIndex, setCurrentCodingIndex] = useState<number>(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');
  const [code, setCode] = useState<{[key: number]: {[key: string]: string}}>({});
  const [executionResult, setExecutionResult] = useState<{[key: number]: SubmissionResult}>({});
  const [testCaseResults, setTestCaseResults] = useState<{[key: number]: {passed: boolean, actualOutput: string, expectedOutput: string, input: string}[]}>({});
  const [allTestCasesPassed, setAllTestCasesPassed] = useState<boolean>(false);
  const [isAutoRunEnabled, setIsAutoRunEnabled] = useState<boolean>(false); // Disable auto-run by default
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>('');
  
  // State for assessment completion
  const [isAssessmentCompleted, setIsAssessmentCompleted] = useState<boolean>(false);
  

  
  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);
  const autoRunTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debug effect to monitor component mount/unmount
  useEffect(() => {
    console.log('AssessmentTaking component mounted');
    return () => {
      console.log('AssessmentTaking component unmounting');
    };
  }, []);
  
  // MCQ Questions (20 predefined questions)
  const mcqQuestions: MCQQuestion[] = [
    {
      id: 1,
      question: "What is the output of the following code: console.log(typeof null);",
      options: ["null", "object", "undefined", "boolean"],
      correctAnswer: 1
    },
    {
      id: 2,
      question: "Which method is used to add an element to the end of an array in JavaScript?",
      options: ["push()", "pop()", "shift()", "unshift()"],
      correctAnswer: 0
    },
    {
      id: 3,
      question: "What does CSS stand for?",
      options: ["Colorful Style Sheets", "Creative Style Sheets", "Cascading Style Sheets", "Computer Style Sheets"],
      correctAnswer: 2
    },
    {
      id: 4,
      question: "Which HTML tag is used to define an internal style sheet?",
      options: ["<script>", "<style>", "<css>", "<link>"],
      correctAnswer: 1
    },
    {
      id: 5,
      question: "In Python, which keyword is used to define a function?",
      options: ["function", "def", "func", "define"],
      correctAnswer: 1
    },
    {
      id: 6,
      question: "What is the correct way to declare a variable in Java?",
      options: ["var name = value;", "let name = value;", "String name = value;", "variable name = value;"],
      correctAnswer: 2
    },
    {
      id: 7,
      question: "Which of the following is not a valid Python data type?",
      options: ["List", "Dictionary", "Tuple", "Class"],
      correctAnswer: 3
    },
    {
      id: 8,
      question: "What is the purpose of the 'this' keyword in JavaScript?",
      options: [
        "Refers to the parent object",
        "Refers to the current object",
        "Refers to the global object",
        "Refers to the previous object"
      ],
      correctAnswer: 1
    },
    {
      id: 9,
      question: "Which CSS property is used to change the text color of an element?",
      options: ["font-color", "text-color", "color", "foreground-color"],
      correctAnswer: 2
    },
    {
      id: 10,
      question: "In HTML, which attribute is used to specify that an input field must be filled out?",
      options: ["required", "validate", "mandatory", "important"],
      correctAnswer: 0
    },
    {
      id: 11,
      question: "What is the correct syntax for referring to an external script called 'xxx.js'?",
      options: [
        "<script href='xxx.js'>",
        "<script name='xxx.js'>",
        "<script src='xxx.js'>",
        "<script file='xxx.js'>"
      ],
      correctAnswer: 2
    },
    {
      id: 12,
      question: "Which of the following is a server-side JavaScript runtime?",
      options: ["React", "Vue", "Node.js", "Angular"],
      correctAnswer: 2
    },
    {
      id: 13,
      question: "What is the default value of the position property in CSS?",
      options: ["relative", "absolute", "fixed", "static"],
      correctAnswer: 3
    },
    {
      id: 14,
      question: "In Python, which function is used to get the length of a list?",
      options: ["size()", "length()", "len()", "count()"],
      correctAnswer: 2
    },
    {
      id: 15,
      question: "Which of the following is not a JavaScript framework?",
      options: ["React", "Django", "Vue", "Angular"],
      correctAnswer: 1
    },
    {
      id: 16,
      question: "What does the 'alt' attribute in HTML images provide?",
      options: [
        "Alternative text for the image",
        "Alignment of the image",
        "Animation for the image",
        "Altitude of the image"
      ],
      correctAnswer: 0
    },
    {
      id: 17,
      question: "In CSS, which unit is relative to the font-size of the element?",
      options: ["px", "em", "cm", "pt"],
      correctAnswer: 1
    },
    {
      id: 18,
      question: "Which Python keyword is used to create a class?",
      options: ["class", "def", "function", "create"],
      correctAnswer: 0
    },
    {
      id: 19,
      question: "What is the correct way to write a comment in JavaScript?",
      options: [
        "<!-- This is a comment -->",
        "// This is a comment",
        "** This is a comment **",
        "## This is a comment ##"
      ],
      correctAnswer: 1
    },
    {
      id: 20,
      question: "Which HTML element is used to specify a footer for a document or section?",
      options: ["<bottom>", "<footer>", "<section>", "<foot>"],
      correctAnswer: 1
    }
  ];
  
  // Coding Challenges (5 challenges)
  const codingChallenges: CodingChallenge[] = [
    {
      id: 1,
      title: "Reverse a String",
      description: "Write a function that takes a string as input and returns the reversed string.",
      examples: [
        { input: "hello", output: "olleh" },
        { input: "world", output: "dlrow" }
      ],
      testCases: [
        { input: "hello", expectedOutput: "olleh", description: "Basic test case" },
        { input: "world", expectedOutput: "dlrow", description: "Another basic test" }
      ]
    },
    {
      id: 2,
      title: "Find Maximum Number",
      description: "Write a function that takes an array of numbers and returns the maximum number.",
      examples: [
        { input: "[1, 5, 3, 9, 2]", output: "9" },
        { input: "[10, -5, 0, 15, 3]", output: "15" }
      ],
      testCases: [
        { input: "[1, 5, 3, 9, 2]", expectedOutput: "9", description: "Basic test case" },
        { input: "[10, -5, 0, 15, 3]", expectedOutput: "15", description: "With negative numbers" }
      ]
    },
    {
      id: 3,
      title: "Check Palindrome",
      description: "Write a function that checks if a given string is a palindrome (reads the same forwards and backwards).",
      examples: [
        { input: "racecar", output: "true" },
        { input: "hello", output: "false" }
      ],
      testCases: [
        { input: "racecar", expectedOutput: "true", description: "Basic palindrome" },
        { input: "hello", expectedOutput: "false", description: "Not a palindrome" }
      ]
    },
    {
      id: 4,
      title: "Array Sum",
      description: "Write a function that takes an array of numbers and returns the sum of all elements.",
      examples: [
        { input: "[1, 2, 3, 4, 5]", output: "15" },
        { input: "[10, -5, 3]", output: "8" }
      ],
      testCases: [
        { input: "[1, 2, 3, 4, 5]", expectedOutput: "15", description: "Basic test case" },
        { input: "[10, -5, 3]", expectedOutput: "8", description: "With negative numbers" }
      ]
    },
    {
      id: 5,
      title: "FizzBuzz",
      description: "Write a function that prints numbers from 1 to n. For multiples of 3, print 'Fizz' instead of the number. For multiples of 5, print 'Buzz'. For multiples of both 3 and 5, print 'FizzBuzz'.",
      examples: [
        { input: "5", output: "1\n2\nFizz\n4\nBuzz" },
        { input: "15", output: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz" }
      ],
      testCases: [
        { input: "5", expectedOutput: "1\n2\nFizz\n4\nBuzz", description: "Basic FizzBuzz" },
        { input: "3", expectedOutput: "1\n2\nFizz", description: "Only Fizz" }
      ]
    }
  ];
  
  // Languages supported by Judge0
  const languages = [
    { id: 'javascript', name: 'JavaScript' },
    { id: 'python', name: 'Python' },
    { id: 'java', name: 'Java' },
    { id: 'c', name: 'C' },
    { id: 'cpp', name: 'C++' },
    { id: 'csharp', name: 'C#' },
    { id: 'php', name: 'PHP' },
    { id: 'ruby', name: 'Ruby' },
    { id: 'go', name: 'Go' },
    { id: 'rust', name: 'Rust' }
  ];
  
  // Initialize code state for each challenge and language
  useEffect(() => {
    console.log('=== Initializing code state ===');
    const initialCode: {[key: number]: {[key: string]: string}} = {};
    const initialTestCases: {[key: number]: {passed: boolean, actualOutput: string, expectedOutput: string, input: string}[]} = {};
    
    console.log('Coding challenges:', codingChallenges);
    console.log('Languages:', languages);
    
    codingChallenges.forEach(challenge => {
      initialCode[challenge.id] = {};
      languages.forEach(lang => {
        initialCode[challenge.id][lang.id] = '';
      });
      
      // Initialize empty test case results
      initialTestCases[challenge.id] = [];
    });
    
    console.log('Initial code state:', initialCode);
    console.log('Setting initial code state');
    setCode(initialCode);
    setTestCaseResults(initialTestCases);
    console.log('Code state initialization complete');
    
    // Also ensure the first challenge has proper initialization
    setTimeout(() => {
      setCode(prev => {
        if (!prev[0]) {
          return {
            ...prev,
            0: {
              [selectedLanguage]: ''
            }
          };
        }
        return prev;
      });
    }, 100);
  }, []);
  
  // Ensure code state is properly initialized for current challenge and language
  useEffect(() => {
    // Check if code state exists for current challenge and language
    if (code && Object.keys(code).length > 0) {
      if (!code[currentCodingIndex]) {
        console.log('Initializing code for challenge:', currentCodingIndex);
        setCode(prev => ({
          ...prev,
          [currentCodingIndex]: {}
        }));
      } else if (!code[currentCodingIndex][selectedLanguage]) {
        console.log('Initializing code for language:', selectedLanguage);
        setCode(prev => ({
          ...prev,
          [currentCodingIndex]: {
            ...prev[currentCodingIndex],
            [selectedLanguage]: ''
          }
        }));
      }
    }
  }, [code, currentCodingIndex, selectedLanguage]);
  
  // Ensure initial code state is set for the first challenge and language
  useEffect(() => {
    if (code && Object.keys(code).length === 0) {
      console.log('Setting initial code state for first challenge');
      setCode({
        0: {
          [selectedLanguage]: ''
        }
      });
    }
  }, [code, selectedLanguage]);
  
  // Debug effect to check if code state is properly initialized
  useEffect(() => {
    // Check if the current code is undefined
    if (code[currentCodingIndex]?.[selectedLanguage] === undefined) {
      console.log('Warning: Code for current challenge and language is undefined');
    } else {
      console.log('Code for current challenge and language is defined:', code[currentCodingIndex]?.[selectedLanguage]);
    }
    console.log('Current isLoading state:', isLoading);
    console.log('Current code state:', code);
    console.log('Current coding index:', currentCodingIndex);
    console.log('Selected language:', selectedLanguage);
  }, [code, currentCodingIndex, selectedLanguage, isLoading]);
  
  // Debug effect to monitor isLoading state changes
  useEffect(() => {
    console.log('isLoading state changed to:', isLoading);
  }, [isLoading]);
  
  // Debug effect to monitor code state changes
  useEffect(() => {
    console.log('Code state changed:', code);
  }, [code]);
  
  // Debug effect to monitor all state changes
  useEffect(() => {
    console.log('=== State Update ===');
    console.log('isLoading:', isLoading);
    console.log('code:', code);
    console.log('currentCodingIndex:', currentCodingIndex);
    console.log('selectedLanguage:', selectedLanguage);
    console.log('code for current challenge/language:', code?.[currentCodingIndex]?.[selectedLanguage]);
    console.log('====================');
  }, [isLoading, code, currentCodingIndex, selectedLanguage]);
  
  // Safety check to ensure isLoading doesn't get stuck
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.log('Safety check: isLoading was true for too long, resetting to false');
        setIsLoading(false);
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);
  
  // Scroll to bottom of code editor when code changes
  useEffect(() => {
    if (codeEditorRef.current && activeTab === 'coding') {
      // Scroll to bottom of the editor
      const editor = codeEditorRef.current;
      editor.scrollTop = editor.scrollHeight;
    }
  }, [code, currentCodingIndex, selectedLanguage, activeTab]);
  
  // Additional scroll handling when component mounts
  useEffect(() => {
    if (codeEditorRef.current && activeTab === 'coding') {
      // Ensure proper scrolling after component mounts
      setTimeout(() => {
        if (codeEditorRef.current) {
          const editor = codeEditorRef.current;
          editor.scrollTop = editor.scrollHeight;
        }
      }, 100);
    }
  }, [activeTab]);
  
  // Dynamically adjust editor height based on content
  useEffect(() => {
    const adjustEditorHeight = () => {
      if (codeEditorRef.current && code && currentCodingIndex >= 0) {
        const currentCode = code[currentCodingIndex]?.[selectedLanguage] || '';
        const editor = codeEditorRef.current;
        const lines = currentCode.split('\n').length;
        const lineHeight = 22; // Approximate line height in pixels
        const padding = 40; // Top and bottom padding
        const minHeight = 200; // Minimum height
        const maxHeight = 800; // Maximum height
        
        // Calculate new height based on content
        let newHeight = lines * lineHeight + padding;
        
        // Ensure height is within bounds
        newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
        
        // Apply the height
        editor.style.height = `${newHeight}px`;
      }
    };
    
    // Adjust height when code, index, or language changes
    adjustEditorHeight();
    
    // Also adjust height when window is resized
    window.addEventListener('resize', adjustEditorHeight);
    
    // Cleanup event listener
    return () => {
      window.removeEventListener('resize', adjustEditorHeight);
    };
  }, [code, currentCodingIndex, selectedLanguage]);
  
  // Function to manually reset loading state (for emergency use)
  const resetLoadingState = () => {
    console.log('Manually resetting loading state');
    setIsLoading(false);
  };
  
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
    setMcqAnswers(prev => ({
      ...prev,
      [currentMCQIndex]: optionIndex
    }));
  };
  
  // Handle navigation between MCQ questions
  const handleMCQNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentMCQIndex > 0) {
      setCurrentMCQIndex(currentMCQIndex - 1);
    } else if (direction === 'next' && currentMCQIndex < mcqQuestions.length - 1) {
      setCurrentMCQIndex(currentMCQIndex + 1);
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
  const handleCodeChange = (newCode: string) => {
    console.log('handleCodeChange called with:', newCode);
    console.log('Current state - index:', currentCodingIndex, 'language:', selectedLanguage);
    
    // Check if the indices are valid
    if (currentCodingIndex < 0 || currentCodingIndex >= codingChallenges.length) {
      console.log('Invalid coding index:', currentCodingIndex);
      return;
    }
    
    // Ensure we have proper state structure
    setCode(prev => {
      const newState = { ...prev };
      
      // Ensure challenge exists
      if (!newState[currentCodingIndex]) {
        newState[currentCodingIndex] = {};
      }
      
      // Ensure language exists for this challenge
      if (!newState[currentCodingIndex][selectedLanguage]) {
        newState[currentCodingIndex][selectedLanguage] = '';
      }
      
      // Update the code
      newState[currentCodingIndex][selectedLanguage] = newCode;
      
      console.log('Updated code state:', newState);
      return newState;
    });
    
    // Dynamically adjust editor height based on content
    setTimeout(() => {
      if (codeEditorRef.current) {
        const editor = codeEditorRef.current;
        const lines = newCode.split('\n').length;
        const lineHeight = 22; // Approximate line height in pixels
        const padding = 40; // Top and bottom padding
        const minHeight = 200; // Minimum height
        const maxHeight = 800; // Maximum height
        
        // Calculate new height based on content
        let newHeight = lines * lineHeight + padding;
        
        // Ensure height is within bounds
        newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
        
        // Apply the height
        editor.style.height = `${newHeight}px`;
      }
    }, 0);
    
    // Scroll to bottom if content is long
    setTimeout(() => {
      if (codeEditorRef.current) {
        codeEditorRef.current.scrollTop = codeEditorRef.current.scrollHeight;
      }
    }, 10);
    
    // Additional scroll handling for long content
    setTimeout(() => {
      if (codeEditorRef.current) {
        const editor = codeEditorRef.current;
        const lineHeight = parseInt(window.getComputedStyle(editor).lineHeight);
        const lines = newCode.split('\n').length;
        const contentHeight = lines * lineHeight;
        const viewportHeight = editor.clientHeight;
        
        // If content is taller than viewport, scroll to bottom
        if (contentHeight > viewportHeight) {
          editor.scrollTop = editor.scrollHeight;
        }
      }
    }, 50);
    
    // If there was an error previously and user is typing, clear the error
    if (executionResult[currentCodingIndex]?.stderr) {
      setExecutionResult(prev => {
        const newResult = { ...prev };
        delete newResult[currentCodingIndex];
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
        executeCode('example');
      }, 800);
    }
  };
  
  // Handle language selection and dismiss alert
  const handleLanguageSelect = (language: string) => {
    console.log('Language selected:', language);
    setSelectedLanguage(language);
    setShowLanguageAlert(false);
  };

  // Reset alert when switching to coding tab
  useEffect(() => {
    if (activeTab === 'coding') {
      setShowLanguageAlert(true);
    }
  }, [activeTab]);
  
  // Execute code with Judge0 API
  const executeCode = async (inputType: 'example' | 'custom' | 'test' = 'example') => {
    console.log('executeCode called with inputType:', inputType);
    
    // Always reset isLoading to false at the beginning to ensure clean state
    setIsLoading(false);
    
    // Force a small delay to ensure state update
    await new Promise(resolve => setTimeout(resolve, 10));
    
    console.log('Setting isLoading to true');
    setIsLoading(true);
    
    try {
      let currentCode = code[currentCodingIndex]?.[selectedLanguage] || '';
      console.log('Current code to execute:', currentCode);
      
      // Check if code is empty
      if (!currentCode.trim()) {
        console.log('Code is empty, showing error');
        setExecutionResult(prev => ({
          ...prev,
          [currentCodingIndex]: {
            status: { id: 0, description: 'Error' },
            stdout: '',
            stderr: 'Please enter some code before running.',
            compile_output: '',
            message: '',
            time: '',
            memory: 0
          }
        }));
        console.log('Setting isLoading to false (empty code)');
        setIsLoading(false);
        return;
      }
      
      // Preprocess code for specific languages
      if (selectedLanguage === 'java') {
        // Ensure Java class is named 'Main' as required by Judge0
        const originalCode = currentCode;
        currentCode = currentCode.replace(/public\s+class\s+\w+/g, 'public class Main');
        if (originalCode !== currentCode) {
          console.log('Preprocessed Java code: replaced class name');
        }
      } else if (selectedLanguage === 'csharp') {
        // Ensure C# class is named 'Main' as required by Judge0
        const originalCode = currentCode;
        currentCode = currentCode.replace(/public\s+class\s+\w+/g, 'public class Main');
        if (originalCode !== currentCode) {
          console.log('Preprocessed C# code: replaced class name');
        }
      } else if (selectedLanguage === 'python') {
        // For Python, ensure proper indentation and handle common issues
        // No specific preprocessing needed for basic cases
      } else if (selectedLanguage === 'cpp') {
        // For C++, ensure proper includes and main function
        // No specific preprocessing needed for basic cases
      }
      
      // Handle different execution types
      if (inputType === 'test') {
        // Run all test cases
        console.log('Running test cases');
        await runTestCases(currentCode);
      } else {
        // Get input based on input type
        let input = '';
        if (inputType === 'example' && codingChallenges[currentCodingIndex]?.examples[0]) {
          input = codingChallenges[currentCodingIndex].examples[0].input;
        } else if (inputType === 'custom') {
          input = customInput;
        }
        console.log('Executing code with input:', input);
        
        // Execute code using Judge0 service
        const result = await judge0Service.executeCode(currentCode, selectedLanguage, input);
        console.log('Code execution result:', result);
        
        setExecutionResult(prev => ({
          ...prev,
          [currentCodingIndex]: result
        }));
      }
    } catch (error) {
      console.error('Error executing code:', error);
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
        [currentCodingIndex]: {
          status: { id: 0, description: 'Error' },
          stdout: '',
          stderr: errorMessage,
          compile_output: '',
          message: '',
          time: '',
          memory: 0
        }
      }));
    } finally {
      // Ensure isLoading is always set to false when execution is done
      console.log('Setting isLoading to false in finally block');
      setIsLoading(false);
      
      // Add an extra safety check to ensure the state is properly updated
      setTimeout(() => {
        console.log('Double-checking isLoading state:', isLoading);
        if (isLoading) {
          console.log('Forcing isLoading to false as safety measure');
          setIsLoading(false);
        }
      }, 100);
    }
  };
  
  // Utility function for delay
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
  
  // Run all test cases for current challenge
  const runTestCases = async (codeToTest: string) => {
    console.log('Running test cases, setting isLoading to true');
    try {
      const currentChallenge = codingChallenges[currentCodingIndex];
      if (!currentChallenge) return;
      
      const results: {passed: boolean, actualOutput: string, expectedOutput: string, input: string}[] = [];
      
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
          
          console.log('Running test case with:', { codeToTest, selectedLanguage, processedInput });
          const result = await judge0Service.executeCode(codeToTest, selectedLanguage, processedInput);
          console.log('Test case result:', result);
          
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
          console.error('Error running test case:', error);
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
          console.log('Test case error details:', { testCase, errorMessage });
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
        [currentCodingIndex]: results
      }));
      
      // Check if all test cases passed
      const allPassed = results.every(result => result.passed);
      setAllTestCasesPassed(allPassed);
      
      // Show result in execution panel
      setExecutionResult(prev => ({
        ...prev,
        [currentCodingIndex]: {
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
      console.error('Error running test cases:', error);
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
        [currentCodingIndex]: {
          status: { id: 0, description: 'Error' },
          stdout: '',
          stderr: errorMessage,
          compile_output: '',
          message: '',
          time: '',
          memory: 0
        }
      }));
    } finally {
      // Ensure isLoading is always set to false when test cases are done
      console.log('Setting isLoading to false in runTestCases finally block');
      setIsLoading(false);
    }
  };
   
  const handleSubmit = () => {
    if (allTestCasesPassed) {
     
      alert('Assessment submitted successfully! All test cases passed.');
      setIsAssessmentCompleted(true);
      // Notify parent component that assessment is completed
      if (window.parent) {
        window.parent.postMessage({ type: 'ASSESSMENT_COMPLETED' }, '*');
      }
    } else {
      alert('Please ensure all test cases pass before submitting.');
    }
  };
  
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
            className={`section-btn ${activeTab === 'mcq' ? 'active' : ''}`}
            onClick={() => setActiveTab('mcq')}
          >
            MCQ
          </button>
          <button 
            className={`section-btn ${activeTab === 'coding' ? 'active' : ''}`}
            onClick={() => setActiveTab('coding')}
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
                  {mcqQuestions[currentMCQIndex]?.options.map((option, index) => (
                    <div
                      key={index}
                      className="option-item"
                      onClick={() => handleMCQAnswerSelect(index)}
                    >
                      <div className={`radio-button ${mcqAnswers[currentMCQIndex] === index ? 'selected' : ''}`}>
                        {mcqAnswers[currentMCQIndex] === index && <div className="radio-button-inner"></div>}
                      </div>
                      <span className="option-text">{option}</span>
                    </div>
                  ))}
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
              onClick={() => handleMCQNavigation('next')}
              disabled={currentMCQIndex === mcqQuestions.length - 1}
            >
              Save and Next
            </button>
            
            {/* Submit button on right side corner */}
            <button 
              className="submit-btn small right-corner"
              onClick={handleSubmit}
            >
              Submit
            </button>
            
            {/* 6x6 grid on the right side corner */}
            <div className="question-grid-container">
              {mcqQuestions.map((_, index) => (
                <div 
                  key={index}
                  className={`question-number-circle ${mcqAnswers[index] !== undefined ? 'answered' : ''} ${index === currentMCQIndex ? 'current' : ''}`}
                  onClick={() => setCurrentMCQIndex(index)}
                >
                  {index + 1}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="coding-section">
            <div className="coding-header">
              <h2 className="challenge-title">{codingChallenges[currentCodingIndex]?.title}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                  onClick={() => {
                    console.log('Run Code button clicked');
                    console.log('Current state - isLoading:', isLoading);
                    console.log('Current code:', code[currentCodingIndex]?.[selectedLanguage]);
                    executeCode('custom');
                  }}
                  disabled={isLoading || !code || !code[currentCodingIndex] || !code[currentCodingIndex][selectedLanguage] || code[currentCodingIndex][selectedLanguage].trim() === ''}
                >
                  {isLoading ? 'Running...' : 'Run Code'}
                </button>
                {/* Emergency reset button - remove in production */}
                <button 
                  style={{ 
                    backgroundColor: '#ff4444', 
                    color: 'white', 
                    border: 'none', 
                    padding: '5px 10px', 
                    borderRadius: '3px',
                    fontSize: '12px'
                  }}
                  onClick={resetLoadingState}
                >
                  Reset Loading
                </button>
              </div>
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
              <div className="problem-section">
                <div className="problem-description">
                  {codingChallenges[currentCodingIndex]?.description}
                </div>
                
                <div className="examples">
                  <h3>Examples:</h3>
                  {codingChallenges[currentCodingIndex]?.examples.map((example, index) => (
                    <div key={index} className="example-item">
                      <div className="example-label">Example {index + 1}:</div>
                      <div className="example-content">
                        <strong>Input:</strong> {example.input}
                        <br />
                        <strong>Output:</strong> {example.output}
                      </div>
                    </div>
                  ))}
                  <div className="note">
                    <strong>Note for Java:</strong> Class name must be 'Main' for proper execution.
                  </div>
                </div>
              </div>
              
              <div className="right-column">
                <div className="editor-section">
                  <div className="editor-header">
                    <div>Code Editor</div>
                    <div className="editor-controls">
                    </div>
                  </div>
                  <textarea
                    ref={codeEditorRef}
                    className="code-editor"
                    value={code[currentCodingIndex]?.[selectedLanguage] || ''}
                    onChange={(e) => {
                      console.log('Textarea onChange triggered');
                      console.log('New value:', e.target.value);
                      console.log('Event:', e);
                      handleCodeChange(e.target.value);
                    }}
                    onPaste={(e) => {
                      console.log('Textarea onPaste triggered');
                      console.log('Pasted data:', e.clipboardData.getData('text'));
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
                          code[currentCodingIndex]?.[selectedLanguage].substring(0, selectionStart) + 
                          '    ' + 
                          code[currentCodingIndex]?.[selectedLanguage].substring(selectionEnd);
                        
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
                    onScroll={() => {
                      console.log('Textarea scrolled');
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
                
                {/* Output container below the code editor */}
                <div className="output-section">
                  <div className="result-header">Execution Result</div>
                  <div className="result-content">
                    {isLoading ? (
                      <div className="result-loading">
                        <div className="spinner"></div>
                        Executing code...
                      </div>
                    ) : executionResult[currentCodingIndex] ? (
                      <div className="result-output">
                        <strong>Status:</strong> {executionResult[currentCodingIndex]?.status?.description || 'Unknown'}
                        <br />
                        {executionResult[currentCodingIndex]?.stdout ? (
                          <>
                            <strong>Output:</strong>
                            <br />
                            <pre>{executionResult[currentCodingIndex]?.stdout}</pre>
                          </>
                        ) : executionResult[currentCodingIndex]?.compile_output ? (
                          <>
                            <strong>Compilation Error:</strong>
                            <br />
                            <pre className="error-output">{executionResult[currentCodingIndex]?.compile_output}</pre>
                          </>
                        ) : executionResult[currentCodingIndex]?.stderr ? (
                          <>
                            <strong>Runtime Error:</strong>
                            <br />
                            <pre className="error-output">{executionResult[currentCodingIndex]?.stderr}</pre>
                          </>
                        ) : (
                          <>
                            <strong>Output:</strong>
                            <br />
                            No output
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="result-output">
                        Run your code to see the output here.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="navigation-buttons">
              <button 
                className="nav-btn prev"
                onClick={() => handleCodingNavigation('prev')}
                disabled={currentCodingIndex === 0}
              >
                Previous Challenge
              </button>
              <button 
                className="nav-btn next right-corner"
                onClick={() => handleCodingNavigation('next')}
                disabled={currentCodingIndex === codingChallenges.length - 1}
              >
                {currentCodingIndex === codingChallenges.length - 1 ? 'Last Challenge' : 'Next Challenge'}
              </button>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
};

export default AssessmentTaking;