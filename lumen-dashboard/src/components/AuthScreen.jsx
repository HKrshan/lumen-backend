import { useState } from 'react';
import { supabase } from '../supabase';

export default function AuthScreen({ onAuth }) {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (tab === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuth(data.user);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Check your email to confirm your account.');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="page-enter" style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg)',
      zIndex: 1000
    }}>
      {/* Dust canvas visible behind */}
      <canvas id="dust-canvas" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />

      {/* Auth Card */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '380px',
        maxWidth: '90%',
        padding: '40px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border2)',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '32px',
            letterSpacing: '-0.02em',
            margin: 0,
            background: 'linear-gradient(90deg, var(--text-1), var(--accent))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            LUMEN
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '8px', fontFamily: "'JetBrains Mono', monospace" }}>
            AI Research Agent
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => { setTab('login'); setError(''); setMessage(''); }}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: tab === 'login' ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === 'login' ? 'var(--text-1)' : 'var(--text-3)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            Login
          </button>
          <button
            onClick={() => { setTab('signup'); setError(''); setMessage(''); }}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: tab === 'signup' ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === 'signup' ? 'var(--text-1)' : 'var(--text-3)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Email Input */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-3)', marginBottom: '6px', fontFamily: "'Inter', sans-serif" }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="you@example.com"
            style={{
              width: '100%',
              height: '40px',
              backgroundColor: 'var(--surface2)',
              border: '1px solid var(--border2)',
              borderRadius: '8px',
              padding: '0 12px',
              fontSize: '14px',
              color: 'var(--text-1)',
              fontFamily: "'Inter', sans-serif",
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border2)'}
          />
        </div>

        {/* Password Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-3)', marginBottom: '6px', fontFamily: "'Inter', sans-serif" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="••••••••"
            style={{
              width: '100%',
              height: '40px',
              backgroundColor: 'var(--surface2)',
              border: '1px solid var(--border2)',
              borderRadius: '8px',
              padding: '0 12px',
              fontSize: '14px',
              color: 'var(--text-1)',
              fontFamily: "'Inter', sans-serif",
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border2)'}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(239,68,68,0.1)',
            border: '1px solid var(--error)',
            borderRadius: '8px',
            color: 'var(--error)',
            fontSize: '12px',
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: '16px'
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Success Message */}
        {message && (
          <div style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(34,197,94,0.1)',
            border: '1px solid var(--success)',
            borderRadius: '8px',
            color: 'var(--success)',
            fontSize: '12px',
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: '16px'
          }}>
            ✓ {message}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            height: '40px',
            backgroundColor: loading ? 'var(--border)' : 'var(--accent)',
            border: 'none',
            borderRadius: '8px',
            color: loading ? 'var(--text-3)' : '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            fontFamily: "'Inter', sans-serif"
          }}
        >
          {loading ? 'Please wait...' : (tab === 'login' ? 'Sign In' : 'Create Account')}
        </button>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--text-4)',
          marginTop: '20px',
          fontFamily: "'Inter', sans-serif"
        }}>
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
