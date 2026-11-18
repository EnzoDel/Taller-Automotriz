// Genera datos de demostración para el módulo de reportes.
// Uso: node src/scripts/seedReportsDemo.js [--clean]
// Todos los registros usan identificadores DEMO para poder eliminarlos sin tocar datos reales.
const database = require('../config/database');

const DEMO_PRODUCT_PREFIX = 'DEMO-';
const DEMO_CLIENT_PREFIX = '9900000';
const IVA_RATE = 0.15;

// Generador pseudoaleatorio determinista para que la demo sea reproducible.
const createRandom = (seed) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

const random = createRandom(2026);
const randomInt = (min, max) => Math.floor(random() * (max - min + 1)) + min;
const pick = (items) => items[randomInt(0, items.length - 1)];
const round2 = (value) => Math.round(value * 100) / 100;

const PRODUCTS = [
  ['Filtro de aceite', 4.5, 9],
  ['Filtro de aire', 6, 12],
  ['Pastillas de freno delanteras', 22, 45],
  ['Aceite 10W-40 (galón)', 18, 32],
  ['Bujía', 3.2, 7],
  ['Batería 12V', 70, 115],
  ['Amortiguador delantero', 48, 85],
  ['Correa de distribución', 25, 52],
  ['Líquido de frenos', 5, 11],
  ['Refrigerante (galón)', 9, 18]
].map(([description, purchasePrice, salePrice], index) => ({
  code: `${DEMO_PRODUCT_PREFIX}${String(index + 1).padStart(3, '0')}`,
  description,
  purchasePrice,
  salePrice
}));

const CLIENTS = ['Carlos Mena', 'María Ortega', 'Luis Andrade', 'Ana Villacís', 'Jorge Paredes', 'Sofía Naranjo']
  .map((name, index) => ({
    cedula: `${DEMO_CLIENT_PREFIX}${String(index + 1).padStart(3, '0')}`,
    name,
    phone: `099900${String(1000 + index)}`
  }));

const VEHICLES = CLIENTS.map((client, index) => ({
  plate: `DEM-${String(1000 + index)}`,
  clientCedula: client.cedula,
  brand: pick(['Chevrolet', 'Kia', 'Toyota', 'Hyundai']),
  model: pick(['Sail', 'Rio', 'Hilux', 'Tucson']),
  year: 2012 + index
}));

const clean = async (client) => {
  await client.query('DELETE FROM clientes WHERE cedula_cliente LIKE $1', [`${DEMO_CLIENT_PREFIX}%`]);
  await client.query('DELETE FROM inventario WHERE codigo_producto LIKE $1', [`${DEMO_PRODUCT_PREFIX}%`]);
};

const randomDate = (year, month) => {
  const now = new Date();
  const lastDay = year === now.getFullYear() && month === now.getMonth()
    ? Math.max(1, now.getDate() - 1)
    : new Date(year, month + 1, 0).getDate();
  return new Date(year, month, randomInt(1, lastDay), randomInt(8, 17), randomInt(0, 59));
};

// Devuelve los meses (año, mes) desde hace 3 años hasta el mes actual, con un patrón de crecimiento.
const getMonths = () => {
  const now = new Date();
  const months = [];
  for (let year = now.getFullYear() - 3; year <= now.getFullYear(); year += 1) {
    for (let month = 0; month < 12; month += 1) {
      if (year === now.getFullYear() && month > now.getMonth()) {
        break;
      }
      months.push({ year, month, growth: 1 + (year - (now.getFullYear() - 3)) * 0.35 });
    }
  }
  return months;
};

const seed = async (client) => {
  await clean(client);

  for (const product of PRODUCTS) {
    await client.query(
      `INSERT INTO inventario (codigo_producto, descripcion, precio_compra, precio_venta, stock)
      VALUES ($1, $2, $3, $4, $5)`,
      [product.code, product.description, product.purchasePrice, product.salePrice, randomInt(15, 60)]
    );
  }

  for (const [index, demoClient] of CLIENTS.entries()) {
    // Los primeros clientes autorizan WhatsApp para poder probar el envío de documentos.
    const optIn = index < 3;
    await client.query(
      `INSERT INTO clientes (cedula_cliente, nombre_cliente, telefono_cliente, correo_cliente, whatsapp_opt_in, whatsapp_opt_in_at)
      VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 THEN CURRENT_TIMESTAMP ELSE NULL END)`,
      [demoClient.cedula, demoClient.name, demoClient.phone, `${demoClient.cedula}@demo.local`, optIn]
    );
  }

  for (const vehicle of VEHICLES) {
    await client.query(
      `INSERT INTO vehiculos (placa, cedula_cliente, marca, modelo, anio, kilometraje)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [vehicle.plate, vehicle.clientCedula, vehicle.brand, vehicle.model, vehicle.year, randomInt(20000, 160000)]
    );
  }

  let invoiceTotal = 0;
  let purchaseTotal = 0;
  const lastMaintenance = new Map();

  for (const { year, month, growth } of getMonths()) {
    const purchases = randomInt(1, 3);
    for (let index = 0; index < purchases; index += 1) {
      const product = pick(PRODUCTS);
      const quantity = Math.max(1, Math.round(randomInt(5, 20) * growth));
      const total = round2(quantity * product.purchasePrice);
      await client.query(
        `INSERT INTO compras_repuestos (codigo_producto, cantidad, precio_unitario, total, fecha_compra)
        VALUES ($1, $2, $3, $4, $5)`,
        [product.code, quantity, product.purchasePrice, total, randomDate(year, month)]
      );
      purchaseTotal += total;
    }

    const invoices = Math.max(1, Math.round(randomInt(3, 8) * growth));
    for (let index = 0; index < invoices; index += 1) {
      const issuedAt = randomDate(year, month);
      const vehicle = pick(VEHICLES);
      const orderResult = await client.query(
        `INSERT INTO orden_trabajo (placa, fecha_ingreso, fecha_salida, trabajos_solicitados, trabajos_a_realizar, operario_encargado)
        VALUES ($1, $2, $2, $3, $3, $4) RETURNING cod_orden`,
        [vehicle.plate, issuedAt, pick(['Mantenimiento preventivo', 'Cambio de frenos', 'Revisión general']), 'Mecánico Demo']
      );
      const orderId = orderResult.rows[0].cod_orden;
      await client.query(
        'INSERT INTO historico (cod_orden, fecha_salida, trabajo_realizado) VALUES ($1, $2, $3)',
        [orderId, issuedAt, 'Trabajo de demostración completado.']
      );

      const lines = [{ description: 'Mano de obra', code: null, quantity: 1, unitPrice: randomInt(15, 60) }];
      for (let line = 0; line < randomInt(1, 3); line += 1) {
        const product = pick(PRODUCTS);
        lines.push({ description: product.description, code: product.code, quantity: randomInt(1, 4), unitPrice: product.salePrice });
      }

      const subtotal = round2(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
      const iva = round2(subtotal * IVA_RATE);
      const total = round2(subtotal + iva);
      const invoiceResult = await client.query(
        `INSERT INTO facturacion (cod_orden, subtotal, iva, total, fecha_emision)
        VALUES ($1, $2, $3, $4, $5) RETURNING numero_factura`,
        [orderId, subtotal, iva, total, issuedAt]
      );
      for (const line of lines) {
        await client.query(
          `INSERT INTO detalle_factura (numero_factura, codigo_producto, descripcion, cantidad, precio_unitario, total_linea)
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [invoiceResult.rows[0].numero_factura, line.code, line.description, line.quantity, line.unitPrice, round2(line.quantity * line.unitPrice)]
        );
      }
      invoiceTotal += total;
      if (!lastMaintenance.has(vehicle.plate) || issuedAt > lastMaintenance.get(vehicle.plate)) {
        lastMaintenance.set(vehicle.plate, issuedAt);
      }
    }
  }

  // Misma regla que el sistema: la última factura define el último mantenimiento del vehículo.
  for (const [plate, date] of lastMaintenance) {
    await client.query('UPDATE vehiculos SET fecha_mantenimiento = $2::date WHERE placa = $1', [plate, date]);
  }

  console.log(`Datos demo creados. Facturado: $${invoiceTotal.toFixed(2)} | Gasto en repuestos: $${purchaseTotal.toFixed(2)}`);
};

const main = async () => {
  const client = await database.pool.connect();
  try {
    await client.query('BEGIN');
    if (process.argv.includes('--clean')) {
      await clean(client);
      console.log('Datos demo eliminados.');
    } else {
      await seed(client);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
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
