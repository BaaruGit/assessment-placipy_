import React, { useState } from 'react';

interface LoginFormProps {
    onLogin: (email: string, password: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(email, password);
    };

    return (
        <div className="login-form-container">
            <form onSubmit={handleSubmit} className="login-form">
                <h2 className="login-title">Login</h2>

                <div className="login-form-group">
                    <label htmlFor="email" className="login-form-label">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="login-form-input"
                        placeholder="Enter your email"
                        required
                    />
                </div>

                <div className="login-form-group">
                    <label htmlFor="password" className="login-form-label">Password</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="login-form-input"
                        placeholder="Enter your password"
                        required
                    />
                </div>

                <button type="submit" className="login-button">
                    Login
                </button>
            </form>
        </div>
    );
};

export default LoginForm;