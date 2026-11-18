const database = require('../config/database');

const WORK_ORDER_COLUMNS = `
  ot.cod_orden AS "workOrderId",
  ot.placa AS plate,
  ot.fecha_ingreso AS "entryDate",
  ot.fecha_salida AS "exitDate",
  ot.trabajos_solicitados AS "requestedJobs",
  ot.trabajos_a_realizar AS "plannedJobs",
  ot.observaciones AS observations,
  ot.operario_encargado AS "assignedOperator",
  c.cedula_cliente AS "clientId",
  c.nombre_cliente AS "clientName",
  c.telefono_cliente AS "clientPhone",
  c.whatsapp_opt_in AS "whatsappOptIn",
  v.marca AS make,
  v.modelo AS model,
  v.color,
  v.anio AS year,
  v.kilometraje AS mileage,
  v.tipo_combustible AS "fuelType"`;

const getWorkOrders = async (searchTerm) => {
  const searchPattern = searchTerm ? `%${searchTerm}%` : null;
  const result = await database.query(
    `SELECT ${WORK_ORDER_COLUMNS}
    FROM orden_trabajo ot
    JOIN vehiculos v ON v.placa = ot.placa
    JOIN clientes c ON c.cedula_cliente = v.cedula_cliente
    WHERE $1::text IS NULL
      OR CAST(ot.cod_orden AS text) ILIKE $1
      OR ot.placa ILIKE $1
      OR c.nombre_cliente ILIKE $1
    ORDER BY ot.fecha_ingreso DESC, ot.cod_orden DESC`,
    [searchPattern]
  );

  return result.rows;
};

const getWorkOrderById = async (workOrderId) => {
  const result = await database.query(
    `SELECT ${WORK_ORDER_COLUMNS},
      h.trabajo_realizado AS "workPerformed",
      c.whatsapp_opt_in AS "whatsappOptIn"
    FROM orden_trabajo ot
    JOIN vehiculos v ON v.placa = ot.placa
    JOIN clientes c ON c.cedula_cliente = v.cedula_cliente
    LEFT JOIN historico h ON h.cod_orden = ot.cod_orden
    WHERE ot.cod_orden = $1
    LIMIT 1`,
    [workOrderId]
  );

  return result.rows[0] || null;
};

const createWorkOrder = async ({ plate, requestedJobs, plannedJobs, observations, assignedOperator }) => {
  const result = await database.query(
    `INSERT INTO orden_trabajo (
      placa, trabajos_solicitados, trabajos_a_realizar, observaciones, operario_encargado
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING cod_orden AS "workOrderId", placa AS plate,
      fecha_ingreso AS "entryDate", fecha_salida AS "exitDate",
      trabajos_solicitados AS "requestedJobs", trabajos_a_realizar AS "plannedJobs",
      observaciones, operario_encargado AS "assignedOperator"`,
    [plate, requestedJobs, plannedJobs || null, observations || null, assignedOperator || null]
  );

  return result.rows[0];
};

const closeWorkOrder = async (workOrderId, workPerformed, nextMaintenance) => {
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');
    const orderResult = await client.query(
      'SELECT cod_orden, fecha_salida FROM orden_trabajo WHERE cod_orden = $1 FOR UPDATE',
      [workOrderId]
    );
    if (orderResult.rowCount === 0) {
      const error = new Error('No se encontró la orden de trabajo.');
      error.code = 'WORK_ORDER_NOT_FOUND';
      throw error;
    }
    if (orderResult.rows[0].fecha_salida) {
      const error = new Error('La orden de trabajo ya fue cerrada.');
      error.code = 'WORK_ORDER_ALREADY_CLOSED';
      throw error;
    }

    const maintenanceDate = await client.query(
      `SELECT $1::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Guayaquil')::date AS valid`,
      [nextMaintenance]
    );
    if (!maintenanceDate.rows[0].valid) {
      const error = new Error('El próximo mantenimiento no puede ser anterior a la fecha actual.');
      error.code = 'INVALID_NEXT_MAINTENANCE';
      throw error;
    }

    const existingHistory = await client.query(
      'SELECT 1 FROM historico WHERE cod_orden = $1 LIMIT 1',
      [workOrderId]
    );
    if (existingHistory.rowCount > 0) {
      const error = new Error('La orden ya tiene un registro histórico.');
      error.code = 'WORK_ORDER_ALREADY_CLOSED';
      throw error;
    }

    const closedOrder = await client.query(
      `UPDATE orden_trabajo
      SET fecha_salida = CURRENT_TIMESTAMP
      WHERE cod_orden = $1
      RETURNING fecha_salida AS "exitDate"`,
      [workOrderId]
    );
    await client.query(
      `INSERT INTO historico (cod_orden, fecha_salida, trabajo_realizado)
      VALUES ($1, $2, $3)`,
      [workOrderId, closedOrder.rows[0].exitDate, workPerformed]
    );
    // La salida del vehículo es su último mantenimiento; GREATEST evita retroceder una fecha más reciente.
    await client.query(
      `UPDATE vehiculos
      SET fecha_mantenimiento = GREATEST(COALESCE(fecha_mantenimiento, $2::date), $2::date),
          proximo_mantenimiento = $3::date
      WHERE placa = (SELECT placa FROM orden_trabajo WHERE cod_orden = $1)`,
      [workOrderId, closedOrder.rows[0].exitDate, nextMaintenance]
    );

    await client.query('COMMIT');
    return {
      workOrderId,
      exitDate: closedOrder.rows[0].exitDate,
      workPerformed,
      nextMaintenance
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  closeWorkOrder
};