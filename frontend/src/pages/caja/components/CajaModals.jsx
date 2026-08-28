import { useState, useEffect } from 'react';

// ── Modal crear / editar caja ────────────────────────────────────────────────
export function ModalCaja({ caja, onConfirm, onClose, guardando, sucursales = [] }) {
  const [form, setForm] = useState({
    nombre: caja?.nombre || '',
    descripcion: caja?.descripcion || '',
    id_sucursal: caja?.id_sucursal || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    onConfirm(form);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
          <h2 className="font-bold text-zinc-900 dark:text-white">{caja ? 'Editar Caja' : 'Nueva Caja'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Nombre *</label>
            <input
              autoFocus
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ej. Caja Principal"
              required
            />
          </div>
          {!caja && sucursales.length > 0 && (
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Sucursal</label>
              <select
                value={form.id_sucursal}
                onChange={e => set('id_sucursal', e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg text-sm outline-none"
              >
                <option value="">Mi sucursal</option>
                {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Descripción</label>
            <textarea
              rows={2}
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="Opcional"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {guardando ? 'Guardando...' : (caja ? 'Guardar cambios' : 'Crear Caja')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal abrir turno ────────────────────────────────────────────────────────
export function ModalAbrirTurno({ cajas, onConfirm, onClose, guardando }) {
  const [form, setForm] = useState({ id_caja: '', monto_inicial: '', observaciones: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  // activo puede venir como boolean (true/false) o number (1/0) según mysql2
  const cajasActivas = cajas.filter(c => c.activo == true || c.activo === 1);
  const sinCajas = cajasActivas.length === 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.id_caja) return;
    onConfirm({ ...form, monto_inicial: parseFloat(form.monto_inicial) || 0 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
          <h2 className="font-bold text-zinc-900 dark:text-white">Abrir Turno de Caja</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">✕</button>
        </div>

        {/* Aviso prominente si no hay cajas disponibles */}
        {sinCajas && (
          <div className="mx-5 mt-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
              ⚠️ No hay cajas activas registradas
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Debe crear al menos una caja desde la pestaña <strong>"Cajas"</strong> antes de poder abrir un turno.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium"
            >
              Entendido, ir a crear una caja
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Caja *</label>
            <select
              value={form.id_caja}
              onChange={e => set('id_caja', e.target.value)}
              required
              disabled={sinCajas}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{sinCajas ? 'Sin cajas disponibles' : 'Seleccionar caja...'}</option>
              {cajasActivas.map(c => <option key={c.id_caja} value={c.id_caja}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Monto inicial (Bs)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.monto_inicial}
              onChange={e => set('monto_inicial', e.target.value)}
              disabled={sinCajas}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Observaciones</label>
            <textarea
              rows={2}
              value={form.observaciones}
              onChange={e => set('observaciones', e.target.value)}
              disabled={sinCajas}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg text-sm outline-none resize-none disabled:opacity-50"
              placeholder="Opcional"
            />
          </div>
          {!sinCajas && (
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium">
                Cancelar
              </button>
              <button type="submit" disabled={guardando} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {guardando ? 'Abriendo...' : 'Abrir Turno'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// ── Modal registrar gasto de caja ───────────────────────────────────────────
export function ModalGasto({ onConfirm, onClose, guardando }) {
  const [form, setForm] = useState({ concepto: '', monto: '', metodo_pago: 'EFECTIVO', observaciones: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.concepto.trim() || !(parseFloat(form.monto) > 0)) return;
    onConfirm({ ...form, monto: parseFloat(form.monto) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
          <h2 className="font-bold text-zinc-900 dark:text-white">Registrar Gasto de Caja</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Concepto *</label>
            <input
              autoFocus
              value={form.concepto}
              onChange={e => set('concepto', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ej. Compra de bolsas, flete, imprevisto..."
              required
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Monto (Bs) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.monto}
              onChange={e => set('monto', e.target.value)}
              required
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Método de pago</label>
            <select
              value={form.metodo_pago}
              onChange={e => set('metodo_pago', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="QR">QR</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Observaciones</label>
            <textarea
              rows={2}
              value={form.observaciones}
              onChange={e => set('observaciones', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg text-sm outline-none resize-none"
              placeholder="Opcional"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Registrar gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal cerrar turno ───────────────────────────────────────────────────────
export function ModalCerrarTurno({ turno, onConfirm, onClose, guardando }) {
  const [form, setForm] = useState({ monto_final: '', observaciones: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(turno.id_apertura, { monto_final: parseFloat(form.monto_final) || 0, observaciones: form.observaciones });
  };

  const fmt = (n) => parseFloat(n || 0).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
          <h2 className="font-bold text-zinc-900 dark:text-white">Cerrar Turno — Arqueo de Caja</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Caja</span>
              <span className="font-medium">{turno.caja_nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Monto inicial</span>
              <span className="font-medium">Bs {fmt(turno.monto_inicial)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Apertura</span>
              <span className="font-medium">{new Date(turno.fecha_apertura).toLocaleString('es-BO')}</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1">Monto contado en caja (Bs) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.monto_final}
              onChange={e => set('monto_final', e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="0.00"
            />
            <p className="text-xs text-zinc-400 mt-1">El sistema calculará la diferencia automáticamente.</p>
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1">Observaciones de cierre</label>
            <textarea
              rows={2}
              value={form.observaciones}
              onChange={e => set('observaciones', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg text-sm outline-none resize-none"
              placeholder="Opcional"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {guardando ? 'Cerrando...' : 'Cerrar Turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
