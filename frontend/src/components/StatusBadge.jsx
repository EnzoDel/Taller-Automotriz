export default function StatusBadge({ status = 'Pendiente' }) {
  const palette = {
    Pendiente: '#f59e0b',
    En_proceso: '#3b82f6',
    Completado: '#10b981',
    Rechazado: '#ef4444'
  };

  return (
    <span
      style={{
        display: 'inline-block',
        background: palette[status] || '#6b7280',
        color: '#fff',
        borderRadius: 999,
        padding: '0.35rem 0.7rem',
        fontSize: '0.8rem',
        fontWeight: 700
      }}
    >
      {status}
    </span>
  );
}
