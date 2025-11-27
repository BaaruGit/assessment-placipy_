import axios from 'axios';

interface TestCase {
  input: string;
  expectedOutput: string;
  marks: number;
}

interface Judge0Submission {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
}

interface Judge0Response {
  stdout: string;
  stderr: string;
  compile_output: string;
  message: string;
  status: {
    id: number;
    description: string;
  };
}

class Judge0Service {
  private readonly JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
  private readonly API_HOST = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';
  private readonly API_KEY = process.env.JUDGE0_API_KEY || '';
  
  private readonly languageIds: Record<string, number> = {
    'python': 71,
    'javascript': 63,
    'java': 62,
    'cpp': 54,
    'c': 50
  };

  /**
   * Execute code against test cases using Judge0 API
   */
  async executeCodeWithTestCases(sourceCode: string, language: string, testCases: TestCase[]): Promise<any> {
    try {
      const languageId = this.languageIds[language.toLowerCase()] || 63; // Default to JavaScript
      const results = [];
      let totalMarks = 0;
      let obtainedMarks = 0;

      // Run each test case
      for (const testCase of testCases) {
        totalMarks += testCase.marks;
        
        const submission: Judge0Submission = {
          source_code: sourceCode,
          language_id: languageId,
          stdin: testCase.input,
          expected_output: testCase.expectedOutput.trim()
        };

        // Submit code to Judge0
        const submissionResponse = await axios.post(`${this.JUDGE0_API_URL}/submissions/?base64_encoded=false&wait=true`, submission, {
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': this.API_KEY,
            'X-RapidAPI-Host': this.API_HOST
          }
        });

        const result: Judge0Response = submissionResponse.data;
        
        // Check if test case passed
        const passed = result.status.id === 3 && // Accepted status
                      result.stdout && 
                      result.stdout.trim() === testCase.expectedOutput.trim();
        
        if (passed) {
          obtainedMarks += testCase.marks;
        }
        
        results.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: result.stdout || '',
          passed: passed,
          status: result.status.description,
          marks: testCase.marks,
          obtainedMarks: passed ? testCase.marks : 0
        });
      }

      const accuracy = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;

      return {
        testCases: results,
        totalMarks: totalMarks,
        obtainedMarks: obtainedMarks,
        accuracy: Math.round(accuracy * 100) / 100,
        passedCount: results.filter(r => r.passed).length,
        totalCount: results.length
      };
    } catch (error) {
      console.error('Judge0 execution error:', error);
      throw new Error('Failed to execute code with Judge0');
    }
  }

  /**
   * Get language ID by language name
   */
  getLanguageId(language: string): number {
    return this.languageIds[language.toLowerCase()] || 63; // Default to JavaScript
  }
}

export default new Judge0Service();