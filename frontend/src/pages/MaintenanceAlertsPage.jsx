import { Link } from 'react-router-dom';

export default function MaintenanceAlertsPage({ alerts, error, loading }) {
  const dueCount = alerts.filter((alert) => alert.status === 'due').length;
  const overdueCount = alerts.filter((alert) => alert.status === 'overdue').length;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Alertas de mantenimiento</h2>
        <p className="mt-1 text-sm text-slate-600">Mantenimientos programados para hoy o vencidos. Se actualizan cada minuto.</p>
      </div>

      {error && <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error} {alerts.length > 0 && 'Se muestran los últimos datos disponibles.'}</p>}

      {!loading && !error && (
        <div className="grid gap-4 sm:grid-cols-2">
          <article className="rounded border border-amber-200 bg-white p-4">
            <p className="text-sm text-slate-600">Para hoy</p>
            <p className="mt-2 text-2xl font-semibold text-amber-700">{dueCount}</p>
          </article>
          <article className="rounded border border-red-200 bg-white p-4">
            <p className="text-sm text-slate-600">Vencidos</p>
            <p className="mt-2 text-2xl font-semibold text-red-700">{overdueCount}</p>
          </article>
        </div>
      )}

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        {loading ? (
          <p className="p-4 text-sm text-slate-600" role="status">Cargando alertas...</p>
        ) : error && alerts.length === 0 ? (
          <p className="p-4 text-sm text-slate-600">No hay datos disponibles. La consulta se volverá a intentar automáticamente.</p>
        ) : alerts.length === 0 ? (
          <p className="p-4 text-sm text-slate-600">No hay mantenimientos para hoy ni vencidos.</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr><th className="px-4 py-3 font-semibold">Placa</th><th className="px-4 py-3 font-semibold">Cliente</th><th className="px-4 py-3 font-semibold">Fecha programada</th><th className="px-4 py-3 font-semibold">Estado</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alerts.map((alert) => (
                <tr key={alert.plate}>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{alert.plate}</td>
                  <td className="px-4 py-3">{alert.clientName}</td>
                  <td className="whitespace-nowrap px-4 py-3">{alert.nextMaintenance}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-1 text-xs font-semibold ${alert.status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
                      {alert.status === 'overdue' ? 'Vencido' : 'Para hoy'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Link className="inline-block text-sm font-semibold text-sky-800 underline" to="/vehiculos">Ver todos los vehículos</Link>
    </section>
  );
}
