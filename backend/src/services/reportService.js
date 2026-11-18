const database = require('../config/database');

const toNumber = (value) => Number(value);

const mapBillingRow = (row) => ({
  period: toNumber(row.period),
  invoiceCount: toNumber(row.invoiceCount),
  subtotal: toNumber(row.subtotal),
  iva: toNumber(row.iva),
  total: toNumber(row.total)
});

const mapPurchaseRow = (row) => ({
  period: toNumber(row.period),
  purchaseCount: toNumber(row.purchaseCount),
  quantity: toNumber(row.quantity),
  total: toNumber(row.total)
});

const sumBy = (rows, key) => Number(rows.reduce((accumulator, row) => accumulator + row[key], 0).toFixed(2));

const getMonthlyBilling = async (year) => {
  const result = await database.query(
    `SELECT
      m AS period,
      COUNT(f.numero_factura) AS "invoiceCount",
      COALESCE(SUM(f.subtotal), 0) AS subtotal,
      COALESCE(SUM(f.iva), 0) AS iva,
      COALESCE(SUM(f.total), 0) AS total
    FROM generate_series(1, 12) AS m
    LEFT JOIN facturacion f
      ON f.fecha_emision >= make_date($1::int, m, 1)
      AND f.fecha_emision < make_date($1::int, m, 1) + INTERVAL '1 month'
    GROUP BY m
    ORDER BY m`,
    [year]
  );

  const months = result.rows.map(mapBillingRow);
  return {
    year,
    months,
    totals: {
      invoiceCount: sumBy(months, 'invoiceCount'),
      subtotal: sumBy(months, 'subtotal'),
      iva: sumBy(months, 'iva'),
      total: sumBy(months, 'total')
    }
  };
};

const getAnnualBilling = async (fromYear, toYear) => {
  const result = await database.query(
    `SELECT
      y AS period,
      COUNT(f.numero_factura) AS "invoiceCount",
      COALESCE(SUM(f.subtotal), 0) AS subtotal,
      COALESCE(SUM(f.iva), 0) AS iva,
      COALESCE(SUM(f.total), 0) AS total
    FROM generate_series($1::int, $2::int) AS y
    LEFT JOIN facturacion f
      ON f.fecha_emision >= make_date(y, 1, 1)
      AND f.fecha_emision < make_date(y + 1, 1, 1)
    GROUP BY y
    ORDER BY y`,
    [fromYear, toYear]
  );

  const years = result.rows.map(mapBillingRow);
  return {
    fromYear,
    toYear,
    years,
    totals: {
      invoiceCount: sumBy(years, 'invoiceCount'),
      subtotal: sumBy(years, 'subtotal'),
      iva: sumBy(years, 'iva'),
      total: sumBy(years, 'total')
    }
  };
};

const getMonthlyPurchases = async (year) => {
  const [monthsResult, topResult] = await Promise.all([
    database.query(
      `SELECT
        m AS period,
        COUNT(c.id) AS "purchaseCount",
        COALESCE(SUM(c.cantidad), 0) AS quantity,
        COALESCE(SUM(c.total), 0) AS total
      FROM generate_series(1, 12) AS m
      LEFT JOIN compras_repuestos c
        ON c.fecha_compra >= make_date($1::int, m, 1)
        AND c.fecha_compra < make_date($1::int, m, 1) + INTERVAL '1 month'
      GROUP BY m
      ORDER BY m`,
      [year]
    ),
    database.query(
      `SELECT
        c.codigo_producto AS "productCode",
        i.descripcion AS description,
        SUM(c.cantidad) AS quantity,
        SUM(c.total) AS total
      FROM compras_repuestos c
      JOIN inventario i ON i.codigo_producto = c.codigo_producto
      WHERE c.fecha_compra >= make_date($1::int, 1, 1)
        AND c.fecha_compra < make_date($1::int + 1, 1, 1)
      GROUP BY c.codigo_producto, i.descripcion
      ORDER BY SUM(c.total) DESC
      LIMIT 5`,
      [year]
    )
  ]);

  const months = monthsResult.rows.map(mapPurchaseRow);
  return {
    year,
    months,
    totals: {
      purchaseCount: sumBy(months, 'purchaseCount'),
      quantity: sumBy(months, 'quantity'),
      total: sumBy(months, 'total')
    },
    topProducts: topResult.rows.map((row) => ({
      productCode: row.productCode,
      description: row.description,
      quantity: toNumber(row.quantity),
      total: toNumber(row.total)
    }))
  };
};

const getAnnualPurchases = async (fromYear, toYear) => {
  const result = await database.query(
    `SELECT
      y AS period,
      COUNT(c.id) AS "purchaseCount",
      COALESCE(SUM(c.cantidad), 0) AS quantity,
      COALESCE(SUM(c.total), 0) AS total
    FROM generate_series($1::int, $2::int) AS y
    LEFT JOIN compras_repuestos c
      ON c.fecha_compra >= make_date(y, 1, 1)
      AND c.fecha_compra < make_date(y + 1, 1, 1)
    GROUP BY y
    ORDER BY y`,
    [fromYear, toYear]
  );

  const years = result.rows.map(mapPurchaseRow);
  return {
    fromYear,
    toYear,
    years,
    totals: {
      purchaseCount: sumBy(years, 'purchaseCount'),
      quantity: sumBy(years, 'quantity'),
      total: sumBy(years, 'total')
    }
  };
};

module.exports = {
  getMonthlyBilling,
  getAnnualBilling,
  getMonthlyPurchases,
  getAnnualPurchases
};
