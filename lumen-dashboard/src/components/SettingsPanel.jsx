import { useState, useEffect } from 'react';
import { getTheme, setTheme, THEMES, LABELS, ACCENTS } from '../theme';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const themeCards = [
  { id: 'dark', label: 'Dark', accent: '#6366f1', bg: '#09090f', preview: ['#09090f', '#111119', '#6366f1'] },
  { id: 'light', label: 'Light', accent: '#6366f1', bg: '#f5f5fc', preview: ['#f5f5fc', '#ffffff', '#6366f1'] },
  { id: 'green-dark', label: 'Forest Dark', accent: '#22c55e', bg: '#080d0a', preview: ['#080d0a', '#0d1512', '#22c55e'] },
  { id: 'green-light', label: 'Forest Light', accent: '#16a34a', bg: '#f0faf3', preview: ['#f0faf3', '#ffffff', '#16a34a'] },
  { id: 'pink-dark', label: 'Rose Dark', accent: '#ec4899', bg: '#0d080d', preview: ['#0d080d', '#150d15', '#ec4899'] },
  { id: 'pink-light', label: 'Rose Light', accent: '#db2777', bg: '#fdf0f7', preview: ['#fdf0f7', '#ffffff', '#db2777'] },
];

const PROVIDERS = [
  { id: 'openrouter', label: 'OpenRouter', url: 'https://openrouter.ai/keys', color: '#7c3aed' },
  { id: 'openai', label: 'OpenAI', url: 'https://platform.openai.com/api-keys', color: '#10a37f' },
  { id: 'anthropic', label: 'Anthropic', url: 'https://console.anthropic.com/', color: '#d97706' },
  { id: 'gemini', label: 'Google Gemini', url: 'https://aistudio.google.com/apikey', color: '#4285f4' },
  { id: 'groq', label: 'Groq', url: 'https://console.groq.com/keys', color: '#f55036' },
  { id: 'mistral', label: 'Mistral', url: 'https://console.mistral.ai/', color: '#ff7000' },
  { id: 'minimax', label: 'MiniMax', url: 'https://www.minimaxi.com/', color: '#06b6d4' },
  { id: 'nvidia', label: 'NVIDIA', url: 'https://build.nvidia.com/', color: '#76b900' },
];

export default function SettingsPanel({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('themes');
  const [currentTheme, setCurrentTheme] = useState(getTheme());

  // API Keys state
  const [configuredKeys, setConfiguredKeys] = useState({});
  const [inputValues, setInputValues] = useState({});
  const [saving, setSaving] = useState({});

  // Models state
  const [models, setModels] = useState({});
  const [activeModel, setActiveModel] = useState('claude-sonnet-4-6');

  useEffect(() => {
    if (isOpen) {
      // Fetch configured API keys
      fetch(`${API_URL}/settings/api-keys`)
        .then(r => r.json())
        .then(data => {
          const map = {};
          data.keys.forEach(k => { map[k.provider] = k; });
          setConfiguredKeys(map);
        })
        .catch(() => { });

      // Fetch models
      fetch(`${API_URL}/settings/models`)
        .then(r => r.json())
        .then(data => setModels(data.models))
        .catch(() => { });

      // Fetch active model
      fetch(`${API_URL}/settings/active-model`)
        .then(r => r.json())
        .then(data => setActiveModel(data.model || 'claude-sonnet-4-6'))
        .catch(() => { });
    }
  }, [isOpen]);

  const handleThemeSelect = (themeId) => {
    setTheme(themeId);
    setCurrentTheme(themeId);
  };

  const saveKey = async (provider) => {
    const key = inputValues[provider];
    if (!key) return;
    setSaving(prev => ({ ...prev, [provider]: true }));
    try {
      await fetch(`${API_URL}/settings/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, api_key: key })
      });
      setInputValues(prev => ({ ...prev, [provider]: '' }));
      const res = await fetch(`${API_URL}/settings/api-keys`);
      const data = await res.json();
      const map = {};
      data.keys.forEach(k => { map[k.provider] = k; });
      setConfiguredKeys(map);
    } catch (err) {
      console.error('Failed to save key:', err);
    }
    setSaving(prev => ({ ...prev, [provider]: false }));
  };

  const deleteKey = async (provider) => {
    try {
      await fetch(`${API_URL}/settings/api-keys/${provider}`, { method: 'DELETE' });
      setConfiguredKeys(prev => { const n = { ...prev }; delete n[provider]; return n; });
    } catch (err) {
      console.error('Failed to delete key:', err);
    }
  };

  const selectModel = async (modelId) => {
    setActiveModel(modelId);
    try {
      await fetch(`${API_URL}/settings/active-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId })
      });
    } catch (err) {
      console.error('Failed to set model:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(9, 9, 15, 0.7)',
      backdropFilter: 'blur(8px)'
    }} onClick={onClose}>
      <div className="blur-reveal" style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        width: '640px',
        maxWidth: '90%',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>SETTINGS</h2>
          <button
            onClick={onClose}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-3)'; }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-3)',
              cursor: 'pointer',
              display: 'flex',
              padding: '4px',
              transition: 'color 0.2s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px', overflowX: 'auto' }}>
          <button
            onClick={() => setActiveTab('themes')}
            style={{
              padding: '12px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'themes' ? `2px solid var(--accent)` : '2px solid transparent',
              color: activeTab === 'themes' ? 'var(--text-1)' : 'var(--text-3)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: "'Inter', sans-serif",
              whiteSpace: 'nowrap'
            }}
          >
            Themes
          </button>
          <button
            onClick={() => setActiveTab('models')}
            style={{
              padding: '12px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'models' ? `2px solid var(--accent)` : '2px solid transparent',
              color: activeTab === 'models' ? 'var(--text-1)' : 'var(--text-3)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: "'Inter', sans-serif",
              whiteSpace: 'nowrap'
            }}
          >
            Models
          </button>
          <button
            onClick={() => setActiveTab('api-keys')}
            style={{
              padding: '12px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'api-keys' ? `2px solid var(--accent)` : '2px solid transparent',
              color: activeTab === 'api-keys' ? 'var(--text-1)' : 'var(--text-3)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: "'Inter', sans-serif",
              whiteSpace: 'nowrap'
            }}
          >
            API Keys
          </button>
          <button
            onClick={() => setActiveTab('general')}
            style={{
              padding: '12px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'general' ? `2px solid var(--accent)` : '2px solid transparent',
              color: activeTab === 'general' ? 'var(--text-1)' : 'var(--text-3)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: "'Inter', sans-serif",
              whiteSpace: 'nowrap'
            }}
          >
            General
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'themes' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {themeCards.map((card) => {
                const isActive = currentTheme === card.id;
                return (
                  <div
                    key={card.id}
                    onClick={() => handleThemeSelect(card.id)}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border2)'}`,
                      backgroundColor: card.bg,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onMouseOver={e => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseOut={e => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'var(--border2)';
                        e.currentTarget.style.transform = 'none';
                      }
                    }}
                  >
                    {/* Checkmark for active theme */}
                    {isActive && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'var(--accent)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    )}

                    {/* Preview circles */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                      {card.preview.map((color, i) => (
                        <div
                          key={i}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: color,
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                        />
                      ))}
                    </div>

                    {/* Label */}
                    <div style={{ fontSize: '13px', fontWeight: 600, color: card.bg === '#ffffff' || card.bg === '#f5f5fc' || card.bg === '#f0faf3' || card.bg === '#fdf0f7' || card.bg === '#fdf5fb' ? '#0f0e1a' : '#eeedf5' }}>
                      {card.label}
                    </div>

                    {/* Accent color indicator */}
                    <div style={{ fontSize: '11px', color: card.accent, marginTop: '4px', fontFamily: "'JetBrains Mono', monospace" }}>
                      {card.accent}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'models' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {Object.entries(models).map(([provider, providerModels]) => {
                const hasKey = configuredKeys[provider];
                return (
                  <div key={provider}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {PROVIDERS.find(p => p.id === provider)?.label || provider}
                      </h3>
                      {!hasKey && (
                        <button
                          onClick={() => setActiveTab('api-keys')}
                          style={{
                            fontSize: '11px',
                            color: 'var(--accent)',
                            fontFamily: "'JetBrains Mono', monospace",
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          Configure API Key →
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {providerModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => selectModel(model.id)}
                          disabled={!hasKey}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: `1px solid ${activeModel === model.id ? 'var(--accent)' : 'var(--border2)'}`,
                            backgroundColor: activeModel === model.id ? 'var(--accent-soft)' : 'var(--surface)',
                            color: activeModel === model.id ? 'var(--accent)' : hasKey ? 'var(--text-2)' : 'var(--text-4)',
                            fontSize: '12px',
                            fontFamily: "'JetBrains Mono', monospace",
                            cursor: hasKey ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: hasKey ? 1 : 0.6
                          }}
                        >
                          {activeModel === model.id && (
                            <span style={{ color: 'var(--success)' }}>✓</span>
                          )}
                          {model.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {Object.keys(models).length === 0 && (
                <div style={{ color: 'var(--text-3)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>
                  Loading models...
                </div>
              )}
            </div>
          )}

          {activeTab === 'api-keys' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {PROVIDERS.map((provider) => (
                <div
                  key={provider.id}
                  style={{
                    padding: '14px 16px',
                    backgroundColor: 'var(--surface2)',
                    border: '1px solid var(--border2)',
                    borderRadius: '10px'
                  }}
                >
                  {/* Top row: provider name + colored dot + "Get API Key" link */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: provider.color }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{provider.label}</span>
                      {configuredKeys[provider.id] && (
                        <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: 'var(--success)', color: '#fff', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace" }}>ACTIVE</span>
                      )}
                    </div>
                    <a
                      href={provider.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", textDecoration: 'none' }}
                    >
                      Get API Key ↗
                    </a>
                  </div>

                  {/* Input row */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="password"
                      placeholder={configuredKeys[provider.id] ? configuredKeys[provider.id].masked : 'sk-...'}
                      value={inputValues[provider.id] || ''}
                      onChange={e => setInputValues(prev => ({ ...prev, [provider.id]: e.target.value }))}
                      style={{
                        flex: 1,
                        height: '34px',
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border2)',
                        borderRadius: '8px',
                        padding: '0 12px',
                        fontSize: '12px',
                        color: 'var(--text-1)',
                        fontFamily: "'JetBrains Mono', monospace",
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border2)'}
                    />
                    <button
                      onClick={() => saveKey(provider.id)}
                      disabled={!inputValues[provider.id] || saving[provider.id]}
                      style={{
                        height: '34px',
                        padding: '0 14px',
                        backgroundColor: inputValues[provider.id] && !saving[provider.id] ? 'var(--accent)' : 'var(--surface)',
                        border: '1px solid var(--border2)',
                        borderRadius: '8px',
                        color: inputValues[provider.id] && !saving[provider.id] ? '#fff' : 'var(--text-3)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: inputValues[provider.id] && !saving[provider.id] ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                        minWidth: '60px'
                      }}
                    >
                      {saving[provider.id] ? '...' : 'Save'}
                    </button>
                    {configuredKeys[provider.id] && (
                      <button
                        onClick={() => deleteKey(provider.id)}
                        style={{
                          height: '34px',
                          width: '34px',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--error)',
                          borderRadius: '8px',
                          color: 'var(--error)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6m4-6v6" /><path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'general' && (
            <div style={{ color: 'var(--text-2)', fontSize: '14px', lineHeight: '1.6' }}>
              <p style={{ margin: 0 }}>
                General settings are currently not implemented in the backend, but this panel is wired up and ready for future options (e.g. custom prompts, key management).
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={onClose}
            className="btn-hover"
            style={{
              padding: '8px 24px',
              backgroundColor: 'var(--surface2)',
              color: 'var(--text-1)',
              fontWeight: 500,
              border: '1px solid var(--border)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'background-color 0.2s',
              boxShadow: 'none',
              fontFamily: "'Inter', sans-serif"
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-soft)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
