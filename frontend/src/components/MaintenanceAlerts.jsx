import { Link } from 'react-router-dom';

export default function MaintenanceAlerts({ alerts, error }) {
  return (
    <>
      {error && <p className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      {alerts.length > 0 && (
        <section className="mb-6 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" aria-labelledby="maintenance-alerts-title">
          <h2 id="maintenance-alerts-title" className="font-semibold">Alertas de mantenimiento: {alerts.length}</h2>
          <p className="mt-1">Hay mantenimientos para hoy o vencidos.</p>
          <Link className="mt-2 inline-block font-semibold underline" to="/alertas-mantenimiento">Ver alertas</Link>
        </section>
      )}
    </>
  );
}
