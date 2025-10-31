import React from 'react';
import ColorBends from '../Style-components/Colorbends';
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
            <ColorBends
                className="background-animation"
           
                speed={0.3}
                frequency={1.2}
                warpStrength={0.8}
            />
            <div className="login-overlay">
                <LoginForm onLogin={handleLogin} />
            </div>
        </div>
    );
};

export default LoginPage;