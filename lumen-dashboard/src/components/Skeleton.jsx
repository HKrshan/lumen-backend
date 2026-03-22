export function SkeletonLine({ width = '100%', height = '14px', style = {} }) {
  return (
    <div style={{
      width,
      height,
      backgroundColor: 'var(--surface2)',
      borderRadius: '6px',
      animation: 'skeletonPulse 1.5s ease-in-out infinite',
      ...style
    }} />
  );
}

export function TaskSkeleton() {
  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--surface2)' }} />
          <SkeletonLine width={`${60 + i * 15}%`} height="12px" />
        </div>
      ))}
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '860px', margin: '0 auto' }}>
      <SkeletonLine width="60%" height="28px" />
      <SkeletonLine width="100%" height="14px" />
      <SkeletonLine width="90%" height="14px" />
      <SkeletonLine width="95%" height="14px" />
      <SkeletonLine width="40%" height="22px" style={{ marginTop: '16px' }} />
      <SkeletonLine width="100%" height="14px" />
      <SkeletonLine width="85%" height="14px" />
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <SkeletonLine width="80px" height="20px" />
      </div>
      <div style={{ marginBottom: '16px' }}>
        <SkeletonLine width="100%" height="36px" />
      </div>
      <div style={{ marginBottom: '12px' }}>
        <SkeletonLine width="120px" height="12px" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--surface2)' }} />
            <SkeletonLine width={`${50 + i * 10}%`} height="13px" />
          </div>
        ))}
      </div>
    </div>
  );
}
