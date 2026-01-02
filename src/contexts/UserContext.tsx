import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AuthService from '../services/auth.service';
import { useNavigate } from 'react-router-dom';

interface User {
    email: string;
    name: string;
    role: string;
    department?: string;
    year?: string;
    joiningDate?: string;
    rollNumber?: string;
}

interface UserContextType {
    user: User | null;
    loading: boolean;
    fetchUser: () => Promise<void>;
    refreshUser: () => Promise<void>;
    clearUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
    children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [initialized, setInitialized] = useState(false);
    const navigate = useNavigate();

    // Fetch user data from API
    const fetchUser = useCallback(async () => {
        // Prevent multiple initializations
        if (initialized && user) {
            return;
        }

        try {
            setLoading(true);
            const token = AuthService.getAccessToken();

            if (token) {
                const userProfile = await AuthService.getUserProfile(token);
                const userData = {
                    email: userProfile.email,
                    name: userProfile.name,
                    role: userProfile.role,
                    department: userProfile.department,
                    year: userProfile.year,
                    joiningDate: userProfile.joiningDate
                };
                setUser(userData);

                // Redirecting to dashboard 
                if (window.location.pathname === '/') {
                    const dashboardPath = AuthService.getDashboardPath(userProfile.role);
                    navigate(dashboardPath);
                }
            } else if (window.location.pathname !== '/') {
                // No token , redirecting broo.
                navigate('/');
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            AuthService.logout();
            if (window.location.pathname !== '/') {
                navigate('/');
            }
        } finally {
            setLoading(false);
            setInitialized(true);
        }
    }, [initialized, user, navigate]);

    // Refresh user data (useful for manual updates)
    const refreshUser = useCallback(async () => {
        // Clear cache and fetch fresh data
        AuthService.clearCache();
        const token = AuthService.getAccessToken();
        if (token) {
            try {
                const userProfile = await AuthService.getUserProfile(token, true);
                setUser(prevUser => ({
                    ...prevUser,
                    ...userProfile
                } as User));
            } catch (error) {
                console.error('Error refreshing user profile:', error);
            }
        }
    }, []);

    // Clear user data (used on logout)
    const clearUser = useCallback(() => {
        setUser(null);
        setInitialized(false);
        AuthService.clearCache();
    }, []);

    // Only fetch user data on initial load
    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    return (
        <UserContext.Provider value={{ user, loading, fetchUser, refreshUser, clearUser }}>
            {children}
        </UserContext.Provider>
    );
};

// Named export for the hook
export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}