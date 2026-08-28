import { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

export function ModalCrearEditar({
  producto,
  clasificaciones = [],
  marcas = [],
  unidades = [],
  onConfirm,
  onClose,
  guardando
}) {
  const isEditing = !!producto;
  
  const [formData, setFormData] = useState({
    id_clasificacion: '',
    id_marca: '',
    id_unidad: '',
    nombre: '',
    descripcion: '',
    codigo_barras: '',
    precio_mayor: 0,
    precio_menor: 0,
    descuento_mayor: 0,
    descuento_menor: 0,
    stock_minimo: 0,
  });

  useEffect(() => {
    if (producto) {
      setFormData({
        id_clasificacion: producto.id_clasificacion || '',
        id_marca:         producto.id_marca || '',
        id_unidad:        producto.id_unidad || '',
        nombre:           producto.nombre || '',
        descripcion:      producto.descripcion || '',
        codigo_barras:    producto.codigo_barras || '',
        precio_mayor:     producto.precio_mayor || 0,
        precio_menor:     producto.precio_menor || 0,
        descuento_mayor:  producto.descuento_mayor || 0,
        descuento_menor:  producto.descuento_menor || 0,
        stock_minimo:     producto.stock_minimo || 0,
      });
    }
  }, [producto]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value 
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="producto-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Fila 1: Nombres y Código */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Nombre del Producto *
              </label>
              <input
                type="text"
                name="nombre"
                required
                value={formData.nombre}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                placeholder="Ej. Fertilizante NPK"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Código de Barras
              </label>
              <input
                type="text"
                name="codigo_barras"
                value={formData.codigo_barras}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
                placeholder="Ej. 123456789012"
              />
            </div>

            {/* Fila 2: Catálogos */}
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Clasificación *
              </label>
              <select
                name="id_clasificacion"
                required
                value={formData.id_clasificacion}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
              >
                <option value="">Seleccionar...</option>
                {clasificaciones.map(c => (
                  <option key={c.id_clasificacion} value={c.id_clasificacion}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Marca *
              </label>
              <select
                name="id_marca"
                required
                value={formData.id_marca}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
              >
                <option value="">Seleccionar...</option>
                {marcas.map(m => (
                  <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Unidad de Medida *
              </label>
              <select
                name="id_unidad"
                required
                value={formData.id_unidad}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all"
              >
                <option value="">Seleccionar...</option>
                {unidades.map(u => (
                  <option key={u.id_unidad} value={u.id_unidad}>{u.nombre} ({u.abreviatura})</option>
                ))}
              </select>
            </div>

            {/* Fila 3: Precios Mayor */}
            <div className="bg-zinc-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 md:col-span-1 space-y-3">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Venta Mayor</p>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Precio (Bs) *</label>
                <input
                  type="number" step="0.01" min="0" required name="precio_mayor"
                  value={formData.precio_mayor} onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Descuento (%)</label>
                <input
                  type="number" step="0.01" min="0" max="100" name="descuento_mayor"
                  value={formData.descuento_mayor} onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 outline-none"
                />
              </div>
            </div>

            {/* Fila 3: Precios Menor */}
            <div className="bg-zinc-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 md:col-span-1 space-y-3">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Venta Menor</p>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Precio (Bs) *</label>
                <input
                  type="number" step="0.01" min="0" required name="precio_menor"
                  value={formData.precio_menor} onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Descuento (%)</label>
                <input
                  type="number" step="0.01" min="0" max="100" name="descuento_menor"
                  value={formData.descuento_menor} onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 outline-none"
                />
              </div>
            </div>

            {/* Fila 3: Stock Mínimo */}
            <div className="bg-zinc-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 md:col-span-1 space-y-3">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Inventario</p>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Stock Mínimo</label>
                <input
                  type="number" min="0" name="stock_minimo"
                  value={formData.stock_minimo} onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 outline-none"
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Descripción
              </label>
              <textarea
                name="descripcion"
                rows="2"
                value={formData.descripcion}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all resize-none"
                placeholder="Detalles adicionales del producto..."
              />
            </div>
            
          </form>
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="producto-form"
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {guardando && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModalImagen({ producto, onSubir, onEliminar, onClose, guardando }) {
  const [preview, setPreview] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [arrastrandoSobre, setArrastrandoSobre] = useState(false);
  const inputRef = useRef(null);

  const imagenActual = producto?.imagen
    ? `${API_BASE}/uploads/${producto.imagen}?v=${Date.now()}`
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
    if (window.confirm('¿Eliminar la imagen del producto?')) onEliminar();
  };

  const imagenMostrada = preview || imagenActual;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-sm overflow-hidden">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Imagen del Producto</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[220px]">{producto?.nombre}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Zona de imagen / drop */}
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
                <img
                  src={imagenMostrada}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
                {/* Overlay al pasar el mouse */}
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Cambiar imagen</span>
                </div>
                {/* Badge "nueva" si hay preview pendiente */}
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

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Acciones secundarias */}
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
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              📎 {archivo.name} ({(archivo.size / 1024).toFixed(0)} KB)
            </p>
          )}
        </div>

        {/* Footer */}
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
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {guardando ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Subiendo...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Guardar imagen
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModalEliminar({ producto, onConfirm, onClose, guardando }) {
  if (!producto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-sm overflow-hidden text-center p-6">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
          ¿Desactivar producto?
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Estás a punto de desactivar <strong className="text-zinc-700 dark:text-zinc-300">{producto.nombre}</strong>.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Sí, desactivar
          </button>
        </div>
      </div>
    </div>
  );
}
