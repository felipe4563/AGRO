import { useState, useEffect, useCallback, useRef } from 'react';
import PageWrapper from '../../components/PageWrapper';
import comboService from '../../services/combo.service';
import productoService from '../../services/producto.service';
import { usePermission } from '../../hooks/usePermission';

const API_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

// El driver de MySQL devuelve las columnas DATE como objetos Date, no como strings,
// así que hay que normalizar antes de usarlas en <input type="date"> o comparaciones.
function aFechaISO(f) {
  if (!f) return '';
  if (f instanceof Date) return isNaN(f.getTime()) ? '' : f.toISOString().slice(0, 10);
  return String(f).slice(0, 10);
}

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

function ModalCombo({ combo, productos, onClose, onGuardar, guardando }) {
  const [nombre, setNombre] = useState(combo?.nombre || '');
  const [descripcion, setDescripcion] = useState(combo?.descripcion || '');
  const [precioCombo, setPrecioCombo] = useState(combo?.precio_combo || '');
  const [fechaInicio, setFechaInicio] = useState(aFechaISO(combo?.fecha_inicio));
  const [fechaFin, setFechaFin] = useState(aFechaISO(combo?.fecha_fin));
  const [items, setItems] = useState(
    combo?.productos?.map((p) => ({ id_producto: p.id_producto, cantidad: p.cantidad })) || [{ id_producto: '', cantidad: 1 }]
  );
  const [error, setError] = useState('');

  const agregarFila = () => setItems((prev) => [...prev, { id_producto: '', cantidad: 1 }]);
  const quitarFila = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const actualizarFila = (idx, campo, valor) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  };

  const sumaPreciosNormales = items.reduce((acc, it) => {
    const p = productos.find((p) => p.id_producto === Number(it.id_producto));
    return acc + (p ? p.precio_menor * (Number(it.cantidad) || 0) : 0);
  }, 0);

  const guardar = () => {
    setError('');
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
    const precio = parseFloat(precioCombo);
    if (!precio || precio <= 0) { setError('El precio del combo debe ser mayor a 0'); return; }
    const validos = items.filter((it) => it.id_producto && Number(it.cantidad) > 0);
    if (validos.length < 2) { setError('Selecciona al menos 2 productos distintos'); return; }
    const idsUnicos = new Set(validos.map((it) => it.id_producto));
    if (idsUnicos.size !== validos.length) { setError('No repitas el mismo producto en el combo'); return; }
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) { setError('La fecha de fin no puede ser anterior a la fecha de inicio'); return; }

    onGuardar({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      precio_combo: precio,
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
      productos: validos.map((it) => ({ id_producto: Number(it.id_producto), cantidad: Number(it.cantidad) })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 max-h-[90vh] flex flex-col">
        <h3 className="font-bold text-zinc-900 dark:text-white mb-4">{combo ? 'Editar combo' : 'Nuevo combo'}</h3>

        <div className="flex-1 overflow-y-auto space-y-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Nombre del combo</label>
            <input
              type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Descripción (opcional)</label>
            <input
              type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Precio del combo (Bs)</label>
            <input
              type="number" step="0.5" value={precioCombo} onChange={(e) => setPrecioCombo(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {sumaPreciosNormales > 0 && (
              <p className="text-xs text-zinc-500 mt-1">Suma normal de los productos: Bs {sumaPreciosNormales.toFixed(2)}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Fecha de inicio (opcional)</label>
              <input
                type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Fecha de fin (opcional)</label>
              <input
                type="date" value={fechaFin} min={fechaInicio || undefined} onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 -mt-2">Si no defines fechas, el combo estará disponible siempre mientras esté activo.</p>

          <div>
            <label className="text-xs text-zinc-500 mb-2 block">Productos que forman el combo (mínimo 2)</label>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={it.id_producto}
                    onChange={(e) => actualizarFila(idx, 'id_producto', e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Seleccionar producto...</option>
                    {productos.map((p) => (
                      <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
                    ))}
                  </select>
                  <input
                    type="number" min="1" value={it.cantidad}
                    onChange={(e) => actualizarFila(idx, 'cantidad', e.target.value)}
                    className="w-16 text-center py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none"
                  />
                  <button onClick={() => quitarFila(idx)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button onClick={agregarFila} className="mt-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
              + Agregar producto
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mt-3">{error}</p>}

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800">
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar combo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalImagenCombo({ combo, onSubir, onEliminar, onClose, guardando }) {
  const [preview, setPreview] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [arrastrandoSobre, setArrastrandoSobre] = useState(false);
  const inputRef = useRef(null);

  const imagenActual = combo?.imagen
    ? `${API_BASE}/uploads/${combo.imagen}?v=${Date.now()}`
    : null;

  const procesarArchivo = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      alert('Solo se permiten imágenes JPG, PNG o WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar los 5 MB');
      return;
    }
    setArchivo(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleFileChange = (e) => procesarArchivo(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastrandoSobre(false);
    procesarArchivo(e.dataTransfer.files[0]);
  };

  const handleSubir = () => {
    if (!archivo) return;
    const fd = new FormData();
    fd.append('imagen', archivo);
    onSubir(fd);
  };

  const handleEliminar = () => {
    if (window.confirm('¿Eliminar la imagen del combo?')) onEliminar();
  };

  const imagenMostrada = preview || imagenActual;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-sm max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Imagen del Combo</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[220px]">{combo?.nombre}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div
            onClick={() => !guardando && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setArrastrandoSobre(true); }}
            onDragLeave={() => setArrastrandoSobre(false)}
            onDrop={handleDrop}
            className={`relative w-full h-48 rounded-xl overflow-hidden flex flex-col items-center justify-center border-2 cursor-pointer transition-all
              ${arrastrandoSobre
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                : imagenMostrada
                  ? 'border-zinc-200 dark:border-zinc-700'
                  : 'border-dashed border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'
              }`}
          >
            {imagenMostrada ? (
              <>
                <img src={imagenMostrada} alt="Preview" className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Cambiar imagen</span>
                </div>
                {preview && (
                  <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    NUEVA
                  </span>
                )}
              </>
            ) : (
              <div className="text-center text-zinc-400 dark:text-zinc-500 pointer-events-none select-none">
                <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm font-medium">Arrastra aquí o haz clic</p>
                <p className="text-xs mt-0.5">JPG, PNG, WebP · máx 5 MB</p>
              </div>
            )}
          </div>

          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={guardando}
              className="flex-1 px-3 py-2 text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
              </svg>
              Seleccionar archivo
            </button>
            {imagenActual && !preview && (
              <button
                type="button"
                onClick={handleEliminar}
                disabled={guardando}
                className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50"
                title="Eliminar imagen actual"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>

          {archivo && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{archivo.name} ({(archivo.size / 1024).toFixed(0)} KB)</p>
          )}
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubir}
            disabled={!archivo || guardando}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            {guardando ? 'Subiendo...' : 'Guardar imagen'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Combos() {
  const { puede } = usePermission();
  const [combos, setCombos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [comboEditar, setComboEditar] = useState(null);
  const [comboImagen, setComboImagen] = useState(null);
  const [guardandoImagen, setGuardandoImagen] = useState(false);

  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [resCombos, resProd] = await Promise.all([comboService.listar(), productoService.listar()]);
      setCombos(resCombos.data);
      setProductos(resProd.data.filter((p) => p.activo === 1));
    } catch {
      mostrarToast('error', 'Error al cargar combos');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const handleGuardar = async (data) => {
    setGuardando(true);
    try {
      if (comboEditar) {
        await comboService.editar(comboEditar.id_combo, data);
        mostrarToast('ok', 'Combo actualizado');
      } else {
        await comboService.crear(data);
        mostrarToast('ok', 'Combo creado');
      }
      setModalAbierto(false);
      setComboEditar(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al guardar el combo');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async (combo) => {
    try {
      const nuevo = combo.activo ? 0 : 1;
      await comboService.toggleActivo(combo.id_combo, nuevo);
      mostrarToast('ok', `Combo ${nuevo ? 'activado' : 'desactivado'}`);
      await cargarDatos();
    } catch {
      mostrarToast('error', 'Error al cambiar el estado');
    }
  };

  const handleSubirImagen = async (formData) => {
    setGuardandoImagen(true);
    try {
      await comboService.subirImagen(comboImagen.id_combo, formData);
      mostrarToast('ok', 'Imagen actualizada');
      setComboImagen(null);
      await cargarDatos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al subir la imagen');
    } finally {
      setGuardandoImagen(false);
    }
  };

  const handleEliminarImagen = async () => {
    setGuardandoImagen(true);
    try {
      await comboService.eliminarImagen(comboImagen.id_combo);
      mostrarToast('ok', 'Imagen eliminada');
      setComboImagen(null);
      await cargarDatos();
    } catch {
      mostrarToast('error', 'Error al eliminar la imagen');
    } finally {
      setGuardandoImagen(false);
    }
  };

  const formatearFecha = (f) => {
    const iso = aFechaISO(f);
    if (!iso) return null;
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <PageWrapper>
      <Toast toast={toast} />
      {modalAbierto && (
        <ModalCombo
          combo={comboEditar}
          productos={productos}
          guardando={guardando}
          onGuardar={handleGuardar}
          onClose={() => { setModalAbierto(false); setComboEditar(null); }}
        />
      )}
      {comboImagen && (
        <ModalImagenCombo
          combo={comboImagen}
          guardando={guardandoImagen}
          onSubir={handleSubirImagen}
          onEliminar={handleEliminarImagen}
          onClose={() => setComboImagen(null)}
        />
      )}

      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">Combos</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Paquetes de productos a precio fijo, disponibles en el POS.</p>
        </div>
        {puede('crear', 'combos') && (
          <button
            onClick={() => { setComboEditar(null); setModalAbierto(true); }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            + Nuevo Combo
          </button>
        )}
      </div>

      {cargando ? (
        <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">Cargando combos...</div>
      ) : combos.length === 0 ? (
        <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <p className="text-lg">No hay combos registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {combos.map((c) => {
            const hoy = new Date().toISOString().slice(0, 10);
            const cFechaInicio = aFechaISO(c.fecha_inicio);
            const cFechaFin = aFechaISO(c.fecha_fin);
            const vigente = (!cFechaInicio || cFechaInicio <= hoy) && (!cFechaFin || cFechaFin >= hoy);
            return (
            <div key={c.id_combo} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="relative w-full aspect-video bg-zinc-100 dark:bg-zinc-800">
                {c.imagen ? (
                  <img src={`${API_BASE}/uploads/${c.imagen}`} alt={c.nombre} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-600">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V7.5a1.5 1.5 0 011.5-1.5h15A1.5 1.5 0 0121 7.5v9a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 16.5zM3 16l5-5a2 2 0 012.8 0l1.7 1.7M14 12l1.6-1.6a2 2 0 012.8 0L21 13" />
                      <circle cx="8" cy="8.5" r="1.25" fill="currentColor" stroke="none" />
                    </svg>
                  </div>
                )}
                {puede('editar', 'combos') && (
                  <button
                    onClick={() => setComboImagen(c)}
                    title="Gestionar imagen"
                    className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 19.5a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 016.75 4.5h10.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H6.75z" />
                    </svg>
                  </button>
                )}
                <span className={`absolute top-2 left-2 w-2.5 h-2.5 rounded-full ${c.activo ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-zinc-900 dark:text-white">{c.nombre}</h3>
                {c.descripcion && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{c.descripcion}</p>}
                <ul className="mt-3 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                  {c.productos.map((p) => (
                    <li key={p.id_producto}>• {p.cantidad} x {p.producto_nombre}</li>
                  ))}
                </ul>
                <p className="mt-3 text-lg font-bold text-emerald-600 dark:text-emerald-400">Bs {parseFloat(c.precio_combo).toFixed(2)}</p>
                {(cFechaInicio || cFechaFin) && (
                  <p className={`mt-1 text-[11px] font-medium ${vigente ? 'text-zinc-500 dark:text-zinc-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {formatearFecha(c.fecha_inicio) || 'Sin inicio'} — {formatearFecha(c.fecha_fin) || 'Sin fin'}
                    {!vigente && ' (fuera de vigencia)'}
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                  {puede('activar', 'combos') && (
                    <button onClick={() => handleToggleActivo(c)} className="text-xs px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                      {c.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  )}
                  {puede('editar', 'combos') && (
                    <button onClick={() => { setComboEditar(c); setModalAbierto(true); }} className="text-xs px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white">
                      Editar
                    </button>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
