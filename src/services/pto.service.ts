import axios from 'axios';

const API_BASE_URL = '/api/pto';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const email = localStorage.getItem('userEmail');
  if (email) (config.headers as any)['X-User-Email'] = email;
  return config;
});

export interface PTOStats {
  totalStudents: number;
  totalDepartments: number;
  totalAssessments: number;
  activeAssessments: number;
  departmentPerformance: Array<{ code: string; name: string; students: number; avgScore: number; completed: number }>;
  upcomingTests: any[];
  ongoingTests: any[];
}

export interface Department {
  id: string;
  name: string;
  code: string;
  students: number;
  staff: number;
  assessments: number;
  staffMembers: string[];
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  department?: string;
  permissions: string[];
  firstName?: string;
  lastName?: string;
}

export interface Assessment {
  id: string;
  name: string;
  department: string;
  type: 'department-wise' | 'college-wide';
  duration: number;
  date: string;
  timeWindow: { start?: string; end?: string };
  attempts: number;
  questions: number;
  status: 'active' | 'inactive' | 'scheduled';
}

export interface AssessmentCreatePayload {
  name: string;
  department: string;
  type: 'department-wise' | 'college-wide';
  duration: number;
  date: string;
  timeWindow?: { start?: string; end?: string };
  attempts: number;
  questions?: any[];
}

class PTOService {
  async getDashboard(): Promise<PTOStats> {
    const res = await api.get('/dashboard');
    return res.data.data;
  }

  async getDepartments(): Promise<Department[]> {
    const res = await api.get('/departments');
    return res.data.data;
  }

  async getDepartmentCatalog(): Promise<string[]> {
    const res = await api.get('/departments/catalog');
    return res.data.data;
  }

  async createDepartment(payload: { name: string; code: string }): Promise<Department> {
    const res = await api.post('/departments', payload);
    return res.data.data;
  }

  async updateDepartment(code: string, updates: Partial<Department>): Promise<Department> {
    const res = await api.put(`/departments/${encodeURIComponent(code)}`, updates);
    return res.data.data;
  }

  async deleteDepartment(code: string): Promise<void> {
    await api.delete(`/departments/${encodeURIComponent(code)}`);
  }

  async getStaff(): Promise<StaffMember[]> {
    const res = await api.get('/staff');
    return res.data.data;
  }

  async createStaff(payload: Partial<StaffMember> & { firstName?: string; lastName?: string }): Promise<StaffMember> {
    const res = await api.post('/staff', payload);
    return res.data.data;
  }

  async updateStaff(id: string, updates: Partial<StaffMember>): Promise<StaffMember> {
    const res = await api.put(`/staff/${encodeURIComponent(id)}`, updates);
    return res.data.data;
  }

  async deleteStaff(id: string): Promise<void> {
    await api.delete(`/staff/${encodeURIComponent(id)}`);
  }

  async getAssessments(): Promise<Assessment[]> {
    const res = await api.get('/assessments');
    return res.data.data;
  }

  async createAssessment(payload: AssessmentCreatePayload): Promise<Assessment> {
    const res = await api.post('/assessments', payload);
    return res.data.data;
  }

  async updateAssessment(id: string, updates: Partial<Assessment>): Promise<Assessment> {
    const res = await api.put(`/assessments/${encodeURIComponent(id)}`, updates);
    return res.data.data;
  }

  async deleteAssessment(id: string): Promise<void> {
    await api.delete(`/assessments/${encodeURIComponent(id)}`);
  }

  async getStudents(): Promise<Array<{ id: string; name: string; rollNumber?: string; department: string; email: string; testsParticipated: number; avgScore: number }>> {
    const res = await api.get('/students');
    return res.data.data;
  }
  async assignStaffToDepartment(code: string, staffId: string): Promise<void> {
    await api.post(`/departments/${encodeURIComponent(code)}/assign-staff`, { staffId });
  }

  async unassignStaffFromDepartment(code: string, staffId: string): Promise<void> {
    await api.post(`/departments/${encodeURIComponent(code)}/unassign-staff`, { staffId });
  }
}

export default new PTOService();