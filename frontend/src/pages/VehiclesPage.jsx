import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const createEmptyVehicleForm = () => ({
  plate: '',
  clientId: '',
  make: '',
  model: '',
  color: '',
  year: String(new Date().getFullYear()),
  mileage: '0',
  fuelType: ''
});

export default function VehiclesPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('vehicles:create');
  const canUpdate = hasPermission('vehicles:update');
  const canDelete = hasPermission('vehicles:delete');
  const canReadClients = hasPermission('clients:read');
  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [vehicleDialog, setVehicleDialog] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(createEmptyVehicleForm);
  const [submitting, setSubmitting] = useState(false);
  const [busyPlate, setBusyPlate] = useState('');

  useEffect(() => {
    let isCurrent = true;

    const loadVehicles = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.get('/vehicles', {
          params: searchTerm ? { q: searchTerm } : undefined
        });
        if (isCurrent) {
          setVehicles(response.data.data);
        }

        if (canReadClients) {
          const clientResponse = await api.get('/clients/options');
          if (isCurrent) {
            setClients(clientResponse.data.data);
          }
        } else if (isCurrent) {
          setClients([]);
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.response?.data?.message || 'No se pudieron cargar los vehículos.');
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    loadVehicles();
    return () => {
      isCurrent = false;
    };
  }, [searchTerm, refreshKey, canReadClients]);

  const handleVehicleChange = (event) => {
    const { name, value } = event.target;
    setVehicleForm((current) => ({ ...current, [name]: value }));
  };

  const openVehicleForm = (vehicle = null) => {
    setError('');
    setMessage('');
    if (vehicle) {
      setVehicleForm({
        plate: vehicle.plate,
        clientId: vehicle.clientId,
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color || '',
        year: String(vehicle.year),
        mileage: String(vehicle.mileage),
        fuelType: vehicle.fuelType || ''
      });
      setVehicleDialog({ mode: 'edit', plate: vehicle.plate });
      return;
    }

    setVehicleForm(createEmptyVehicleForm());
    setVehicleDialog({ mode: 'create' });
  };

  const handleVehicleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    const payload = {
      clientId: vehicleForm.clientId,
      make: vehicleForm.make.trim(),
      model: vehicleForm.model.trim(),
      color: vehicleForm.color.trim() || null,
      year: Number(vehicleForm.year),
      mileage: Number(vehicleForm.mileage),
      fuelType: vehicleForm.fuelType.trim() || null
    };

    try {
      if (vehicleDialog.mode === 'create') {
        await api.post('/vehicles', { ...payload, plate: vehicleForm.plate.trim().toUpperCase() });
        setMessage('Vehículo registrado.');
      } else {
        await api.put(`/vehicles/${encodeURIComponent(vehicleDialog.plate)}`, payload);
        setMessage('Vehículo actualizado.');
      }

      setVehicleDialog(null);
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo guardar el vehículo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (vehicle) => {
    if (!window.confirm(`¿Eliminar el vehículo ${vehicle.plate}?`)) {
      return;
    }

    setBusyPlate(vehicle.plate);
    setError('');
    setMessage('');

    try {
      await api.delete(`/vehicles/${encodeURIComponent(vehicle.plate)}`);
      setMessage('Vehículo eliminado.');
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo eliminar el vehículo.');
    } finally {
      setBusyPlate('');
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Vehículos</h2>
          <p className="mt-1 text-sm text-slate-600">Vehículos registrados y clientes asociados</p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <label className="min-w-56 flex-1 sm:w-72">
            <span className="sr-only">Buscar vehículos</span>
            <input className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" type="search" placeholder="Buscar placa, marca o modelo" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </label>
          {canCreate && <button className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800" type="button" onClick={() => openVehicleForm()}>Registrar vehículo</button>}
        </div>
      </div>

      {error && <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      {message && <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{message}</p>}

      {canCreate && clients.length === 0 && !loading && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>No hay clientes registrados. Primero registra un cliente y luego asócialo a un vehículo.</p>
          <Link className="font-semibold underline" to="/clientes">Ir a Clientes</Link>
        </div>
      )}

      {vehicleDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <form className="my-4 w-full max-w-3xl space-y-4 rounded border border-slate-200 bg-white p-6 shadow-xl" onSubmit={handleVehicleSubmit} role="dialog" aria-modal="true" aria-labelledby="vehicle-dialog-title">
            <div>
              <h3 id="vehicle-dialog-title" className="text-lg font-semibold text-slate-900">{vehicleDialog.mode === 'create' ? 'Registrar vehículo' : 'Editar vehículo'}</h3>
              {vehicleDialog.mode === 'edit' && <p className="mt-1 text-sm text-slate-600">Placa: {vehicleDialog.plate}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vehicleDialog.mode === 'create' && <label className="space-y-1 text-sm font-medium text-slate-700">Placa<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal uppercase" name="plate" maxLength="20" required value={vehicleForm.plate} onChange={handleVehicleChange} /></label>}
              <label className="space-y-1 text-sm font-medium text-slate-700">Cliente<select className="w-full rounded border border-slate-300 bg-white px-3 py-2 font-normal" name="clientId" required value={vehicleForm.clientId} onChange={handleVehicleChange}><option value="">Selecciona un cliente</option>{clients.map((client) => <option key={client.clientId} value={client.clientId}>{client.name} · {client.clientId}</option>)}</select></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">Marca<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="make" maxLength="50" required value={vehicleForm.make} onChange={handleVehicleChange} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">Modelo<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="model" maxLength="50" required value={vehicleForm.model} onChange={handleVehicleChange} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">Color<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="color" maxLength="30" value={vehicleForm.color} onChange={handleVehicleChange} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">Año<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="year" type="number" min="1900" max="2100" step="1" required value={vehicleForm.year} onChange={handleVehicleChange} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">Kilometraje<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="mileage" type="number" min="0" max="99999999.99" step="0.01" required value={vehicleForm.mileage} onChange={handleVehicleChange} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">Combustible<select className="w-full rounded border border-slate-300 bg-white px-3 py-2 font-normal" name="fuelType" value={vehicleForm.fuelType} onChange={handleVehicleChange}><option value="">No especificado</option><option value="Gasolina">Gasolina</option><option value="Diésel">Diésel</option><option value="Híbrido">Híbrido</option><option value="Eléctrico">Eléctrico</option><option value="GLP">GLP</option></select></label>
            </div>
            <div className="flex justify-end gap-3">
              <button className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => setVehicleDialog(null)} disabled={submitting}>Cancelar</button>
              <button className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60" type="submit" disabled={submitting || clients.length === 0}>{submitting ? 'Guardando...' : 'Guardar vehículo'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        {error && !vehicleDialog ? <p className="p-4 text-sm text-red-700" role="alert">{error}</p> : loading ? <p className="p-4 text-sm text-slate-600" role="status">Cargando vehículos...</p> : vehicles.length === 0 ? <p className="p-4 text-sm text-slate-600">No hay vehículos registrados.</p> : (
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="px-4 py-3 font-semibold">Placa</th><th className="px-4 py-3 font-semibold">Vehículo</th><th className="px-4 py-3 font-semibold">Año</th><th className="px-4 py-3 font-semibold">Kilometraje</th><th className="px-4 py-3 font-semibold">Cliente</th><th className="px-4 py-3 font-semibold">Próximo mantenimiento</th>{(canUpdate || canDelete) && <th className="px-4 py-3 font-semibold">Acciones</th>}</tr></thead>
            <tbody className="divide-y divide-slate-100">{vehicles.map((vehicle) => <tr key={vehicle.plate}><td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{vehicle.plate}</td><td className="px-4 py-3">{vehicle.make} {vehicle.model}</td><td className="px-4 py-3">{vehicle.year}</td><td className="whitespace-nowrap px-4 py-3">{Number(vehicle.mileage).toLocaleString('es-EC')} km</td><td className="px-4 py-3">{vehicle.clientName}</td><td className="whitespace-nowrap px-4 py-3">{vehicle.nextMaintenance || 'Sin programar'}{vehicle.maintenanceStatus && <span className={`mt-1 block text-xs font-semibold ${vehicle.maintenanceStatus === 'overdue' ? 'text-red-700' : vehicle.maintenanceStatus === 'due' ? 'text-amber-700' : 'text-slate-600'}`}>{vehicle.maintenanceStatus === 'overdue' ? 'Vencido' : vehicle.maintenanceStatus === 'due' ? 'Para hoy' : 'Programado'}</span>}</td>{(canUpdate || canDelete) && <td className="whitespace-nowrap px-4 py-3"><div className="flex gap-2">{canUpdate && <button className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => openVehicleForm(vehicle)}>Editar</button>}{canDelete && <button className="rounded border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50" type="button" onClick={() => handleDelete(vehicle)} disabled={busyPlate === vehicle.plate}>{busyPlate === vehicle.plate ? 'Eliminando...' : 'Eliminar'}</button>}</div></td>}</tr>)}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}
