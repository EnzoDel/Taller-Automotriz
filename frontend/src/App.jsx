import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import InventoryPage from './pages/InventoryPage';
import UsersPage from './pages/UsersPage';
import CustomersPage from './pages/CustomersPage';
import VehiclesPage from './pages/VehiclesPage';
import OrdersPage from './pages/OrdersPage';
import BillingPage from './pages/BillingPage';
import HistoryPage from './pages/HistoryPage';
import ReportsPage from './pages/ReportsPage';
import MaintenanceAlerts from './components/MaintenanceAlerts';
import MaintenanceAlertsPage from './pages/MaintenanceAlertsPage';
import useMaintenanceAlerts from './hooks/useMaintenanceAlerts';

const navItems = [
  { to: '/', label: 'Inventario' },
  { to: '/usuarios', label: 'Usuarios', permission: 'users:read' },
  { to: '/clientes', label: 'Clientes', permission: 'clients:read' },
  { to: '/vehiculos', label: 'Vehículos', permission: 'vehicles:read' },
  { to: '/alertas-mantenimiento', label: 'Alertas', permission: 'vehicles:read' },
  { to: '/ordenes', label: 'Órdenes', permission: 'workOrders:read' },
  { to: '/historial', label: 'Histórico', permission: 'history:read' },
  { to: '/facturacion', label: 'Facturación', permission: 'billing:read' },
  { to: '/reportes', label: 'Reportes', permission: 'reports:read' }
];

function AppContent() {
  const { user, loading, logout, hasPermission } = useAuth();
  const location = useLocation();
  const canReadVehicles = Boolean(user) && hasPermission('vehicles:read');
  const maintenance = useMaintenanceAlerts(canReadVehicles);

  if (loading) {
    return <main className="p-8 text-sm text-slate-600" role="status">Verificando sesión...</main>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-slate-900 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <h1 className="text-2xl font-bold">Taller Automotriz</h1>
          <div className="flex flex-wrap items-center gap-4">
            <nav className="flex flex-wrap gap-3">
              {navItems.filter((item) => !item.permission || hasPermission(item.permission)).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded px-3 py-2 text-sm font-semibold transition ${
                      isActive ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-3 border-l border-slate-700 pl-4">
              <span className="text-sm text-slate-200">{user.name}</span>
              <button className="text-sm font-semibold text-slate-300 hover:text-white" type="button" onClick={logout}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {canReadVehicles && location.pathname !== '/alertas-mantenimiento' && <MaintenanceAlerts alerts={maintenance.alerts} error={maintenance.error} />}
        <Routes>
          <Route path="/" element={<InventoryPage />} />
          <Route path="/usuarios" element={hasPermission('users:read') ? <UsersPage /> : <InventoryPage />} />
          <Route path="/clientes" element={hasPermission('clients:read') ? <CustomersPage /> : <InventoryPage />} />
          <Route path="/vehiculos" element={hasPermission('vehicles:read') ? <VehiclesPage /> : <InventoryPage />} />
          <Route path="/alertas-mantenimiento" element={canReadVehicles ? <MaintenanceAlertsPage {...maintenance} /> : <InventoryPage />} />
          <Route path="/ordenes" element={hasPermission('workOrders:read') ? <OrdersPage /> : <InventoryPage />} />
          <Route path="/historial" element={hasPermission('history:read') ? <HistoryPage /> : <InventoryPage />} />
          <Route path="/facturacion" element={hasPermission('billing:read') ? <BillingPage /> : <InventoryPage />} />
                    <Route path="/reportes" element={hasPermission('reports:read') ? <ReportsPage /> : <InventoryPage />} />
                  </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
