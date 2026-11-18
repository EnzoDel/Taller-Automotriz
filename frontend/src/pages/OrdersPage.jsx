import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { downloadPdf, sendPdfByWhatsApp } from '../services/documents';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  plate: '',
  requestedJobs: '',
  plannedJobs: '',
  observations: '',
  assignedOperator: ''
};

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—';

export default function OrdersPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('workOrders:create');
  const canClose = hasPermission('workOrders:close');
  const canSendWhatsApp = hasPermission('workOrders:send');
  const [orders, setOrders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [formData, setFormData] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [closingOrder, setClosingOrder] = useState(null);
  const [workPerformed, setWorkPerformed] = useState('');
  const [nextMaintenance, setNextMaintenance] = useState('');
  const [closing, setClosing] = useState(false);
  const [documentActionId, setDocumentActionId] = useState('');

  useEffect(() => {
    let isCurrent = true;

    const loadOrders = async () => {
      setLoading(true);
      setError('');
      try {
        const [orderResponse, vehicleResponse] = await Promise.all([
          api.get('/work-orders', { params: searchTerm ? { q: searchTerm } : undefined }),
          api.get('/vehicles')
        ]);
        if (isCurrent) {
          setOrders(orderResponse.data.data);
          setVehicles(vehicleResponse.data.data);
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.response?.data?.message || 'No se pudieron cargar las órdenes de trabajo.');
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    loadOrders();
    return () => {
      isCurrent = false;
    };
  }, [searchTerm, refreshKey]);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.plate === formData.plate);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/work-orders', {
        plate: formData.plate,
        requestedJobs: formData.requestedJobs.trim(),
        plannedJobs: formData.plannedJobs.trim() || null,
        observations: formData.observations.trim() || null,
        assignedOperator: formData.assignedOperator.trim() || null
      });
      const orderId = String(response.data.data.workOrderId).padStart(5, '0');
      setFormData(emptyForm);
      setFormOpen(false);
      setMessage(`Orden OT-${orderId} registrada correctamente.`);
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo registrar la orden de trabajo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseOrder = async (event) => {
    event.preventDefault();
    setClosing(true);
    setError('');
    setMessage('');

    try {
      const response = await api.patch(`/work-orders/${closingOrder.workOrderId}/close`, {
        workPerformed: workPerformed.trim(),
        nextMaintenance
      });
      setMessage(`Orden OT-${String(response.data.data.workOrderId).padStart(5, '0')} cerrada y enviada al Histórico.`);
      setClosingOrder(null);
      setWorkPerformed('');
      setNextMaintenance('');
      window.dispatchEvent(new Event('maintenance-updated'));
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.errors?.[0]?.msg || requestError.response?.data?.message || 'No se pudo cerrar la orden.');
    } finally {
      setClosing(false);
    }
  };

  const handleDownloadOrderPdf = async (order) => {
    setDocumentActionId(`download-${order.workOrderId}`);
    setError('');
    setMessage('');
    try {
      await downloadPdf(`/work-orders/${order.workOrderId}/pdf`, `orden-${order.workOrderId}.pdf`);
      setMessage(`PDF de la orden OT-${String(order.workOrderId).padStart(5, '0')} descargado.`);
    } catch {
      setError('No se pudo descargar el PDF de la orden.');
    } finally {
      setDocumentActionId('');
    }
  };

  const handleSendOrderPdf = async (order) => {
    if (!order.whatsappOptIn) {
      setError('El cliente no ha autorizado recibir documentos por WhatsApp.');
      return;
    }
    if (!window.confirm(`¿Enviar la orden OT-${String(order.workOrderId).padStart(5, '0')} al WhatsApp de ${order.clientName}?`)) {
      return;
    }

    setDocumentActionId(`whatsapp-${order.workOrderId}`);
    setError('');
    setMessage('');
    try {
      await sendPdfByWhatsApp(`/work-orders/${order.workOrderId}/whatsapp`);
      setMessage('Orden enviada por WhatsApp.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo enviar la orden por WhatsApp.');
    } finally {
      setDocumentActionId('');
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Órdenes de trabajo</h2>
          <p className="mt-1 text-sm text-slate-600">Recepción de vehículos y trabajos solicitados</p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <label className="min-w-56 flex-1 sm:w-72">
            <span className="sr-only">Buscar órdenes</span>
            <input className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" type="search" placeholder="Buscar orden, placa o cliente" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </label>
          {canCreate && <button className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800" type="button" onClick={() => { setError(''); setFormOpen((current) => !current); }}>{formOpen ? 'Cerrar formulario' : 'Ingresar orden'}</button>}
          {hasPermission('history:read') && <Link className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/historial">Ver histórico</Link>}
        </div>
      </div>

      {error && !closingOrder && <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      {message && <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{message}</p>}

      {canCreate && vehicles.length === 0 && !loading && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>Registra primero el cliente y su vehículo para poder ingresar una orden de trabajo.</p>
          <Link className="font-semibold underline" to="/vehiculos">Ir a vehículos</Link>
        </div>
      )}

      {formOpen && (
        <form className="space-y-5 rounded border border-slate-200 bg-white p-5" onSubmit={handleSubmit}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Recepción de vehículo</h3>
              <p className="mt-1 text-sm text-slate-600">El número y la fecha de ingreso se asignan automáticamente.</p>
            </div>
            <span className="rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase text-slate-600">Parte interna de trabajo</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">Vehículo que ingresa
              <select className="w-full rounded border border-slate-300 bg-white px-3 py-2 font-normal" name="plate" required value={formData.plate} onChange={handleChange}>
                <option value="">Selecciona un vehículo</option>
                {vehicles.map((vehicle) => <option key={vehicle.plate} value={vehicle.plate}>{vehicle.plate} · {vehicle.make} {vehicle.model} · {vehicle.clientName}</option>)}
              </select>
            </label>
          </div>

          {selectedVehicle && (
            <dl className="grid gap-x-6 gap-y-3 border-y border-slate-200 py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-xs uppercase text-slate-500">Cliente</dt><dd className="mt-1 font-medium text-slate-900">{selectedVehicle.clientName}</dd></div>
              <div><dt className="text-xs uppercase text-slate-500">Teléfono</dt><dd className="mt-1 text-slate-800">{selectedVehicle.clientPhone}</dd></div>
              <div><dt className="text-xs uppercase text-slate-500">Vehículo</dt><dd className="mt-1 text-slate-800">{selectedVehicle.make} {selectedVehicle.model}, {selectedVehicle.year}</dd></div>
              <div><dt className="text-xs uppercase text-slate-500">Kilometraje</dt><dd className="mt-1 text-slate-800">{Number(selectedVehicle.mileage).toLocaleString('es-EC')} km</dd></div>
            </dl>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">Trabajos solicitados
              <textarea className="min-h-32 w-full resize-y rounded border border-slate-300 px-3 py-2 font-normal" name="requestedJobs" maxLength="5000" required value={formData.requestedJobs} onChange={handleChange} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">Trabajos a realizar
              <textarea className="min-h-32 w-full resize-y rounded border border-slate-300 px-3 py-2 font-normal" name="plannedJobs" maxLength="5000" value={formData.plannedJobs} onChange={handleChange} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">Observaciones
              <textarea className="min-h-24 w-full resize-y rounded border border-slate-300 px-3 py-2 font-normal" name="observations" maxLength="5000" value={formData.observations} onChange={handleChange} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">Operario encargado
              <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="assignedOperator" maxLength="100" value={formData.assignedOperator} onChange={handleChange} />
            </label>
          </div>

          <div className="flex justify-end">
            <button className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60" type="submit" disabled={submitting || vehicles.length === 0}>{submitting ? 'Registrando...' : 'Registrar orden de trabajo'}</button>
          </div>
        </form>
      )}

      {closingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form className="w-full max-w-xl space-y-4 rounded border border-slate-200 bg-white p-6 shadow-xl" onSubmit={handleCloseOrder} role="dialog" aria-modal="true" aria-labelledby="close-order-title">
            <div>
              <h3 id="close-order-title" className="text-lg font-semibold text-slate-900">Cerrar orden OT-{String(closingOrder.workOrderId).padStart(5, '0')}</h3>
              <p className="mt-1 text-sm text-slate-600">Registra el trabajo realizado; se guardará en el Histórico junto con la fecha de salida.</p>
            </div>
            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            <label className="block space-y-1 text-sm font-medium text-slate-700">Trabajo realizado
              <textarea className="min-h-32 w-full rounded border border-slate-300 px-3 py-2 font-normal" maxLength="5000" required value={workPerformed} onChange={(event) => setWorkPerformed(event.target.value)} />
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">Fecha del próximo mantenimiento
              <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" type="date" required value={nextMaintenance} onChange={(event) => setNextMaintenance(event.target.value)} />
              <span className="block text-xs font-normal text-slate-500">La alerta aparecerá a partir de esta fecha.</span>
            </label>
            <div className="flex justify-end gap-3">
              <button className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => { setClosingOrder(null); setNextMaintenance(''); setError(''); }} disabled={closing}>Cancelar</button>
              <button className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60" type="submit" disabled={closing}>{closing ? 'Cerrando...' : 'Cerrar orden'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        {loading ? <p className="p-4 text-sm text-slate-600" role="status">Cargando órdenes...</p> : orders.length === 0 ? <p className="p-4 text-sm text-slate-600">No hay órdenes de trabajo registradas.</p> : (
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="px-4 py-3 font-semibold">Orden / ingreso</th><th className="px-4 py-3 font-semibold">Vehículo</th><th className="px-4 py-3 font-semibold">Cliente</th><th className="px-4 py-3 font-semibold">Operario</th><th className="px-4 py-3 font-semibold">Trabajos solicitados</th><th className="px-4 py-3 font-semibold">Estado</th><th className="px-4 py-3 font-semibold">Documentos</th>{canClose && <th className="px-4 py-3 font-semibold">Acción</th>}</tr></thead>
            <tbody className="divide-y divide-slate-100">{orders.map((order) => <tr key={order.workOrderId}><td className="whitespace-nowrap px-4 py-3"><span className="font-semibold text-slate-900">OT-{String(order.workOrderId).padStart(5, '0')}</span><span className="mt-1 block text-xs text-slate-500">{formatDate(order.entryDate)}</span></td><td className="whitespace-nowrap px-4 py-3">{order.plate}<span className="mt-1 block text-xs text-slate-500">{order.make} {order.model}</span></td><td className="px-4 py-3">{order.clientName}<span className="mt-1 block text-xs text-slate-500">{order.clientPhone}</span></td><td className="px-4 py-3">{order.assignedOperator || '—'}</td><td className="max-w-sm px-4 py-3"><p className="line-clamp-2">{order.requestedJobs}</p>{(order.plannedJobs || order.observations) && <details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">Ver detalles de recepción</summary>{order.plannedJobs && <p className="mt-2"><strong>Por realizar:</strong> {order.plannedJobs}</p>}{order.observations && <p className="mt-1"><strong>Observaciones:</strong> {order.observations}</p>}</details>}</td><td className="whitespace-nowrap px-4 py-3"><span className={order.exitDate ? 'rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800' : 'rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800'}>{order.exitDate ? 'Cerrada' : 'En taller'}</span></td><td className="whitespace-nowrap px-4 py-3"><div className="flex flex-col items-start gap-2"><button className="text-xs font-semibold text-sky-800 underline disabled:text-slate-400" type="button" onClick={() => handleDownloadOrderPdf(order)} disabled={Boolean(documentActionId)}>{documentActionId === `download-${order.workOrderId}` ? 'Generando...' : 'Descargar PDF'}</button>{canSendWhatsApp && <button className="text-xs font-semibold text-emerald-800 underline disabled:text-slate-400" type="button" onClick={() => handleSendOrderPdf(order)} disabled={Boolean(documentActionId) || !order.whatsappOptIn} title={order.whatsappOptIn ? 'Enviar PDF por WhatsApp' : 'El cliente no autorizó WhatsApp'}>{documentActionId === `whatsapp-${order.workOrderId}` ? 'Enviando...' : order.whatsappOptIn ? 'Enviar WhatsApp' : 'Sin autorización'}</button>}</div></td>{canClose && <td className="whitespace-nowrap px-4 py-3">{!order.exitDate && <button className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => { setClosingOrder(order); setWorkPerformed(''); }}>Cerrar orden</button>}</td>}</tr>)}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}
