import { useState, useEffect, useRef } from 'react';
import PageWrapper from '../../components/PageWrapper';
import configuracionService from '../../services/configuracion.service';
import { useConfiguracion } from '../../contexts/ConfiguracionContext';

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium max-w-xs sm:max-w-sm ${
      toast.tipo === 'ok'
        ? 'bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300'
        : 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
    }`}>
      <span className="shrink-0">{toast.tipo === 'ok' ? '✅' : '⚠️'}</span>
      <span className="break-words">{toast.msg}</span>
    </div>
  );
}

export default function Configuracion() {
  const { logoUrl, nombreEmpresa, recargar } = useConfiguracion();

  const [nombre, setNombre] = useState('');
  const [nit, setNit] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [guardandoLogo, setGuardandoLogo] = useState(false);
  const [toast, setToast] = useState(null);
  const [tieneLogo, setTieneLogo] = useState(false);

  const [preview, setPreview] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [arrastrandoSobre, setArrastrandoSobre] = useState(false);
  const inputRef = useRef(null);

  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    configuracionService.obtener()
      .then((r) => {
        setNombre(r.data.nombre_empresa || '');
        setNit(r.data.nit || '');
        setDireccion(r.data.direccion || '');
        setCiudad(r.data.ciudad || '');
        setTelefono(r.data.telefono || '');
        setCorreo(r.data.correo || '');
        setTieneLogo(!!r.data.logo);
      })
      .catch(() => mostrarToast('error', 'Error al cargar la configuración'))
      .finally(() => setCargando(false));
  }, []);

  const guardarDatosEmpresa = async () => {
    if (!nombre.trim()) { mostrarToast('error', 'El nombre de la empresa es obligatorio'); return; }
    setGuardandoNombre(true);
    try {
      await configuracionService.actualizar({
        nombre_empresa: nombre.trim(),
        nit: nit.trim(),
        direccion: direccion.trim(),
        ciudad: ciudad.trim(),
        telefono: telefono.trim(),
        correo: correo.trim(),
      });
      mostrarToast('ok', 'Datos de la empresa actualizados');
      recargar();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardandoNombre(false);
    }
  };

  const procesarArchivo = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      mostrarToast('error', 'Solo se permiten imágenes JPG, PNG o WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      mostrarToast('error', 'La imagen no puede superar los 5 MB');
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

  const guardarLogo = async () => {
    if (!archivo) return;
    setGuardandoLogo(true);
    try {
      const fd = new FormData();
      fd.append('logo', archivo);
      await configuracionService.subirLogo(fd);
      mostrarToast('ok', 'Logo actualizado');
      setArchivo(null);
      setPreview(null);
      setTieneLogo(true);
      recargar();
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al subir el logo');
    } finally {
      setGuardandoLogo(false);
    }
  };

  const eliminarLogo = async () => {
    if (!window.confirm('¿Eliminar el logo actual? Se usará el logo por defecto del sistema.')) return;
    setGuardandoLogo(true);
    try {
      await configuracionService.eliminarLogo();
      mostrarToast('ok', 'Logo eliminado');
      setTieneLogo(false);
      recargar();
    } catch {
      mostrarToast('error', 'Error al eliminar el logo');
    } finally {
      setGuardandoLogo(false);
    }
  };

  const imagenMostrada = preview || (tieneLogo ? `${logoUrl}?v=${Date.now()}` : null);

  if (cargando) return (
    <PageWrapper>
      <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">Cargando configuración...</div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <Toast toast={toast} />

      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Configuración del Negocio</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Nombre y logo de la empresa — se usan en el inicio de sesión, el menú lateral y el ticket de venta.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
        {/* Logo — columna angosta, a la izquierda */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5 lg:sticky lg:top-4">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-3">Logo de la empresa</h3>
            <div
              onClick={() => !guardandoLogo && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setArrastrandoSobre(true); }}
              onDragLeave={() => setArrastrandoSobre(false)}
              onDrop={handleDrop}
              className={`relative w-full aspect-square rounded-xl overflow-hidden flex flex-col items-center justify-center border-2 cursor-pointer transition-all
                ${arrastrandoSobre
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : imagenMostrada
                    ? 'border-zinc-200 dark:border-zinc-700'
                    : 'border-dashed border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'
                }`}
            >
              {imagenMostrada ? (
                <>
                  <img src={imagenMostrada} alt="Logo" className="w-full h-full object-contain p-4" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Cambiar logo</span>
                  </div>
                  {preview && (
                    <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      NUEVO
                    </span>
                  )}
                </>
              ) : (
                <div className="text-center text-zinc-400 dark:text-zinc-500 pointer-events-none select-none px-4">
                  <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm font-medium">Arrastra aquí o haz clic</p>
                  <p className="text-xs mt-0.5">JPG, PNG, WebP · máx 5 MB</p>
                </div>
              )}
            </div>

            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => inputRef.current?.click()}
                disabled={guardandoLogo}
                className="flex-1 px-3 py-2 text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors disabled:opacity-50"
              >
                Seleccionar
              </button>
              {tieneLogo && !preview && (
                <button
                  onClick={eliminarLogo}
                  disabled={guardandoLogo}
                  className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50"
                  title="Eliminar logo actual"
                >
                  Eliminar
                </button>
              )}
            </div>

            {archivo && (
              <button
                onClick={guardarLogo}
                disabled={guardandoLogo}
                className="mt-3 w-full px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50"
              >
                {guardandoLogo ? 'Subiendo...' : 'Guardar logo'}
              </button>
            )}
          </div>
        </div>

        {/* Datos de la empresa — columna ancha, a la derecha */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-4">Datos de la empresa</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Nombre de la empresa *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">NIT</label>
                <input
                  type="text"
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Dirección</label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Correo</label>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-400">Nombre en uso actualmente: <span className="font-medium text-zinc-600 dark:text-zinc-300">{nombreEmpresa}</span></p>
              <button
                onClick={guardarDatosEmpresa}
                disabled={guardandoNombre}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50 shrink-0"
              >
                {guardandoNombre ? 'Guardando...' : 'Guardar datos'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
