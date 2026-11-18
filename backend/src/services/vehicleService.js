const database = require('../config/database');

const VEHICLE_COLUMNS = `
  v.placa AS plate,
  v.cedula_cliente AS "clientId",
  c.nombre_cliente AS "clientName",
  c.telefono_cliente AS "clientPhone",
  v.marca AS make,
  v.modelo AS model,
  v.color,
  v.anio AS year,
  v.kilometraje AS mileage,
  v.tipo_combustible AS "fuelType",
  v.fecha_mantenimiento AS "lastMaintenance",
  to_char(v.proximo_mantenimiento, 'YYYY-MM-DD') AS "nextMaintenance",
  CASE
    WHEN v.proximo_mantenimiento IS NULL THEN NULL
    WHEN v.proximo_mantenimiento < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Guayaquil')::date THEN 'overdue'
    WHEN v.proximo_mantenimiento = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Guayaquil')::date THEN 'due'
    ELSE 'scheduled'
  END AS "maintenanceStatus"`;

const getVehicles = async (searchTerm) => {
  const searchPattern = searchTerm ? `%${searchTerm}%` : null;
  const result = await database.query(
    `SELECT ${VEHICLE_COLUMNS}
    FROM vehiculos v
    JOIN clientes c ON c.cedula_cliente = v.cedula_cliente
    WHERE $1::text IS NULL
      OR v.placa ILIKE $1
      OR v.marca ILIKE $1
      OR v.modelo ILIKE $1
      OR c.nombre_cliente ILIKE $1
    ORDER BY v.placa ASC`,
    [searchPattern]
  );

  return result.rows;
};

const getMaintenanceAlerts = async () => {
  const result = await database.query(
    `SELECT v.placa AS plate, c.nombre_cliente AS "clientName",
      to_char(v.proximo_mantenimiento, 'YYYY-MM-DD') AS "nextMaintenance",
      CASE WHEN v.proximo_mantenimiento < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Guayaquil')::date
        THEN 'overdue' ELSE 'due' END AS status
    FROM vehiculos v
    JOIN clientes c ON c.cedula_cliente = v.cedula_cliente
    WHERE v.proximo_mantenimiento <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Guayaquil')::date
    ORDER BY v.proximo_mantenimiento, v.placa`
  );
  return result.rows;
};

const createVehicle = async ({ plate, clientId, make, model, color, year, mileage, fuelType }) => {
  const result = await database.query(
    `INSERT INTO vehiculos (
      placa, cedula_cliente, marca, modelo, color, anio, kilometraje, tipo_combustible, fecha_mantenimiento
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)
    RETURNING placa AS plate, cedula_cliente AS "clientId", marca AS make,
      modelo AS model, color, anio AS year, kilometraje AS mileage,
      tipo_combustible AS "fuelType", fecha_mantenimiento AS "lastMaintenance"`,
    [plate, clientId, make, model, color || null, year, mileage, fuelType || null]
  );

  return result.rows[0];
};

const updateVehicle = async (plate, { clientId, make, model, color, year, mileage, fuelType }) => {
  const result = await database.query(
    `UPDATE vehiculos
    SET cedula_cliente = $2,
        marca = $3,
        modelo = $4,
        color = $5,
        anio = $6,
        kilometraje = $7,
        tipo_combustible = $8
    WHERE placa = $1
    RETURNING placa AS plate, cedula_cliente AS "clientId", marca AS make,
      modelo AS model, color, anio AS year, kilometraje AS mileage,
      tipo_combustible AS "fuelType", fecha_mantenimiento AS "lastMaintenance"`,
    [plate, clientId, make, model, color || null, year, mileage, fuelType || null]
  );

  return result.rows[0] || null;
};

const deleteVehicle = async (plate) => {
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [748220]);
    const vehicle = await client.query('SELECT placa FROM vehiculos WHERE placa = $1 FOR UPDATE', [plate]);
    if (vehicle.rowCount === 0) {
      await client.query('COMMIT');
      return null;
    }

    const workOrders = await client.query(
      'SELECT 1 FROM orden_trabajo WHERE placa = $1 LIMIT 1',
      [plate]
    );
    if (workOrders.rowCount > 0) {
      const error = new Error('No se puede eliminar el vehículo porque tiene órdenes de trabajo asociadas.');
      error.code = 'VEHICLE_HAS_WORK_ORDERS';
      throw error;
    }

    const result = await client.query(
      'DELETE FROM vehiculos WHERE placa = $1 RETURNING placa AS plate',
      [plate]
    );
    await client.query('COMMIT');
    return result.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getVehicles,
  getMaintenanceAlerts,
  createVehicle,
  updateVehicle,
  deleteVehicle
};