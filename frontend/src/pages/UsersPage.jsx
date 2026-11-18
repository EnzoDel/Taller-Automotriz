import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const initialForm = {
  cedula: '',
  name: '',
  phone: '',
  email: '',
  password: '',
  role: 'mecanico'
};

const roleLabels = {
  administrador: 'Administrador',
  recepcionista: 'Recepcionista',
  mecanico: 'Mecánico'
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingUser, setEditingUser] = useState(null);
  const [editData, setEditData] = useState(null);
  const [busyUserId, setBusyUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      setUsers(response.data.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

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
      await api.post('/users', formData);
      setFormData(initialForm);
      setMessage('Usuario creado.');
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo crear el usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (selectedUser) => {
    setEditingUser(selectedUser);
    setEditData({
      name: selectedUser.name,
      phone: selectedUser.phone,
      email: selectedUser.email,
      role: selectedUser.role,
      password: ''
    });
    setError('');
    setMessage('');
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditData((current) => ({ ...current, [name]: value }));
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    setBusyUserId(editingUser.userId);
    setError('');
    setMessage('');

    try {
      const payload = {
        name: editData.name.trim(),
        phone: editData.phone.trim(),
        email: editData.email.trim(),
        role: editData.role
      };
      if (editData.password) {
        payload.password = editData.password;
      }

      const isCurrentUser = editingUser.userId === currentUser.userId;
      await api.patch(`/users/${encodeURIComponent(editingUser.userId)}`, payload);
      setEditingUser(null);
      setEditData(null);
      setMessage('Usuario actualizado.');
      await loadUsers();

      if (isCurrentUser) {
        window.location.reload();
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo actualizar el usuario.');
    } finally {
      setBusyUserId('');
    }
  };

  const handleDelete = async (selectedUser) => {
    if (selectedUser.userId === currentUser.userId) {
      return;
    }

    if (!window.confirm(`¿Eliminar la cuenta de ${selectedUser.name}?`)) {
      return;
    }

    setBusyUserId(selectedUser.userId);
    setError('');
    setMessage('');

    try {
      await api.delete(`/users/${encodeURIComponent(selectedUser.userId)}`);
      setMessage('Usuario eliminado.');
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo eliminar el usuario.');
    } finally {
      setBusyUserId('');
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Usuarios</h2>
        <p className="mt-1 text-sm text-slate-600">Cuentas y roles del personal del taller</p>
      </div>

      {error && <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      {message && <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{message}</p>}

      <form className="space-y-4 rounded border border-slate-200 bg-white p-5" onSubmit={handleSubmit}>
        <h3 className="text-lg font-semibold text-slate-900">Crear usuario</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-sm font-medium text-slate-700">Cédula<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="cedula" inputMode="numeric" pattern="[0-9]{10}" maxLength="10" required value={formData.cedula} onChange={handleChange} /></label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Nombre<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="name" maxLength="100" required value={formData.name} onChange={handleChange} /></label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Teléfono<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="phone" inputMode="numeric" pattern="[0-9]{7,10}" maxLength="10" required value={formData.phone} onChange={handleChange} /></label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Correo<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="email" type="email" maxLength="100" required value={formData.email} onChange={handleChange} /></label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Contraseña<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="password" type="password" minLength="10" maxLength="72" autoComplete="new-password" required value={formData.password} onChange={handleChange} /></label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Rol<select className="w-full rounded border border-slate-300 bg-white px-3 py-2 font-normal" name="role" value={formData.role} onChange={handleChange}><option value="mecanico">Mecánico</option><option value="recepcionista">Recepcionista</option><option value="administrador">Administrador</option></select></label>
        </div>
        <div className="flex justify-end">
          <button className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60" type="submit" disabled={submitting}>{submitting ? 'Creando...' : 'Crear usuario'}</button>
        </div>
      </form>

      {editingUser && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            className="w-full max-w-2xl space-y-4 rounded border border-slate-200 bg-white p-6 shadow-xl"
            onSubmit={handleUpdate}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
          >
            <div>
              <h3 id="edit-user-title" className="text-lg font-semibold text-slate-900">Editar usuario</h3>
              <p className="mt-1 text-sm text-slate-600">Cédula: {editingUser.userId}</p>
            </div>
            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700">Nombre<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="name" maxLength="100" required value={editData.name} onChange={handleEditChange} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">Teléfono<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="phone" inputMode="numeric" pattern="[0-9]{7,10}" maxLength="10" required value={editData.phone} onChange={handleEditChange} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">Correo<input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="email" type="email" maxLength="100" required value={editData.email} onChange={handleEditChange} /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">Rol<select className="w-full rounded border border-slate-300 bg-white px-3 py-2 font-normal" name="role" value={editData.role} onChange={handleEditChange} disabled={editingUser.userId === currentUser.userId}><option value="mecanico">Mecánico</option><option value="recepcionista">Recepcionista</option><option value="administrador">Administrador</option></select></label>
              <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">Nueva contraseña <span className="font-normal text-slate-500">(opcional)</span><input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="password" type="password" minLength="10" maxLength="72" autoComplete="new-password" value={editData.password} onChange={handleEditChange} /></label>
            </div>
            <div className="flex justify-end gap-3">
              <button className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => { setEditingUser(null); setEditData(null); setError(''); }} disabled={Boolean(busyUserId)}>Cancelar</button>
              <button className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60" type="submit" disabled={Boolean(busyUserId)}>{busyUserId ? 'Guardando...' : 'Guardar cambios'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        {loading ? <p className="p-4 text-sm text-slate-600" role="status">Cargando usuarios...</p> : users.length === 0 ? <p className="p-4 text-sm text-slate-600">No hay usuarios registrados.</p> : (
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="px-4 py-3 font-semibold">Cédula</th><th className="px-4 py-3 font-semibold">Nombre</th><th className="px-4 py-3 font-semibold">Correo</th><th className="px-4 py-3 font-semibold">Teléfono</th><th className="px-4 py-3 font-semibold">Rol</th><th className="px-4 py-3 font-semibold">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.userId}><td className="px-4 py-3">{user.userId}</td><td className="px-4 py-3 font-medium text-slate-900">{user.name}</td><td className="px-4 py-3">{user.email}</td><td className="px-4 py-3">{user.phone}</td><td className="px-4 py-3">{roleLabels[user.role] || user.role}</td><td className="whitespace-nowrap px-4 py-3"><div className="flex gap-2"><button className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => startEditing(user)}>Editar</button>{user.userId !== currentUser.userId && <button className="rounded border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50" type="button" onClick={() => handleDelete(user)} disabled={busyUserId === user.userId}>{busyUserId === user.userId ? 'Eliminando...' : 'Eliminar'}</button>}</div></td></tr>)}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}