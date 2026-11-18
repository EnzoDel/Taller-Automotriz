const database = require('../config/database');

const MAX_AMOUNT_CENTS = 9999999999;

const toCents = (amount) => Math.round(Number(amount) * 100);
const centsToAmount = (amountCents) => (amountCents / 100).toFixed(2);

const getInvoices = async (searchTerm) => {
  const searchPattern = searchTerm ? `%${searchTerm}%` : null;
  const result = await database.query(
    `SELECT
      f.numero_factura AS "invoiceNumber",
      f.cod_orden AS "orderId",
      f.subtotal,
      f.iva,
      f.total,
      f.fecha_emision AS "issuedAt",
      ot.placa AS plate,
      c.nombre_cliente AS "clientName",
      c.telefono_cliente AS "clientPhone",
      c.whatsapp_opt_in AS "whatsappOptIn",
      COALESCE(
        jsonb_agg(jsonb_build_object(
          'productCode', df.codigo_producto,
          'description', df.descripcion,
          'quantity', df.cantidad,
          'unitPrice', df.precio_unitario,
          'lineTotal', df.total_linea
        )) FILTER (WHERE df.id IS NOT NULL),
        '[]'::jsonb
      ) AS items
    FROM facturacion f
    JOIN orden_trabajo ot ON ot.cod_orden = f.cod_orden
    JOIN vehiculos v ON v.placa = ot.placa
    JOIN clientes c ON c.cedula_cliente = v.cedula_cliente
    LEFT JOIN detalle_factura df ON df.numero_factura = f.numero_factura
    WHERE $1::text IS NULL
      OR CAST(f.numero_factura AS text) ILIKE $1
      OR CAST(f.cod_orden AS text) ILIKE $1
      OR ot.placa ILIKE $1
      OR c.nombre_cliente ILIKE $1
    GROUP BY f.numero_factura, f.cod_orden, f.subtotal, f.iva, f.total,
      f.fecha_emision, ot.placa, c.nombre_cliente, c.telefono_cliente, c.whatsapp_opt_in
    ORDER BY f.fecha_emision DESC, f.numero_factura DESC`,
    [searchPattern]
  );

  return result.rows;
};

const getInvoiceByNumber = async (invoiceNumber) => {
  const result = await database.query(
    `SELECT
      f.numero_factura AS "invoiceNumber",
      f.cod_orden AS "orderId",
      f.subtotal,
      f.iva,
      f.total,
      f.fecha_emision AS "issuedAt",
      ot.placa AS plate,
      c.nombre_cliente AS "clientName",
      c.telefono_cliente AS "clientPhone",
      c.whatsapp_opt_in AS "whatsappOptIn",
      v.marca AS make,
      v.modelo AS model,
      v.anio AS year,
      COALESCE(
        jsonb_agg(jsonb_build_object(
          'productCode', df.codigo_producto,
          'description', df.descripcion,
          'quantity', df.cantidad,
          'unitPrice', df.precio_unitario,
          'lineTotal', df.total_linea
        )) FILTER (WHERE df.id IS NOT NULL),
        '[]'::jsonb
      ) AS items
    FROM facturacion f
    JOIN orden_trabajo ot ON ot.cod_orden = f.cod_orden
    JOIN vehiculos v ON v.placa = ot.placa
    JOIN clientes c ON c.cedula_cliente = v.cedula_cliente
    LEFT JOIN detalle_factura df ON df.numero_factura = f.numero_factura
    WHERE f.numero_factura = $1
    GROUP BY f.numero_factura, f.cod_orden, f.subtotal, f.iva, f.total,
      f.fecha_emision, ot.placa, c.nombre_cliente, c.telefono_cliente,
      c.whatsapp_opt_in, v.marca, v.modelo, v.anio
    LIMIT 1`,
    [invoiceNumber]
  );

  return result.rows[0] || null;
};

const getAvailableOrders = async () => {
  const result = await database.query(
    `SELECT
      ot.cod_orden AS "orderId",
      ot.fecha_ingreso AS "entryDate",
      ot.placa AS plate,
      ot.trabajos_solicitados AS "requestedJobs",
      c.nombre_cliente AS "clientName",
      v.marca AS make,
      v.modelo AS model
    FROM orden_trabajo ot
    JOIN vehiculos v ON v.placa = ot.placa
    JOIN clientes c ON c.cedula_cliente = v.cedula_cliente
    WHERE NOT EXISTS (
      SELECT 1 FROM facturacion f WHERE f.cod_orden = ot.cod_orden
    )
    ORDER BY ot.fecha_ingreso ASC, ot.cod_orden ASC`
  );

  return result.rows;
};

const createInvoice = async ({ orderId, ivaRate, items }) => {
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');
    const orderResult = await client.query(
      'SELECT cod_orden FROM orden_trabajo WHERE cod_orden = $1 FOR UPDATE',
      [orderId]
    );
    if (orderResult.rowCount === 0) {
      const error = new Error('No se encontró la orden de trabajo seleccionada.');
      error.code = 'ORDER_NOT_FOUND';
      throw error;
    }

    const existingInvoice = await client.query(
      'SELECT 1 FROM facturacion WHERE cod_orden = $1 LIMIT 1',
      [orderId]
    );
    if (existingInvoice.rowCount > 0) {
      const error = new Error('La orden de trabajo ya tiene una factura.');
      error.code = 'ORDER_ALREADY_INVOICED';
      throw error;
    }

    const invoiceItems = [];
    let subtotalCents = 0;

    for (const item of items) {
      const quantity = Number(item.quantity);
      let productCode = null;
      let description = item.description?.trim() || '';
      let unitPriceCents;

      if (item.productCode) {
        const inventoryResult = await client.query(
          `SELECT codigo_producto, LEFT(descripcion, 150) AS description,
            precio_venta, precio_descuento, stock
          FROM inventario
          WHERE codigo_producto = $1
          FOR UPDATE`,
          [item.productCode]
        );
        const product = inventoryResult.rows[0];
        if (!product) {
          const error = new Error(`No se encontró el producto ${item.productCode}.`);
          error.code = 'PRODUCT_NOT_FOUND';
          throw error;
        }
        if (Number(product.stock) < quantity) {
          const error = new Error(`Stock insuficiente para ${product.description}.`);
          error.code = 'INSUFFICIENT_STOCK';
          throw error;
        }

        productCode = product.codigo_producto;
        description = product.description;
        const salePrice = Number(product.precio_venta);
        const discountPrice = product.precio_descuento === null ? null : Number(product.precio_descuento);
        const effectivePrice = discountPrice !== null && discountPrice < salePrice
          ? discountPrice
          : salePrice;
        unitPriceCents = toCents(effectivePrice);

        const stockUpdate = await client.query(
          `UPDATE inventario
          SET stock = stock - $2
          WHERE codigo_producto = $1 AND stock >= $2`,
          [productCode, quantity]
        );
        if (stockUpdate.rowCount === 0) {
          const error = new Error(`Stock insuficiente para ${description}.`);
          error.code = 'INSUFFICIENT_STOCK';
          throw error;
        }
      } else {
        unitPriceCents = toCents(item.unitPrice);
      }

      const lineTotalCents = unitPriceCents * quantity;
      if (!Number.isSafeInteger(lineTotalCents) || lineTotalCents > MAX_AMOUNT_CENTS) {
        const error = new Error('El total de una línea supera el máximo permitido.');
        error.code = 'INVOICE_AMOUNT_OUT_OF_RANGE';
        throw error;
      }

      subtotalCents += lineTotalCents;
      invoiceItems.push({
        productCode,
        description,
        quantity,
        unitPrice: centsToAmount(unitPriceCents),
        lineTotal: centsToAmount(lineTotalCents),
        lineTotalCents
      });
    }

    const taxCents = Math.round(subtotalCents * Number(ivaRate) / 100);
    const totalCents = subtotalCents + taxCents;
    if (subtotalCents > MAX_AMOUNT_CENTS || taxCents > MAX_AMOUNT_CENTS || totalCents > MAX_AMOUNT_CENTS) {
      const error = new Error('El total de la factura supera el máximo permitido.');
      error.code = 'INVOICE_AMOUNT_OUT_OF_RANGE';
      throw error;
    }

    const invoiceResult = await client.query(
      `INSERT INTO facturacion (cod_orden, subtotal, iva, total)
      VALUES ($1, $2, $3, $4)
      RETURNING numero_factura AS "invoiceNumber", cod_orden AS "orderId",
        subtotal, iva, total, fecha_emision AS "issuedAt"`,
      [orderId, centsToAmount(subtotalCents), centsToAmount(taxCents), centsToAmount(totalCents)]
    );
    const invoice = invoiceResult.rows[0];

    for (const item of invoiceItems) {
      await client.query(
        `INSERT INTO detalle_factura (
          numero_factura, codigo_producto, descripcion, cantidad, precio_unitario, total_linea
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [invoice.invoiceNumber, item.productCode, item.description, item.quantity, item.unitPrice, item.lineTotal]
      );
    }

    // Facturar implica pago y salida del vehículo: esa fecha es su último mantenimiento.
    await client.query(
      `UPDATE vehiculos
      SET fecha_mantenimiento = GREATEST(COALESCE(fecha_mantenimiento, $2::date), $2::date)
      WHERE placa = (SELECT placa FROM orden_trabajo WHERE cod_orden = $1)`,
      [orderId, invoice.issuedAt]
    );

    await client.query('COMMIT');
    return { ...invoice, items: invoiceItems.map(({ lineTotalCents, ...item }) => item) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getInvoices,
  getInvoiceByNumber,
  getAvailableOrders,
  createInvoice
};