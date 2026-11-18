const database = require('../config/database');

const getHistory = async ({ searchTerm, fromDate, toDate, page = 1, limit = 20 }) => {
  const searchPattern = searchTerm ? `%${searchTerm}%` : null;
  const offset = (page - 1) * limit;
  const filterValues = [searchPattern, fromDate || null, toDate || null];
  const filters = `
    ($1::text IS NULL
      OR CAST(ot.cod_orden AS text) ILIKE $1
      OR ot.placa ILIKE $1
      OR c.nombre_cliente ILIKE $1
      OR h.trabajo_realizado ILIKE $1)
    AND ($2::date IS NULL OR h.fecha_salida >= $2::date)
    AND ($3::date IS NULL OR h.fecha_salida < $3::date + INTERVAL '1 day')`;

  const [historyResult, countResult] = await Promise.all([
    database.query(
      `SELECT
        h.id AS "historyId",
        h.cod_orden AS "workOrderId",
        h.fecha_salida AS "exitDate",
        h.trabajo_realizado AS "workPerformed",
        ot.fecha_ingreso AS "entryDate",
        ot.trabajos_solicitados AS "requestedJobs",
        ot.trabajos_a_realizar AS "plannedJobs",
        ot.observaciones AS observations,
        ot.operario_encargado AS "assignedOperator",
        ot.placa AS plate,
        v.marca AS make,
        v.modelo AS model,
        v.anio AS year,
        v.kilometraje AS mileage,
        c.cedula_cliente AS "clientId",
        c.nombre_cliente AS "clientName",
        c.telefono_cliente AS "clientPhone",
        f.numero_factura AS "invoiceNumber",
        f.total AS "invoiceTotal"
      FROM historico h
      JOIN orden_trabajo ot ON ot.cod_orden = h.cod_orden
      JOIN vehiculos v ON v.placa = ot.placa
      JOIN clientes c ON c.cedula_cliente = v.cedula_cliente
      LEFT JOIN facturacion f ON f.cod_orden = ot.cod_orden
      WHERE ${filters}
      ORDER BY h.fecha_salida DESC, h.id DESC
      LIMIT $4 OFFSET $5`,
      [...filterValues, limit, offset]
    ),
    database.query(
      `SELECT COUNT(*)::int AS total
      FROM historico h
      JOIN orden_trabajo ot ON ot.cod_orden = h.cod_orden
      JOIN vehiculos v ON v.placa = ot.placa
      JOIN clientes c ON c.cedula_cliente = v.cedula_cliente
      WHERE ${filters}`,
      filterValues
    )
  ]);

  const total = countResult.rows[0].total;
  return {
    data: historyResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

module.exports = {
  getHistory
};