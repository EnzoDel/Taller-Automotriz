const express = require('express');
const router = express.Router();
const { login, getCurrentUser, logout } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const {
	getInventory,
	createInventoryItem,
	updateInventoryItem,
	replenishInventoryStock,
	deleteInventoryItem
} = require('../controllers/inventoryController');
const { loginValidation } = require('../validators/authValidator');
const { userCreateValidation, userUpdateValidation, userIdValidation } = require('../validators/userValidator');
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { getVehicles, getMaintenanceAlerts, createVehicle, updateVehicle, deleteVehicle } = require('../controllers/vehicleController');
const { getClients, getClientOptions, createClient, updateClient, deleteClient } = require('../controllers/clientController');
const { getWorkOrders, createWorkOrder, closeWorkOrder } = require('../controllers/workOrderController');
const { getInvoices, getAvailableOrders, createInvoice } = require('../controllers/billingController');
const { getConfigurationStatus: getSRIConfigurationStatus } = require('../controllers/sriController');
const { getHistory } = require('../controllers/historyController');
const {
	downloadWorkOrderPdf,
	sendWorkOrderPdfWhatsApp,
	downloadInvoicePdf,
	sendInvoicePdfWhatsApp
} = require('../controllers/documentController');
const requirePermission = require('../middlewares/requirePermission');
const {
	inventoryQueryValidation,
	createInventoryValidation,
	updateInventoryValidation,
	replenishStockValidation,
	deleteInventoryValidation
} = require('../validators/inventoryValidator');
const validateRequest = require('../middlewares/validateRequest');
const {
	vehicleQueryValidation,
	vehicleCreateValidation,
	vehicleUpdateValidation,
	vehiclePlateValidation
} = require('../validators/vehicleValidator');
const { clientQueryValidation, clientCreateValidation, clientIdValidation, clientUpdateValidation } = require('../validators/clientValidator');
const { workOrderQueryValidation, workOrderCreateValidation, closeWorkOrderValidation } = require('../validators/workOrderValidator');
const { historyQueryValidation } = require('../validators/historyValidator');
const { invoiceQueryValidation, createInvoiceValidation } = require('../validators/billingValidator');
const { workOrderDocumentValidation, invoiceDocumentValidation } = require('../validators/documentValidator');
const { reportYearValidation, reportYearRangeValidation } = require('../validators/reportValidator');
const {
	getMonthlyBilling,
	getAnnualBilling,
	getMonthlyPurchases,
	getAnnualPurchases
} = require('../controllers/reportController');

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@taller.com
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Sesión iniciada mediante cookie HttpOnly.
 *       401:
 *         description: Credenciales incorrectas.
 *       400:
 *         description: Error de validación
 */
router.post('/auth/login', loginValidation, validateRequest, login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Obtener el usuario autenticado y sus permisos
 *     tags: [Auth]
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Usuario y permisos actuales.
 *       401:
 *         description: Sesión inválida o ausente.
 */
router.get('/auth/me', authMiddleware, getCurrentUser);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Auth]
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Cookie de sesión eliminada.
 */
router.post('/auth/logout', authMiddleware, logout);

/**
 * @openapi
 * /api/inventory:
 *   get:
 *     summary: Listar productos del inventario
 *     description: Busca productos por código o descripción en la tabla inventario.
 *     tags: [Inventario]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Texto opcional para buscar por código o descripción.
 *     responses:
 *       200:
 *         description: Productos encontrados.
 *       400:
 *         description: Error de validación del parámetro de búsqueda.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       500:
 *         description: Error interno del servidor.
 */
router.get('/inventory', authMiddleware, requirePermission('inventory:read'), inventoryQueryValidation, validateRequest, getInventory);

/**
 * @openapi
 * /api/inventory:
 *   post:
 *     summary: Registrar un producto en el inventario
 *     description: Crea un producto con los campos de la tabla inventario.
 *     tags: [Inventario]
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productCode, description, purchasePrice, salePrice, stockMax]
 *             properties:
 *               productCode:
 *                 type: string
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               purchasePrice:
 *                 type: number
 *                 minimum: 0
 *               salePrice:
 *                 type: number
 *                 minimum: 0
 *               discountPrice:
 *                 type: number
 *                 nullable: true
 *                 minimum: 0
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               stockMax:
 *                 type: integer
 *                 minimum: 1
 *                 description: Nivel objetivo usado como máximo para calcular el semáforo de stock.
 *     responses:
 *       201:
 *         description: Producto creado.
 *       400:
 *         description: Error de validación.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       409:
 *         description: Ya existe un producto con ese código.
 *       500:
 *         description: Error interno del servidor.
 */
router.post('/inventory', authMiddleware, requirePermission('inventory:create'), createInventoryValidation, validateRequest, createInventoryItem);

/**
 * @openapi
 * /api/inventory/{productCode}:
 *   put:
 *     summary: Actualizar los datos de un producto
 *     description: Actualiza descripción, precios y stock máximo. El stock actual se modifica con el endpoint de reabastecimiento.
 *     tags: [Inventario]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: productCode
 *         required: true
 *         schema:
 *           type: string
 *           maxLength: 50
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description, purchasePrice, salePrice, stockMax]
 *             properties:
 *               description:
 *                 type: string
 *               purchasePrice:
 *                 type: number
 *                 minimum: 0
 *               salePrice:
 *                 type: number
 *                 minimum: 0
 *               discountPrice:
 *                 type: number
 *                 nullable: true
 *                 minimum: 0
 *               stockMax:
 *                 type: integer
 *                 minimum: 1
 *                 description: Nivel objetivo usado como máximo para calcular el semáforo de stock.
 *     responses:
 *       200:
 *         description: Producto actualizado.
 *       400:
 *         description: Error de validación.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       404:
 *         description: Producto no encontrado.
 *       500:
 *         description: Error interno del servidor.
 *   delete:
 *     summary: Eliminar un producto
 *     description: El producto no se elimina si está referenciado por una factura.
 *     tags: [Inventario]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: productCode
 *         required: true
 *         schema:
 *           type: string
 *           maxLength: 50
 *     responses:
 *       200:
 *         description: Producto eliminado.
 *       404:
 *         description: Producto no encontrado.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       409:
 *         description: El producto está asociado a una factura.
 *       500:
 *         description: Error interno del servidor.
 */
router.put('/inventory/:productCode', authMiddleware, requirePermission('inventory:update'), updateInventoryValidation, validateRequest, updateInventoryItem);
router.delete('/inventory/:productCode', authMiddleware, requirePermission('inventory:delete'), deleteInventoryValidation, validateRequest, deleteInventoryItem);

/**
 * @openapi
 * /api/inventory/{productCode}/stock:
 *   patch:
 *     summary: Reabastecer el stock de un producto
 *     description: Suma la cantidad indicada al stock actual de forma atómica.
 *     tags: [Inventario]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: productCode
 *         required: true
 *         schema:
 *           type: string
 *           maxLength: 50
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 10
 *     responses:
 *       200:
 *         description: Stock reabastecido.
 *       400:
 *         description: Cantidad inválida o superior al máximo permitido.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       404:
 *         description: Producto no encontrado.
 *       500:
 *         description: Error interno del servidor.
 */
router.patch('/inventory/:productCode/stock', authMiddleware, requirePermission('inventory:replenish'), replenishStockValidation, validateRequest, replenishInventoryStock);

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Listar usuarios del taller
 *     description: Solo administradores pueden consultar usuarios; nunca se devuelven hashes de contraseña.
 *     tags: [Usuarios]
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Usuarios registrados.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 */
router.get('/users', authMiddleware, requirePermission('users:read'), getUsers);

/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Crear un usuario del taller
 *     description: Solo administradores pueden crear usuarios. La contraseña se almacena con bcrypt.
 *     tags: [Usuarios]
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cedula, name, phone, email, password, role]
 *             properties:
 *               cedula:
 *                 type: string
 *                 pattern: '^\\d{10}$'
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 10
 *               role:
 *                 type: string
 *                 enum: [administrador, recepcionista, mecanico]
 *     responses:
 *       201:
 *         description: Usuario creado.
 *       400:
 *         description: Error de validación.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       409:
 *         description: Cédula o correo ya registrados.
 */
router.post('/users', authMiddleware, requirePermission('users:create'), userCreateValidation, validateRequest, createUser);

/**
 * @openapi
 * /api/users/{userId}:
 *   patch:
 *     summary: Actualizar un usuario
 *     description: Actualiza los campos enviados. Si se incluye una contraseña, se vuelve a hashear con bcrypt.
 *     tags: [Usuarios]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\\d{10}$'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 10
 *               role:
 *                 type: string
 *                 enum: [administrador, recepcionista, mecanico]
 *     responses:
 *       200:
 *         description: Usuario actualizado.
 *       400:
 *         description: Error de validación.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       404:
 *         description: Usuario no encontrado.
 *       409:
 *         description: Correo duplicado o último administrador.
 */
router.patch('/users/:userId', authMiddleware, requirePermission('users:update'), userUpdateValidation, validateRequest, updateUser);

/**
 * @openapi
 * /api/users/{userId}:
 *   delete:
 *     summary: Eliminar un usuario
 *     description: Un administrador no puede eliminarse a sí mismo ni eliminar al último administrador.
 *     tags: [Usuarios]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\\d{10}$'
 *     responses:
 *       200:
 *         description: Usuario eliminado.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       404:
 *         description: Usuario no encontrado.
 *       409:
 *         description: No se puede eliminar la propia cuenta o el último administrador.
 */
router.delete('/users/:userId', authMiddleware, requirePermission('users:delete'), userIdValidation, validateRequest, deleteUser);

/**
 * @openapi
 * /api/vehicles:
 *   get:
 *     summary: Listar y buscar vehículos
 *     tags: [Vehículos]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Buscar por placa, marca o modelo.
 *     responses:
 *       200:
 *         description: Vehículos y cliente asociado.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 */
router.get('/vehicles', authMiddleware, requirePermission('vehicles:read'), vehicleQueryValidation, validateRequest, getVehicles);

/**
 * @openapi
 * /api/vehicles/maintenance-alerts:
 *   get:
 *     summary: Consultar mantenimientos programados para hoy o vencidos
 *     description: Requiere el permiso vehicles:read. Las fechas se evalúan en la zona horaria continental de Ecuador.
 *     tags: [Vehículos]
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Lista de alertas internas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       plate:
 *                         type: string
 *                       clientName:
 *                         type: string
 *                       nextMaintenance:
 *                         type: string
 *                         format: date
 *                       status:
 *                         type: string
 *                         enum: [due, overdue]
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       500:
 *         description: Error interno del servidor.
 */
router.get('/vehicles/maintenance-alerts', authMiddleware, requirePermission('vehicles:read'), getMaintenanceAlerts);

/**
 * @openapi
 * /api/vehicles:
 *   post:
 *     summary: Registrar un vehículo
 *     description: La fecha del último mantenimiento se deja sin definir al registrar el vehículo.
 *     tags: [Vehículos]
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plate, clientId, make, model, year, mileage]
 *             properties:
 *               plate:
 *                 type: string
 *                 maxLength: 20
 *               clientId:
 *                 type: string
 *                 pattern: '^\\d{10}$'
 *               make:
 *                 type: string
 *                 maxLength: 50
 *               model:
 *                 type: string
 *                 maxLength: 50
 *               color:
 *                 type: string
 *                 nullable: true
 *               year:
 *                 type: integer
 *               mileage:
 *                 type: number
 *               fuelType:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Vehículo creado.
 *       400:
 *         description: Error de validación.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       404:
 *         description: Cliente no encontrado.
 *       409:
 *         description: La placa ya está registrada.
 */
router.post('/vehicles', authMiddleware, requirePermission('vehicles:create'), vehicleCreateValidation, validateRequest, createVehicle);

/**
 * @openapi
 * /api/vehicles/{plate}:
 *   put:
 *     summary: Actualizar un vehículo
 *     description: La fecha del último mantenimiento no se puede modificar mediante esta operación.
 *     tags: [Vehículos]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: plate
 *         required: true
 *         schema:
 *           type: string
 *           maxLength: 20
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, make, model, year, mileage]
 *             properties:
 *               clientId:
 *                 type: string
 *               make:
 *                 type: string
 *               model:
 *                 type: string
 *               color:
 *                 type: string
 *                 nullable: true
 *               year:
 *                 type: integer
 *               mileage:
 *                 type: number
 *               fuelType:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Vehículo actualizado.
 *       400:
 *         description: Error de validación.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       404:
 *         description: Vehículo o cliente no encontrado.
 */
router.put('/vehicles/:plate', authMiddleware, requirePermission('vehicles:update'), vehicleUpdateValidation, validateRequest, updateVehicle);

/**
 * @openapi
 * /api/vehicles/{plate}:
 *   delete:
 *     summary: Eliminar un vehículo
 *     description: Se rechaza si hay órdenes de trabajo asociadas, para conservar historial y facturas.
 *     tags: [Vehículos]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: plate
 *         required: true
 *         schema:
 *           type: string
 *           maxLength: 20
 *     responses:
 *       200:
 *         description: Vehículo eliminado.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       404:
 *         description: Vehículo no encontrado.
 *       409:
 *         description: El vehículo tiene órdenes de trabajo asociadas.
 */
router.delete('/vehicles/:plate', authMiddleware, requirePermission('vehicles:delete'), vehiclePlateValidation, validateRequest, deleteVehicle);

/**
 * @openapi
 * /api/clients:
 *   get:
 *     summary: Listar y buscar clientes
 *     description: Datos de contacto de clientes para registrarlos antes de asociar vehículos.
 *     tags: [Clientes]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Buscar por cédula, nombre, teléfono o correo.
 *     responses:
 *       200:
 *         description: Clientes registrados.
 *       400:
 *         description: Error de validación.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 */
router.get('/clients', authMiddleware, requirePermission('clients:read'), clientQueryValidation, validateRequest, getClients);

/**
 * @openapi
 * /api/clients/options:
 *   get:
 *     summary: Listar clientes para asociar a un vehículo
 *     tags: [Clientes]
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Identificadores y nombres de clientes.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 */
router.get('/clients/options', authMiddleware, requirePermission('clients:read'), getClientOptions);

/**
 * @openapi
 * /api/clients:
 *   post:
 *     summary: Crear un cliente desde el formulario de vehículos
 *     tags: [Clientes]
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, name, phone]
 *             properties:
 *               clientId:
 *                 type: string
 *                 pattern: '^\\d{10}$'
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 nullable: true
 *               address:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Cliente creado.
 *       400:
 *         description: Error de validación.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       409:
 *         description: La cédula ya está registrada.
 */
router.post('/clients', authMiddleware, requirePermission('clients:create'), clientCreateValidation, validateRequest, createClient);

/**
 * @openapi
 * /api/clients/{clientId}:
 *   put:
 *     summary: Actualizar un cliente
 *     description: La cédula es el identificador y no se modifica; los datos de contacto sí.
 *     tags: [Clientes]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\\d{10}$'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               phone:
 *                 type: string
 *                 maxLength: 10
 *               email:
 *                 type: string
 *                 nullable: true
 *               address:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Cliente actualizado.
 *       400:
 *         description: Error de validación.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       404:
 *         description: Cliente no encontrado.
 *   delete:
 *     summary: Eliminar un cliente sin vehículos asociados
 *     description: Se rechaza el borrado si el cliente tiene vehículos para evitar eliminar historial en cascada.
 *     tags: [Clientes]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\\d{10}$'
 *     responses:
 *       200:
 *         description: Cliente eliminado.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       404:
 *         description: Cliente no encontrado.
 *       409:
 *         description: El cliente tiene vehículos asociados.
 */
router.put('/clients/:clientId', authMiddleware, requirePermission('clients:update'), clientUpdateValidation, validateRequest, updateClient);
router.delete('/clients/:clientId', authMiddleware, requirePermission('clients:delete'), clientIdValidation, validateRequest, deleteClient);

/**
 * @openapi
 * /api/work-orders:
 *   get:
 *     summary: Consultar órdenes de trabajo
 *     description: Devuelve la recepción y los datos derivados del cliente y vehículo asociados.
 *     tags: [Órdenes de trabajo]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Buscar por número, placa o cliente.
 *     responses:
 *       200:
 *         description: Órdenes registradas.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 */
router.get('/work-orders', authMiddleware, requirePermission('workOrders:read'), workOrderQueryValidation, validateRequest, getWorkOrders);

/**
 * @openapi
 * /api/work-orders:
 *   post:
 *     summary: Ingresar una orden de trabajo
 *     description: Registra recepción de un vehículo. El código y fecha de ingreso se generan en PostgreSQL.
 *     tags: [Órdenes de trabajo]
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plate, requestedJobs]
 *             properties:
 *               plate:
 *                 type: string
 *                 maxLength: 20
 *               requestedJobs:
 *                 type: string
 *               plannedJobs:
 *                 type: string
 *                 nullable: true
 *               observations:
 *                 type: string
 *                 nullable: true
 *               assignedOperator:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Orden ingresada.
 *       400:
 *         description: Error de validación.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       404:
 *         description: Vehículo no encontrado.
 */
router.post('/work-orders', authMiddleware, requirePermission('workOrders:create'), workOrderCreateValidation, validateRequest, createWorkOrder);

/**
 * @openapi
 * /api/work-orders/{workOrderId}/close:
 *   patch:
 *     summary: Cerrar una orden de trabajo
 *     description: Guarda el cierre, el histórico y la fecha del próximo mantenimiento en una sola transacción. La fecha no puede ser anterior al día actual en Ecuador continental.
 *     tags: [Órdenes de trabajo]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: workOrderId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [workPerformed, nextMaintenance]
 *             properties:
 *               workPerformed:
 *                 type: string
 *                 maxLength: 5000
 *               nextMaintenance:
 *                 type: string
 *                 format: date
 *                 description: Fecha obligatoria del próximo mantenimiento (AAAA-MM-DD).
 *     responses:
 *       200:
 *         description: Orden cerrada y registrada en histórico.
 *       400:
 *         description: Error de validación.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       404:
 *         description: Orden no encontrada.
 *       409:
 *         description: La orden ya fue cerrada.
 */
router.patch('/work-orders/:workOrderId/close', authMiddleware, requirePermission('workOrders:close'), closeWorkOrderValidation, validateRequest, closeWorkOrder);

/**
 * @openapi
 * /api/billing/invoices:
 *   get:
 *     summary: Consultar facturas
 *     tags: [Facturación]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Buscar por número de factura, orden, placa o cliente.
 *     responses:
 *       200:
 *         description: Facturas y líneas de detalle.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 */
router.get('/billing/invoices', authMiddleware, requirePermission('billing:read'), invoiceQueryValidation, validateRequest, getInvoices);

/**
 * @openapi
 * /api/billing/sri/status:
 *   get:
 *     summary: Consultar preparación de la integración con el SRI
 *     description: Informa el ambiente y los requisitos de configuración faltantes. Nunca devuelve secretos ni habilita el envío de comprobantes.
 *     tags: [Facturación]
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Estado de configuración de la integración SRI.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       500:
 *         description: Error interno del servidor.
 */
router.get('/billing/sri/status', authMiddleware, requirePermission('billing:read'), getSRIConfigurationStatus);

/**
 * @openapi
 * /api/billing/available-orders:
 *   get:
 *     summary: Consultar órdenes aún no facturadas
 *     tags: [Facturación]
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Órdenes disponibles para facturar.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 */
router.get('/billing/available-orders', authMiddleware, requirePermission('billing:read'), getAvailableOrders);

/**
 * @openapi
 * /api/billing/invoices:
 *   post:
 *     summary: Emitir factura interna para una orden
 *     description: Una factura por orden. Los productos usan precio y stock vigentes; la creación y el descuento de stock son atómicos.
 *     tags: [Facturación]
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, ivaRate, items]
 *             properties:
 *               orderId:
 *                 type: integer
 *               ivaRate:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 50
 *                 items:
 *                   type: object
 *                   required: [quantity]
 *                   properties:
 *                     productCode:
 *                       type: string
 *                       nullable: true
 *                     description:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                     unitPrice:
 *                       type: number
 *                       description: Obligatorio en servicios manuales; para repuestos se usa el precio del inventario.
 *     responses:
 *       201:
 *         description: Factura creada y stock actualizado.
 *       400:
 *         description: Error de validación o importe fuera de rango.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       404:
 *         description: Orden o producto no encontrado.
 *       409:
 *         description: Orden ya facturada o stock insuficiente.
 */
router.post('/billing/invoices', authMiddleware, requirePermission('billing:create'), createInvoiceValidation, validateRequest, createInvoice);

/**
 * @openapi
 * /api/history:
 *   get:
 *     summary: Consultar histórico de trabajos
 *     description: Lista trabajos realizados con cliente, vehículo y factura asociada cuando exista.
 *     tags: [Histórico]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Buscar por orden, placa, cliente o trabajo realizado.
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Registros históricos paginados.
 *       400:
 *         description: Filtros inválidos.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 */
router.get('/history', authMiddleware, requirePermission('history:read'), historyQueryValidation, validateRequest, getHistory);

/**
 * @openapi
 * /api/work-orders/{workOrderId}/pdf:
 *   get:
 *     summary: Descargar PDF de una orden de trabajo
 *     tags: [Documentos]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: workOrderId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: PDF interno de la orden.
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       404:
 *         description: Orden no encontrada.
 */
router.get('/work-orders/:workOrderId/pdf', authMiddleware, requirePermission('workOrders:read'), workOrderDocumentValidation, validateRequest, downloadWorkOrderPdf);

/**
 * @openapi
 * /api/work-orders/{workOrderId}/whatsapp:
 *   post:
 *     summary: Enviar PDF de orden por WhatsApp
 *     description: Requiere consentimiento WhatsApp del cliente y plantilla aprobada en Meta.
 *     tags: [Documentos]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: workOrderId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Mensaje aceptado por WhatsApp Cloud API.
 *       400:
 *         description: Teléfono del cliente inválido.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       404:
 *         description: Orden no encontrada.
 *       409:
 *         description: El cliente no autorizó WhatsApp.
 *       502:
 *         description: Meta rechazó el documento o el mensaje.
 *       503:
 *         description: Integración WhatsApp no configurada.
 */
router.post('/work-orders/:workOrderId/whatsapp', authMiddleware, requirePermission('workOrders:send'), workOrderDocumentValidation, validateRequest, sendWorkOrderPdfWhatsApp);

/**
 * @openapi
 * /api/billing/invoices/{invoiceNumber}/pdf:
 *   get:
 *     summary: Descargar comprobante interno de factura
 *     description: El PDF indica que no sustituye al comprobante electrónico autorizado por el SRI.
 *     tags: [Documentos]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: invoiceNumber
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: PDF interno de factura.
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       404:
 *         description: Factura no encontrada.
 */
router.get('/billing/invoices/:invoiceNumber/pdf', authMiddleware, requirePermission('billing:read'), invoiceDocumentValidation, validateRequest, downloadInvoicePdf);

/**
 * @openapi
 * /api/billing/invoices/{invoiceNumber}/whatsapp:
 *   post:
 *     summary: Enviar comprobante interno por WhatsApp
 *     description: Requiere consentimiento del cliente y plantilla de documento aprobada por Meta.
 *     tags: [Documentos]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: invoiceNumber
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Mensaje aceptado por WhatsApp Cloud API.
 *       400:
 *         description: Teléfono del cliente inválido.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       404:
 *         description: Factura no encontrada.
 *       409:
 *         description: El cliente no autorizó WhatsApp.
 *       502:
 *         description: Meta rechazó el documento o el mensaje.
 *       503:
 *         description: Integración WhatsApp no configurada.
 */
router.post('/billing/invoices/:invoiceNumber/whatsapp', authMiddleware, requirePermission('billing:send'), invoiceDocumentValidation, validateRequest, sendInvoicePdfWhatsApp);

/**
 * @openapi
 * /api/reports/billing/monthly:
 *   get:
 *     summary: Facturación mensual de un año
 *     description: Devuelve los 12 meses del año con cantidad de facturas, subtotal, IVA y total facturado. Rol requerido Administrador.
 *     tags: [Reportes]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 2000
 *           maximum: 2100
 *         description: Año a consultar. Por defecto, el año actual.
 *     responses:
 *       200:
 *         description: Serie mensual con `year`, `months[{period, invoiceCount, subtotal, iva, total}]` y `totals`.
 *       400:
 *         description: Parámetros inválidos.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       500:
 *         description: Error interno del servidor.
 */
router.get('/reports/billing/monthly', authMiddleware, requirePermission('reports:read'), reportYearValidation, validateRequest, getMonthlyBilling);

/**
 * @openapi
 * /api/reports/billing/annual:
 *   get:
 *     summary: Facturación anual
 *     description: Devuelve la facturación agrupada por año en un rango (por defecto, los últimos 5 años). Rol requerido Administrador.
 *     tags: [Reportes]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: query
 *         name: fromYear
 *         schema:
 *           type: integer
 *           minimum: 2000
 *           maximum: 2100
 *       - in: query
 *         name: toYear
 *         schema:
 *           type: integer
 *           minimum: 2000
 *           maximum: 2100
 *     responses:
 *       200:
 *         description: Serie anual con `years[{period, invoiceCount, subtotal, iva, total}]` y `totals`.
 *       400:
 *         description: Parámetros inválidos.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       500:
 *         description: Error interno del servidor.
 */
router.get('/reports/billing/annual', authMiddleware, requirePermission('reports:read'), reportYearRangeValidation, validateRequest, getAnnualBilling);

/**
 * @openapi
 * /api/reports/purchases/monthly:
 *   get:
 *     summary: Gastos mensuales en compra de repuestos
 *     description: Devuelve los 12 meses del año con compras, unidades y monto gastado, además de los 5 repuestos con mayor gasto. Rol requerido Administrador.
 *     tags: [Reportes]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 2000
 *           maximum: 2100
 *         description: Año a consultar. Por defecto, el año actual.
 *     responses:
 *       200:
 *         description: Serie mensual con `months[{period, purchaseCount, quantity, total}]`, `totals` y `topProducts`.
 *       400:
 *         description: Parámetros inválidos.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       500:
 *         description: Error interno del servidor.
 */
router.get('/reports/purchases/monthly', authMiddleware, requirePermission('reports:read'), reportYearValidation, validateRequest, getMonthlyPurchases);

/**
 * @openapi
 * /api/reports/purchases/annual:
 *   get:
 *     summary: Gastos anuales en compra de repuestos
 *     description: Devuelve el gasto en repuestos agrupado por año en un rango (por defecto, los últimos 5 años). Rol requerido Administrador.
 *     tags: [Reportes]
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: query
 *         name: fromYear
 *         schema:
 *           type: integer
 *           minimum: 2000
 *           maximum: 2100
 *       - in: query
 *         name: toYear
 *         schema:
 *           type: integer
 *           minimum: 2000
 *           maximum: 2100
 *     responses:
 *       200:
 *         description: Serie anual con `years[{period, purchaseCount, quantity, total}]` y `totals`.
 *       400:
 *         description: Parámetros inválidos.
 *       401:
 *         description: Sesión inválida o ausente.
 *       403:
 *         description: Permiso insuficiente.
 *       500:
 *         description: Error interno del servidor.
 */
router.get('/reports/purchases/annual', authMiddleware, requirePermission('reports:read'), reportYearRangeValidation, validateRequest, getAnnualPurchases);

module.exports = router;
