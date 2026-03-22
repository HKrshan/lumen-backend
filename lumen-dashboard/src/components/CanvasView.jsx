import { useEffect, useRef, useState } from 'react';
import { useTaskDetails } from '../api/hooks';
import { X, Minus, Plus, RotateCcw } from 'lucide-react';

export default function CanvasView({ taskId, onClose }) {
  const { data: task, isLoading } = useTaskDetails(taskId);
  const sources = task?.sources || [];

  const containerRef = useRef(null);
  const canvasInnerRef = useRef(null);
  const dragging = useRef({ active: false, nodeId: null, startX: 0, startY: 0 });

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Initialize nodes with random positions
  useEffect(() => {
    if (!sources || sources.length === 0) return;

    const initializedNodes = sources.map((src, i) => {
      const angle = (i / sources.length) * 2 * Math.PI;
      const radius = 200 + Math.random() * 300;
      return {
        id: i,
        url: src.url,
        title: src.title || src.url,
        snippet: src.snippet || '',
        image: src.image,
        domain: new URL(src.url).hostname,
        x: 400 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius,
      };
    });

    setNodes(initializedNodes);

    // Compute edges based on keyword overlap
    const computedEdges = [];
    for (let i = 0; i < initializedNodes.length; i++) {
      for (let j = i + 1; j < initializedNodes.length; j++) {
        const nodeA = initializedNodes[i];
        const nodeB = initializedNodes[j];

        const keywordsA = new Set(nodeA.snippet.toLowerCase().split(/\s+/).filter(w => w.length > 4));
        const keywordsB = new Set(nodeB.snippet.toLowerCase().split(/\s+/).filter(w => w.length > 4));

        const overlap = [...keywordsA].filter(w => keywordsB.has(w)).length;

        if (overlap >= 2) {
          computedEdges.push({ from: nodeA.id, to: nodeB.id, weight: overlap });
        }
      }
    }

    setEdges(computedEdges);
  }, [sources]);

  // Node dragging
  const onNodeMouseDown = (e, id) => {
    e.stopPropagation();
    dragging.current = { active: true, nodeId: id, startX: e.clientX, startY: e.clientY };
  };

  // Pan on empty space
  const onCanvasMouseDown = (e) => {
    dragging.current = { active: true, nodeId: null, startX: e.clientX, startY: e.clientY };
  };

  const onMouseMove = (e) => {
    if (!dragging.current.active) return;
    const dx = e.clientX - dragging.current.startX;
    const dy = e.clientY - dragging.current.startY;
    dragging.current.startX = e.clientX;
    dragging.current.startY = e.clientY;
    if (dragging.current.nodeId !== null) {
      setNodes(prev => prev.map(n =>
        n.id === dragging.current.nodeId
          ? { ...n, x: n.x + dx / zoom, y: n.y + dy / zoom }
          : n
      ));
    } else {
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  const onMouseUp = () => {
    dragging.current.active = false;
    dragging.current.nodeId = null;
  };

  const onWheel = (e) => {
    e.preventDefault();
    setZoom(prev => Math.min(Math.max(prev - e.deltaY * 0.001, 0.3), 2.5));
  };

  // Attach wheel listener with passive: false
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener('wheel', onWheel, { passive: false });
      return () => el.removeEventListener('wheel', onWheel);
    }
  }, []);

  // Touch pan support
  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      dragging.current = {
        active: true,
        nodeId: null,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY
      };
    }
  };

  const onTouchMove = (e) => {
    if (!dragging.current.active || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragging.current.startX;
    const dy = e.touches[0].clientY - dragging.current.startY;
    dragging.current.startX = e.touches[0].clientX;
    dragging.current.startY = e.touches[0].clientY;
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  // Pinch zoom support
  const lastPinchDist = useRef(0);
  const onTouchStartPinch = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const onTouchMovePinch = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = dist - lastPinchDist.current;
      lastPinchDist.current = dist;
      setZoom(prev => Math.min(Math.max(prev + delta * 0.005, 0.3), 2.5));
    }
  };

  const handleNodeClick = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const zoomIn = () => setZoom(z => Math.min(z + 0.15, 2.5));
  const zoomOut = () => setZoom(z => Math.max(z - 0.15, 0.3));
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  if (isLoading || !taskId) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        backgroundColor: 'rgba(9, 9, 15, 0.85)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          position: 'absolute',
          top: 24,
          right: 24,
          zIndex: 401,
          display: 'flex',
          gap: '8px'
        }}>
          <button onClick={zoomIn} style={{ width: 32, height: 32, backgroundColor: 'rgba(13,13,21,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--text-1)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={16} />
          </button>
          <button onClick={zoomOut} style={{ width: 32, height: 32, backgroundColor: 'rgba(13,13,21,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--text-1)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Minus size={16} />
          </button>
          <button onClick={resetView} style={{ width: 32, height: 32, backgroundColor: 'rgba(13,13,21,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--text-1)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RotateCcw size={14} />
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', letterSpacing: '0.1em' }}>
          LOADING_CANVAS...
        </div>
      </div>
    );
  }

  if (!sources || sources.length === 0) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        backgroundColor: 'rgba(9, 9, 15, 0.85)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          position: 'absolute',
          top: 24,
          right: 24,
          zIndex: 401,
          display: 'flex',
          gap: '8px'
        }}>
          <button onClick={zoomIn} style={{ width: 32, height: 32, backgroundColor: 'rgba(13,13,21,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--text-1)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={16} />
          </button>
          <button onClick={zoomOut} style={{ width: 32, height: 32, backgroundColor: 'rgba(13,13,21,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--text-1)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Minus size={16} />
          </button>
          <button onClick={resetView} style={{ width: 32, height: 32, backgroundColor: 'rgba(13,13,21,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--text-1)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RotateCcw size={14} />
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', letterSpacing: '0.1em' }}>
          NO_SOURCES_AVAILABLE
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        backgroundColor: 'rgba(9, 9, 15, 0.85)',
        backdropFilter: 'blur(2px)',
        overflow: 'hidden',
        cursor: dragging.current.active && dragging.current.nodeId === null ? 'grabbing' : 'grab',
        touchAction: 'none'
      }}
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={(e) => { onTouchStartPinch(e); onTouchStart(e); }}
      onTouchMove={(e) => { onTouchMovePinch(e); onTouchMove(e); }}
      onTouchEnd={() => { dragging.current.active = false; }}
    >
      {/* Control buttons */}
      <div style={{
        position: 'absolute',
        top: 24,
        right: 24,
        zIndex: 401,
        display: 'flex',
        gap: '8px'
      }}>
        <button onClick={zoomIn} title="Zoom In" style={{ width: 32, height: 32, backgroundColor: 'rgba(13,13,21,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--text-1)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(13,13,21,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
        >
          <Plus size={16} />
        </button>
        <button onClick={zoomOut} title="Zoom Out" style={{ width: 32, height: 32, backgroundColor: 'rgba(13,13,21,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--text-1)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(13,13,21,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
        >
          <Minus size={16} />
        </button>
        <button onClick={resetView} title="Reset View" style={{ width: 32, height: 32, backgroundColor: 'rgba(13,13,21,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--text-1)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(13,13,21,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
        >
          <RotateCcw size={14} />
        </button>
        <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
        <button
          onClick={onClose}
          title="Close"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '6px',
            borderRadius: '8px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.borderColor = 'var(--border2)'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Instructions */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: 24,
        zIndex: 401,
        color: 'var(--text-4)',
        fontSize: '11px',
        fontFamily: "'JetBrains Mono', monospace",
        backgroundColor: 'rgba(13,13,21,0.8)',
        backdropFilter: 'blur(12px)',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid var(--border)'
      }}>
        <div>DRAG: Pan canvas</div>
        <div>SCROLL: Zoom</div>
        <div>CLICK_NODE: Open source</div>
        <div>DRAG_NODE: Reposition</div>
      </div>

      {/* Canvas container with transform */}
      <div
        ref={canvasInnerRef}
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {/* Edges SVG overlay */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            width: '100%',
            height: '100%'
          }}
        >
          {edges.map((edge, i) => {
            const fromNode = nodes.find(n => n.id === edge.from);
            const toNode = nodes.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            return (
              <line
                key={i}
                x1={fromNode.x + 100}
                y1={fromNode.y + 80}
                x2={toNode.x + 100}
                y2={toNode.y + 80}
                stroke="rgba(99,102,241,0.2)"
                strokeWidth="1"
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className="canvas-node"
            style={{
              position: 'absolute',
              left: node.x,
              top: node.y,
              width: '200px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '12px',
              cursor: 'pointer',
              transition: 'border-color 0.2s, transform 0.2s',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}
            onClick={() => handleNodeClick(node.url)}
            onMouseDown={(e) => onNodeMouseDown(e, node.id)}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            {node.image && (
              <img
                src={node.image}
                alt=""
                style={{
                  width: '100%',
                  height: '100px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  backgroundColor: 'var(--surface2)'
                }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <div style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-1)',
              lineHeight: '1.4',
              marginBottom: '8px',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
              {node.title}
            </div>
            <div style={{
              fontSize: '10px',
              color: 'var(--accent)',
              fontFamily: "'JetBrains Mono', monospace",
              backgroundColor: 'rgba(99,102,241,0.1)',
              padding: '4px 8px',
              borderRadius: '4px',
              display: 'inline-block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%'
            }}>
              {node.domain}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
