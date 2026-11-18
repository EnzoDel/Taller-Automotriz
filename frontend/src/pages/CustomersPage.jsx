import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  clientId: '',
  name: '',
  phone: '',
  email: '',
  address: '',
  whatsappOptIn: false
};

export default function CustomersPage() {
  const { hasPermission } = useAuth();
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [formData, setFormData] = useState(emptyForm);
  const [editingClient, setEditingClient] = useState(null);
  const [editData, setEditData] = useState(null);
  const [busyClientId, setBusyClientId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isCurrent = true;

    const loadClients = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/clients', {
          params: searchTerm ? { q: searchTerm } : undefined
        });
        if (isCurrent) {
          setClients(response.data.data);
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.response?.data?.message || 'No se pudieron cargar los clientes.');
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    loadClients();
    return () => {
      isCurrent = false;
    };
  }, [searchTerm, refreshKey]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      await api.post('/clients', {
        clientId: formData.clientId.trim(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        whatsappOptIn: formData.whatsappOptIn
      });
      setFormData(emptyForm);
      setFormOpen(false);
      setMessage('Cliente registrado. Ya puedes asociarlo a un vehículo.');
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo registrar el cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (client) => {
    setEditingClient(client);
    setEditData({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      address: client.address || '',
      whatsappOptIn: Boolean(client.whatsappOptIn)
    });
    setError('');
    setMessage('');
  };

  const handleEditChange = (event) => {
    const { name, value, type, checked } = event.target;
    setEditData((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    setBusyClientId(editingClient.clientId);
    setError('');
    setMessage('');

    try {
      await api.put(`/clients/${encodeURIComponent(editingClient.clientId)}`, {
        name: editData.name.trim(),
        phone: editData.phone.trim(),
        email: editData.email.trim() || null,
        address: editData.address.trim() || null,
        whatsappOptIn: editData.whatsappOptIn
      });
      setEditingClient(null);
      setEditData(null);
      setMessage('Cliente actualizado.');
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo actualizar el cliente.');
    } finally {
      setBusyClientId('');
    }
  };

  const handleDelete = async (client) => {
    if (!window.confirm(`¿Eliminar al cliente ${client.name}?`)) {
      return;
    }

    setBusyClientId(client.clientId);
    setError('');
    setMessage('');

    try {
      await api.delete(`/clients/${encodeURIComponent(client.clientId)}`);
      setMessage('Cliente eliminado.');
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo eliminar el cliente.');
    } finally {
      setBusyClientId('');
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Clientes</h2>
          <p className="mt-1 text-sm text-slate-600">Registra al cliente antes de asociar sus vehículos</p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <label className="min-w-56 flex-1 sm:w-72">
            <span className="sr-only">Buscar clientes</span>
            <input className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" type="search" placeholder="Buscar cédula, nombre o contacto" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </label>
          {hasPermission('clients:create') && <button className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800" type="button" onClick={() => { setError(''); setFormOpen((current) => !current); }}>{formOpen ? 'Cerrar formulario' : 'Registrar cliente'}</button>}
          {hasPermission('vehicles:create') && <Link className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/vehiculos">Ir a vehículos</Link>}
        </div>
      </div>

      {error && <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      {message && <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{message}</p>}

      {formOpen && (
        <form className="space-y-4 rounded border border-slate-200 bg-white p-5" onSubmit={handleSubmit}>
          <h3 className="text-lg font-semibold text-slate-900">Nuevo cliente</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-sm font-medium text-slate-700">Cédula<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="clientId" inputMode="numeric" pattern="[0-9]{10}" maxLength="10" required value={formData.clientId} onChange={handleChange} /></label>
            <label className="space-y-1 text-sm font-medium text-slate-700">Nombre<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="name" maxLength="100" required value={formData.name} onChange={handleChange} /></label>
            <label className="space-y-1 text-sm font-medium text-slate-700">Teléfono<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="phone" inputMode="numeric" pattern="[0-9]{7,10}" maxLength="10" required value={formData.phone} onChange={handleChange} /></label>
            <label className="space-y-1 text-sm font-medium text-slate-700">Correo (opcional)<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="email" type="email" maxLength="100" value={formData.email} onChange={handleChange} /></label>
            <label className="space-y-1 text-sm font-medium text-slate-700 lg:col-span-2">Dirección (opcional)<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="address" value={formData.address} onChange={handleChange} /></label>
            <label className="flex items-start gap-2 text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-3"><input className="mt-1" type="checkbox" name="whatsappOptIn" checked={formData.whatsappOptIn} onChange={handleChange} /><span>El cliente autoriza recibir documentos (órdenes y facturas) por WhatsApp</span></label>
          </div>
          <div className="flex justify-end">
            <button className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60" type="submit" disabled={submitting}>{submitting ? 'Guardando...' : 'Guardar cliente'}</button>
          </div>
        </form>
      )}

      {editingClient && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form className="w-full max-w-xl space-y-4 rounded border border-slate-200 bg-white p-6 shadow-xl" onSubmit={handleUpdate} role="dialog" aria-modal="true" aria-labelledby="edit-client-title">
            <div>
              <h3 id="edit-client-title" className="text-lg font-semibold text-slate-900">Editar cliente</h3>
              <p className="mt-1 text-sm text-slate-600">Cédula: {editingClient.clientId}</p>
            </div>
            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700">Nombre<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="name" maxLength="100" required value={editData.name} onChange={handleEditChange} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">Teléfono<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="phone" inputMode="numeric" pattern="[0-9]{7,10}" maxLength="10" required value={editData.phone} onChange={handleEditChange} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">Correo (opcional)<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="email" type="email" maxLength="100" value={editData.email} onChange={handleEditChange} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">Dirección (opcional)<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="address" value={editData.address} onChange={handleEditChange} /></label>
              <label className="flex items-start gap-2 text-sm font-medium text-slate-700 sm:col-span-2"><input className="mt-1" type="checkbox" name="whatsappOptIn" checked={editData.whatsappOptIn} onChange={handleEditChange} /><span>El cliente autoriza recibir documentos por WhatsApp</span></label>
            </div>
            <div className="flex justify-end gap-3">
              <button className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => { setEditingClient(null); setEditData(null); setError(''); }} disabled={Boolean(busyClientId)}>Cancelar</button>
              <button className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60" type="submit" disabled={Boolean(busyClientId)}>{busyClientId ? 'Guardando...' : 'Guardar cambios'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        {loading ? <p className="p-4 text-sm text-slate-600" role="status">Cargando clientes...</p> : clients.length === 0 ? <p className="p-4 text-sm text-slate-600">No hay clientes registrados.</p> : (
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="px-4 py-3 font-semibold">Cédula</th><th className="px-4 py-3 font-semibold">Nombre</th><th className="px-4 py-3 font-semibold">Teléfono</th><th className="px-4 py-3 font-semibold">Correo</th><th className="px-4 py-3 font-semibold">Dirección</th><th className="px-4 py-3 font-semibold">WhatsApp</th>{(hasPermission('clients:update') || hasPermission('clients:delete')) && <th className="px-4 py-3 font-semibold">Acciones</th>}</tr></thead>
            <tbody className="divide-y divide-slate-100">{clients.map((client) => <tr key={client.clientId}><td className="whitespace-nowrap px-4 py-3">{client.clientId}</td><td className="px-4 py-3 font-medium text-slate-900">{client.name}</td><td className="whitespace-nowrap px-4 py-3">{client.phone}</td><td className="px-4 py-3">{client.email || '—'}</td><td className="px-4 py-3">{client.address || '—'}</td><td className="whitespace-nowrap px-4 py-3">{client.whatsappOptIn ? 'Autorizado' : 'No autorizado'}</td>{(hasPermission('clients:update') || hasPermission('clients:delete')) && <td className="whitespace-nowrap px-4 py-3"><div className="flex gap-2">{hasPermission('clients:update') && <button className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => startEditing(client)}>Editar</button>}{hasPermission('clients:delete') && <button className="rounded border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50" type="button" onClick={() => handleDelete(client)} disabled={busyClientId === client.clientId}>{busyClientId === client.clientId ? 'Eliminando...' : 'Eliminar'}</button>}</div></td>}</tr>)}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}
