import { useState, useEffect } from 'react';

const CATEGORIAS = [
  { value: 'VARIABLE', label: 'Costo variable' },
  { value: 'FIJO', label: 'Costo fijo' },
  { value: 'RETIRO', label: 'Retiro / fuera del negocio' },
  { value: 'OTRO', label: 'Otros gastos' },
];

export function ModalAnotarMovimiento({ onConfirm, onClose, guardando }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    tipo: 'EGRESO',
    categoria: 'VARIABLE',
    concepto: '',
    monto: '',
    metodo_pago: 'EFECTIVO',
    fecha_gasto: hoy,
    observaciones: '',
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.concepto.trim() || !(parseFloat(form.monto) > 0)) return;
    onConfirm({ ...form, fecha_gasto: `${form.fecha_gasto} 12:00:00` });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Anotar movimiento</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form id="form-movimiento" onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <button type="button" onClick={() => set('tipo', 'INGRESO')}
              className={`flex-1 py-2 text-sm font-bold ${form.tipo === 'INGRESO' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-zinc-800 text-zinc-500'}`}>
              Entró plata
            </button>
            <button type="button" onClick={() => set('tipo', 'EGRESO')}
              className={`flex-1 py-2 text-sm font-bold ${form.tipo === 'EGRESO' ? 'bg-red-600 text-white' : 'bg-white dark:bg-zinc-800 text-zinc-500'}`}>
              Salió plata
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Concepto *</label>
            <input
              type="text" required value={form.concepto} onChange={(e) => set('concepto', e.target.value)}
              placeholder={form.tipo === 'INGRESO' ? 'Ej. Inyección de capital' : 'Ej. Retiro del dueño'}
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {form.tipo === 'EGRESO' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Categoría</label>
              <select
                value={form.categoria} onChange={(e) => set('categoria', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Monto (Bs) *</label>
              <input
                type="number" required min="0.01" step="0.01" value={form.monto} onChange={(e) => set('monto', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha</label>
              <input
                type="date" value={form.fecha_gasto} onChange={(e) => set('fecha_gasto', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Método</label>
            <select
              value={form.metodo_pago} onChange={(e) => set('metodo_pago', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="QR">QR</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
        </form>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" form="form-movimiento" disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModalClasificarGastos({ conceptos, onReclasificar, onClose }) {
  const [valores, setValores] = useState({});
  const [guardandoId, setGuardandoId] = useState(null);

  useEffect(() => {
    setValores(Object.fromEntries(conceptos.map((c) => [c.concepto, c.categoria_actual || 'OTRO'])));
  }, [conceptos]);

  const guardar = async (concepto) => {
    setGuardandoId(concepto);
    try {
      await onReclasificar(concepto, valores[concepto]);
    } finally {
      setGuardandoId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Clasificar gastos</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Cambiar la categoría afecta a todos los movimientos pasados con ese concepto.</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-2">
          {conceptos.length === 0 && (
            <p className="text-sm text-zinc-400 text-center py-8">No hay gastos registrados todavía.</p>
          )}
          {conceptos.map((c) => (
            <div key={c.concepto} className="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{c.concepto}</p>
                <p className="text-xs text-zinc-400">×{c.veces} · Bs {parseFloat(c.total_egresos || 0).toFixed(2)}</p>
              </div>
              <select
                value={valores[c.concepto] || 'OTRO'}
                onChange={(e) => setValores((p) => ({ ...p, [c.concepto]: e.target.value }))}
                className="text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {CATEGORIAS.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </select>
              <button
                onClick={() => guardar(c.concepto)}
                disabled={guardandoId === c.concepto}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg disabled:opacity-50 shrink-0"
              >
                {guardandoId === c.concepto ? '...' : 'Guardar'}
              </button>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
