import React from 'react';
import LoginForm from '../components/LoginForm';
import '../css-files/Login.css';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();

    const handleLogin = (email: string, password: string) => {
        // In a real application, you would send these credentials to your authentication service
        console.log('Login attempt with:', { email, password });
        // For now, we'll just show an alert and redirect to student dashboard
        alert(`Login successful! Welcome ${email}`);
        navigate('/student');
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
                <LoginForm onLogin={handleLogin} />
            </div>
        </div>
    );
};

export default LoginPage;