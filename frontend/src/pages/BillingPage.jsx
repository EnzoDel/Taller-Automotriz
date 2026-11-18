import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { downloadPdf, sendPdfByWhatsApp } from '../services/documents';
import { useAuth } from '../context/AuthContext';

const createEmptyItem = () => ({ productCode: '', description: '', quantity: '1', unitPrice: '' });
const currency = (amount) => Number(amount || 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD' });
const productPrice = (product) => {
  const salePrice = Number(product.salePrice);
  const discountPrice = product.discountPrice === null ? null : Number(product.discountPrice);
  return discountPrice !== null && discountPrice < salePrice ? discountPrice : salePrice;
};
const formatDate = (value) => value
  ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—';

export default function BillingPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('billing:create');
  const canSendWhatsApp = hasPermission('billing:send');
  const [invoices, setInvoices] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [ivaRate, setIvaRate] = useState('15');
  const [orderId, setOrderId] = useState('');
  const [items, setItems] = useState([createEmptyItem()]);
  const [documentActionNumber, setDocumentActionNumber] = useState('');

  useEffect(() => {
    let isCurrent = true;

    const loadBilling = async () => {
      setLoading(true);
      setError('');
      try {
        const [invoiceResponse, orderResponse, productResponse] = await Promise.all([
          api.get('/billing/invoices', { params: searchTerm ? { q: searchTerm } : undefined }),
          api.get('/billing/available-orders'),
          api.get('/inventory')
        ]);
        if (isCurrent) {
          setInvoices(invoiceResponse.data.data);
          setAvailableOrders(orderResponse.data.data);
          setProducts(productResponse.data.data);
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.response?.data?.message || 'No se pudo cargar la facturación.');
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    loadBilling();
    return () => {
      isCurrent = false;
    };
  }, [searchTerm, refreshKey]);

  const selectedOrder = availableOrders.find((order) => String(order.orderId) === orderId);

  const handleItemChange = (index, field, value) => {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }

      if (field === 'productCode') {
        const product = products.find((entry) => entry.productCode === value);
        return value
          ? { ...item, productCode: value, description: product?.description || '', unitPrice: product ? String(productPrice(product)) : '' }
          : { ...item, productCode: '', description: '', unitPrice: '' };
      }

      return { ...item, [field]: value };
    }));
  };

  const addItem = () => setItems((current) => [...current, createEmptyItem()]);
  const removeItem = (index) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));

  const subtotal = items.reduce((sum, item) => {
    const product = products.find((entry) => entry.productCode === item.productCode);
    const unitPrice = product ? productPrice(product) : Number(item.unitPrice || 0);
    return sum + unitPrice * Number(item.quantity || 0);
  }, 0);
  const tax = subtotal * Number(ivaRate || 0) / 100;
  const total = subtotal + tax;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/billing/invoices', {
        orderId: Number(orderId),
        ivaRate: Number(ivaRate),
        items: items.map((item) => {
          const invoiceItem = { quantity: Number(item.quantity) };
          if (item.productCode) {
            invoiceItem.productCode = item.productCode;
          } else {
            invoiceItem.description = item.description.trim();
            invoiceItem.unitPrice = Number(item.unitPrice);
          }
          return invoiceItem;
        })
      });
      const invoiceNumber = String(response.data.data.invoiceNumber).padStart(6, '0');
      setMessage(`Factura F-${invoiceNumber} emitida. El stock de repuestos se actualizó.`);
      setFormOpen(false);
      setOrderId('');
      setItems([createEmptyItem()]);
      setIvaRate('15');
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo emitir la factura.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadInvoicePdf = async (invoice) => {
    setDocumentActionNumber(`download-${invoice.invoiceNumber}`);
    setError('');
    setMessage('');
    try {
      await downloadPdf(`/billing/invoices/${invoice.invoiceNumber}/pdf`, `comprobante-interno-${invoice.invoiceNumber}.pdf`);
      setMessage(`PDF de la factura F-${String(invoice.invoiceNumber).padStart(6, '0')} descargado.`);
    } catch {
      setError('No se pudo descargar el comprobante PDF.');
    } finally {
      setDocumentActionNumber('');
    }
  };

  const handleSendInvoicePdf = async (invoice) => {
    if (!invoice.whatsappOptIn) {
      setError('El cliente no ha autorizado recibir documentos por WhatsApp.');
      return;
    }
    if (!window.confirm(`¿Enviar el comprobante F-${String(invoice.invoiceNumber).padStart(6, '0')} al WhatsApp de ${invoice.clientName}?`)) {
      return;
    }

    setDocumentActionNumber(`whatsapp-${invoice.invoiceNumber}`);
    setError('');
    setMessage('');
    try {
      await sendPdfByWhatsApp(`/billing/invoices/${invoice.invoiceNumber}/whatsapp`);
      setMessage('Comprobante interno enviado por WhatsApp.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo enviar el comprobante por WhatsApp.');
    } finally {
      setDocumentActionNumber('');
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">Facturación</h2>
            <span className="rounded bg-slate-200 px-2 py-1 text-xs font-semibold uppercase text-slate-700">Interna</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">Facturas asociadas a órdenes de trabajo</p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <label className="min-w-56 flex-1 sm:w-72">
            <span className="sr-only">Buscar facturas</span>
            <input className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" type="search" placeholder="Buscar factura, orden, placa o cliente" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </label>
          {canCreate && <button className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800" type="button" onClick={() => { setError(''); setFormOpen((current) => !current); }}>{formOpen ? 'Cerrar formulario' : 'Nueva factura'}</button>}
        </div>
      </div>

      {error && <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      {message && <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{message}</p>}

      {canCreate && availableOrders.length === 0 && !loading && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>No hay órdenes pendientes de facturar.</p>
          <Link className="font-semibold underline" to="/ordenes">Ir a órdenes</Link>
        </div>
      )}

      {formOpen && (
        <form className="space-y-5 rounded border border-slate-200 bg-white p-5" onSubmit={handleSubmit}>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Nueva factura interna</h3>
            <p className="mt-1 text-sm text-slate-600">Cada orden se factura una sola vez. Los repuestos se cobran al precio vigente del inventario.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">Orden de trabajo
              <select className="w-full rounded border border-slate-300 bg-white px-3 py-2 font-normal" required value={orderId} onChange={(event) => setOrderId(event.target.value)}>
                <option value="">Selecciona una orden pendiente</option>
                {availableOrders.map((order) => <option key={order.orderId} value={order.orderId}>OT-{String(order.orderId).padStart(5, '0')} · {order.plate} · {order.clientName}</option>)}
              </select>
            </label>
          </div>

          {selectedOrder && (
            <div className="grid gap-4 rounded bg-slate-50 p-4 text-sm sm:grid-cols-3">
              <p><span className="block text-xs uppercase text-slate-500">Cliente</span><span className="mt-1 block font-medium">{selectedOrder.clientName}</span></p>
              <p><span className="block text-xs uppercase text-slate-500">Vehículo</span><span className="mt-1 block font-medium">{selectedOrder.plate} · {selectedOrder.make} {selectedOrder.model}</span></p>
              <p className="sm:col-span-3"><span className="block text-xs uppercase text-slate-500">Trabajo solicitado</span><span className="mt-1 block">{selectedOrder.requestedJobs}</span></p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold text-slate-900">Detalle</h4>
              <button className="rounded border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={addItem} disabled={items.length >= 50}>Agregar línea</button>
            </div>
            {items.map((item, index) => {
              const selectedProduct = products.find((product) => product.productCode === item.productCode);
              const linePrice = selectedProduct ? productPrice(selectedProduct) : Number(item.unitPrice || 0);

              return (
                <div className="grid gap-3 rounded border border-slate-200 p-3 md:grid-cols-12" key={`invoice-item-${index}`}>
                  <label className="space-y-1 text-xs font-semibold text-slate-600 md:col-span-4">Producto del inventario
                    <select className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" value={item.productCode} onChange={(event) => handleItemChange(index, 'productCode', event.target.value)}>
                      <option value="">Mano de obra / servicio manual</option>
                      {products.map((product) => <option key={product.productCode} value={product.productCode} disabled={Number(product.stock) < 1}>{product.productCode} · {product.description} · stock {product.stock}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-slate-600 md:col-span-4">Descripción
                    <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 disabled:bg-slate-100" maxLength="150" required value={item.productCode ? (selectedProduct?.description || '') : item.description} disabled={Boolean(item.productCode)} onChange={(event) => handleItemChange(index, 'description', event.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-slate-600 md:col-span-1">Cantidad
                    <input className="w-full rounded border border-slate-300 px-2 py-2 text-sm font-normal text-slate-800" type="number" min="1" max="1000000" step="1" required value={item.quantity} onChange={(event) => handleItemChange(index, 'quantity', event.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-slate-600 md:col-span-2">Precio unitario
                    <input className="w-full rounded border border-slate-300 px-2 py-2 text-sm font-normal text-slate-800 disabled:bg-slate-100" type="number" min="0" max="99999999.99" step="0.01" required={!item.productCode} value={item.productCode ? (selectedProduct ? productPrice(selectedProduct) : '') : item.unitPrice} disabled={Boolean(item.productCode)} onChange={(event) => handleItemChange(index, 'unitPrice', event.target.value)} />
                  </label>
                  <div className="flex items-end justify-between gap-2 md:col-span-1 md:flex-col md:items-end">
                    <span className="pb-2 text-sm font-semibold text-slate-900">{currency(linePrice * Number(item.quantity || 0))}</span>
                    <button className="pb-2 text-xs font-semibold text-red-700 disabled:text-slate-400" type="button" onClick={() => removeItem(index)} disabled={items.length === 1}>Quitar</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-5 border-t border-slate-200 pt-4">
            <label className="w-40 space-y-1 text-sm font-medium text-slate-700">IVA (%)
              <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" type="number" min="0" max="100" step="0.01" required value={ivaRate} onChange={(event) => setIvaRate(event.target.value)} />
            </label>
            <dl className="grid min-w-52 gap-1 text-right text-sm">
              <div className="flex justify-between gap-6"><dt className="text-slate-600">Subtotal</dt><dd className="font-medium">{currency(subtotal)}</dd></div>
              <div className="flex justify-between gap-6"><dt className="text-slate-600">IVA</dt><dd className="font-medium">{currency(tax)}</dd></div>
              <div className="flex justify-between gap-6 border-t border-slate-200 pt-1 text-base"><dt className="font-semibold">Total</dt><dd className="font-bold text-slate-900">{currency(total)}</dd></div>
            </dl>
          </div>

          <div className="flex justify-end">
            <button className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60" type="submit" disabled={submitting || availableOrders.length === 0}>{submitting ? 'Emitiendo...' : 'Emitir factura'}</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        {loading ? <p className="p-4 text-sm text-slate-600" role="status">Cargando facturas...</p> : invoices.length === 0 ? <p className="p-4 text-sm text-slate-600">No hay facturas registradas.</p> : (
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="px-4 py-3 font-semibold">Factura / emisión</th><th className="px-4 py-3 font-semibold">Orden</th><th className="px-4 py-3 font-semibold">Cliente</th><th className="px-4 py-3 font-semibold">Subtotal</th><th className="px-4 py-3 font-semibold">IVA</th><th className="px-4 py-3 font-semibold">Total</th><th className="px-4 py-3 font-semibold">Documentos</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{invoices.map((invoice) => <tr key={invoice.invoiceNumber}><td className="whitespace-nowrap px-4 py-3"><span className="font-semibold text-slate-900">F-{String(invoice.invoiceNumber).padStart(6, '0')}</span><span className="mt-1 block text-xs text-slate-500">{formatDate(invoice.issuedAt)}</span></td><td className="px-4 py-3">OT-{String(invoice.orderId).padStart(5, '0')}<span className="mt-1 block text-xs text-slate-500">{invoice.plate}</span></td><td className="px-4 py-3">{invoice.clientName}</td><td className="whitespace-nowrap px-4 py-3">{currency(invoice.subtotal)}</td><td className="whitespace-nowrap px-4 py-3">{currency(invoice.iva)}</td><td className="whitespace-nowrap px-4 py-3 font-semibold">{currency(invoice.total)}<details className="mt-1 text-xs font-normal text-slate-600"><summary className="cursor-pointer">Ver detalle</summary><ul className="mt-2 space-y-1">{invoice.items.map((item, index) => <li key={`${invoice.invoiceNumber}-${index}`}>{item.description} · {item.quantity} × {currency(item.unitPrice)}</li>)}</ul></details></td><td className="whitespace-nowrap px-4 py-3"><div className="flex flex-col items-start gap-2"><button className="text-xs font-semibold text-sky-800 underline disabled:text-slate-400" type="button" onClick={() => handleDownloadInvoicePdf(invoice)} disabled={Boolean(documentActionNumber)}>{documentActionNumber === `download-${invoice.invoiceNumber}` ? 'Generando...' : 'Descargar PDF'}</button>{canSendWhatsApp && <button className="text-xs font-semibold text-emerald-800 underline disabled:text-slate-400" type="button" onClick={() => handleSendInvoicePdf(invoice)} disabled={Boolean(documentActionNumber) || !invoice.whatsappOptIn} title={invoice.whatsappOptIn ? 'Enviar PDF por WhatsApp' : 'El cliente no autorizó WhatsApp'}>{documentActionNumber === `whatsapp-${invoice.invoiceNumber}` ? 'Enviando...' : invoice.whatsappOptIn ? 'Enviar WhatsApp' : 'Sin autorización'}</button>}</div></td></tr>)}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}
