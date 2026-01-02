import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_URL || 'http://localhost:3000'}/api`;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface College {
  id: string;
  name: string;
  domain: string;
  location?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Officer {
  id: string;
  name: string;
  email: string;
  role: 'Placement Training Officer' | 'Placement Training Staff' | 'Administrator';
  department?: string;
  phone?: string;
  collegeId: string;
  collegeName?: string;
  permissions: string[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStats {
  totalColleges: number;
  totalOfficers: number;
  totalStudents: number;
  activeAssessments: number;
  totalAssessments: number;
  topColleges: Array<{
    name: string;
    domain: string;
    students: number;
    assessments: number;
    completedAssessments: number;
  }>;
  recentActivity: any[];
}

class AdminService {
  // Dashboard Methods
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await api.get('/admin/dashboard/stats');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalColleges: 0,
        totalOfficers: 0,
        totalStudents: 0,
        activeAssessments: 0,
        totalAssessments: 0,
        topColleges: [],
        recentActivity: []
      };
    }
  }

  // College Management Methods
  async getColleges(): Promise<College[]> {
    try {
      const response = await api.get('/admin/colleges');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching colleges:', error);
      throw error;
    }
  }

  async createCollege(collegeData: Partial<College>): Promise<College> {
    try {
      const response = await api.post('/admin/colleges', collegeData);
      return response.data.data;
    } catch (error) {
      console.error('Error creating college:', error);
      throw error;
    }
  }

  async updateCollege(collegeId: string, updates: Partial<College>): Promise<College> {
    try {
      const response = await api.put(`/admin/colleges/${encodeURIComponent(collegeId)}`, updates);
      return response.data.data;
    } catch (error) {
      console.error('Error updating college:', error);
      throw error;
    }
  }

  async deleteCollege(collegeId: string): Promise<void> {
    try {
      await api.delete(`/admin/colleges/${encodeURIComponent(collegeId)}`);
    } catch (error) {
      console.error('Error deleting college:', error);
      throw error;
    }
  }

  async getCollegeById(collegeId: string): Promise<College> {
    try {
      const response = await api.get(`/admin/colleges/${encodeURIComponent(collegeId)}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching college:', error);
      throw error;
    }
  }

  // Officer Management Methods
  async getOfficers(filters?: { collegeId?: string; role?: string; status?: string }): Promise<Officer[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.collegeId) params.append('collegeId', filters.collegeId);
      if (filters?.role) params.append('role', filters.role);
      if (filters?.status) params.append('status', filters.status);
      
      const response = await api.get(`/admin/officers?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching officers:', error);
      throw error;
    }
  }

  async createOfficer(officerData: Partial<Officer>): Promise<Officer & { authInfo?: { defaultPassword: string | null; instructions: string; note: string; cognitoStatus?: boolean } }> {
    try {
      const response = await api.post('/admin/officers', officerData);
      
      // Return both officer data and auth info if present
      return {
        ...response.data.data,
        authInfo: response.data.authInfo
      };
    } catch (error) {
      console.error('Error creating officer:', error);
      throw error;
    }
  }

  async updateOfficer(officerId: string, updates: Partial<Officer>): Promise<Officer> {
    try {
      const response = await api.put(`/admin/officers/${encodeURIComponent(officerId)}`, updates);
      return response.data.data;
    } catch (error) {
      console.error('Error updating officer:', error);
      throw error;
    }
  }

  async deleteOfficer(officerId: string): Promise<void> {
    try {
      await api.delete(`/admin/officers/${encodeURIComponent(officerId)}`);
    } catch (error) {
      console.error('Error deleting officer:', error);
      throw error;
    }
  }

  // Department Methods
  async getDepartments(collegeId?: string): Promise<any[]> {
    try {
      const params = collegeId ? `?collegeId=${collegeId}` : '';
      const response = await api.get(`/admin/departments${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  }

  // Assessment Methods
  async getAssessments(filters?: { status?: string; collegeId?: string }): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.collegeId) params.append('collegeId', filters.collegeId);
      
      const response = await api.get(`/admin/assessments?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching assessments:', error);
      throw error;
    }
  }

  // Reports Methods
  async getPerformanceReport(filters?: { startDate?: string; endDate?: string; collegeId?: string }): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.collegeId) params.append('collegeId', filters.collegeId);
      
      const response = await api.get(`/admin/reports/performance?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching performance report:', error);
      throw error;
    }
  }

  async getCollegeReports(): Promise<any[]> {
    try {
      const response = await api.get('/admin/reports/colleges');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching college reports:', error);
      throw error;
    }
  }

  // Settings Methods
  async getSettings(): Promise<any> {
    try {
      const response = await api.get('/admin/settings');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  async updateSettings(settings: any): Promise<any> {
    try {
      const response = await api.put('/admin/settings', settings);
      return response.data.data;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  // Admin Profile Methods
  async getAdminProfile(): Promise<any> {
    try {
      const response = await api.get('/admin/profile');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      throw error;
    }
  }

  async updateAdminProfile(profileData: any): Promise<any> {
    try {
      const response = await api.put('/admin/profile', profileData);
      return response.data.data;
    } catch (error) {
      console.error('Error updating admin profile:', error);
      throw error;
    }
  }

  // Analytics Methods
  async getAssessmentResults(): Promise<any[]> {
    try {
      const response = await api.get('/admin/analytics/assessment-results');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching assessment results:', error);
      throw error;
    }
  }

  async getPerformanceOverview(): Promise<any> {
    try {
      const response = await api.get('/admin/analytics/performance-overview');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching performance overview:', error);
      throw error;
    }
  }

  async getAssessmentStats(assessmentId: string): Promise<any> {
    try {
      const response = await api.get(`/admin/analytics/assessment-stats/${assessmentId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching assessment stats:', error);
      throw error;
    }
  }

  async getDepartmentPerformance(): Promise<any[]> {
    try {
      const response = await api.get('/admin/analytics/department-performance');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching department performance:', error);
      throw error;
    }
  }

  // Utility Methods
  async testConnection(): Promise<boolean> {
    try {
      const response = await api.get('/admin/dashboard/stats');
      return response.status === 200;
    } catch (error) {
      console.error('Admin service connection test failed:', error);
      return false;
    }
  }
}

export default new AdminService();
