import axios from 'axios';
import AuthService from './auth.service';

const API_BASE_URL = import.meta.env.VITE_URL || 'http://localhost:3000';

class AssessmentService {
  private getAuthHeaders() {
    const token = AuthService.getAccessToken();
    console.log('Using auth token:', token ? 'Bearer ***' : 'No token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async createAssessment(assessmentData: any): Promise<any> {
    try {
      console.log('=== Creating Assessment ===');
      console.log('API Base URL:', API_BASE_URL);
      console.log('Assessment Data:', JSON.stringify(assessmentData, null, 2));
      
      const headers = this.getAuthHeaders();
      console.log('Request headers:', headers);
      
      const response = await axios.post(
        `${API_BASE_URL}/api/assessments`,
        assessmentData,
        { headers }
      );
      console.log('Assessment creation response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating assessment:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || 'Failed to create assessment');
    }
  }

  async getAllAssessments(filters?: any): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (filters?.department) params.append('department', filters.department);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.lastKey) params.append('lastKey', filters.lastKey);

      const response = await axios.get(
        `${API_BASE_URL}/api/assessments?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting assessments:', error);
      throw new Error(error.response?.data?.message || 'Failed to retrieve assessments');
    }
  }

  async getAssessmentById(assessmentId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/assessments/${assessmentId}`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting assessment:', error);
      throw new Error(error.response?.data?.message || 'Failed to retrieve assessment');
    }
  }

  async getAssessmentQuestions(assessmentId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/assessments/${assessmentId}/questions`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting assessment questions:', error);
      throw new Error(error.response?.data?.message || 'Failed to retrieve assessment questions');
    }
  }

  /**
   * Get assessment with questions combined
   */
  async getAssessmentWithQuestions(assessmentId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/assessments/${assessmentId}/with-questions`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting assessment with questions:', error);
      throw new Error(error.response?.data?.message || 'Failed to retrieve assessment with questions');
    }
  }

  async updateAssessment(assessmentId: string, updates: any): Promise<any> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/assessments/${assessmentId}`,
        updates,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error updating assessment:', error);
      throw new Error(error.response?.data?.message || 'Failed to update assessment');
    }
  }

  async deleteAssessment(assessmentId: string): Promise<any> {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/assessments/${assessmentId}`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error deleting assessment:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete assessment');
    }
  }

  async exportAssessmentsToCSV(filters: any = {}): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);
      
      const response = await axios.get(
        `${API_BASE_URL}/api/assessments/export/csv?${params.toString()}`,
        { 
          headers: this.getAuthHeaders(),
          responseType: 'blob'
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Error exporting assessments to CSV:', error);
      throw new Error(error.response?.data?.message || 'Failed to export assessments to CSV');
    }
  }

  async importAssessmentsFromCSV(rows: any[]): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/assessments/import/csv`,
        { rows },
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Error importing assessments from CSV:', error);
      throw new Error(error.response?.data?.message || 'Failed to import assessments from CSV');
    }
  }
  
  async getAssessmentsByOwner(): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/assessments/my-assessments`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting assessments by owner:', error);
      throw new Error(error.response?.data?.message || 'Failed to retrieve assessments');
    }
  }
}

export default new AssessmentService();