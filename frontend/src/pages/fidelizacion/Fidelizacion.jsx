import { useState, useEffect, useCallback, useMemo } from 'react';
import PageWrapper from '../../components/PageWrapper';
import fidelizacionService from '../../services/fidelizacion.service';
import clienteService from '../../services/cliente.service';
import productoService from '../../services/producto.service';
import comboService from '../../services/combo.service';
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

// ── Pestaña: Canjear ────────────────────────────────────────────────────
function TabCanjear({ recompensas, mostrarToast }) {
  const { puede } = usePermission();
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [clienteSel, setClienteSel] = useState(null);
  const [canjeando, setCanjeando] = useState(false);

  useEffect(() => {
    clienteService.listar().then((r) => setClientes(r.data.filter((c) => c.activo === 1))).catch(() => {});
  }, []);

  const clientesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return [];
    const b = busqueda.toLowerCase();
    return clientes.filter((c) =>
      `${c.nombre} ${c.apellido || ''}`.toLowerCase().includes(b) || (c.ci_nit || '').toLowerCase().includes(b)
    ).slice(0, 8);
  }, [busqueda, clientes]);

  const seleccionarCliente = async (c) => {
    setBusqueda('');
    try {
      const res = await fidelizacionService.obtenerCliente(c.id_cliente);
      setClienteSel(res.data);
    } catch {
      mostrarToast('error', 'Error al cargar el saldo del cliente');
    }
  };

  const refrescarCliente = async () => {
    if (!clienteSel) return;
    const res = await fidelizacionService.obtenerCliente(clienteSel.id_cliente);
    setClienteSel(res.data);
  };

  const canjear = async (recompensa) => {
    if (!clienteSel) return;
    if (clienteSel.puntos_fidelidad < recompensa.costo_puntos) {
      mostrarToast('error', 'El cliente no tiene puntos suficientes');
      return;
    }
    if (!window.confirm(`¿Canjear "${recompensa.nombre}" por ${recompensa.costo_puntos} puntos?`)) return;

    setCanjeando(true);
    try {
      await fidelizacionService.canjear(clienteSel.id_cliente, recompensa.id_recompensa);
      mostrarToast('ok', 'Canje registrado correctamente');
      await refrescarCliente();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al canjear');
    } finally {
      setCanjeando(false);
    }
  };

  return (
    <div>
      <div className="relative max-w-sm mb-4">
        <input
          type="text"
          placeholder="Buscar cliente por nombre o CI/NIT..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <svg className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        {clientesFiltrados.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg overflow-hidden">
            {clientesFiltrados.map((c) => (
              <button
                key={c.id_cliente}
                onClick={() => seleccionarCliente(c)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white"
              >
                {c.nombre} {c.apellido || ''} <span className="text-xs text-zinc-500">({c.ci_nit || 'S/N'})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {clienteSel ? (
        <>
          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-white">{clienteSel.nombre} {clienteSel.apellido || ''}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">CI/NIT: {clienteSel.ci_nit || 'S/N'}</p>
            </div>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{clienteSel.puntos_fidelidad}</p>
          </div>

          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Catálogo de recompensas (Producto/Combo)</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            Las recompensas de tipo Descuento solo se pueden canjear durante una venta en el POS.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {recompensas.filter((r) => r.activo && r.tipo === 'PRODUCTO').map((r) => (
              <div key={r.id_recompensa} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                <p className="font-semibold text-sm text-zinc-900 dark:text-white">{r.nombre}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{r.producto_nombre || r.combo_nombre}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{r.costo_puntos}</span>
                  {puede('canjear', 'fidelizacion') && (
                    <button
                      onClick={() => canjear(r)}
                      disabled={canjeando || clienteSel.puntos_fidelidad < r.costo_puntos}
                      className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Canjear
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Historial de movimientos</h3>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
            {(clienteSel.movimientos || []).length === 0 && (
              <p className="p-3 text-sm text-zinc-500">Sin movimientos aún.</p>
            )}
            {(clienteSel.movimientos || []).map((m) => (
              <div key={m.id_movimiento} className="p-3 flex items-center justify-between text-sm">
                <div>
                  <p className="text-zinc-900 dark:text-white">{m.descripcion || m.tipo}</p>
                  <p className="text-xs text-zinc-500">{new Date(m.fecha).toLocaleString()}</p>
                </div>
                <span className={`font-bold ${m.puntos > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {m.puntos > 0 ? '+' : ''}{m.puntos}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          Busca un cliente para ver su saldo de puntos y canjear recompensas.
        </div>
      )}
    </div>
  );
}

// ── Pestaña: Recompensas (CRUD) ──────────────────────────────────────────
function TabRecompensas({ recompensas, recargar, mostrarToast }) {
  const { puede } = usePermission();
  const [productos, setProductos] = useState([]);
  const [combos, setCombos] = useState([]);
  const [editando, setEditando] = useState(null); // null | {} | recompensa
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [costoPuntos, setCostoPuntos] = useState('');
  const [tipo, setTipo] = useState('PRODUCTO');
  const [tipoItem, setTipoItem] = useState('producto'); // 'producto' | 'combo' — solo si tipo === PRODUCTO
  const [idProducto, setIdProducto] = useState('');
  const [idCombo, setIdCombo] = useState('');
  const [tipoDescuento, setTipoDescuento] = useState('BS');
  const [valorDescuento, setValorDescuento] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    productoService.listar().then((r) => setProductos(r.data.filter((p) => p.activo === 1))).catch(() => {});
    comboService.listar().then((r) => setCombos(r.data.filter((c) => c.activo === 1))).catch(() => {});
  }, []);

  const abrirNuevo = () => {
    setEditando({});
    setNombre(''); setDescripcion(''); setCostoPuntos('');
    setTipo('PRODUCTO'); setTipoItem('producto'); setIdProducto(''); setIdCombo('');
    setTipoDescuento('BS'); setValorDescuento('');
  };
  const abrirEditar = (r) => {
    setEditando(r);
    setNombre(r.nombre); setDescripcion(r.descripcion || ''); setCostoPuntos(r.costo_puntos);
    setTipo(r.tipo);
    setTipoItem(r.id_combo ? 'combo' : 'producto');
    setIdProducto(r.id_producto || ''); setIdCombo(r.id_combo || '');
    setTipoDescuento(r.tipo_descuento || 'BS'); setValorDescuento(r.valor_descuento || '');
  };

  const guardar = async () => {
    if (!nombre.trim() || !costoPuntos || Number(costoPuntos) <= 0) {
      mostrarToast('error', 'Nombre y costo en puntos (mayor a 0) son obligatorios');
      return;
    }
    if (tipo === 'PRODUCTO' && !(tipoItem === 'producto' ? idProducto : idCombo)) {
      mostrarToast('error', 'Seleccione el producto o combo de la recompensa');
      return;
    }
    if (tipo === 'DESCUENTO' && (!valorDescuento || Number(valorDescuento) <= 0)) {
      mostrarToast('error', 'Ingrese el valor del descuento');
      return;
    }
    setGuardando(true);
    try {
      const data = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        costo_puntos: Number(costoPuntos),
        tipo,
        id_producto: tipo === 'PRODUCTO' && tipoItem === 'producto' ? Number(idProducto) : null,
        id_combo: tipo === 'PRODUCTO' && tipoItem === 'combo' ? Number(idCombo) : null,
        tipo_descuento: tipo === 'DESCUENTO' ? tipoDescuento : null,
        valor_descuento: tipo === 'DESCUENTO' ? Number(valorDescuento) : null,
      };
      if (editando.id_recompensa) {
        await fidelizacionService.editarRecompensa(editando.id_recompensa, data);
        mostrarToast('ok', 'Recompensa actualizada');
      } else {
        await fidelizacionService.crearRecompensa(data);
        mostrarToast('ok', 'Recompensa creada');
      }
      setEditando(null);
      await recargar();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (r) => {
    try {
      await fidelizacionService.toggleActivoRecompensa(r.id_recompensa, r.activo ? 0 : 1);
      mostrarToast('ok', `Recompensa ${r.activo ? 'desactivada' : 'activada'}`);
      await recargar();
    } catch {
      mostrarToast('error', 'Error al cambiar el estado');
    }
  };

  return (
    <div>
      {puede('gestionar_recompensas', 'fidelizacion') && (
        <button onClick={abrirNuevo} className="mb-4 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium">
          + Nueva Recompensa
        </button>
      )}

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-4">{editando.id_recompensa ? 'Editar' : 'Nueva'} recompensa</h3>
            <label className="text-xs text-zinc-500 mb-1 block">Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full px-3 py-2 mb-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none" />
            <label className="text-xs text-zinc-500 mb-1 block">Descripción (opcional)</label>
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full px-3 py-2 mb-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none" />

            <label className="text-xs text-zinc-500 mb-1 block">Tipo de recompensa</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={() => setTipo('PRODUCTO')} className={`py-2 rounded-lg text-sm font-medium border ${tipo === 'PRODUCTO' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>
                Producto/Combo
              </button>
              <button onClick={() => setTipo('DESCUENTO')} className={`py-2 rounded-lg text-sm font-medium border ${tipo === 'DESCUENTO' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>
                Descuento
              </button>
            </div>

            {tipo === 'PRODUCTO' ? (
              <>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button onClick={() => setTipoItem('producto')} className={`py-1.5 rounded-lg text-xs font-medium border ${tipoItem === 'producto' ? 'bg-zinc-800 dark:bg-zinc-700 border-zinc-800 dark:border-zinc-700 text-white' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>Producto</button>
                  <button onClick={() => setTipoItem('combo')} className={`py-1.5 rounded-lg text-xs font-medium border ${tipoItem === 'combo' ? 'bg-zinc-800 dark:bg-zinc-700 border-zinc-800 dark:border-zinc-700 text-white' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>Combo</button>
                </div>
                {tipoItem === 'producto' ? (
                  <select value={idProducto} onChange={(e) => setIdProducto(e.target.value)} className="w-full px-3 py-2 mb-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none">
                    <option value="">Seleccionar producto...</option>
                    {productos.map((p) => <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>)}
                  </select>
                ) : (
                  <select value={idCombo} onChange={(e) => setIdCombo(e.target.value)} className="w-full px-3 py-2 mb-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none">
                    <option value="">Seleccionar combo...</option>
                    {combos.map((c) => <option key={c.id_combo} value={c.id_combo}>{c.nombre}</option>)}
                  </select>
                )}
              </>
            ) : (
              <div className="flex gap-2 mb-3">
                <select value={tipoDescuento} onChange={(e) => setTipoDescuento(e.target.value)} className="w-28 px-2 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none">
                  <option value="BS">Bs</option>
                  <option value="PCT">%</option>
                </select>
                <input type="number" min="1" placeholder="Valor" value={valorDescuento} onChange={(e) => setValorDescuento(e.target.value)} className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none" />
              </div>
            )}

            <label className="text-xs text-zinc-500 mb-1 block">Costo en puntos</label>
            <input type="number" min="1" value={costoPuntos} onChange={(e) => setCostoPuntos(e.target.value)} className="w-full px-3 py-2 mb-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none" />
            <div className="flex gap-2">
              <button onClick={() => setEditando(null)} className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recompensas.map((r) => (
          <div key={r.id_recompensa} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-zinc-900 dark:text-white">{r.nombre}</h3>
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${r.activo ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
            </div>
            {r.descripcion && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{r.descripcion}</p>}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {r.tipo === 'PRODUCTO'
                ? `${r.producto_nombre || r.combo_nombre}`
                : `${r.tipo_descuento === 'PCT' ? `${r.valor_descuento}%` : `Bs ${r.valor_descuento}`} de descuento`}
            </p>
            <p className="mt-3 text-lg font-bold text-amber-600 dark:text-amber-400">{r.costo_puntos} pts</p>
            {puede('gestionar_recompensas', 'fidelizacion') && (
              <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                <button onClick={() => toggleActivo(r)} className="text-xs px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  {r.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => abrirEditar(r)} className="text-xs px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white">Editar</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pestaña: Configuración ───────────────────────────────────────────────
function TabConfiguracion({ mostrarToast }) {
  const { puede } = usePermission();
  const [bsPorPunto, setBsPorPunto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fidelizacionService.obtenerConfiguracion()
      .then((r) => setBsPorPunto(r.data.bs_por_punto))
      .catch(() => mostrarToast('error', 'Error al cargar la configuración'))
      .finally(() => setCargando(false));
  }, []); // eslint-disable-line

  const guardar = async () => {
    const valor = parseFloat(bsPorPunto);
    if (!valor || valor <= 0) { mostrarToast('error', 'El valor debe ser mayor a 0'); return; }
    setGuardando(true);
    try {
      await fidelizacionService.actualizarConfiguracion(valor);
      mostrarToast('ok', 'Configuración actualizada');
    } catch {
      mostrarToast('error', 'Error al guardar la configuración');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div className="p-8 text-center text-zinc-500">Cargando...</div>;

  return (
    <div className="max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5">
      <label className="text-sm font-semibold text-zinc-900 dark:text-white mb-2 block">
        Bolivianos gastados por cada punto ganado
      </label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-500">Bs</span>
        <input
          type="number" step="0.5" value={bsPorPunto} onChange={(e) => setBsPorPunto(e.target.value)}
          disabled={!puede('configurar', 'fidelizacion')}
          className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none disabled:opacity-60"
        />
        <span className="text-sm text-zinc-500">= 1 punto</span>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
        Ej: con Bs 10, una venta de Bs 235 da 23 puntos al cliente.
      </p>
      {puede('configurar', 'fidelizacion') && (
        <button onClick={guardar} disabled={guardando} className="mt-4 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50">
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────
export default function Fidelizacion() {
  const [tab, setTab] = useState('canjear');
  const [recompensas, setRecompensas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [toast, setToast] = useState(null);

  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const cargarRecompensas = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fidelizacionService.listarRecompensas();
      setRecompensas(res.data);
    } catch {
      mostrarToast('error', 'Error al cargar recompensas');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarRecompensas(); }, [cargarRecompensas]);

  const tabs = [
    { id: 'canjear', label: 'Canjear' },
    { id: 'recompensas', label: 'Recompensas' },
    { id: 'configuracion', label: 'Configuración' },
  ];

  return (
    <PageWrapper>
      <Toast toast={toast} />

      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">Fidelización</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Puntos por compras y canje de recompensas.</p>
      </div>

      <div className="mb-4 inline-flex flex-wrap rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-emerald-600 text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">Cargando...</div>
      ) : (
        <>
          {tab === 'canjear' && <TabCanjear recompensas={recompensas} mostrarToast={mostrarToast} />}
          {tab === 'recompensas' && <TabRecompensas recompensas={recompensas} recargar={cargarRecompensas} mostrarToast={mostrarToast} />}
          {tab === 'configuracion' && <TabConfiguracion mostrarToast={mostrarToast} />}
        </>
      )}
    </PageWrapper>
  );
}
