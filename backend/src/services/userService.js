const database = require('../config/database');
const { hashPassword } = require('./authService');
const { normalizeRole } = require('../config/permissions');

const USER_ADMIN_LOCK_KEY = 748219;

const getUsers = async () => {
  const result = await database.query(
    `SELECT cedula AS "userId", nombre AS name, telefono AS phone,
      correo AS email, rol AS role
    FROM usuarios
    ORDER BY nombre ASC`
  );

  return result.rows;
};

const createUser = async ({ cedula, name, phone, email, password, role }) => {
  const passwordHash = await hashPassword(password);
  const result = await database.query(
    `INSERT INTO usuarios (cedula, nombre, telefono, correo, contrasena, rol)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING cedula AS "userId", nombre AS name, telefono AS phone,
      correo AS email, rol AS role`,
    [cedula, name, phone, email, passwordHash, role]
  );

  return result.rows[0];
};

const updateUser = async (userId, { name, phone, email, password, role }) => {
  const passwordHash = password ? await hashPassword(password) : null;
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [USER_ADMIN_LOCK_KEY]);
    const currentResult = await client.query(
      'SELECT rol FROM usuarios WHERE cedula = $1 FOR UPDATE',
      [userId]
    );

    if (!currentResult.rows[0]) {
      await client.query('COMMIT');
      return null;
    }

    const currentRole = normalizeRole(currentResult.rows[0].rol);
    const nextRole = normalizeRole(role || currentResult.rows[0].rol);
    if (currentRole === 'administrador' && nextRole !== 'administrador') {
      const admins = await client.query(
        "SELECT COUNT(*)::int AS total FROM usuarios WHERE LOWER(rol) = 'administrador'"
      );
      if (admins.rows[0].total <= 1) {
        const error = new Error('No se puede cambiar el rol del último administrador.');
        error.code = 'LAST_ADMIN';
        throw error;
      }
    }

    const result = await client.query(
      `UPDATE usuarios
      SET nombre = COALESCE($2, nombre),
          telefono = COALESCE($3, telefono),
          correo = COALESCE($4, correo),
          rol = COALESCE($5, rol),
          contrasena = COALESCE($6, contrasena)
      WHERE cedula = $1
      RETURNING cedula AS "userId", nombre AS name, telefono AS phone,
        correo AS email, rol AS role`,
      [userId, name ?? null, phone ?? null, email ?? null, role ?? null, passwordHash]
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

const deleteUser = async (userId) => {
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [USER_ADMIN_LOCK_KEY]);
    const currentResult = await client.query(
      'SELECT rol FROM usuarios WHERE cedula = $1 FOR UPDATE',
      [userId]
    );

    if (!currentResult.rows[0]) {
      await client.query('COMMIT');
      return null;
    }

    if (normalizeRole(currentResult.rows[0].rol) === 'administrador') {
      const admins = await client.query(
        "SELECT COUNT(*)::int AS total FROM usuarios WHERE LOWER(rol) = 'administrador'"
      );
      if (admins.rows[0].total <= 1) {
        const error = new Error('No se puede eliminar al último administrador.');
        error.code = 'LAST_ADMIN';
        throw error;
      }
    }

    const result = await client.query(
      `DELETE FROM usuarios WHERE cedula = $1
      RETURNING cedula AS "userId", nombre AS name, correo AS email, rol AS role`,
      [userId]
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
  getUsers,
  createUser,
  updateUser,
  deleteUser
};