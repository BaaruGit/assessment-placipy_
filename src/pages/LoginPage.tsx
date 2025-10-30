import React from 'react';
import ColorBends from '../Style-components/Colorbends';
import LoginForm from '../components/LoginForm';

const LoginPage: React.FC = () => {
    const handleLogin = (email: string, password: string) => {
        // In a real application, you would send these credentials to your authentication service
        console.log('Login attempt with:', { email, password });
        // For now, we'll just show an alert
        alert(`Login attempt with email: ${email}`);
    };

    return (
        <div className="login-page">
            <ColorBends
                className="background-animation"
             colors={["#ff5c7a", "#8a5cff", "#00ffd1"]}
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