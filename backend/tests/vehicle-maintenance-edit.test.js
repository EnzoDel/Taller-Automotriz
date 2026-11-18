const test = require('node:test');
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');
const { vehicleCreateValidation, vehicleUpdateValidation } = require('../src/validators/vehicleValidator');
const database = require('../src/config/database');
const { createVehicle, updateVehicle } = require('../src/services/vehicleService');

const vehicle = {
  plate: 'ABC-123',
  clientId: '0123456789',
  make: 'Marca',
  model: 'Modelo',
  year: 2020,
  mileage: 1000
};

const validate = async (rules, data) => {
  const req = { body: { ...data }, params: { plate: vehicle.plate }, query: {} };
  for (const rule of rules) {
    await rule.run(req);
  }
  return validationResult(req).array();
};

test('no permite establecer manualmente el último mantenimiento', async () => {
  assert.equal((await validate(vehicleCreateValidation, vehicle)).length, 0);
  assert.equal((await validate(vehicleUpdateValidation, vehicle)).length, 0);
  for (const lastMaintenance of ['2026-01-01', null]) {
    for (const rules of [vehicleCreateValidation, vehicleUpdateValidation]) {
      const errors = await validate(rules, { ...vehicle, lastMaintenance });
      assert.ok(errors.some((error) => error.path === 'lastMaintenance'));
    }
  }
});

test('al registrar un vehículo se guarda sin fecha de mantenimiento', async () => {
  const originalQuery = database.query;
  let captured;
  database.query = async (sql, params) => {
    captured = { sql, params };
    return { rows: [{ plate: vehicle.plate, lastMaintenance: null }] };
  };
  try {
    const result = await createVehicle({ ...vehicle, lastMaintenance: '2027-01-01' });
    assert.match(captured.sql, /VALUES\s*\(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, NULL\)/);
    assert.equal(captured.params.length, 8);
    assert.equal(result.lastMaintenance, null);
  } finally {
    database.query = originalQuery;
  }
});

test('editar un vehículo no modifica la fecha de mantenimiento', async () => {
  const originalQuery = database.query;
  let captured;
  database.query = async (sql, params) => {
    captured = { sql, params };
    return { rows: [{ plate: vehicle.plate, lastMaintenance: '2026-01-01' }] };
  };
  try {
    const result = await updateVehicle(vehicle.plate, { ...vehicle, lastMaintenance: '2027-01-01' });
    const setClause = captured.sql.split('WHERE')[0];
    assert.doesNotMatch(setClause, /fecha_mantenimiento/i);
    assert.equal(captured.params.length, 8);
    assert.equal(result.lastMaintenance, '2026-01-01');
  } finally {
    database.query = originalQuery;
    await database.pool.end();
  }
});
