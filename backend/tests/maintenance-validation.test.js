const test = require('node:test');
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');
const { closeWorkOrderValidation } = require('../src/validators/workOrderValidator');

const validate = async (nextMaintenance) => {
  const req = {
    body: { workPerformed: 'Cambio de aceite', nextMaintenance },
    params: { workOrderId: '1' },
    query: {}
  };
  for (const rule of closeWorkOrderValidation) {
    await rule.run(req);
  }
  return validationResult(req).array();
};

test('exige una fecha válida de calendario en formato AAAA-MM-DD', async () => {
  assert.equal((await validate('2028-02-29')).length, 0);
  for (const invalid of [undefined, null, '', '2026-02-29', '2026-13-01', '2026-01-01T00:00:00Z', '0000-01-01']) {
    assert.ok((await validate(invalid)).some((error) => error.path === 'nextMaintenance'), String(invalid));
  }
});
