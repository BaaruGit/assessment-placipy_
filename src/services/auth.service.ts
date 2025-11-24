import axios from 'axios';

// Define user roles
export type UserRole = 'Student' | 'Placement Training Officer' | 'Placement Training Staff' | 'Administrator';

// Define user interface
export interface User {
    email: string;
    name: string;
    role: UserRole;
    accessToken: string;
    department?: string;
    year?: string;
    joiningDate?: string;
}

// Define challenge response interface
export interface ChallengeResponse {
    challenge: 'NEW_PASSWORD_REQUIRED';
    session: string;
    username: string;
}

// Authentication service
class AuthService {
    private apiUrl = '/api/users'; // Backend API base URL (using proxy)
    private userProfileCache: { data: Omit<User, 'accessToken'>; timestamp: number } | null = null;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
    private pendingProfileRequest: Promise<Omit<User, 'accessToken'>> | null = null;

    private normalizeRole(role?: string): UserRole {
        if (!role || typeof role !== 'string') {
            console.warn(`normalizeRole: missing or invalid role value (${String(role)}), defaulting to Student`);
        
          return 'Student';
        }
        switch (role.toLowerCase()) {
            case 'student':
            case 'student user':
                return 'Student';
            case 'pto':
            case 'placement training officer':
            case 'placementtrainingofficer':
                return 'Placement Training Officer';
            case 'pts':
            case 'placement training staff':
            case 'placementtrainingstaff':
            case 'placement tracking supervisor':
            case 'placementtrackingsupervisor':
                return 'Placement Training Staff';
            case 'admin':
            case 'administrator':
                return 'Administrator';
            default:
                if (['Student', 'Placement Training Officer', 'Placement Training Staff', 'Administrator'].includes(role)) {
                    return role as UserRole;
                }
                console.warn(`Unknown role: ${role}, defaulting to Student`);
                return 'Student';
        }
    }

    async login(email: string, password: string): Promise<User | ChallengeResponse> {
        try {
            console.log('Attempting login with:', { email });
            const response = await axios.post(`${this.apiUrl}/login`, { username: email, password }, { timeout: 10000 });
            console.log('Login response:', response.data);

            if (response.data.challenge === 'NEW_PASSWORD_REQUIRED') {
                return { challenge: 'NEW_PASSWORD_REQUIRED', session: response.data.session, username: email };
            }

            const { accessToken } = response.data;
            const userProfile = await this.getUserProfile(accessToken, true);
            localStorage.setItem('accessToken', accessToken);
            this.userProfileCache = { data: userProfile, timestamp: Date.now() };

            return { email: userProfile.email, name: userProfile.name, role: userProfile.role, accessToken, department: userProfile.department, year: userProfile.year, joiningDate: userProfile.joiningDate };
        } catch (error: any) {
            console.error('Login error:', error);
            if (error.response) {
                const message = error.response.data?.message || error.response.statusText || 'Unknown server error';
                if (error.response.status === 401) {
                    throw new Error('Invalid email or password. Please check your credentials and try again.');
                }
                throw new Error(`Login failed: ${message} (${error.response.status})`);
            } else if (error.request) {
                console.error('No response received:', error.request);
                throw new Error('Network error: Could not connect to the authentication server. Please ensure the backend is running on port 3000.');
            } else {
                throw new Error('Login failed: ' + error.message);
            }
        }
    }

    async respondToNewPasswordChallenge(username: string, currentPassword: string, newPassword: string, session: string): Promise<User | { sessionExpired: true }> {
        try {
            console.log('Responding to NEW_PASSWORD_REQUIRED challenge for:', username);
            const response = await axios.post(`${this.apiUrl}/respond-to-new-password-challenge`, { username, password: currentPassword, newPassword, session }, { timeout: 10000 });
            console.log('Challenge response:', response.data);
            const { accessToken } = response.data;
            const userProfile = await this.getUserProfile(accessToken, true);
            localStorage.setItem('accessToken', accessToken);
            this.userProfileCache = { data: userProfile, timestamp: Date.now() };
            return { email: userProfile.email, name: userProfile.name, role: userProfile.role, accessToken, department: userProfile.department, year: userProfile.year, joiningDate: userProfile.joiningDate };
        } catch (error: any) {
            console.error('Challenge response error:', error);
            if (error.response) {
                const message = error.response.data?.message || error.response.statusText || 'Unknown server error';
                if (message.includes('session has expired') || message.includes('Invalid session for the user')) {
                    return { sessionExpired: true };
                }
                throw new Error(`Failed to set new password: ${message} (${error.response.status})`);
            } else if (error.request) {
                throw new Error('Network error: Could not connect to the authentication server.');
            } else {
                throw new Error('Failed to set new password: ' + error.message);
            }
        }
    }

    async getUserProfile(token: string, bypassCache: boolean = false): Promise<Omit<User, 'accessToken'>> {
        if (!bypassCache && this.userProfileCache) {
            const now = Date.now();
            if (now - this.userProfileCache.timestamp < this.CACHE_DURATION) {
                console.log('Returning cached user profile');
                return this.userProfileCache.data;
            }
        }

        if (this.pendingProfileRequest && !bypassCache) {
            console.log('Returning existing profile request promise');
            return this.pendingProfileRequest;
        }

        this.pendingProfileRequest = this.fetchUserProfile(token)
            .then((profile) => {
                this.userProfileCache = { data: profile, timestamp: Date.now() };
                this.pendingProfileRequest = null;
                return profile;
            })
            .catch((err) => {
                this.pendingProfileRequest = null;
                throw err;
            });

        return this.pendingProfileRequest;
    }

    private async fetchUserProfile(token: string): Promise<Omit<User, 'accessToken'>> {
        try {
            console.log('Fetching user profile with token:', token ? 'Bearer ***' : 'No token');
            const config = { headers: { 'Authorization': `Bearer ${token}` }, timeout: 10000 };
            const response = await axios.get(`${this.apiUrl}/profile`, config);
            console.log('Profile response:', response.data);

            const userData = response?.data;
            if (!userData || typeof userData !== 'object') {
                throw new Error('Malformed profile response: missing user information');
            }
            const { email, name, role, department, year, joiningDate } = userData.user;
            const normalizedRole = this.normalizeRole(role);
            const validRoles: UserRole[] = ['Student', 'Placement Training Officer', 'Placement Training Staff', 'Administrator'];
            if (!validRoles.includes(normalizedRole)) {
                throw new Error(`Invalid user role: ${role}`);
            }
            return { email, name, role: normalizedRole, department, year, joiningDate };
        } catch (error: any) {
            console.error('Error getting user profile:', error);
            if (error.response) {
                const message = error.response.data?.message || error.response.statusText || 'Unknown server error';
                if (error.response.status === 401) {
                    throw new Error('Your session has expired. Please log in again.');
                }
                if (error.response.status === 403) {
                    throw new Error('Access forbidden. Your token may be invalid or expired.');
                }
                throw new Error(`Profile verification failed: ${message} (${error.response.status})`);
            } else if (error.request) {
                throw new Error('Network error: Could not connect to the server for profile verification. Please ensure the backend is running on port 3000.');
            } else {
                throw new Error('Profile verification failed: ' + error.message);
            }
        }
    }

    async getUserRole(token: string): Promise<UserRole> {
        const userProfile = await this.getUserProfile(token);
        return userProfile.role;
    }

    clearCache(): void {
        this.userProfileCache = null;
        this.pendingProfileRequest = null;
    }

    /**
     * Get dashboard URL based on user role
     * @param role User role
     * @returns Dashboard URL path
     */
    getDashboardPath(role: UserRole): string {
        return this.getDashboardUrl(role);
    }

    /**
     * Check if user is authenticated
     * @returns True if user is authenticated, false otherwise
     */
    isAuthenticated(): boolean {
        const token = localStorage.getItem('accessToken');
        return !!token;
    }

    getAccessToken(): string | null {
        return localStorage.getItem('accessToken');
    }

    logout(): void {
        localStorage.removeItem('accessToken');
        this.clearCache();
    }

    private getDashboardUrl(role: UserRole): string {
        switch (role) {
            case 'Student':
                return '/student';
            case 'Placement Training Officer':
                return '/pto';
            case 'Placement Training Staff':
                return '/pts';
            case 'Administrator':
                return '/company-admin';
            default:
                return '/';
        }
    }
}

export default new AuthService();
