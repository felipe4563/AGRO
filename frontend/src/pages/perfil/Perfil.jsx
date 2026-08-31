import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageWrapper from '../../components/PageWrapper';
import perfilService from '../../services/perfil.service';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

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

export default function Perfil() {
  const { usuario, actualizarUsuario } = useAuth();
  const [searchParams] = useSearchParams();
  const obligatorio = searchParams.get('obligatorio') === '1';

  const [toast, setToast] = useState(null);
  const [datosPerfil, setDatosPerfil] = useState(null);
  const [preview, setPreview] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const inputRef = useRef(null);

  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [guardandoPassword, setGuardandoPassword] = useState(false);

  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    perfilService.obtener()
      .then((res) => setDatosPerfil(res.data))
      .catch(() => mostrarToast('error', 'Error al cargar el perfil'));
  }, []);

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

  const guardarFoto = async () => {
    if (!archivo) return;
    setSubiendoFoto(true);
    try {
      const fd = new FormData();
      fd.append('foto', archivo);
      const res = await perfilService.subirFoto(fd);
      actualizarUsuario({ foto: res.data.foto });
      mostrarToast('ok', 'Foto actualizada');
      setArchivo(null);
      setPreview(null);
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al subir la foto');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const guardarPassword = async () => {
    if (!contrasenaActual || !nuevaContrasena) {
      mostrarToast('error', 'Completa la contraseña actual y la nueva');
      return;
    }
    if (nuevaContrasena.length < 6) {
      mostrarToast('error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      mostrarToast('error', 'La confirmación no coincide con la nueva contraseña');
      return;
    }
    setGuardandoPassword(true);
    try {
      await perfilService.cambiarPassword({ contrasena_actual: contrasenaActual, nueva_contrasena: nuevaContrasena });
      actualizarUsuario({ debe_cambiar_contrasena: false });
      mostrarToast('ok', 'Contraseña actualizada correctamente');
      setContrasenaActual('');
      setNuevaContrasena('');
      setConfirmarContrasena('');
    } catch (err) {
      mostrarToast('error', err.response?.data?.error || 'Error al cambiar la contraseña');
    } finally {
      setGuardandoPassword(false);
    }
  };

  const imagenMostrada = preview || (usuario?.foto ? `${API_BASE}/uploads/${usuario.foto}?v=${Date.now()}` : null);

  return (
    <PageWrapper>
      <Toast toast={toast} />

      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Mi perfil</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Tus datos, tu foto y tu contraseña.
        </p>
      </div>

      {obligatorio && (
        <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-xl text-orange-800 dark:text-orange-300 text-sm font-semibold">
          Debes actualizar tu contraseña para continuar.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
        {/* Foto — columna angosta, a la izquierda, sticky en escritorio */}
        {!obligatorio && (
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5 lg:sticky lg:top-4">
              <h2 className="font-bold text-zinc-900 dark:text-white mb-4">Foto de perfil</h2>
              <div className="flex flex-col items-center gap-3">
                <div className="w-28 h-28 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center text-zinc-400">
                  {imagenMostrada ? (
                    <img src={imagenMostrada} alt="Foto de perfil" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold">{usuario?.nombre?.[0]}{usuario?.apellido?.[0]}</span>
                  )}
                </div>
                <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(e) => procesarArchivo(e.target.files[0])} />
                <button
                  onClick={() => inputRef.current?.click()}
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Elegir foto
                </button>
                {archivo && (
                  <button
                    onClick={guardarFoto}
                    disabled={subiendoFoto}
                    className="w-full px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50"
                  >
                    {subiendoFoto ? 'Subiendo...' : 'Guardar foto'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Datos + contraseña — columnas anchas, a la derecha (o todo el ancho si es obligatorio) */}
        <div className={`${obligatorio ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-6`}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
            <h2 className="font-bold text-zinc-900 dark:text-white mb-4">Mis datos</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Nombre completo</dt>
                <dd className="text-zinc-900 dark:text-white font-medium">
                  {datosPerfil ? `${datosPerfil.nombre} ${datosPerfil.apellido}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">CI</dt>
                <dd className="text-zinc-900 dark:text-white font-medium">{datosPerfil?.ci || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Correo</dt>
                <dd className="text-zinc-900 dark:text-white font-medium">{datosPerfil?.correo || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Celular</dt>
                <dd className="text-zinc-900 dark:text-white font-medium">{datosPerfil?.celular || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Rol</dt>
                <dd className="text-zinc-900 dark:text-white font-medium">{datosPerfil?.rol_nombre || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Sucursal</dt>
                <dd className="text-zinc-900 dark:text-white font-medium">{datosPerfil?.sucursal_nombre || '—'}</dd>
              </div>
            </dl>
            <p className="text-[11px] text-zinc-400 mt-4">
              Para cambiar estos datos, contacta a un administrador.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
            <h2 className="font-bold text-zinc-900 dark:text-white mb-4">Cambiar contraseña</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Contraseña actual</label>
                <input
                  type="password"
                  value={contrasenaActual}
                  onChange={(e) => setContrasenaActual(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Nueva contraseña</label>
                <input
                  type="password"
                  value={nuevaContrasena}
                  onChange={(e) => setNuevaContrasena(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  value={confirmarContrasena}
                  onChange={(e) => setConfirmarContrasena(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <button
              onClick={guardarPassword}
              disabled={guardandoPassword}
              className="w-full sm:w-auto mt-4 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50"
            >
              {guardandoPassword ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
