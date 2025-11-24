import axios from 'axios';
import AuthService from './auth.service';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class ProfileService {
  private getAuthHeaders() {
    const token = AuthService.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Update user profile information
   */
  async updateProfile(profileData: any): Promise<any> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/users/profile`,
        profileData,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: any): Promise<any> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/users/profile/preferences`,
        preferences,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      throw new Error(error.response?.data?.message || 'Failed to update preferences');
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/users/profile/preferences`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting preferences:', error);
      throw new Error(error.response?.data?.message || 'Failed to get preferences');
    }
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(settings: any): Promise<any> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/users/profile/security`,
        settings,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error updating security settings:', error);
      throw new Error(error.response?.data?.message || 'Failed to update security settings');
    }
  }

  async updateProfilePicture(profilePictureUrl: string): Promise<any> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/users/profile/picture`,
        { profilePictureUrl },
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update profile picture');
    }
  }

  /**
   * Get security settings
   */
  async getSecuritySettings(): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/users/profile/security`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting security settings:', error);
      throw new Error(error.response?.data?.message || 'Failed to get security settings');
    }
  }
}

export default new ProfileService();
