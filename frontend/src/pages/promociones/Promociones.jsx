import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/PageWrapper';
import promocionService from '../../services/promocion.service';
import productoService from '../../services/producto.service';
import catalogoService from '../../services/catalogo.service';
import { usePermission } from '../../hooks/usePermission';

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium max-w-xs sm:max-w-sm ${
      toast.tipo === 'ok'
        ? 'bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300'
        : 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
    }`}>
      <span className="break-words">{toast.msg}</span>
    </div>
  );
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function ModalPromocion({ promo, productos, clasificaciones, onClose, onGuardar, guardando }) {
  const [nombre, setNombre] = useState(promo?.nombre || '');
  const [valorPct, setValorPct] = useState(promo?.valor_pct || '');
  const [fechaInicio, setFechaInicio] = useState(promo?.fecha_inicio?.slice(0, 10) || hoyISO());
  const [fechaFin, setFechaFin] = useState(promo?.fecha_fin?.slice(0, 10) || hoyISO());
  const [idsProductos, setIdsProductos] = useState(new Set((promo?.productos || []).map((p) => p.id_producto)));
  const [idsClasificaciones, setIdsClasificaciones] = useState(new Set((promo?.clasificaciones || []).map((c) => c.id_clasificacion)));
  const [error, setError] = useState('');

  const toggleProducto = (id) => {
    setIdsProductos((prev) => {
      const nuevo = new Set(prev);
      nuevo.has(id) ? nuevo.delete(id) : nuevo.add(id);
      return nuevo;
    });
  };
  const toggleClasificacion = (id) => {
    setIdsClasificaciones((prev) => {
      const nuevo = new Set(prev);
      nuevo.has(id) ? nuevo.delete(id) : nuevo.add(id);
      return nuevo;
    });
  };

  const guardar = () => {
    setError('');
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
    const pct = parseFloat(valorPct);
    if (!pct || pct <= 0 || pct > 100) { setError('El porcentaje debe estar entre 0 y 100'); return; }
    if (fechaFin < fechaInicio) { setError('La fecha fin no puede ser anterior a la fecha inicio'); return; }
    if (idsProductos.size === 0 && idsClasificaciones.size === 0) { setError('Selecciona al menos un producto o una categoría'); return; }

    onGuardar({
      nombre: nombre.trim(),
      valor_pct: pct,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      id_productos: Array.from(idsProductos),
      id_clasificaciones: Array.from(idsClasificaciones),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 max-h-[90vh] flex flex-col">
        <h3 className="font-bold text-zinc-900 dark:text-white mb-4">{promo ? 'Editar promoción' : 'Nueva promoción'}</h3>

        <div className="flex-1 overflow-y-auto space-y-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Nombre de la promoción</label>
            <input
              type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Porcentaje de descuento (%)</label>
            <input
              type="number" min="1" max="100" value={valorPct} onChange={(e) => setValorPct(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Fecha inicio</label>
              <input
                type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Fecha fin</label>
              <input
                type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-2 block">Categorías completas en promoción</label>
            <div className="max-h-32 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 space-y-1">
              {clasificaciones.map((c) => (
                <label key={c.id_clasificacion} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input type="checkbox" checked={idsClasificaciones.has(c.id_clasificacion)} onChange={() => toggleClasificacion(c.id_clasificacion)} />
                  {c.nombre}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-2 block">Productos puntuales en promoción</label>
            <div className="max-h-40 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 space-y-1">
              {productos.map((p) => (
                <label key={p.id_producto} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input type="checkbox" checked={idsProductos.has(p.id_producto)} onChange={() => toggleProducto(p.id_producto)} />
                  {p.nombre}
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mt-3">{error}</p>}

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800">
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar promoción'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Promociones() {
  const { puede } = usePermission();
  const [promos, setPromos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [promoEditar, setPromoEditar] = useState(null);

  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [resPromos, resProd, resClas] = await Promise.all([
        promocionService.listar(),
        productoService.listar(),
        catalogoService.listarClasificaciones(),
      ]);
      setPromos(resPromos.data);
      setProductos(resProd.data.filter((p) => p.activo === 1));
      setClasificaciones(resClas.data);
    } catch {
      mostrarToast('error', 'Error al cargar promociones');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const estaVigente = (p) => {
    const hoy = hoyISO();
    return p.activo && hoy >= p.fecha_inicio.slice(0, 10) && hoy <= p.fecha_fin.slice(0, 10);
  };

  const handleGuardar = async (data) => {
    setGuardando(true);
    try {
      if (promoEditar) {
        await promocionService.editar(promoEditar.id_promocion, data);
        mostrarToast('ok', 'Promoción actualizada');
      } else {
        await promocionService.crear(data);
        mostrarToast('ok', 'Promoción creada');
      }
      setModalAbierto(false);
      setPromoEditar(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al guardar la promoción');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async (p) => {
    try {
      const nuevo = p.activo ? 0 : 1;
      await promocionService.toggleActivo(p.id_promocion, nuevo);
      mostrarToast('ok', `Promoción ${nuevo ? 'activada' : 'desactivada'}`);
      await cargarDatos();
    } catch {
      mostrarToast('error', 'Error al cambiar el estado');
    }
  };

  return (
    <PageWrapper>
      <Toast toast={toast} />
      {modalAbierto && (
        <ModalPromocion
          promo={promoEditar}
          productos={productos}
          clasificaciones={clasificaciones}
          guardando={guardando}
          onGuardar={handleGuardar}
          onClose={() => { setModalAbierto(false); setPromoEditar(null); }}
        />
      )}

      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">Promociones</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Descuentos por rango de fechas, aplicados automáticamente en el POS.</p>
        </div>
        {puede('crear', 'promociones') && (
          <button
            onClick={() => { setPromoEditar(null); setModalAbierto(true); }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            + Nueva Promoción
          </button>
        )}
      </div>

      {cargando ? (
        <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">Cargando promociones...</div>
      ) : promos.length === 0 ? (
        <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <p className="text-lg">No hay promociones registradas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.map((p) => (
            <div key={p.id_promocion} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-zinc-900 dark:text-white">{p.nombre}</h3>
                {estaVigente(p) ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">VIGENTE</span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {p.activo ? 'FUERA DE FECHA' : 'INACTIVA'}
                  </span>
                )}
              </div>
              <p className="mt-2 text-2xl font-black text-red-600 dark:text-red-400">-{parseFloat(p.valor_pct)}%</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {new Date(p.fecha_inicio).toLocaleDateString()} — {new Date(p.fecha_fin).toLocaleDateString()}
              </p>
              <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-300 space-y-0.5">
                {p.clasificaciones.map((c) => <p key={c.id_clasificacion}>{c.clasificacion_nombre} (categoría completa)</p>)}
                {p.productos.map((pr) => <p key={pr.id_producto}>• {pr.producto_nombre}</p>)}
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                {puede('activar', 'promociones') && (
                  <button onClick={() => handleToggleActivo(p)} className="text-xs px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    {p.activo ? 'Desactivar' : 'Activar'}
                  </button>
                )}
                {puede('editar', 'promociones') && (
                  <button onClick={() => { setPromoEditar(p); setModalAbierto(true); }} className="text-xs px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white">
                    Editar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
