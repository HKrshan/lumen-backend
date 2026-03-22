import { useEffect, useRef } from 'react';
import { useTaskDetails } from '../api/hooks';

export default function AgentLog({ taskId, onShowReport }) {
  const { data: task, isLoading } = useTaskDetails(taskId);
  const endOfMessagesRef = useRef(null);
  const prevMsgLengthRef = useRef(0);

  // Auto-scroll to bottom smoothly
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task?.messages]);

  // Sequentially add anim-target to new messages
  useEffect(() => {
    const msgs = task?.messages || [];
    const currentLength = msgs.length;
    const prevLength = prevMsgLengthRef.current;

    if (currentLength > prevLength) {
      const entries = document.querySelectorAll('.log-entry');
      for (let i = prevLength; i < currentLength; i++) {
        const entry = entries[i];
        if (entry) {
          setTimeout(() => {
            entry.classList.add('anim-target', 'log-line-in');
            entry.style.opacity = ''; // Remove inline opacity to let CSS take over
          }, (i - prevLength) * 100);
        }
      }
    }
    prevMsgLengthRef.current = currentLength;
  }, [task?.messages?.length]);

  const getLogStyle = (content) => {
    const lower = content.toLowerCase();
    let color = 'var(--text-2)';
    let fontWeight = 400;

    if (lower.includes('research') || lower.includes('search') || lower.includes('look')) {
      color = '#a5b4fc'; // Subtle indigo
    } else if (lower.includes('scrap') || lower.includes('extract') || lower.includes('read')) {
      color = '#fcd34d'; // Subtle amber
    } else if (lower.includes('synthes') || lower.includes('write')) {
      color = '#6ee7b7'; // Subtle emerald
    } else if (lower.includes('done') || lower.includes('finish') || lower.includes('success')) {
      color = 'var(--text-1)';
      fontWeight = 500;
    }

    return { color, fontWeight, letterSpacing: '-0.01em' };
  };

  if (!taskId) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg)' }}>
        <span style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--text-3)' }}>◈</span>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}>AWAITING_INPUT</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: '40px 48px', color: 'var(--text-3)', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace" }}>
        INITIALIZING_DATALINK...
      </div>
    );
  }

  // Check for no_api_key error
  const hasNoApiKeyError = task?.error?.includes('no_api_key') || 
    (task?.status === 'failed' && task?.result?.includes('No API key configured'));

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '40px 48px 120px', backgroundColor: 'var(--bg)' }}>
      {task?.status === 'done' && (
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={onShowReport}
            className="btn-hover"
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-1)',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace",
              transition: 'background-color 0.2s, border-color 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--sidebar)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            [ OPEN_REPORT ]
          </button>
        </div>
      )}

      {/* API Key Error Message */}
      {hasNoApiKeyError && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: 'rgba(239,68,68,0.1)',
          border: '1px solid var(--error)',
          borderRadius: '10px',
          margin: '16px 0',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px',
          color: 'var(--error)'
        }}>
          ⚠ No API key configured. Go to{' '}
          <span
            style={{ textDecoration: 'underline', cursor: 'pointer', color: 'var(--accent)' }}
            onClick={() => {
              const settingsBtn = document.querySelector('.settings-icon-hover');
              if (settingsBtn) settingsBtn.click();
            }}
          >
            Settings → API Keys
          </span>
          {' '}to add your key.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {task?.messages?.map((msg, idx) => {
          const isNew = idx >= prevMsgLengthRef.current;
          return (
            <div
              key={idx}
              className="log-entry"
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '16px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '13px',
                lineHeight: '1.6',
                opacity: isNew ? 0 : 1
              }}
            >
              <span style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: '2px' }}>◈</span>
              <span style={getLogStyle(msg.content)}>
                {msg.role === 'tool' ? msg.content : <span style={{ color: 'var(--text-3)' }}>[SYS]: {msg.content}</span>}
              </span>
            </div>
          );
        })}

        {task?.status === 'running' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '16px',
              alignItems: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '13px',
              lineHeight: '1.6',
              opacity: 0.6,
              marginTop: '8px'
            }}
          >
            <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>◈</span>
            <div className="pulse-dot" style={{ width: '8px', height: '8px', backgroundColor: 'var(--text-3)', borderRadius: '50%' }} />
            <span style={{ color: 'var(--text-3)', letterSpacing: '0.05em' }}>PROCESSING...</span>
          </div>
        )}
        <div ref={endOfMessagesRef} style={{ height: '24px' }} />
      </div>
    </div>
  );
}
