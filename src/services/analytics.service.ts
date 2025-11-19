import axios from 'axios';
import AuthService from './auth.service';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class AnalyticsService {
  private getAuthHeaders() {
    const token = AuthService.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get student analytics data
   */
  async getStudentAnalytics(): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/analytics/students`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting student analytics:', error);
      throw new Error(error.response?.data?.message || 'Failed to retrieve analytics');
    }
  }

  /**
   * Get department statistics
   */
  async getDepartmentStats(): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/analytics/departments`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting department stats:', error);
      throw new Error(error.response?.data?.message || 'Failed to retrieve department stats');
    }
  }

  /**
   * Get assessment analytics
   */
  async getAssessmentAnalytics(): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/analytics/assessments`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting assessment analytics:', error);
      throw new Error(error.response?.data?.message || 'Failed to retrieve assessment analytics');
    }
  }
}

export default new AnalyticsService();
