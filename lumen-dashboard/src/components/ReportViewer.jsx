import { useTaskDetails } from '../api/hooks';
import ReactMarkdown from 'react-markdown';
import { Copy, Download } from 'lucide-react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

const faviconUrl = (url) => `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;

export default function ReportViewer({ taskId, onOpenCanvas }) {
  const { data: task, isLoading } = useTaskDetails(taskId);

  if (!taskId) return null;

  const handleCopy = () => {
    if (task?.result) {
      navigator.clipboard.writeText(task.result);
    }
  };

  const handleDownload = () => {
    if (task?.result) {
      const blob = new Blob([task.result], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${taskId.slice(0, 8)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const hasSources = !isLoading && task?.sources && task.sources.length > 0;
  const isDone = task?.status === 'done';

  return (
    <div style={{
      width: '100%',
      maxWidth: '860px',
      margin: '0 auto',
      padding: '48px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.15em', fontFamily: "'JetBrains Mono', monospace" }}>
          REPORT
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleCopy}
            title="Copy Report"
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              color: 'var(--text-2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.backgroundColor = 'var(--sidebar)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
          >
            <Copy size={14} />
          </button>
          <button
            onClick={handleDownload}
            title="Download Report"
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              color: 'var(--text-2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.backgroundColor = 'var(--sidebar)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Report Content */}
      {isLoading ? (
        <div style={{ color: 'var(--text-3)', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace" }}>
          PROCESSING_REPORT...
        </div>
      ) : !task?.result ? (
        <div style={{ color: 'var(--text-3)', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace" }}>
          ERROR: NO_REPORT_AVAILABLE
        </div>
      ) : (
        <div className="markdown-body" style={{ fontSize: '15px', color: 'var(--text-1)', lineHeight: '1.7' }}>
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeHighlight]}
            components={{
              code({ node, inline, className, children, ...props }) {
                return inline ? (
                  <code style={{
                    backgroundColor: 'rgba(99,102,241,0.15)',
                    color: 'var(--accent)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '13px'
                  }} {...props}>{children}</code>
                ) : (
                  <div style={{ position: 'relative', margin: '16px 0' }}>
                    <pre style={{
                      backgroundColor: '#0d0d15',
                      border: '1px solid var(--border2)',
                      borderRadius: '10px',
                      padding: '20px',
                      overflowX: 'auto',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '13px',
                      lineHeight: '1.7',
                      margin: 0
                    }}>
                      <code className={className} {...props}>{children}</code>
                    </pre>
                  </div>
                );
              },
              div({ node, className, children, ...props }) {
                if (className?.includes('math')) {
                  return (
                    <div style={{
                      backgroundColor: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: '10px',
                      padding: '20px 24px',
                      margin: '16px 0',
                      overflowX: 'auto',
                      textAlign: 'center'
                    }} {...props}>{children}</div>
                  );
                }
                return <div {...props}>{children}</div>;
              },
              img({ src, alt }) {
                return (
                  <div style={{ margin: '20px 0', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img
                      src={src}
                      alt={alt}
                      onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                      style={{ width: '100%', display: 'block', cursor: 'zoom-in' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const overlay = document.createElement('div');
                        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out';
                        const img = document.createElement('img');
                        img.src = src;
                        img.style.cssText = 'max-width:90vw;max-height:90vh;border-radius:8px;object-fit:contain';
                        overlay.appendChild(img);
                        overlay.onclick = () => document.body.removeChild(overlay);
                        document.body.appendChild(overlay);
                      }}
                    />
                    {alt && (
                      <p style={{ margin: 0, padding: '8px 12px', fontSize: '12px', color: 'var(--text-3)', fontStyle: 'italic', backgroundColor: 'var(--surface)' }}>
                        {alt}
                      </p>
                    )}
                  </div>
                );
              }
            }}
          >
            {task.result}
          </ReactMarkdown>
        </div>
      )}

      {/* Sources Section */}
      {hasSources && (
        <div style={{
          marginTop: '48px',
          paddingTop: '32px',
          borderTop: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.15em', fontFamily: "'JetBrains Mono', monospace", marginBottom: '16px' }}>
            SOURCES ({task.sources.length})
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {task.sources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  textDecoration: 'none',
                  cursor: 'pointer',
                  display: 'block'
                }}
                onMouseOver={(e) => {
                  const card = e.currentTarget.querySelector('.source-card');
                  if (card) {
                    card.style.borderColor = 'var(--accent)';
                    card.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseOut={(e) => {
                  const card = e.currentTarget.querySelector('.source-card');
                  if (card) {
                    card.style.borderColor = 'var(--border)';
                    card.style.transform = 'none';
                  }
                }}
              >
                <div
                  className="source-card"
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    gap: '12px',
                    transition: 'all 0.2s'
                  }}
                >
                  <img
                    src={src.image || faviconUrl(src.url)}
                    alt=""
                    onError={(e) => { e.currentTarget.src = faviconUrl(src.url); }}
                    style={{
                      width: '48px',
                      height: '48px',
                      objectFit: 'contain',
                      borderRadius: '4px',
                      flexShrink: 0,
                      backgroundColor: 'var(--surface)'
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)', lineHeight: '1.4', marginBottom: '4px' }}>
                      {src.title || src.url}
                    </div>
                    {src.snippet && (
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: '1.5' }}>
                        {src.snippet.slice(0, 120)}{src.snippet.length > 120 ? '...' : ''}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", marginTop: '6px' }}>
                      {new URL(src.url).hostname}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Floating CANVAS button - only show when done and has sources */}
      {isDone && hasSources && onOpenCanvas && (
        <button
          onClick={onOpenCanvas}
          style={{
            position: 'fixed',
            bottom: '110px',
            right: '24px',
            zIndex: 200,
            padding: '10px 18px',
            backgroundColor: 'var(--accent)',
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
            boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#565bec';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(99,102,241,0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent)';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.4)';
          }}
        >
          CANVAS ⬡
        </button>
      )}
    </div>
  );
}
