import React from 'react';
import LoginForm from '../components/LoginForm';
import '../css-files/Login.css';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  

    const handleLogin = (email: string, password: string) => {
       
        console.log('Login attempt with:', { email, password });
      
        alert(`Login successful! Welcome ${email}`);
       
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