const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const runWithEnvironment = (code, overrides) => spawnSync(process.execPath, ['-e', code], {
  cwd: require('node:path').join(__dirname, '..'),
  encoding: 'utf8',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    FRONTEND_ORIGINS: 'https://taller.example',
    DATABASE_URL: 'postgresql://test:test@db.example:5432/postgres',
    DB_SSL: 'true',
    DB_SSL_CA: 'test-certificate',
    JWT_SECRET: 'test-secret-with-at-least-32-bytes',
    ...overrides
  }
});

test('exige orígenes HTTPS explícitos en producción', () => {
  const load = "require('./src/config/origins')";
  assert.equal(runWithEnvironment(load, {}).status, 0);
  for (const origin of ['', '*', 'http://taller.example', 'https://taller.example/path']) {
    assert.notEqual(runWithEnvironment(load, { FRONTEND_ORIGINS: origin }).status, 0, origin);
  }
});

test('exige TLS verificado y evita que la URL sobrescriba su configuración', () => {
  const load = "const db=require('./src/config/database'); if (db.pool.options.ssl.rejectUnauthorized !== true || db.pool.options.ssl.ca !== 'test-certificate') process.exit(1); db.pool.end()";
  assert.equal(runWithEnvironment(load, {}).status, 0);
  for (const overrides of [
    { DB_SSL: 'false' },
    { DB_SSL_CA: '' },
    { DATABASE_URL: 'postgresql://test:test@db.example/postgres?sslmode=no-verify' },
    { DATABASE_URL: 'postgresql://test:test@db.example/postgres?ssl=true' }
  ]) {
    assert.notEqual(runWithEnvironment(load, overrides).status, 0);
  }
});

test('la clave de sesión de producción debe estar configurada y tener al menos 32 bytes', () => {
  const load = "require('./src/config/session')";
  assert.equal(runWithEnvironment(load, {}).status, 0);
  assert.notEqual(runWithEnvironment(load, { JWT_SECRET: '' }).status, 0);
  assert.notEqual(runWithEnvironment(load, { JWT_SECRET: 'corta' }).status, 0);
});

test('rechaza solicitudes de escritura sin un origen autorizado', async () => {
  const script = `
    const express = require('express');
    const app = express();
    app.use(require('./src/middlewares/requireTrustedOrigin'));
    app.use((req, res) => res.status(204).end());
    const server = app.listen(0, '127.0.0.1', async () => {
      try {
        const url = 'http://127.0.0.1:' + server.address().port;
        const cases = [
          ['POST', undefined, 403],
          ['POST', 'https://other.example', 403],
          ['POST', 'https://taller.example', 204],
          ['GET', undefined, 204]
        ];
        for (const [method, origin, expected] of cases) {
          const response = await fetch(url, { method, headers: origin ? { Origin: origin } : {} });
          if (response.status !== expected) throw new Error('Estado inesperado: ' + response.status);
        }
      } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
      } finally {
        server.close();
      }
    });
  `;
  const result = runWithEnvironment(script, {});
  assert.equal(result.status, 0, result.stderr);
});

test('la API de producción protege el origen y genera cookies de cierre seguras', () => {
  const script = `
    const net = require('node:net');
    const { spawn } = require('node:child_process');
    const probe = net.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(async () => {
        const startup = "require('./src/services/authService').getUserById = async () => ({ userId: 'test', role: 'administrador' }); require('./src/index')";
        const child = spawn(process.execPath, ['-e', startup], {
          env: { ...process.env, PORT: String(port) },
          stdio: 'ignore'
        });
        const base = 'http://127.0.0.1:' + port;
        try {
          let health;
          for (let attempt = 0; attempt < 50; attempt++) {
            try { health = await fetch(base + '/api/health'); break; } catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
          }
          if (!health || health.status !== 200 || !health.headers.get('cache-control').includes('no-store')) throw new Error('Health check inválido');
          const denied = await fetch(base + '/api/auth/logout', { method: 'POST' });
          if (denied.status !== 403) throw new Error('No se bloqueó un origen ausente');
          const token = require('jsonwebtoken').sign({}, process.env.JWT_SECRET, { subject: 'test' });
          const allowed = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { Origin: 'https://taller.example', Cookie: 'taller_session=' + token } });
          const cookie = allowed.headers.get('set-cookie') || '';
          if (allowed.status !== 200 || !cookie.includes('HttpOnly') || !cookie.includes('Secure') || !cookie.includes('SameSite=Lax')) throw new Error('Cookie de sesión inválida');
        } catch (error) {
          console.error(error.message);
          process.exitCode = 1;
        } finally {
          child.kill();
        }
      });
    });
  `;
  const result = runWithEnvironment(script, {});
  assert.equal(result.status, 0, result.stderr);
});
