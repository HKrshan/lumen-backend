import { useState, useEffect } from 'react';
import { getTheme, setTheme, THEMES, LABELS, ACCENTS } from '../theme';
import { supabase } from '../supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Navbar({ currentTaskTitle, sidebarOpen, onToggleSidebar, searchQuery, onSearchChange, user, onLogout }) {
  const [backendOnline, setBackendOnline] = useState(null);
  const [theme, setThemeState] = useState(getTheme());
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Backend health check every 10s
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
        setBackendOnline(res.ok);
      } catch { setBackendOnline(false); }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleThemeChange = (t) => {
    setTheme(t);
    setThemeState(t);
  };

  const isLight = theme.includes('light');

  return (
    <header style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: '52px',
      backgroundColor: 'var(--sidebar)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px 0 8px',
      zIndex: 500,
      gap: '12px'
    }}>
      {/* Left: sidebar toggle + logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button onClick={onToggleSidebar} style={{
          width: '32px', height: '32px',
          backgroundColor: 'transparent',
          border: '1px solid transparent',
          borderRadius: '8px',
          color: 'var(--text-2)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s'
        }}
          onMouseOver={e => { e.currentTarget.style.backgroundColor = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border2)'; }}
          onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" />
          </svg>
        </button>
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '18px',
          letterSpacing: '-0.02em',
          background: 'linear-gradient(90deg, var(--text-1), var(--accent))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>LUMEN</span>
      </div>

      {/* Center: current task title */}
      <div style={{ flex: 1, textAlign: 'center', overflow: 'hidden' }}>
        {currentTaskTitle && (
          <span style={{
            fontSize: '13px',
            color: 'var(--text-3)',
            fontFamily: "'JetBrains Mono', monospace",
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
            maxWidth: '400px',
            margin: '0 auto'
          }}>
            {currentTaskTitle}
          </span>
        )}
      </div>

      {/* Right: search, backend status, theme toggle, user menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            style={{
              height: '30px',
              width: '160px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border2)',
              borderRadius: '8px',
              padding: '0 10px 0 30px',
              fontSize: '12px',
              color: 'var(--text-1)',
              fontFamily: "'Inter', sans-serif",
              outline: 'none',
              transition: 'border-color 0.2s, width 0.3s'
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.width = '220px'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border2)'; e.target.style.width = '160px'; }}
          />
          <svg style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        {/* Backend status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: '8px' }}>
          <div style={{
            width: '7px', height: '7px', borderRadius: '50%',
            backgroundColor: backendOnline === null ? 'var(--text-3)' : backendOnline ? 'var(--success)' : 'var(--error)',
            boxShadow: backendOnline ? '0 0 6px var(--success)' : 'none'
          }} />
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
            {backendOnline === null ? 'CHECKING' : backendOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* Theme toggle (dark/light quick toggle) */}
        <button
          onClick={() => handleThemeChange(isLight ? theme.replace('light', 'dark') : theme.replace('dark', 'light'))}
          title="Toggle light/dark"
          style={{
            width: '32px', height: '32px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border2)',
            borderRadius: '8px',
            color: 'var(--text-2)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s'
          }}
        >
          {isLight ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>

        {/* User avatar / logout dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              height: '30px',
              width: '30px',
              backgroundColor: 'var(--accent)',
              border: 'none',
              borderRadius: '50%',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            {user?.email?.[0]?.toUpperCase()}
          </button>

          {showUserMenu && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 499 }}
                onClick={() => setShowUserMenu(false)}
              />
              <div style={{
                position: 'absolute',
                top: '36px',
                right: 0,
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border2)',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                zIndex: 500,
                minWidth: '160px',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {user?.email}
                </div>
                <button
                  onClick={() => { onLogout(); setShowUserMenu(false); }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--error)',
                    fontSize: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
