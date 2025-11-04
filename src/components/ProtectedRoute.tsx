import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/auth.service';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const checkAuthorization = async () => {
            try {
                // Check if user is authenticated
                if (!AuthService.isAuthenticated()) {
                    navigate('/');
                    return;
                }

                // Get access token
                const token = AuthService.getAccessToken();
                if (!token) {
                    navigate('/');
                    return;
                }

                // Get user role from backend (uses caching and deduplication)
                const userProfile = await AuthService.getUserProfile(token);
                const userRole = userProfile.role;

                // Check if user role is in allowed roles
                if (allowedRoles.includes(userRole)) {
                    setIsAuthorized(true);
                } else {
                    // Redirect to error page or login
                    navigate('/unauthorized');
                }
            } catch (error) {
                console.error('Authorization check failed:', error);
                navigate('/');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuthorization();
    }, [allowedRoles, navigate]);

    if (isLoading) {
        return <div className="loading">Checking authorization...</div>;
    }

    return isAuthorized ? <>{children}</> : null;
};

export default ProtectedRoute;