import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useTaskDetails, useTasks } from './api/hooks';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AgentLog from './components/AgentLog';
import ReportViewer from './components/ReportViewer';
import ResearchInput from './components/ResearchInput';
import SettingsPanel from './components/SettingsPanel';
import CanvasView from './components/CanvasView';
import AuthScreen from './components/AuthScreen';
import { SidebarSkeleton } from './components/Skeleton';

// Utility to wrap text in spans for letter-by-letter reveal
function splitTextToSpans() {
  document.querySelectorAll('.split-text').forEach((el) => {
    const text = el.innerText;
    el.innerHTML = '';
    text.split('').forEach((char, i) => {
      const span = document.createElement('span');
      span.className = 'char-span';
      span.style.animationDelay = `${i * 0.04}s`;
      span.innerHTML = char === ' ' ? '&nbsp;' : char;
      el.appendChild(span);
    });
    el.classList.remove('split-text');
  });
}

export default function App() {
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-6');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCanvas, setShowCanvas] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check auth session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: currentTask } = useTaskDetails(activeTaskId);
  const { data: tasks = [] } = useTasks();

  const currentTaskTitle = tasks?.find(t => t.id === activeTaskId)?.query || null;

  // Responsive sidebar: auto-close on narrow screens
  useEffect(() => {
    const handler = () => { if (window.innerWidth < 768) setSidebarOpen(false); };
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // IntersectionObserver for trigger-reveal animations on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('anim-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -20px 0px' }
    );

    const observeTargets = () => {
      const targets = document.querySelectorAll('.anim-target:not(.anim-visible)');
      targets.forEach((el) => observer.observe(el));
    };

    observeTargets();

    const mutationObserver = new MutationObserver(() => {
      observeTargets();
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  // Split text into spans for charReveal animation
  useEffect(() => {
    splitTextToSpans();
  }, []);

  const handleTaskCreated = (taskId) => {
    setActiveTaskId(taskId);
  };

  const handleSelectTask = (taskId) => {
    setActiveTaskId(taskId);
  };

  const handleNewTask = () => {
    setActiveTaskId(null);
    setShowCanvas(false);
    setTimeout(() => document.querySelector('textarea')?.focus(), 100);
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(o => !o);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const isTaskDone = currentTask?.status === 'done';
  const hasSources = currentTask?.sources && currentTask.sources.length > 0;

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg)'
      }}>
        <div className="pulse-dot" style={{ width: '16px', height: '16px', backgroundColor: 'var(--accent)', borderRadius: '50%' }} />
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!user) {
    return <AuthScreen onAuth={setUser} />;
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg)',
      color: 'var(--text-1)',
      overflow: 'hidden',
      position: 'relative'
    }}>

      {/* Navbar */}
      <Navbar
        currentTaskTitle={currentTaskTitle}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        user={user}
        onLogout={handleLogout}
      />

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && window.innerWidth < 768 && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 49
          }}
        />
      )}

      {/* Left Sidebar */}
      {sidebarOpen && (
        <Sidebar
          activeTaskId={activeTaskId}
          onSelectTask={handleSelectTask}
          onOpenSettings={() => setSettingsOpen(true)}
          onNewTask={handleNewTask}
          searchQuery={searchQuery}
        />
      )}

      {/* Main Content Area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          filter: showCanvas ? 'blur(6px)' : 'none',
          transition: 'filter 0.3s ease',
          pointerEvents: showCanvas ? 'none' : 'auto',
          paddingTop: '52px'
        }}
      >

        {/* Top/Middle: Agent Log or ReportViewer */}
        <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>

          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {activeTaskId && currentTask && currentTask.status !== 'done' ? (
              <AgentLog
                taskId={activeTaskId}
                selectedModel={selectedModel}
              />
            ) : activeTaskId && isTaskDone ? (
              <ReportViewer
                taskId={activeTaskId}
                onOpenCanvas={() => setShowCanvas(true)}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', letterSpacing: '0.1em' }}>
                START_A_RESEARCH_TASK
              </div>
            )}
          </main>
        </div>

        {/* Bottom Bar: Research Input */}
        <ResearchInput
          onTaskCreated={handleTaskCreated}
          currentModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>

      {/* Full-screen Canvas View (overlay with blur) */}
      {showCanvas && (
        <CanvasView
          taskId={activeTaskId}
          onClose={() => setShowCanvas(false)}
        />
      )}

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

    </div>
  );
}
