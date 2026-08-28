import { useState, useEffect, useCallback } from 'react';
import almacenService from '../../../services/almacen.service';

// ─── Modal: Nueva Entrada (crear lote) ───────────────────────────────────────
export function ModalEntrada({ onConfirm, onClose, guardando }) {
  const hoy = new Date().toISOString().split('T')[0];
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState({
    id_producto: '',
    numero_lote: '',
    fecha_produccion: '',
    fecha_vencimiento: '',
    fecha_ingreso_almacen: hoy,
    cantidad_cajas: '',
    unidades_por_caja: '1',
    precio_por_caja: '',
    observaciones: '',
  });

  useEffect(() => {
    almacenService.listarProductos()
      .then(r => setProductos(r.data))
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      ...form,
      cantidad_cajas: parseInt(form.cantidad_cajas),
      unidades_por_caja: parseInt(form.unidades_por_caja),
      precio_por_caja: parseFloat(form.precio_por_caja) || 0,
    });
  };

  const totalUnidades = (parseInt(form.cantidad_cajas) || 0) * (parseInt(form.unidades_por_caja) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Nueva Entrada de Stock</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form id="form-entrada" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Producto *</label>
            <select
              required
              value={form.id_producto}
              onChange={e => set('id_producto', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Seleccione un producto...</option>
              {productos.map(p => (
                <option key={p.id_producto} value={p.id_producto}>
                  {p.nombre} {p.codigo_barras ? `(${p.codigo_barras})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">N° de Lote</label>
              <input
                type="text"
                value={form.numero_lote}
                onChange={e => set('numero_lote', e.target.value)}
                placeholder="Ej. LOT-2024-001"
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha Ingreso *</label>
              <input
                type="date"
                required
                value={form.fecha_ingreso_almacen}
                onChange={e => set('fecha_ingreso_almacen', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha Producción</label>
              <input
                type="date"
                value={form.fecha_produccion}
                onChange={e => set('fecha_produccion', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha Vencimiento</label>
              <input
                type="date"
                value={form.fecha_vencimiento}
                onChange={e => set('fecha_vencimiento', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cajas *</label>
              <input
                type="number"
                required
                min="1"
                value={form.cantidad_cajas}
                onChange={e => set('cantidad_cajas', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Unid./Caja *</label>
              <input
                type="number"
                required
                min="1"
                value={form.unidades_por_caja}
                onChange={e => set('unidades_por_caja', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Precio/Caja (Bs)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.precio_por_caja}
                onChange={e => set('precio_por_caja', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {totalUnidades > 0 && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300">
              Total a ingresar: <span className="font-bold">{totalUnidades} unidades</span> ({form.cantidad_cajas} cajas × {form.unidades_por_caja} u/caja)
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Observaciones</label>
            <textarea
              rows={2}
              value={form.observaciones}
              onChange={e => set('observaciones', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </form>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-entrada"
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl disabled:opacity-50 transition-colors"
          >
            {guardando ? 'Guardando...' : 'Ingresar Lote'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Dar de Baja Lote ─────────────────────────────────────────────────
export function ModalBaja({ lote, onConfirm, onClose, guardando }) {
  const [motivo, setMotivo] = useState('');

  if (!lote) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Dar de Baja Lote</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">{lote.producto_nombre}</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Lote: {lote.numero_lote || `ID-${lote.id_lote}`} · Stock: {lote.stock_unidades} unidades
            </p>
            <p className="text-xs text-red-500 dark:text-red-400 mt-2">
              Esta acción desactivará el lote y registrará la salida del stock restante.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Motivo de baja *</label>
            <input
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej. Vencimiento, Daño, Merma..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(motivo)}
            disabled={guardando || !motivo.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-xl disabled:opacity-50 transition-colors"
          >
            {guardando ? 'Procesando...' : 'Dar de Baja'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Crear Traslado ────────────────────────────────────────────────────
export function ModalTraslado({ lote, onConfirm, onClose, guardando }) {
  const [sucursales, setSucursales] = useState([]);
  const [form, setForm] = useState({
    id_sucursal_dest: '',
    cantidad_cajas: '',
    cantidad_unidades: '',
    observaciones: '',
  });

  useEffect(() => {
    almacenService.listarSucursales()
      .then(r => setSucursales(r.data))
      .catch(() => {});
  }, []);

  if (!lote) return null;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Nuevo Traslado</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm">
            <p className="font-semibold text-zinc-900 dark:text-white">{lote.producto_nombre}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Lote: {lote.numero_lote || `ID-${lote.id_lote}`} · Disponible: {lote.stock_cajas} cajas / {lote.stock_unidades} unidades
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Sucursal Destino *</label>
            <select
              required
              value={form.id_sucursal_dest}
              onChange={e => set('id_sucursal_dest', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Seleccione destino...</option>
              {sucursales.map(s => (
                <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cajas</label>
              <input
                type="number"
                min="0"
                max={lote.stock_cajas}
                value={form.cantidad_cajas}
                onChange={e => set('cantidad_cajas', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Unidades sueltas</label>
              <input
                type="number"
                min="0"
                max={lote.stock_unidades}
                value={form.cantidad_unidades}
                onChange={e => set('cantidad_unidades', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Observaciones</label>
            <textarea
              rows={2}
              value={form.observaciones}
              onChange={e => set('observaciones', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm({ id_lote_origen: lote.id_lote, ...form })}
            disabled={guardando || !form.id_sucursal_dest || (!form.cantidad_cajas && !form.cantidad_unidades)}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl disabled:opacity-50 transition-colors"
          >
            {guardando ? 'Creando...' : 'Crear Traslado'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Ajuste Inventario ─────────────────────────────────────────────────
export function ModalAjuste({ lote, onConfirm, onClose, guardando }) {
  const [nuevaCantidad, setNuevaCantidad] = useState(lote?.stock_unidades ?? '');
  const [motivo, setMotivo] = useState('');

  if (!lote) return null;

  const diferencia = parseInt(nuevaCantidad) - lote.stock_unidades;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Ajuste de Inventario</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm">
            <p className="font-semibold text-zinc-900 dark:text-white">{lote.producto_nombre}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Lote: {lote.numero_lote || `ID-${lote.id_lote}`} · Stock actual: <span className="font-bold text-zinc-700 dark:text-zinc-200">{lote.stock_unidades} u</span>
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nuevo stock real (unidades) *</label>
            <input
              type="number"
              min="0"
              value={nuevaCantidad}
              onChange={e => setNuevaCantidad(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          {nuevaCantidad !== '' && !isNaN(diferencia) && diferencia !== 0 && (
            <div className={`p-3 rounded-xl border text-sm ${diferencia > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
              Diferencia: {diferencia > 0 ? '+' : ''}{diferencia} unidades
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Motivo del ajuste *</label>
            <input
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej. Conteo físico, Merma, Daño..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(lote.id_lote, { nueva_cantidad_unidades: parseInt(nuevaCantidad), motivo })}
            disabled={guardando || !motivo.trim() || nuevaCantidad === '' || isNaN(parseInt(nuevaCantidad))}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-500 rounded-xl disabled:opacity-50 transition-colors"
          >
            {guardando ? 'Guardando...' : 'Aplicar Ajuste'}
          </button>
        </div>
      </div>
    </div>
  );
}
