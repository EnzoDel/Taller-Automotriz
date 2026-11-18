const database = require('../config/database');

const getClients = async (searchTerm) => {
  const searchPattern = searchTerm ? `%${searchTerm}%` : null;
  const result = await database.query(
    `SELECT
      cedula_cliente AS "clientId",
      nombre_cliente AS name,
      telefono_cliente AS phone,
      correo_cliente AS email,
      direccion_cliente AS address,
      whatsapp_opt_in AS "whatsappOptIn",
      whatsapp_opt_in_at AS "whatsappOptInAt"
    FROM clientes
    WHERE $1::text IS NULL
      OR cedula_cliente ILIKE $1
      OR nombre_cliente ILIKE $1
      OR telefono_cliente ILIKE $1
      OR COALESCE(correo_cliente, '') ILIKE $1
    ORDER BY nombre_cliente ASC`,
    [searchPattern]
  );

  return result.rows;
};

const getClientOptions = async () => {
  const result = await database.query(
    `SELECT cedula_cliente AS "clientId", nombre_cliente AS name
    FROM clientes
    ORDER BY nombre_cliente ASC`
  );

  return result.rows;
};

const createClient = async ({ clientId, name, phone, email, address, whatsappOptIn = false }) => {
  const result = await database.query(
    `INSERT INTO clientes (
      cedula_cliente, nombre_cliente, telefono_cliente, correo_cliente,
      direccion_cliente, whatsapp_opt_in, whatsapp_opt_in_at
    ) VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $6 THEN CURRENT_TIMESTAMP ELSE NULL END)
    RETURNING cedula_cliente AS "clientId", nombre_cliente AS name,
      whatsapp_opt_in AS "whatsappOptIn", whatsapp_opt_in_at AS "whatsappOptInAt"`,
    [clientId, name, phone, email || null, address || null, Boolean(whatsappOptIn)]
  );

  return result.rows[0];
};

const updateClient = async (clientId, { name, phone, email, address, whatsappOptIn = false }) => {
  const result = await database.query(
    `UPDATE clientes
    SET nombre_cliente = $2,
        telefono_cliente = $3,
        correo_cliente = $4,
        direccion_cliente = $5,
        whatsapp_opt_in = $6,
        whatsapp_opt_in_at = CASE WHEN $6 THEN CURRENT_TIMESTAMP ELSE NULL END
    WHERE cedula_cliente = $1
    RETURNING cedula_cliente AS "clientId", nombre_cliente AS name,
      telefono_cliente AS phone, correo_cliente AS email, direccion_cliente AS address,
      whatsapp_opt_in AS "whatsappOptIn", whatsapp_opt_in_at AS "whatsappOptInAt"`,
    [clientId, name, phone, email ?? null, address ?? null, Boolean(whatsappOptIn)]
  );

  return result.rows[0] || null;
};

const deleteClient = async (clientId) => {
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');
    const currentClient = await client.query(
      'SELECT cedula_cliente FROM clientes WHERE cedula_cliente = $1 FOR UPDATE',
      [clientId]
    );
    if (currentClient.rowCount === 0) {
      await client.query('COMMIT');
      return null;
    }

    const vehicles = await client.query(
      'SELECT 1 FROM vehiculos WHERE cedula_cliente = $1 LIMIT 1',
      [clientId]
    );
    if (vehicles.rowCount > 0) {
      const error = new Error('No se puede eliminar el cliente porque tiene vehículos asociados.');
      error.code = 'CLIENT_HAS_VEHICLES';
      throw error;
    }

    const result = await client.query(
      `DELETE FROM clientes
      WHERE cedula_cliente = $1
      RETURNING cedula_cliente AS "clientId", nombre_cliente AS name`,
      [clientId]
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
  getClients,
  getClientOptions,
  createClient,
  updateClient,
  deleteClient
};