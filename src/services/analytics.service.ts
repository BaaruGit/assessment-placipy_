import axios from 'axios';
import AuthService from './auth.service';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

if (!API_BASE_URL) {
  throw new Error('API base URL is missing');
}

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
      console.error('Error response:', error.response);
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
      console.error('Error response:', error.response);
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
      console.error('Error response:', error.response);
      throw new Error(error.response?.data?.message || 'Failed to retrieve assessment analytics');
    }
  }

  /**
   * Get PTS overview analytics
   */
  async getPTSOverview(): Promise<any> {
    try {
      console.log('Making request to PTS overview endpoint');
      const response = await axios.get(
        `${API_BASE_URL}/analytics/pts-overview`,
        { headers: this.getAuthHeaders() }
      );
      console.log('Received response from PTS overview endpoint:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error getting PTS overview:', error);
      console.error('Error response:', error.response);
      console.error('Error request:', error.request);
      throw new Error(error.response?.data?.message || error.message || 'Failed to retrieve PTS overview');
    }
  }
}

export default new AnalyticsService();