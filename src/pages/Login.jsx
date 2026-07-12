import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="login-page" id="login-page">
      {/* Background decorative elements */}
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-orb login-bg-orb-3" />

      <div className="login-content animate-fade-in-up">
        {/* Logo & Branding */}
        <div className="login-brand">
          <div className="login-logo" id="login-logo">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="48" y2="48">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <rect width="48" height="48" rx="14" fill="url(#logo-grad)" />
              <text x="24" y="32" textAnchor="middle" fontSize="22" fontWeight="800" fill="white" fontFamily="Inter, sans-serif">D</text>
            </svg>
          </div>
          <h1 className="login-title">DuitDuit</h1>
          <p className="login-subtitle">Smart money tracking,<br />simplified for you.</p>
        </div>

        {/* Features */}
        <div className="login-features">
          <div className="login-feature">
            <span className="login-feature-icon">📊</span>
            <span>Track income &amp; expenses</span>
          </div>
          <div className="login-feature">
            <span className="login-feature-icon">💳</span>
            <span>Multiple wallet management</span>
          </div>
          <div className="login-feature">
            <span className="login-feature-icon">📈</span>
            <span>Monthly financial overview</span>
          </div>
        </div>

        {/* Sign In Button */}
        <button
          className="google-sign-in-btn"
          onClick={signInWithGoogle}
          id="google-sign-in-btn"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Sign in with Google</span>
        </button>

        <p className="login-disclaimer">
          Your data is securely stored and only accessible by you.
        </p>
      </div>
    </div>
  );
}
