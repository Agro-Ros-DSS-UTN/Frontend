export const PageLoader = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    width: '100%',
    color: 'var(--text-secondary, #64748b)',
    fontSize: '0.95rem',
    gap: '12px',
    padding: '40px 20px'
  }}>
    <div style={{
      width: '28px',
      height: '28px',
      border: '3px solid rgba(28, 58, 94, 0.15)',
      borderTopColor: '#1c3a5e',
      borderRadius: '50%',
      animation: 'agroros-spin 0.7s linear infinite'
    }} />
    <span>Cargando contenido…</span>
    <style>{`@keyframes agroros-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default PageLoader;
