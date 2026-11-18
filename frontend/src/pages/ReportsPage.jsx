import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import BarChart from '../components/BarChart';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const BILLING_COLOR = '#0284c7';
const PURCHASES_COLOR = '#f59e0b';

const formatMoney = (value) => Number(value ?? 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD' });

function SummaryCard({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [mode, setMode] = useState('monthly');
  const [year, setYear] = useState(currentYear);
  const [fromYear, setFromYear] = useState(currentYear - 4);
  const [toYear, setToYear] = useState(currentYear);
  const [billing, setBilling] = useState(null);
  const [purchases, setPurchases] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const rangeIsValid = fromYear <= toYear && toYear - fromYear < 20;

  useEffect(() => {
    if (mode === 'annual' && !rangeIsValid) {
      return undefined;
    }

    let isCurrent = true;
    const params = mode === 'monthly' ? { year } : { fromYear, toYear };

    const loadReports = async () => {
      setLoading(true);
      setError('');
      try {
        const [billingResponse, purchasesResponse] = await Promise.all([
          api.get(`/reports/billing/${mode}`, { params }),
          api.get(`/reports/purchases/${mode}`, { params })
        ]);
        if (isCurrent) {
          setBilling(billingResponse.data.data);
          setPurchases(purchasesResponse.data.data);
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.response?.data?.message || 'No se pudieron cargar los reportes.');
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    loadReports();
    return () => {
      isCurrent = false;
    };
  }, [mode, year, fromYear, toYear, rangeIsValid]);

  const chart = useMemo(() => {
    if (!billing || !purchases) {
      return null;
    }
    const billingRows = mode === 'monthly' ? billing.months : billing.years;
    const purchaseRows = mode === 'monthly' ? purchases.months : purchases.years;
    // Al cambiar de modo, los datos previos son del otro tipo hasta que llega la nueva respuesta.
    if (!billingRows || !purchaseRows) {
      return null;
    }
    return {
      labels: billingRows.map((row) => (mode === 'monthly' ? MONTH_LABELS[row.period - 1] : String(row.period))),
      billingRows,
      purchaseRows
    };
  }, [billing, purchases, mode]);

  const balance = billing && purchases ? billing.totals.total - purchases.totals.total : 0;
  const periodLabel = mode === 'monthly' ? 'Mes' : 'Año';

  const handleYearChange = (setter) => (event) => {
    const value = Number(event.target.value);
    if (Number.isInteger(value) && value >= 2000 && value <= 2100) {
      setter(value);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Reportería</h2>
          <p className="text-sm text-slate-600">Facturación y gastos en compra de repuestos.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex overflow-hidden rounded border border-slate-300 bg-white text-sm font-semibold">
            {[['monthly', 'Mensual'], ['annual', 'Anual']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`px-4 py-2 ${mode === value ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'monthly' ? (
            <label className="text-sm">
              <span className="block text-xs font-semibold text-slate-500">Año</span>
              <input
                className="w-24 rounded border border-slate-300 px-2 py-1.5"
                type="number"
                min="2000"
                max="2100"
                value={year}
                onChange={handleYearChange(setYear)}
              />
            </label>
          ) : (
            <>
              <label className="text-sm">
                <span className="block text-xs font-semibold text-slate-500">Desde</span>
                <input
                  className="w-24 rounded border border-slate-300 px-2 py-1.5"
                  type="number"
                  min="2000"
                  max="2100"
                  value={fromYear}
                  onChange={handleYearChange(setFromYear)}
                />
              </label>
              <label className="text-sm">
                <span className="block text-xs font-semibold text-slate-500">Hasta</span>
                <input
                  className="w-24 rounded border border-slate-300 px-2 py-1.5"
                  type="number"
                  min="2000"
                  max="2100"
                  value={toYear}
                  onChange={handleYearChange(setToYear)}
                />
              </label>
            </>
          )}
        </div>
      </div>

      {mode === 'annual' && !rangeIsValid && (
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-800" role="alert">
          El año final debe ser igual o posterior al inicial y el rango no puede superar 20 años.
        </p>
      )}
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {loading && <p className="text-sm text-slate-600" role="status">Cargando reportes...</p>}

      {chart && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Total facturado" value={formatMoney(billing.totals.total)} tone="text-sky-700" />
            <SummaryCard label="IVA facturado" value={formatMoney(billing.totals.iva)} />
            <SummaryCard label="Gasto en repuestos" value={formatMoney(purchases.totals.total)} tone="text-amber-600" />
            <SummaryCard
              label="Balance (facturado − gasto)"
              value={formatMoney(balance)}
              tone={balance >= 0 ? 'text-emerald-600' : 'text-red-600'}
            />
          </div>

          <div className="rounded-lg bg-white p-5 shadow">
            <h3 className="mb-3 text-lg font-semibold">
              {mode === 'monthly' ? `Facturación vs. gastos en repuestos ${year}` : `Facturación vs. gastos en repuestos ${fromYear}–${toYear}`}
            </h3>
            <BarChart
              title="Facturación frente a gastos en repuestos"
              labels={chart.labels}
              series={[
                { name: 'Facturación (total)', color: BILLING_COLOR, values: chart.billingRows.map((row) => row.total) },
                { name: 'Gasto en repuestos', color: PURCHASES_COLOR, values: chart.purchaseRows.map((row) => row.total) }
              ]}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="overflow-x-auto rounded-lg bg-white p-5 shadow">
              <h3 className="mb-3 text-lg font-semibold">Detalle de facturación</h3>
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">{periodLabel}</th>
                    <th className="py-2 text-right">Facturas</th>
                    <th className="py-2 text-right">Subtotal</th>
                    <th className="py-2 text-right">IVA</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.billingRows.map((row, index) => (
                    <tr key={row.period} className="border-t border-slate-100">
                      <td className="py-1.5">{chart.labels[index]}</td>
                      <td className="py-1.5 text-right">{row.invoiceCount}</td>
                      <td className="py-1.5 text-right">{formatMoney(row.subtotal)}</td>
                      <td className="py-1.5 text-right">{formatMoney(row.iva)}</td>
                      <td className="py-1.5 text-right font-semibold">{formatMoney(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded-lg bg-white p-5 shadow">
              <h3 className="mb-3 text-lg font-semibold">Detalle de compras de repuestos</h3>
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">{periodLabel}</th>
                    <th className="py-2 text-right">Compras</th>
                    <th className="py-2 text-right">Unidades</th>
                    <th className="py-2 text-right">Gasto</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.purchaseRows.map((row, index) => (
                    <tr key={row.period} className="border-t border-slate-100">
                      <td className="py-1.5">{chart.labels[index]}</td>
                      <td className="py-1.5 text-right">{row.purchaseCount}</td>
                      <td className="py-1.5 text-right">{row.quantity}</td>
                      <td className="py-1.5 text-right font-semibold">{formatMoney(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {mode === 'monthly' && (
            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="mb-3 text-lg font-semibold">Repuestos con mayor gasto en {year}</h3>
              {purchases.topProducts.length === 0 ? (
                <p className="text-sm text-slate-500">No hay compras registradas en este año.</p>
              ) : (
                <ul className="space-y-3">
                  {purchases.topProducts.map((product) => (
                    <li key={product.productCode}>
                      <div className="flex justify-between text-sm">
                        <span>{product.description} <span className="text-slate-400">({product.productCode})</span></span>
                        <span className="font-semibold">{formatMoney(product.total)}</span>
                      </div>
                      <div className="mt-1 h-2 rounded bg-slate-100">
                        <div
                          className="h-2 rounded bg-amber-500"
                          style={{ width: `${(product.total / purchases.topProducts[0].total) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
