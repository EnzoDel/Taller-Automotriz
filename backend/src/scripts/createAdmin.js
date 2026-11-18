const readline = require('node:readline/promises');
const database = require('../config/database');
const { hashPassword } = require('../services/authService');

const promptHidden = (message) => new Promise((resolve, reject) => {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    reject(new Error('Ejecuta este comando desde una terminal interactiva.'));
    return;
  }

  process.stdout.write(message);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let value = '';

  const handleInput = (chunk) => {
    const character = chunk.toString('utf8');
    if (character === '\u0003') {
      process.stdin.removeListener('data', handleInput);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      reject(new Error('Operación cancelada.'));
      return;
    }

    if (character === '\r' || character === '\n') {
      process.stdin.removeListener('data', handleInput);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
      resolve(value);
      return;
    }

    if (character === '\u007f' || character === '\b') {
      if (value.length > 0) {
        value = value.slice(0, -1);
        process.stdout.write('\b \b');
      }
      return;
    }

    value += character;
    process.stdout.write('*');
  };

  process.stdin.on('data', handleInput);
});

const main = async () => {
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  const cedula = (await prompt.question('Cédula (10 dígitos): ')).trim();
  const name = (await prompt.question('Nombre: ')).trim();
  const phone = (await prompt.question('Teléfono: ')).trim();
  const email = (await prompt.question('Correo: ')).trim().toLowerCase();
  prompt.close();

  const password = await promptHidden('Contraseña (mínimo 10 caracteres): ');
  const confirmation = await promptHidden('Confirmar contraseña: ');
  if (password.length < 10 || Buffer.byteLength(password, 'utf8') > 72 || password !== confirmation) {
    throw new Error('La contraseña no cumple el mínimo o no coincide con su confirmación.');
  }

  const client = await database.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [748219]);
    const countResult = await client.query('SELECT COUNT(*)::int AS total FROM usuarios');
    if (countResult.rows[0].total > 0) {
      throw new Error('Ya existen usuarios. El primer administrador solo se puede crear con la tabla vacía.');
    }

    const passwordHash = await hashPassword(password);
    await client.query(
      `INSERT INTO usuarios (cedula, nombre, telefono, correo, contrasena, rol)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [cedula, name, phone, email, passwordHash, 'administrador']
    );
    await client.query('COMMIT');
    console.log('Administrador inicial creado. Ya puedes iniciar sesión desde el frontend.');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      throw new Error('La cédula o el correo ya están registrados.');
    }
    throw error;
  } finally {
    client.release();
    await database.pool.end();
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});