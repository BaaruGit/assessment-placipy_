import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_URL;

if (!API_BASE_URL) {
  throw new Error('API base URL is missing');
}

export interface Student {
  email: string;
  rollNumber: string;
  name: string;
  department: string;
  phone?: string;
  status: 'Active' | 'Inactive';
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * Get authorization header with token
 */
const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');

  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

/**
 * Get all students
 */
export const getAllStudents = async (): Promise<Student[]> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/students`,
      getAuthHeader()
    );

    return response.data.data || [];
  } catch (error: any) {
    console.error("Error fetching students:", error);
    throw new Error(error.response?.data?.error || "Failed to fetch students");
  }
};

/**
 * Get student by email
 */
export const getStudentByEmail = async (email: string): Promise<Student> => {
  try {
    const encodedEmail = encodeURIComponent(email);

    const response = await axios.get(
      `${API_BASE_URL}/api/students/${encodedEmail}`,
      getAuthHeader()
    );

    return response.data.data;
  } catch (error: any) {
    console.error("Error fetching student:", error);
    throw new Error(error.response?.data?.error || "Failed to fetch student");
  }
};

/**
 * Create or update student (Upsert)
 */
export const upsertStudent = async (
  studentData: Student
): Promise<Student> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/students`,
      studentData,
      getAuthHeader()
    );

    return response.data.data;
  } catch (error: any) {
    console.error("Error saving student:", error);
    throw new Error(error.response?.data?.error || "Failed to save student");
  }
};

/**
 * Update student status
 */
export const updateStudentStatus = async (
  email: string,
  status: "Active" | "Inactive"
): Promise<Student> => {
  try {
    const encodedEmail = encodeURIComponent(email);

    const response = await axios.put(
      `${API_BASE_URL}/api/students/${encodedEmail}/status`,
      { status },
      getAuthHeader()
    );

    return response.data.data;
  } catch (error: any) {
    console.error("Status update error:", error);
    throw new Error(
      error.response?.data?.error || "Failed to update student status"
    );
  }
};

/**
 * Delete student
 */
export const deleteStudent = async (email: string): Promise<void> => {
  try {
    const encodedEmail = encodeURIComponent(email);

    await axios.delete(
      `${API_BASE_URL}/api/students/${encodedEmail}`,
      getAuthHeader()
    );

  } catch (error: any) {
    console.error("Error deleting student:", error);
    throw new Error(error.response?.data?.error || "Failed to delete student");
  }
};
