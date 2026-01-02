import axios from 'axios';
import AuthService from './auth.service';

const API_BASE_URL = import.meta.env.VITE_URL || 'http://localhost:3000';

class StudentAssessmentService {
  private getAuthHeaders() {
    const token = AuthService.getAccessToken();
    console.log('Using auth token:', token ? 'Bearer ***' : 'No token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get all assessments for student with proper error handling
   */
  async getAllAssessments(filters?: any): Promise<any> {
    try {
      const params = new URLSearchParams();
      const token = AuthService.getAccessToken();
      const userProfile = token ? await AuthService.getUserProfile(token) : null;
      const userEmail = userProfile?.email;
      const clientDomain = userEmail ? userEmail.split('@')[1] : undefined;

      if (clientDomain) params.append('clientDomain', clientDomain);
      if (filters?.department) params.append('department', filters.department);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.lastKey) params.append('lastKey', filters.lastKey);

      const url = `${API_BASE_URL}/api/assessments?${params.toString()}`;
      console.log('Fetching all assessments from:', url);
      
      const response = await axios.get(url, { headers: this.getAuthHeaders() });
      console.log('All Assessment response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error getting assessments:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle network errors specifically
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to the server. Please make sure the backend is running.');
      }
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      
      // Handle server errors
      if (error.response?.status === 500) {
        throw new Error('Server error occurred. Please try again later.');
      }
      
      throw new Error(error.response?.data?.message || 'Failed to retrieve assessments');
    }
  }

  /**
   * Get a specific assessment by ID
   */
  async getAssessmentById(assessmentId: string, department?: string): Promise<any> {
    try {
      if (!assessmentId) {
        throw new Error('Assessment ID is required');
      }

      const params = new URLSearchParams();
      const token = AuthService.getAccessToken();
      const userProfile = token ? await AuthService.getUserProfile(token) : null;
      const userEmail = userProfile?.email;
      const clientDomain = userEmail ? userEmail.split('@')[1] : undefined;

      if (clientDomain) params.append('clientDomain', clientDomain);
      if (department) params.append('department', department);

      const url = `${API_BASE_URL}/api/assessments/${assessmentId}?${params.toString()}`;
      console.log('Fetching assessment by ID from:', url);
      
      const response = await axios.get(
        url,
        { headers: this.getAuthHeaders() }
      );
      console.log('Assessment by ID response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error getting assessment:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Assessment not found. Please check if the assessment exists and you have access to it.');
      }
      
      throw new Error(error.response?.data?.message || 'Failed to retrieve assessment');
    }
  }

  /**
   * Get questions for a specific assessment
   */
  async getAssessmentQuestions(assessmentId: string): Promise<any> {
    try {
      if (!assessmentId) {
        throw new Error('Assessment ID is required');
      }
      
      const response = await axios.get(
        `${API_BASE_URL}/api/assessments/${assessmentId}/questions`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting assessment questions:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Assessment not found. Please check if the assessment exists and you have access to it.');
      }
      
      throw new Error(error.response?.data?.message || 'Failed to retrieve assessment questions');
    }
  }

  /**
   * Get assessment with questions combined - NEW ENDPOINT
   */
  async getAssessmentWithQuestions(assessmentId: string): Promise<any> {
    try {
      if (!assessmentId) {
        throw new Error('Assessment ID is required');
      }
      
      console.log(`Fetching assessment with questions: ${assessmentId}`);
      const response = await axios.get(
        `${API_BASE_URL}/api/student-assessments/${assessmentId}/with-questions`,
        { headers: this.getAuthHeaders() }
      );
      console.log('Assessment with questions response:', response.data);
      
      // Process the response to ensure test cases are properly formatted
      if (response.data.success && response.data.data) {
        const { assessment, questions } = response.data.data;
        
        // Process questions to ensure test cases are properly formatted for coding questions
        const processedQuestions = questions.map((question: any) => {
          if (question.entityType === 'coding') {
            // Handle cases where testCases might be missing or empty
            let formattedTestCases = [];
            
            if (question.testCases && Array.isArray(question.testCases) && question.testCases.length > 0) {
              // Ensure test cases have the correct structure for the frontend
              formattedTestCases = question.testCases.map((tc: any) => {
                // Handle different possible formats
                const input = tc.input ?? (tc.inputs ? tc.inputs.input : '') ?? '';
                const expectedOutput = tc.expectedOutput ?? '';
                
                return {
                  input,
                  expectedOutput
                };
              });
            }
            
            return {
              ...question,
              testCases: formattedTestCases
            };
          }
          return question;
        });
        
        // Return flattened data structure expected by the frontend component
        return {
          success: true,
          data: {
            ...assessment,
            questions: processedQuestions,
            // Flatten the assessment object to ensure all properties are at the top level
            ...Object.fromEntries(Object.entries(assessment).filter(([key]) => 
              !["questions"].includes(key)))
          }
        };
      }      
      return response.data;
    } catch (error: any) {
      console.error('Error getting assessment with questions:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.status === 404) {
        throw new Error('Assessment not found. Please check if the assessment exists and you have access to it.');
      }
      
      throw new Error(error.response?.data?.message || 'Failed to retrieve assessment with questions');
    }
  }
}

export default new StudentAssessmentService();