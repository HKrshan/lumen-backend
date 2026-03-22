import { useState } from 'react';
import { useTasks } from '../api/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { SidebarSkeleton } from './Skeleton';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Sidebar({ activeTaskId, onSelectTask, onOpenSettings, onNewTask, searchQuery }) {
  const { data: tasks = [], isLoading, isError } = useTasks();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Filter tasks by search query
  const filteredTasks = searchQuery
    ? tasks.filter(task => {
      const displayTitle = task.title || task.query || '';
      return displayTitle.toLowerCase().includes(searchQuery.toLowerCase());
    })
    : tasks;

  const saveTitle = async (taskId, title) => {
    try {
      await fetch(`${API_URL}/tasks/${taskId}/title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      queryClient.invalidateQueries(['tasks']);
    } catch (err) {
      console.error('Failed to save title:', err);
    }
  };

  const handleTitleDoubleClick = (task) => {
    setEditingId(task.id);
    setEditValue(task.title || task.query || '');
  };

  return (
    <aside style={{
      position: 'fixed',
      top: '52px',
      left: 0,
      height: 'calc(100vh - 52px)',
      width: '240px',
      backgroundColor: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50
    }}>
      {/* Top: Branding */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
        <h1
          className="split-text"
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '20px',
            letterSpacing: '-0.02em',
            margin: 0,
            background: 'linear-gradient(90deg, var(--text-1), var(--accent))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          LUMEN
        </h1>
      </div>

      {/* New Task Button */}
      <div style={{ padding: '8px 16px 0' }}>
        <button
          onClick={onNewTask}
          style={{
            width: '100%',
            height: '36px',
            backgroundColor: 'var(--accent-soft)',
            border: '1px solid var(--accent)',
            borderRadius: '8px',
            color: 'var(--accent)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontFamily: "'Inter', sans-serif",
            transition: 'all 0.2s'
          }}
          onMouseOver={e => { e.currentTarget.style.backgroundColor = 'var(--accent)'; e.currentTarget.style.color = '#fff'; }}
          onMouseOut={e => { e.currentTarget.style.backgroundColor = 'var(--accent-soft)'; e.currentTarget.style.color = 'var(--accent)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Task
        </button>
      </div>

      {/* Middle: Task History */}
      <div style={{ padding: '16px 16px 8px' }}>
        <h2 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-3)', fontWeight: 600, margin: 0 }}>
          Research History
        </h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
        {isLoading && <SidebarSkeleton />}
        {isError && <div style={{ color: 'var(--error)', fontSize: '13px', padding: '8px' }}>Error loading tasks.</div>}

        {!isLoading && !isError && [...filteredTasks].reverse().map((task) => {
          const isActive = task.id === activeTaskId;
          const isRunning = task.status === 'running';
          const displayTitle = task.title || task.query?.slice(0, 30) || `Task ${task.id.slice(0, 8)}`;

          return (
            <button
              key={task.id}
              onClick={() => onSelectTask?.(task.id)}
              onDoubleClick={() => handleTitleDoubleClick(task)}
              className="btn-hover task-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 12px',
                marginTop: '4px',
                backgroundColor: isActive ? 'var(--sidebar)' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? 'var(--accent)' : 'transparent',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                fontFamily: 'inherit',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '12px', flexShrink: 0 }}>
                  {isRunning ? (
                    <div className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent)' }} />
                  ) : (
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: task.status === 'done' ? 'var(--success)' : task.status === 'failed' ? 'var(--error)' : 'var(--text-3)'
                    }} />
                  )}
                </div>

                {editingId === task.id ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => { saveTitle(task.id, editValue); setEditingId(null); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { saveTitle(task.id, editValue); setEditingId(null); }
                      if (e.key === 'Escape') { setEditingId(null); }
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--accent)',
                      color: 'var(--text-1)',
                      fontSize: '13px',
                      fontFamily: "'Inter', sans-serif",
                      outline: 'none',
                      width: '100%',
                      padding: '2px 0'
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span style={{
                    fontSize: '13px',
                    fontWeight: isActive ? 500 : 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1
                  }}>
                    {displayTitle}
                  </span>
                )}
              </div>

              {/* Edit icon - shows on hover */}
              {editingId !== task.id && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="edit-icon"
                  style={{
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    flexShrink: 0,
                    marginLeft: '8px',
                    color: 'var(--text-3)'
                  }}
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom: Settings */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={onOpenSettings}
          className="settings-icon-hover"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '10px 12px',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--text-2)',
            cursor: 'pointer',
            borderRadius: '6px',
            fontFamily: 'inherit',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'color 0.2s, background-color 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.backgroundColor = 'var(--sidebar)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <svg className="settings-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Settings
        </button>
      </div>
    </aside>
  );
}
