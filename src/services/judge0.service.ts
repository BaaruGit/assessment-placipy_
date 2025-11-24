import axios from 'axios';

// Judge0 API base URL
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_HOST = import.meta.env.VITE_JUDGE0_HOST || 'judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = import.meta.env.VITE_JUDGE0_API_KEY || 'YOUR_RAPIDAPI_KEY_HERE';

// Log environment variables for debugging
console.log('Environment variables:', {
  VITE_JUDGE0_HOST: import.meta.env.VITE_JUDGE0_HOST,
  VITE_JUDGE0_API_KEY: import.meta.env.VITE_JUDGE0_API_KEY ? '***REDACTED***' : undefined,
  JUDGE0_API_HOST,
  JUDGE0_API_KEY
});

// Language IDs for Judge0
const LANGUAGE_IDS: { [key: string]: number } = {
  'javascript': 63,
  'python': 71,
  'java': 62,
  'c': 50,
  'cpp': 54,
  'csharp': 51,
  'php': 68,
  'ruby': 72,
  'go': 60,
  'rust': 73
};

// Submission interface
export interface Submission {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
}

// Submission result interface
export interface SubmissionResult {
  status: {
    id: number;
    description: string;
  };
  stdout: string;
  stderr: string;
  compile_output: string;
  message: string;
  time: string;
  memory: number;
}

class Judge0Service {
  private apiClient;

  constructor() {
    console.log('Judge0 API Configuration:', {
      url: JUDGE0_API_URL,
      host: JUDGE0_API_HOST,
      key: JUDGE0_API_KEY ? '***REDACTED***' : 'MISSING'
    });
    
    this.apiClient = axios.create({
      baseURL: JUDGE0_API_URL,
      headers: {
        'X-RapidAPI-Key': JUDGE0_API_KEY,
        'X-RapidAPI-Host': JUDGE0_API_HOST,
        'Content-Type': 'application/json'
      }
    });
    
    // Test the API connection (only in development, not in production to save quota)
    // this.testApiConnection();
  }
  
  private rateLimited = false;
  
  async testApiConnection() {
    // If we know we're rate limited, skip the test
    if (this.rateLimited) {
      console.log('Skipping API test due to known rate limiting');
      return;
    }
    
    try {
      console.log('Testing Judge0 API connection...');
      const response = await this.apiClient.get('/languages');
      console.log('Available languages:', response.data);
      
      // Test submitting a simple JavaScript code (commented out to save quota)
      /*
      console.log('Testing code submission...');
      const testSubmission: Submission = {
        source_code: 'console.log("Hello, World!");',
        language_id: 63, // JavaScript
        stdin: ''
      };
      
      const token = await this.createSubmission(testSubmission);
      console.log('Test submission token:', token);
      
      // Get the result
      const result = await this.getSubmission(token);
      console.log('Test submission result:', result);
      */
    } catch (error: any) {
      console.error('Failed to connect to Judge0 API:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        // If it's a rate limit error, don't retry the test
        if (error.response.status === 429) {
          console.log('Skipping API test due to rate limiting');
          this.rateLimited = true;
          return;
        }
      }
    }
  }

  /**
   * Get language ID by language name
   * @param language Language name
   * @returns Language ID
   */
  getLanguageId(language: string): number {
    const languageId = LANGUAGE_IDS[language] || 63; // Default to JavaScript
    console.log(`Language mapping: ${language} -> ${languageId}`);
    console.log('Available languages:', LANGUAGE_IDS);
    return languageId;
  }

  /**
   * Submit code for execution
   * @param submission Submission data
   * @returns Token for checking submission status
   */
  async createSubmission(submission: Submission): Promise<string> {
    // If we know we're rate limited, don't even try
    if (this.rateLimited) {
      throw new Error('Rate limit exceeded. Please wait before submitting more requests.');
    }
    
    try {
      console.log('Creating submission:', submission);
      const response = await this.apiClient.post('/submissions', submission, {
        params: {
          base64_encoded: 'false',
          fields: '*'
        }
      });
      
      console.log('Submission response:', response.data);
      console.log('Response headers:', response.headers);
      
      // Check rate limit headers
      const rateLimitRemaining = response.headers['x-ratelimit-remaining'];
      const rateLimitReset = response.headers['x-ratelimit-reset'];
      
      if (rateLimitRemaining !== undefined && parseInt(rateLimitRemaining) < 5) {
        console.warn(`Low rate limit remaining: ${rateLimitRemaining}`);
        // You might want to warn the user or implement backoff logic
      }
      
      return response.data.token;
    } catch (error: any) {
      console.error('Error creating submission:', error.response?.data || error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        // Log the full error for debugging
        console.error('Full error object:', JSON.stringify(error, null, 2));
        
        // Handle rate limiting (429)
        if (error.response.status === 429) {
          const resetTime = error.response.headers['x-ratelimit-reset'];
          console.warn('Rate limit exceeded. Reset time:', resetTime);
          this.rateLimited = true;
          
          // Try to parse the reset time and wait if possible
          if (resetTime) {
            const resetTimestamp = parseInt(resetTime) * 1000; // Convert to milliseconds
            const currentTime = Date.now();
            const waitTime = Math.max(0, resetTimestamp - currentTime);
            
            if (waitTime > 0) {
              console.log(`Waiting ${waitTime}ms for rate limit to reset...`);
              // Note: We can't actually wait here in the service because it would block,
              // but we can inform the caller about the wait time needed
            }
          }
          
          throw new Error('Rate limit exceeded. Please wait before submitting more requests.');
        }
      }
      throw new Error('Failed to submit code for execution');
    }
  }

  /**
   * Get submission result by token
   * @param token Submission token
   * @returns Submission result
   */
  async getSubmission(token: string): Promise<SubmissionResult> {
    try {
      console.log('Getting submission:', token);
      const response = await this.apiClient.get(`/submissions/${token}`, {
        params: {
          base64_encoded: 'false',
          fields: '*'
        }
      });
      
      console.log('Submission result:', response.data);
      console.log('Response headers:', response.headers);
      return response.data;
    } catch (error: any) {
      console.error('Error getting submission:', error.response?.data || error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
      throw new Error('Failed to get submission result');
    }
  }

  /**
   * Execute code and get result
   * @param sourceCode Source code to execute
   * @param language Language name
   * @param stdin Input for the program
   * @returns Execution result
   */
  async executeCode(sourceCode: string, language: string, stdin?: string, retryCount = 0): Promise<SubmissionResult> {
    // Check if API key is configured
    if (!JUDGE0_API_KEY || JUDGE0_API_KEY === 'YOUR_RAPIDAPI_KEY_HERE') {
      throw new Error('Judge0 API key is not configured. Please set the VITE_JUDGE0_API_KEY environment variable.');
    }
    
    try {
      const languageId = this.getLanguageId(language);
      console.log(`Executing code with language: ${language} (ID: ${languageId})`);
      
      // Create submission
      const submission: Submission = {
        source_code: sourceCode,
        language_id: languageId,
        stdin: stdin
      };

      console.log('Submission payload:', submission);
      const token = await this.createSubmission(submission);
      console.log('Submission token:', token);

      // Poll for result (max 10 attempts with 500ms delay)
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        const result = await this.getSubmission(token);
        console.log(`Attempt ${attempts + 1}:`, result);
        
        // If execution is finished (status.id > 2 means finished)
        if (result.status.id > 2) {
          console.log('Execution completed:', result);
          return result;
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      throw new Error('Code execution timed out');
    } catch (error: any) {
      console.error('Error executing code:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
      
      // Handle rate limiting specifically
      if (error.message.includes('rate limit') && retryCount < 2) {
        // Wait for 5 seconds and retry
        console.log(`Rate limit hit, waiting 5 seconds before retry ${retryCount + 1}/2`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.executeCode(sourceCode, language, stdin, retryCount + 1);
      } else if (error.message.includes('rate limit')) {
        throw new Error('Rate limit exceeded. Please wait before submitting more requests.');
      } else if (error.message.includes('API key')) {
        throw new Error('Judge0 API key is not configured properly. Please check your environment variables.');
      }
      
      // Re-throw with more context
      throw new Error(`Failed to execute code: ${error.message}`);
    }
  }
}

// Export singleton instance
const judge0Service = new Judge0Service();
export default judge0Service;