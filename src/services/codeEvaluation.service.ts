import axios from 'axios';
import AuthService from './auth.service';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class CodeEvaluationService {
  private getAuthHeaders() {
    const token = AuthService.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Evaluate student code against test cases using Judge0
   * @param assessmentId - The assessment ID
   * @param questionId - The question ID
   * @param code - The student's code
   * @param language - The programming language
   * @returns Evaluation results
   */
  async evaluateCode(assessmentId: string, questionId: string, code: string, language: string): Promise<any> {
    try {
      console.log('=== Evaluating Code ===');
      console.log('API Base URL:', API_BASE_URL);
      console.log('Assessment ID:', assessmentId);
      console.log('Question ID:', questionId);
      console.log('Language:', language);
      console.log('Code length:', code.length);

      const headers = this.getAuthHeaders();
      console.log('Request headers:', headers);

      const response = await axios.post(
        `${API_BASE_URL}/code-evaluation/evaluate`,
        {
          assessmentId,
          questionId,
          code,
          language
        },
        { headers }
      );

      console.log('Code evaluation response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error evaluating code:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || 'Failed to evaluate code');
    }
  }
}

export default new CodeEvaluationService();