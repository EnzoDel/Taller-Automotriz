import { useEffect, useState } from 'react';
import api from '../services/api';

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—';

const formatCurrency = (value) => value === null || value === undefined
  ? 'Sin factura'
  : Number(value).toLocaleString('es-EC', { style: 'currency', currency: 'USD' });

export default function HistoryPage() {
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isCurrent = true;

    const loadHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/history', {
          params: {
            q: searchTerm || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
            page,
            limit: 20
          }
        });
        if (isCurrent) {
          setRecords(response.data.data);
          setPagination(response.data.pagination);
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.response?.data?.message || 'No se pudo cargar el histórico.');
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    loadHistory();
    return () => {
      isCurrent = false;
    };
  }, [searchTerm, fromDate, toDate, page]);

  const resetPageAndSet = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Histórico de trabajos</h2>
        <p className="mt-1 text-sm text-slate-600">Órdenes cerradas y trabajos realizados</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 pb-5">
        <label className="min-w-56 flex-1 space-y-1 text-sm font-medium text-slate-700">
          Buscar
          <input className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" type="search" placeholder="Orden, placa, cliente o trabajo" value={searchTerm} onChange={resetPageAndSet(setSearchTerm)} />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Desde
          <input className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-normal" type="date" value={fromDate} onChange={resetPageAndSet(setFromDate)} />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Hasta
          <input className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-normal" type="date" value={toDate} onChange={resetPageAndSet(setToDate)} />
        </label>
        <p className="pb-2 text-sm text-slate-500">{pagination.total} registros</p>
      </div>

      {error && <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        {loading ? <p className="p-4 text-sm text-slate-600" role="status">Cargando histórico...</p> : records.length === 0 ? <p className="p-4 text-sm text-slate-600">No hay trabajos cerrados para estos filtros.</p> : (
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="px-4 py-3 font-semibold">Salida / orden</th><th className="px-4 py-3 font-semibold">Vehículo</th><th className="px-4 py-3 font-semibold">Cliente</th><th className="px-4 py-3 font-semibold">Trabajo realizado</th><th className="px-4 py-3 font-semibold">Factura</th><th className="px-4 py-3 font-semibold">Detalle</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{records.map((record) => <tr key={record.historyId}>
              <td className="whitespace-nowrap px-4 py-3"><span className="font-semibold text-slate-900">{formatDate(record.exitDate)}</span><span className="mt-1 block text-xs text-slate-500">OT-{String(record.workOrderId).padStart(5, '0')}</span></td>
              <td className="whitespace-nowrap px-4 py-3">{record.plate}<span className="mt-1 block text-xs text-slate-500">{record.make} {record.model}, {record.year}</span></td>
              <td className="px-4 py-3">{record.clientName}<span className="mt-1 block text-xs text-slate-500">{record.clientPhone}</span></td>
              <td className="max-w-sm px-4 py-3">{record.workPerformed}</td>
              <td className="whitespace-nowrap px-4 py-3">{record.invoiceNumber ? `F-${String(record.invoiceNumber).padStart(6, '0')}` : '—'}<span className="mt-1 block text-xs text-slate-500">{formatCurrency(record.invoiceTotal)}</span></td>
              <td className="px-4 py-3"><details><summary className="cursor-pointer text-xs font-semibold text-sky-800">Ver orden</summary><div className="mt-2 min-w-56 space-y-1 text-xs text-slate-600"><p><strong>Solicitado:</strong> {record.requestedJobs}</p>{record.plannedJobs && <p><strong>Planificado:</strong> {record.plannedJobs}</p>}{record.observations && <p><strong>Observaciones:</strong> {record.observations}</p>}<p><strong>Operario:</strong> {record.assignedOperator || '—'}</p><p><strong>Ingreso:</strong> {formatDate(record.entryDate)}</p><p><strong>Kilometraje:</strong> {Number(record.mileage).toLocaleString('es-EC')} km</p></div></details></td>
            </tr>)}</tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-600">Página {pagination.page} de {Math.max(1, pagination.totalPages)}</p>
        <div className="flex gap-2">
          <button className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}>Anterior</button>
          <button className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))} disabled={page >= pagination.totalPages || loading}>Siguiente</button>
        </div>
      </div>
    </section>
  );
}