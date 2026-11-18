const ROLE_PERMISSIONS = {
  administrador: [
    'inventory:read',
    'inventory:create',
    'inventory:update',
    'inventory:replenish',
    'inventory:delete',
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'vehicles:read',
    'vehicles:create',
    'vehicles:update',
    'vehicles:delete',
    'clients:read',
    'clients:create',
    'clients:update',
    'clients:delete',
    'workOrders:read',
    'workOrders:create',
    'workOrders:close',
    'workOrders:send',
    'history:read',
    'billing:read',
    'billing:create',
    'billing:send',
    'reports:read'
  ],
  recepcionista: [
    'inventory:read',
    'inventory:create',
    'inventory:update',
    'inventory:replenish',
    'vehicles:read',
    'vehicles:create',
    'vehicles:update',
    'vehicles:delete',
    'clients:read',
    'clients:create',
    'clients:update',
    'clients:delete',
    'workOrders:read',
    'workOrders:create',
    'workOrders:close',
    'workOrders:send',
    'history:read',
    'billing:read',
    'billing:create',
    'billing:send'
  ],
  mecanico: ['inventory:read', 'vehicles:read', 'workOrders:read', 'history:read']
};

const normalizeRole = (role = '') => role
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const getRolePermissions = (role) => ROLE_PERMISSIONS[normalizeRole(role)] || [];

module.exports = {
  ROLE_PERMISSIONS,
  normalizeRole,
  getRolePermissions
};