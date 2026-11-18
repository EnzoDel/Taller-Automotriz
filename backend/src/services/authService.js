const bcrypt = require('bcryptjs');
const database = require('../config/database');
const { normalizeRole, getRolePermissions } = require('../config/permissions');

const toPublicUser = (user) => {
  const role = normalizeRole(user.role);
  return {
    userId: user.userId,
    name: user.name,
    email: user.email,
    role,
    permissions: getRolePermissions(role)
  };
};

const authenticateUser = async (email, password) => {
  const result = await database.query(
    `SELECT cedula AS "userId", nombre AS name, correo AS email,
      contrasena AS "passwordHash", rol AS role
    FROM usuarios
    WHERE LOWER(correo) = LOWER($1)
    LIMIT 1`,
    [email]
  );
  const user = result.rows[0];

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return null;
  }

  return toPublicUser(user);
};

const getUserById = async (userId) => {
  const result = await database.query(
    `SELECT cedula AS "userId", nombre AS name, correo AS email, rol AS role
    FROM usuarios
    WHERE cedula = $1
    LIMIT 1`,
    [userId]
  );

  return result.rows[0] ? toPublicUser(result.rows[0]) : null;
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

module.exports = {
  authenticateUser,
  getUserById,
  hashPassword,
  comparePassword,
};
