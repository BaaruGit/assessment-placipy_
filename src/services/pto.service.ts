
import axios from 'axios';

const API_BASE_URL = '/api/pto';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const devEmail = localStorage.getItem('ptoDevEmail') || 'pto@ksrce.ac.in';
  (config.headers as any)['X-User-Email'] = devEmail;
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
  active?: boolean;
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

  async activateDepartment(code: string): Promise<void> {
    await api.post(`/departments/${encodeURIComponent(code)}/activate`);
  }

  async deactivateDepartment(code: string): Promise<void> {
    await api.post(`/departments/${encodeURIComponent(code)}/deactivate`);
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

  async exportStaff(): Promise<Blob> {
    const res = await api.get('/staff/export', { responseType: 'blob' });
    return res.data;
  }

  async importStaff(rows: any[]): Promise<{ success: boolean; results: any[] }>{
    const res = await api.post('/staff/import', { rows });
    return res.data;
  }

  async updateStaffPassword(email: string, newPassword: string): Promise<void> {
    await api.post('/staff/password', { email, newPassword });
  }

  async getAssessments(): Promise<Assessment[]> {
    const res = await api.get('/assessments');
    return res.data.data;
  }

  async getAssessment(id: string): Promise<any> {
    const res = await api.get(`/assessments/${encodeURIComponent(id)}`);
    return res.data.data;
  }

  async createAssessment(payload: AssessmentCreatePayload): Promise<Assessment> {
    const res = await api.post('/assessments', payload);
    return res.data.data;
  }

  async updateAssessment(id: string, updates: any): Promise<any> {
    const res = await api.put(`/assessments/${encodeURIComponent(id)}`, updates);
    return res.data.data;
  }

  async deleteAssessment(id: string): Promise<void> {
    await api.delete(`/assessments/${encodeURIComponent(id)}`);
  }

  async enableAssessment(id: string): Promise<void> {
    await api.post(`/assessments/${encodeURIComponent(id)}/enable`);
  }

  async disableAssessment(id: string): Promise<void> {
    await api.post(`/assessments/${encodeURIComponent(id)}/disable`);
  }

  async scheduleAssessment(id: string): Promise<void> {
    await api.post(`/assessments/${encodeURIComponent(id)}/schedule`);
  }

  async getStudents(): Promise<Array<{ id: string; name: string; rollNumber?: string; department: string; email: string; testsParticipated: number; avgScore: number }>> {
    const res = await api.get('/students');
    return res.data.data;
  }
  async updateProfile(payload: { firstName: string; lastName: string; email: string; phone?: string; designation?: string; department?: string }): Promise<any> {
    const res = await api.put('/profile', payload);
    return res.data.data;
  }
  async getProfile(): Promise<any> {
    const res = await api.get('/profile');
    return res.data.data;
  }
  async assignStaffToDepartment(code: string, staffId: string): Promise<void> {
    await api.post(`/departments/${encodeURIComponent(code)}/assign-staff`, { staffId });
  }

  async unassignStaffFromDepartment(code: string, staffId: string): Promise<void> {
    await api.post(`/departments/${encodeURIComponent(code)}/unassign-staff`, { staffId });
  }

  async sendAnnouncement(payload: { title: string; message: string; tags?: string[]; attachments?: { filename: string; contentType: string; data: string }[] }): Promise<any> {
    const res = await api.post('/announcements', payload);
    return res.data.data;
  }

  async listAnnouncements(params?: { limit?: number; nextToken?: any }): Promise<{ items: any[]; nextToken: any }>{
    const qs = new URLSearchParams();
    if (params?.limit) qs.append('limit', String(params.limit));
    if (params?.nextToken) qs.append('nextToken', JSON.stringify(params.nextToken));
    const res = await api.get(`/announcements${qs.toString() ? `?${qs.toString()}` : ''}`);
    return res.data.data;
  }

  async sendMessage(recipientId: string, message: string, attachments?: { filename: string; contentType: string; data: string }[]): Promise<any> {
    const res = await api.post('/messages/send', { recipientId, message, attachments: attachments || [] });
    return res.data.data;
  }

  async getMessageHistory(params: { recipientId?: string; conversationId?: string; limit?: number; nextToken?: any }): Promise<{ items: any[]; nextToken: any }>{
    const qs = new URLSearchParams();
    if (params.recipientId) qs.append('recipientId', params.recipientId);
    if (params.conversationId) qs.append('conversationId', params.conversationId);
    if (params.limit) qs.append('limit', String(params.limit));
    if (params.nextToken) qs.append('nextToken', JSON.stringify(params.nextToken));
    const res = await api.get(`/messages/history?${qs.toString()}`);
    return res.data.data;
  }

  async markMessageRead(params: { conversationId?: string; recipientId?: string; messageId: string }): Promise<any> {
    const body: any = {};
    if (params.conversationId) body.conversationId = params.conversationId;
    if (params.recipientId) body.recipientId = params.recipientId;
    const res = await api.post(`/messages/${encodeURIComponent(params.messageId)}/read`, body);
    return res.data.data;
  }
}

export default new PTOService();
