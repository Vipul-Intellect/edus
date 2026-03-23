// src/pages/Login/Loginpage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import ApiService from '../../services/api';
import './login.css';

const QUICK_LOGINS = [
  { role: 'admin',   label: 'Admin',   icon: '🛡️', username: 'admin',   password: 'Admin@123', cls: 'admin'   },
  { role: 'teacher', label: 'Teacher', icon: '📚', username: 'teacher1', password: 'Teacher@123', cls: 'teacher' },
  { role: 'student', label: 'Student', icon: '🎓', username: 'student1', password: 'Student@123', cls: 'student' },
];

const LoginPage = () => {
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [userType, setUserType]     = useState('student');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError]           = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const navigate = useNavigate();

  const doLogin = async (uname, pass, type) => {
    setIsLoading(true);
    setError('');
    try {
      // Try admin endpoint first if toggle = admin, otherwise use standard login
      let response;
      if (type === 'admin') {
        response = await ApiService.adminLogin(uname, pass);
        // Fallback: if adminLogin fails, try regular login too
        if (!response?.token) {
          response = await ApiService.login(uname, pass);
        }
      } else {
        response = await ApiService.login(uname, pass);
      }

      if (response?.token) {
        const { role } = response;
        // Navigate based on actual server-returned role (not the toggle selection)
        switch (role) {
          case 'admin':   navigate('/admin');   break;
          case 'teacher': navigate('/teacher'); break;
          case 'student': navigate('/student'); break;
          default:        navigate('/');
        }
      } else {
        setError(response?.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      if (err.message?.includes('Network error') || err.message?.includes('fetch'))
        setError('Cannot connect to server. Please ensure the backend is running.');
      else if (err.message?.includes('401') || err.message?.includes('Invalid'))
        setError('Invalid username or password.');
      else
        setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    doLogin(username, password, userType);
  };

  const handleQuickLogin = (ql) => {
    setUserType(ql.role);
    setUsername(ql.username);
    setPassword(ql.password);
    doLogin(ql.username, ql.password, ql.role);
  };

  return (
    <div className="login-container">
      {/* Brand */}
      <div className="login-brand">
        <h1 className="brand-title">
          <GraduationCap size={32} strokeWidth={2} />
          EduScheduler
        </h1>
        <p className="brand-subtitle">Campus Automation Platform</p>
      </div>

      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Welcome back 👋</h1>
          <p className="login-subtitle">Sign in to your account to continue</p>
        </div>

        {/* Role selector */}
        <div className="role-toggle-container">
          {['student', 'teacher', 'admin'].map((role) => (
            <button
              key={role}
              type="button"
              className={`role-toggle-btn ${userType === role ? 'active' : ''}`}
              onClick={() => setUserType(role)}
            >
              {role === 'student' ? '🎓' : role === 'teacher' ? '📚' : '🛡️'}
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter your username"
              className="login-input"
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="login-input"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {/* Remember me + Forgot */}
          <div className="form-footer">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <a
              href="#"
              className="forgot-link"
              onClick={(e) => { e.preventDefault(); alert('Please contact your IT administrator to reset your password.'); }}
            >
              Forgot password?
            </a>
          </div>

          {error && (
            <div className="error-message">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm1 13H7v-2h2v2zm0-3H7V4h2v6z" />
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? <span className="spinner" /> : null}
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Quick login */}
        <div className="divider"><span>Quick Login</span></div>
        <div className="quick-login-section">
          <p className="quick-login-label">For testing — one click login</p>
          <div className="quick-login-buttons">
            {QUICK_LOGINS.map((ql) => (
              <button
                key={ql.role}
                type="button"
                className={`quick-btn ${ql.cls}`}
                onClick={() => handleQuickLogin(ql)}
                disabled={isLoading}
              >
                <span className="quick-btn-icon">{ql.icon}</span>
                {ql.label}
                <span className="quick-btn-creds">{ql.username}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;