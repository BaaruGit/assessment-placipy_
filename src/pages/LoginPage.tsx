import React, { useState } from 'react';
import LoginForm from '../components/LoginForm';
import '../css-files/Login.css';
import AuthService from '../services/auth.service';
import { useNavigate } from 'react-router-dom';
import type { User } from '../services/auth.service';
import { useUser } from '../contexts/UserContext';

// Define challenge response interface locally to avoid import issues
interface ChallengeResponse {
    challenge: 'NEW_PASSWORD_REQUIRED';
    session: string;
    username: string;
}

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
    const [password, setPassword] = useState<string>('');
    const [sessionExpired, setSessionExpired] = useState<boolean>(false);

    const { refreshUser } = useUser();

    const handleLogin = async (email: string, password: string) => {
        try {
            setError(null);
            setPassword(password);
            console.log('Attempting login with:', { email });

            // Authenticate user with Cognito
            const result = await AuthService.login(email, password);

            // Check if we have a challenge
            if (result && typeof result === 'object' && 'challenge' in result && result.challenge === 'NEW_PASSWORD_REQUIRED') {
                console.log('NEW_PASSWORD_REQUIRED challenge received');
                setChallenge(result as ChallengeResponse);
                setSessionExpired(false);
                return;
            }

            const userResult = result as User;
            console.log('Login successful for:', userResult.email);

            // Refresh UserContext so profile and name update immediately
            try {
                await refreshUser();
                console.log('UserContext refreshed after login');
            } catch (refreshErr) {
                console.warn('Failed to refresh user context after login:', refreshErr);
            }

            // Get dashboard path based on user role
            const dashboardPath = AuthService.getDashboardPath(userResult.role);
            console.log('Redirecting to:', dashboardPath);

            // Redirect to appropriate dashboard
            navigate(dashboardPath);
        } catch (err) {
            const e = err as Error;
            console.error('Login error in component:', e);
            setError(e.message || 'An unexpected error occurred during login. Please try again.');
        }
    };

    const handleNewPassword = async (newPassword: string) => {
        try {
            if (!challenge) {
                throw new Error('No challenge to respond to');
            }

            setError(null);
            console.log('Responding to NEW_PASSWORD_REQUIRED challenge');

            // Respond to the challenge
            const result = await AuthService.respondToNewPasswordChallenge(
                challenge.username,
                password,
                newPassword,
                challenge.session
            );

            // Check if session expired
            if ('sessionExpired' in result && result.sessionExpired) {
                setSessionExpired(true);
                setChallenge(null);
                setError('The session has expired. Please log in again to get a new session.');
                return;
            }

            const user = result as User;
            console.log('Password updated successfully for:', user.email);

            // Refresh context after setting new password / login
            try {
                await refreshUser();
                console.log('UserContext refreshed after completing password challenge');
            } catch (refreshErr) {
                console.warn('Failed to refresh user context after password challenge:', refreshErr);
            }

            // Get dashboard path based on user role
            const dashboardPath = AuthService.getDashboardPath(user.role);
            console.log('Redirecting to:', dashboardPath);

            // Redirect to appropriate dashboard
            navigate(dashboardPath);
        } catch (err) {
            const e = err as Error;
            console.error('New password error in component:', e);
            setError(e.message || 'Failed to set new password. Please try again.');
        }
    };

    const handleRetryLogin = () => {
        setChallenge(null);
        setSessionExpired(false);
        setError(null);
    };

    return (
        <div className="login-page">
            <div className="background-animation">
                <div className="bubble bubble-1"></div>
                <div className="bubble bubble-2"></div>
                <div className="bubble bubble-3"></div>
                <div className="bubble bubble-4"></div>
                <div className="bubble bubble-5"></div>
            </div>
            <div className="login-overlay">
                {!challenge ? (
                    <LoginForm onLogin={handleLogin} />
                ) : (
                    <div className="new-password-form">
                        <h3>New Password Required</h3>
                        {sessionExpired ? (
                            <div>
                                <p className="error-message">The session has expired. Please log in again.</p>
                                <button
                                    type="button"
                                    className="login-button"
                                    onClick={handleRetryLogin}
                                >
                                    Log In Again
                                </button>
                            </div>
                        ) : (
                            <>
                                <p>You need to set a new password for your account.</p>
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.target as HTMLFormElement);
                                    const newPassword = formData.get('newPassword') as string;
                                    await handleNewPassword(newPassword);
                                }}>
                                    <div className="login-form-group">
                                        <label htmlFor="newPassword" className="login-form-label">
                                            New Password
                                        </label>
                                        <div className="login-form-input-wrapper">
                                            <input
                                                type="password"
                                                id="newPassword"
                                                name="newPassword"
                                                className="login-form-input"
                                                placeholder="Enter your new password"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" className="login-button">
                                        Set New Password
                                    </button>
                                    <button
                                        type="button"
                                        className="login-button-secondary"
                                        onClick={() => setChallenge(null)}
                                    >
                                        Cancel
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                )}
                {error && !sessionExpired && <div className="login-error">{error}</div>}
            </div>
        </div>
    );
};

export default LoginPage;