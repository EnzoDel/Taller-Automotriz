import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getStockLevel } from '../utils/inventoryStock';

const getStockBadge = (product) => {
  const level = getStockLevel(product.stock, product.stockMax);
  if (level === 'unconfigured') {
    return { label: 'Definir máximo', style: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' };
  }
  if (level === 'red') {
    return {
      label: Number(product.stock) === 0 ? 'Agotado' : 'Bajo',
      style: 'bg-red-50 text-red-800',
      dot: 'bg-red-600'
    };
  }
  if (level === 'yellow') {
    return { label: 'Medio', style: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' };
  }
  return {
    label: Number(product.stock) >= Number(product.stockMax) ? 'Completo' : 'Saludable',
    style: 'bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-600'
  };
};

const getStockRowStyle = (product) => {
  const styles = {
    red: 'bg-red-50',
    yellow: 'bg-amber-50',
    green: 'bg-emerald-50',
    unconfigured: 'bg-slate-50'
  };
  return styles[getStockLevel(product.stock, product.stockMax)];
};

export default function InventoryPage() {
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeAction, setActiveAction] = useState(null);
  const [actionData, setActionData] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [deletingProductCode, setDeletingProductCode] = useState('');
  const [formData, setFormData] = useState({
    productCode: '',
    description: '',
    purchasePrice: '',
    salePrice: '',
    discountPrice: '',
    stock: '0',
    stockMax: ''
  });

  useEffect(() => {
    let isCurrent = true;

    const loadInventory = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.get('/inventory', {
          params: searchTerm ? { q: searchTerm } : undefined
        });

        if (isCurrent) {
          setProducts(response.data.data);
        }
      } catch {
        if (isCurrent) {
          setError('No se pudo cargar el inventario. Verifica que la API y PostgreSQL estén disponibles.');
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    loadInventory();

    return () => {
      isCurrent = false;
    };
  }, [searchTerm, refreshKey]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    setSuccessMessage('');

    try {
      await api.post('/inventory', {
        productCode: formData.productCode.trim(),
        description: formData.description.trim(),
        purchasePrice: Number(formData.purchasePrice),
        salePrice: Number(formData.salePrice),
        discountPrice: formData.discountPrice === '' ? null : Number(formData.discountPrice),
        stock: Number(formData.stock),
        stockMax: Number(formData.stockMax)
      });

      setFormData({
        productCode: '',
        description: '',
        purchasePrice: '',
        salePrice: '',
        discountPrice: '',
        stock: '0',
        stockMax: ''
      });
      setFormOpen(false);
      setSuccessMessage('Producto agregado al inventario.');
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || 'No se pudo guardar el producto.');
    } finally {
      setSubmitting(false);
    }
  };

  const openProductAction = (action, product) => {
    setActiveAction({ type: action, ...product });
    setActionError('');
    setActionData(action === 'edit' ? {
      description: product.description,
      purchasePrice: String(product.purchasePrice),
      salePrice: String(product.salePrice),
      discountPrice: product.discountPrice ?? '',
      stockMax: product.stockMax ?? ''
    } : { quantity: '1' });
  };

  const handleActionDataChange = (event) => {
    const { name, value } = event.target;
    setActionData((current) => ({ ...current, [name]: value }));
  };

  const handleUpdateProduct = async (event) => {
    event.preventDefault();
    setActionSubmitting(true);
    setActionError('');

    try {
      const productCode = activeAction.productCode;
      await api.put(`/inventory/${encodeURIComponent(productCode)}`, {
        description: actionData.description.trim(),
        purchasePrice: Number(actionData.purchasePrice),
        salePrice: Number(actionData.salePrice),
        discountPrice: actionData.discountPrice === '' ? null : Number(actionData.discountPrice),
        stockMax: Number(actionData.stockMax)
      });
      setActiveAction(null);
      setSuccessMessage('Producto actualizado.');
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'No se pudo actualizar el producto.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleReplenishStock = async (event) => {
    event.preventDefault();
    setActionSubmitting(true);
    setActionError('');

    try {
      const productCode = activeAction.productCode;
      await api.patch(`/inventory/${encodeURIComponent(productCode)}/stock`, {
        quantity: Number(actionData.quantity)
      });
      setActiveAction(null);
      setSuccessMessage('Stock reabastecido correctamente.');
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'No se pudo reabastecer el stock.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    const confirmed = window.confirm(`¿Eliminar el producto ${product.productCode}?`);
    if (!confirmed) {
      return;
    }

    setDeletingProductCode(product.productCode);
    setActionError('');
    setSuccessMessage('');

    try {
      await api.delete(`/inventory/${encodeURIComponent(product.productCode)}`);
      setSuccessMessage('Producto eliminado.');
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'No se pudo eliminar el producto.');
    } finally {
      setDeletingProductCode('');
    }
  };

  const outOfStock = products.filter((product) => Number(product.stock) === 0).length;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inventario</h2>
          <p className="mt-1 text-sm text-slate-600">Repuestos y existencias registrados</p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <label className="min-w-56 flex-1 sm:w-72">
            <span className="sr-only">Buscar productos</span>
            <input
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
              type="search"
              placeholder="Buscar por código o descripción"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          {hasPermission('inventory:create') && <button
            className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            type="button"
            onClick={() => {
              setFormError('');
              setFormOpen((current) => !current);
            }}
          >
            {formOpen ? 'Cerrar formulario' : 'Agregar producto'}
          </button>}
        </div>
      </div>

      {successMessage && (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {successMessage}
        </p>
      )}
      {actionError && !activeAction && (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {actionError}
        </p>
      )}

      {formOpen && (
        <form className="space-y-4 rounded border border-slate-200 bg-white p-5" onSubmit={handleSubmit}>
          <h3 className="text-lg font-semibold text-slate-900">Nuevo producto</h3>
          {formError && <p className="text-sm text-red-700" role="alert">{formError}</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Código del producto
              <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="productCode" maxLength="50" required value={formData.productCode} onChange={handleFormChange} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-2">
              Descripción
              <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="description" maxLength="2000" required value={formData.description} onChange={handleFormChange} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Precio de compra
              <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="purchasePrice" type="number" min="0" max="99999999.99" step="0.01" required value={formData.purchasePrice} onChange={handleFormChange} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Precio de venta
              <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="salePrice" type="number" min="0" max="99999999.99" step="0.01" required value={formData.salePrice} onChange={handleFormChange} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Precio con descuento
              <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="discountPrice" type="number" min="0" max="99999999.99" step="0.01" value={formData.discountPrice} onChange={handleFormChange} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Stock inicial
              <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="stock" type="number" min="0" max="2147483647" step="1" required value={formData.stock} onChange={handleFormChange} />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Stock máximo objetivo
              <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="stockMax" type="number" min="1" max="2147483647" step="1" required value={formData.stockMax} onChange={handleFormChange} />
              <span className="block text-xs font-normal text-slate-500">Se usa como referencia para el semáforo.</span>
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => setFormOpen(false)} disabled={submitting}>
              Cancelar
            </button>
            <button className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar producto'}
            </button>
          </div>
        </form>
      )}

      {activeAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section
            className="w-full max-w-xl space-y-4 rounded border border-slate-200 bg-white p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-action-title"
          >
            <div>
              <h3 id="inventory-action-title" className="text-lg font-semibold text-slate-900">
                {activeAction.type === 'edit' ? 'Editar producto' : 'Reabastecer stock'}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {activeAction.productCode} · {activeAction.description}
              </p>
            </div>

            {actionError && <p className="text-sm text-red-700" role="alert">{actionError}</p>}

            {activeAction.type === 'edit' ? (
              <form className="space-y-4" onSubmit={handleUpdateProduct}>
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  Descripción
                  <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="description" maxLength="2000" required value={actionData.description} onChange={handleActionDataChange} />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    Precio de compra
                    <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="purchasePrice" type="number" min="0" max="99999999.99" step="0.01" required value={actionData.purchasePrice} onChange={handleActionDataChange} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    Precio de venta
                    <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="salePrice" type="number" min="0" max="99999999.99" step="0.01" required value={actionData.salePrice} onChange={handleActionDataChange} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">
                    Precio con descuento
                    <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="discountPrice" type="number" min="0" max="99999999.99" step="0.01" value={actionData.discountPrice} onChange={handleActionDataChange} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">
                    Stock máximo objetivo
                    <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="stockMax" type="number" min="1" max="2147483647" step="1" required value={actionData.stockMax} onChange={handleActionDataChange} />
                    <span className="block text-xs font-normal text-slate-500">Rojo: hasta 25%; amarillo: más de 25% y hasta 50%; verde: más de 50%.</span>
                  </label>
                </div>
                <div className="flex justify-end gap-3">
                  <button className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => setActiveAction(null)} disabled={actionSubmitting}>Cancelar</button>
                  <button className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60" type="submit" disabled={actionSubmitting}>{actionSubmitting ? 'Guardando...' : 'Guardar cambios'}</button>
                </div>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleReplenishStock}>
                <p className="text-sm text-slate-600">Stock actual: <strong>{activeAction.stock}</strong></p>
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  Cantidad a sumar
                  <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal" name="quantity" type="number" min="1" max="2147483647" step="1" required value={actionData.quantity} onChange={handleActionDataChange} />
                </label>
                <div className="flex justify-end gap-3">
                  <button className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => setActiveAction(null)} disabled={actionSubmitting}>Cancelar</button>
                  <button className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60" type="submit" disabled={actionSubmitting}>{actionSubmitting ? 'Guardando...' : 'Sumar al stock'}</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Productos encontrados</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{products.length}</p>
        </article>
        <article className="rounded border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Productos sin stock</p>
          <p className="mt-2 text-2xl font-semibold text-red-700">{outOfStock}</p>
        </article>
      </div>

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        {error ? (
          <p className="p-4 text-sm text-red-700" role="alert">{error}</p>
        ) : loading ? (
          <p className="p-4 text-sm text-slate-600" role="status">Cargando inventario...</p>
        ) : products.length === 0 ? (
          <p className="p-4 text-sm text-slate-600">No hay productos para mostrar.</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Código</th>
                <th className="px-4 py-3 font-semibold">Descripción</th>
                <th className="px-4 py-3 font-semibold">Precio de venta</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">Semáforo</th>
                {(hasPermission('inventory:update') || hasPermission('inventory:replenish') || hasPermission('inventory:delete')) && (
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product.productCode} className={getStockRowStyle(product)}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{product.productCode}</td>
                  <td className="px-4 py-3 text-slate-700">{product.description}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {Number(product.salePrice).toLocaleString('es-EC', { style: 'currency', currency: 'USD' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900">{product.stock}</span>
                    <span className="block text-xs text-slate-500">máximo {product.stockMax ?? 'sin definir'}</span>
                  </td>
                  <td className="bg-white px-4 py-3">
                    {(() => {
                      const status = getStockBadge(product);
                      return (
                        <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${status.style}`} aria-label={`Estado del stock: ${status.label}`}>
                          <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} aria-hidden="true" />
                          {status.label}
                        </span>
                      );
                    })()}
                  </td>
                  {(hasPermission('inventory:update') || hasPermission('inventory:replenish') || hasPermission('inventory:delete')) && (
                    <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex gap-2">
                      {hasPermission('inventory:update') && <button className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => openProductAction('edit', product)}>Editar</button>}
                      {hasPermission('inventory:replenish') && <button className="rounded border border-sky-300 px-2.5 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-50" type="button" onClick={() => openProductAction('replenish', product)}>Reabastecer</button>}
                      {hasPermission('inventory:delete') && <button className="rounded border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50" type="button" onClick={() => handleDeleteProduct(product)} disabled={deletingProductCode === product.productCode}>{deletingProductCode === product.productCode ? 'Eliminando...' : 'Eliminar'}</button>}
                    </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
