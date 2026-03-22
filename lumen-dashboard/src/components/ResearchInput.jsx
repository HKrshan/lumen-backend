import { useState, useRef, useEffect } from 'react';
import { useStartResearch } from '../api/hooks';

const MODELS = ['claude-sonnet-4-6', 'gemini-2.5-flash', 'gemini-2.5-pro'];
const MODEL_LABELS = {
  'claude-sonnet-4-6': 'SONNET',
  'gemini-2.5-flash': 'FLASH',
  'gemini-2.5-pro': 'PRO'
};

export default function ResearchInput({ onTaskCreated, currentModel, onModelChange }) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const mutation = useStartResearch();
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    mutation.mutate(
      { query: query.trim(), model: currentModel },
      {
        onSuccess: (data) => {
          setQuery('');
          onTaskCreated?.(data.task_id || data.id);
          textareaRef.current?.focus();
        },
      }
    );
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [query]);

  const toggleModel = () => {
    if (onModelChange) {
      const currentIndex = MODELS.indexOf(currentModel);
      const nextIndex = (currentIndex + 1) % MODELS.length;
      onModelChange(MODELS[nextIndex]);
    }
  };

  const displayModel = MODEL_LABELS[currentModel] || currentModel.split('-').pop().toUpperCase();

  return (
    <form
      onSubmit={handleSubmit}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '640px',
        maxWidth: 'calc(100vw - 48px)',
        backgroundColor: 'var(--surface)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: isFocused ? '1px solid var(--accent)' : '1px solid var(--border)',
        boxShadow: isFocused ? '0 12px 40px rgba(99, 102, 241, 0.12)' : '0 8px 32px rgba(0,0,0,0.4)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'flex-end',
        padding: '12px 16px',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        zIndex: 100
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', width: '100%', alignItems: 'center', gap: '12px' }}>
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What would you like to research?"
          rows={1}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '15px',
            color: 'var(--text-1)',
            maxHeight: '120px',
            resize: 'none',
            padding: '8px 4px',
            fontFamily: "'Inter', sans-serif",
            lineHeight: '1.5'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />

        {/* Model Pill Switcher */}
        <div
          className="model-pill"
          onClick={toggleModel}
          title="Toggle Model"
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '34px',
            padding: '0 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface2)',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-3)',
            fontFamily: "'JetBrains Mono', monospace",
            userSelect: 'none'
          }}
        >
          {displayModel}
        </div>

        <button
          type="submit"
          className={(!mutation.isPending && query.trim()) ? "btn-hover" : ""}
          disabled={mutation.isPending || !query.trim()}
          style={{
            height: '36px',
            backgroundColor: (mutation.isPending || !query.trim()) ? 'var(--border)' : 'var(--accent)',
            border: 'none',
            borderRadius: '8px',
            color: (mutation.isPending || !query.trim()) ? 'var(--text-3)' : '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            padding: '0 16px',
            cursor: (mutation.isPending || !query.trim()) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            minWidth: '72px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {mutation.isPending ? (
            <div className="pulse-dot" style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-3)', borderRadius: '50%' }} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
