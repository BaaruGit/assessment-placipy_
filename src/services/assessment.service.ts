import axios from 'axios';
import AuthService from './auth.service';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class AssessmentService {
  private getAuthHeaders() {
    const token = AuthService.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async createAssessment(assessmentData: any): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/assessments`,
        assessmentData,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error creating assessment:', error);
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
        `${API_BASE_URL}/assessments?${params.toString()}`,
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
        `${API_BASE_URL}/assessments/${assessmentId}`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting assessment:', error);
      throw new Error(error.response?.data?.message || 'Failed to retrieve assessment');
    }
  }

  async updateAssessment(assessmentId: string, updates: any): Promise<any> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/assessments/${assessmentId}`,
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
        `${API_BASE_URL}/assessments/${assessmentId}`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error deleting assessment:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete assessment');
    }
  }
}

export default new AssessmentService();
