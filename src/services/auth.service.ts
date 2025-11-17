import axios from 'axios';

// Define user roles
export type UserRole = 'Student' | 'PTO' | 'PTS' | 'Admin';

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

    /**
     * Normalize role name to match expected UserRole type
     * @param role Role string from backend
     * @returns Normalized UserRole
     */
    private normalizeRole(role: string): UserRole {
        // Handle different possible role representations
        switch (role.toLowerCase()) {
            case 'student':
            case 'student user':
                return 'Student';
            case 'pto':
            case 'placement training officer':
            case 'placementtrainingofficer':
                return 'PTO';
            case 'pts':
            case 'placement training staff':
            case 'placementtrainingstaff':
            case 'placement tracking supervisor':
            case 'placementtrackingsupervisor':
                return 'PTS';
            case 'admin':
            case 'administrator':
                return 'Admin';
            default:
                // If we can't match, return the role as-is (will be validated elsewhere)
                // This maintains backward compatibility
                if (['Student', 'PTO', 'PTS', 'Admin'].includes(role)) {
                    return role as UserRole;
                }
                // Default to Student if we can't determine the role
                console.warn(`Unknown role: ${role}, defaulting to Student`);
                return 'Student';
        }
    }

    /**
     * Login user with email and password
     * @param email 
     * @param password 
     * @returns User object with role and access token
     */
    async login(email: string, password: string): Promise<User | ChallengeResponse> {
        try {
            console.log('Attempting login with:', { email });

            // Call backend login endpoint
            const response = await axios.post(`${this.apiUrl}/login`, {
                username: email, // Using email as username
                password
            }, {
                timeout: 10000 // 10 second timeout
            });

            console.log('Login response:', response.data);

            // Check if we have a challenge
            if (response.data.challenge === 'NEW_PASSWORD_REQUIRED') {
                return {
                    challenge: 'NEW_PASSWORD_REQUIRED',
                    session: response.data.session,
                    username: email
                };
            }

            const { accessToken } = response.data;

            // Get user profile from backend (bypass cache for fresh login)
            const userProfile = await this.getUserProfile(accessToken, true);

            // Store token in localStorage for future requests
            localStorage.setItem('accessToken', accessToken);

            // Cache the user profile
            this.userProfileCache = {
                data: userProfile,
                timestamp: Date.now()
            };

            return {
                email: userProfile.email,
                name: userProfile.name,
                role: userProfile.role,
                accessToken,
                department: userProfile.department,
                year: userProfile.year,
                joiningDate: userProfile.joiningDate
            };
        } catch (error: any) {
            console.error('Login error:', error);

            if (error.response) {
                // Server responded with error status
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
                console.error('Response headers:', error.response.headers);

                const message = error.response.data?.message || error.response.statusText || 'Unknown server error';

                // Special handling for authentication errors
                if (error.response.status === 401) {
                    throw new Error('Invalid email or password. Please check your credentials and try again.');
                }

                throw new Error(`Login failed: ${message} (${error.response.status})`);
            } else if (error.request) {
                // Request was made but no response received
                console.error('No response received:', error.request);
                throw new Error('Network error: Could not connect to the authentication server. Please ensure the backend is running on port 3000.');
            } else {
                // Something else happened 
                console.error('Error message:', error.message);
                throw new Error('Login failed: ' + error.message);
            }
        }
    }

    /**
     * Respond to NEW_PASSWORD_REQUIRED challenge
     * @param username 
     * @param currentPassword 
     * @param newPassword 
     * @param session 
     * @returns User object with role and access token
     */
    async respondToNewPasswordChallenge(
        username: string,
        currentPassword: string,
        newPassword: string,
        session: string
    ): Promise<User | { sessionExpired: true }> {
        try {
            console.log('Responding to NEW_PASSWORD_REQUIRED challenge for:', username);

            // Call backend endpoint to respond to challenge , yeah it's me kavin here , in case you reading then i am the one who developed it.
            const response = await axios.post(`${this.apiUrl}/respond-to-new-password-challenge`, {
                username,
                password: currentPassword,
                newPassword,
                session
            }, {
                timeout: 10000 // 10 second timeout
            });

            console.log('Challenge response:', response.data);

            const { accessToken } = response.data;

            // Get user profile from backend (bypass cache for fresh login)
            const userProfile = await this.getUserProfile(accessToken, true);

            // Store token in localStorage for future requests
            localStorage.setItem('accessToken', accessToken);

            // Cache the user profile
            this.userProfileCache = {
                data: userProfile,
                timestamp: Date.now()
            };

            return {
                email: userProfile.email,
                name: userProfile.name,
                role: userProfile.role,
                accessToken,
                department: userProfile.department,
                year: userProfile.year,
                joiningDate: userProfile.joiningDate
            };
        } catch (error: any) {
            console.error('Challenge response error:', error);

            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
                console.error('Response headers:', error.response.headers);

                const message = error.response.data?.message || error.response.statusText || 'Unknown server error';

                // Handle session expired errors specifically
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

    /**
     * Get user profile from backend with caching and request deduplication
     * @param token Access token
     * @param bypassCache Whether to bypass the cache
     * @returns User profile
     */
    async getUserProfile(token: string, bypassCache: boolean = false): Promise<Omit<User, 'accessToken'>> {
        // Check if we have a valid cached profile
        if (!bypassCache && this.userProfileCache) {
            const now = Date.now();
            if (now - this.userProfileCache.timestamp < this.CACHE_DURATION) {
                console.log('Returning cached user profile');
                return this.userProfileCache.data;
            }
        }

        // If there's already a pending request, return that promise
        if (this.pendingProfileRequest && !bypassCache) {
            console.log('Returning existing profile request promise');
            return this.pendingProfileRequest;
        }

        // Create a new request promise
        this.pendingProfileRequest = this.fetchUserProfile(token)
            .then(profile => {
                // Cache the result
                this.userProfileCache = {
                    data: profile,
                    timestamp: Date.now()
                };
                // Clear the pending request
                this.pendingProfileRequest = null;
                return profile;
            })
            .catch(error => {
                // Clear the pending request on error
                this.pendingProfileRequest = null;
                throw error;
            });

        return this.pendingProfileRequest;
    }

    /**
     * Fetch user profile from backend
     * @param token Access token
     * @returns User profile
     */
    private async fetchUserProfile(token: string): Promise<Omit<User, 'accessToken'>> {
        try {
            console.log('Fetching user profile with token:', token ? 'Bearer ***' : 'No token');

            // Set authorization header
            const config = {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                timeout: 10000 // 10 second timeout
            };

            // Call backend profile endpoint to get user information
            const response = await axios.get(`${this.apiUrl}/profile`, config);

            console.log('Profile response:', response.data);

            // Extract user data from response
            const { email, name, role, department, year, joiningDate } = response.data.user;

            // Normalize role name to match expected values
            const normalizedRole = this.normalizeRole(role);

            // Validate role (this is now redundant but kept for safety)
            const validRoles: UserRole[] = ['Student', 'PTO', 'PTS', 'Admin'];
            if (!validRoles.includes(normalizedRole)) {
                throw new Error(`Invalid user role: ${role}`);
            }

            return {
                email,
                name,
                role: normalizedRole,
                department,
                year,
                joiningDate
            };
        } catch (error: any) {
            console.error('Error getting user profile:', error);

            if (error.response) {
                console.error('Profile check response data:', error.response.data);
                console.error('Profile check response status:', error.response.status);

                const message = error.response.data?.message || error.response.statusText || 'Unknown server error';

                // Special handling for authentication errors
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

    /**
     * Get user role from backend (kept for backward compatibility)
     * @param token Access token
     * @returns User role
     */
    async getUserRole(token: string): Promise<UserRole> {
        const userProfile = await this.getUserProfile(token);
        return userProfile.role;
    }

    /**
     * Clear user profile cache
     */
    clearCache(): void {
        this.userProfileCache = null;
        this.pendingProfileRequest = null;
    }

    /**
     * Check if user is authenticated
     * @returns True if user is authenticated, false otherwise
     */
    isAuthenticated(): boolean {
        const token = localStorage.getItem('accessToken');
        return !!token;
    }

    /**
     * Get stored access token
     * @returns Access token or null
     */
    getAccessToken(): string | null {
        return localStorage.getItem('accessToken');
    }

    /**
     * Logout user
     */
    logout(): void {
        localStorage.removeItem('accessToken');
        this.clearCache();
    }

    /**
     * Get dashboard path based on user role
     * @param role User role
     * @returns Dashboard path
     */
    getDashboardPath(role: UserRole): string {
        switch (role) {
            case 'Student':
                return '/student';
            case 'PTO':
                return '/pto';
            case 'PTS':
                return '/pts';
            case 'Admin':
                return '/company-admin';
            default:
                return '/'; // Redirect to login for unknown roles
        }
    }
}

export default new AuthService();