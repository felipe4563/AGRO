import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaEnvelope, FaLock, FaSpinner, FaEye, FaEyeSlash } from 'react-icons/fa';

import { useAuth }           from '../contexts/AuthContext';
import { useAbilityUpdater } from '../contexts/AbilityContext';
import { useConfiguracion }  from '../contexts/ConfiguracionContext';

const Login = () => {
  const [identificador,    setIdentificador]    = useState('');
  const [contrasena,       setContrasena]       = useState('');
  const [mostrarContrasena,setMostrarContrasena]= useState(false);

  const { login, cargando, error } = useAuth();
  const { actualizar }             = useAbilityUpdater();
  const { nombreEmpresa, logoUrl } = useConfiguracion();
  const navigate                   = useNavigate();
  const location                   = useLocation();

  const destino = location.state?.from?.pathname ?? '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!identificador || !contrasena) return;

    try {
      const usuario = await login(identificador.trim(), contrasena);
      actualizar(usuario.permisos ?? []);
      navigate(destino, { replace: true });
    } catch {
      // El error ya está en el estado `error` de AuthContext
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-500">
      {/* Fondo futurista y malla */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Efectos de neón animados (Agro-Futurista) */}
      <div className="absolute top-10 -left-20 w-72 sm:w-96 h-72 sm:h-96 bg-emerald-400 dark:bg-emerald-600 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] sm:blur-[128px] opacity-40 dark:opacity-30 animate-pulse"></div>
      <div className="absolute top-20 -right-20 w-72 sm:w-96 h-72 sm:h-96 bg-lime-400 dark:bg-lime-500 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] sm:blur-[128px] opacity-30 dark:opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-80 sm:w-[500px] h-80 sm:h-[500px] bg-emerald-300 dark:bg-emerald-500 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] sm:blur-[150px] opacity-30 dark:opacity-20"></div>

      {/* Contenedor Principal Glassmorphism */}
      <div className="relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-3xl p-6 sm:p-8 md:p-10 w-full max-w-[90%] sm:max-w-md border border-slate-200 dark:border-white/5 overflow-hidden group hover:border-emerald-300 dark:hover:border-white/10 transition-colors duration-500">
        
        {/* Resplandor interno sutil en hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 dark:from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

        {/* Logo con resplandor */}
        <div className="flex justify-center mb-8 relative">
          <div className="absolute inset-0 bg-emerald-400/30 dark:bg-emerald-400/20 blur-2xl rounded-full scale-150 animate-pulse" />
          <img
            src={logoUrl}
            alt="Logo"
            className="w-32 sm:w-40 md:w-48 h-auto object-contain relative z-10 filter drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] dark:drop-shadow-[0_0_15px_rgba(52,211,153,0.5)] transition-transform duration-500 hover:scale-105"
          />
        </div>

        <div className="text-center mb-8">
          <p className="text-base sm:text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">
            {nombreEmpresa}
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-lime-500 dark:from-emerald-400 dark:to-lime-300 tracking-tight">
            Acceso al Sistema
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase letter-spacing-1">
            Gestión Agropecuaria 2.0
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-center shadow-[0_0_15px_rgba(239,68,68,0.05)] dark:shadow-[0_0_15px_rgba(239,68,68,0.1)] backdrop-blur-md">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="break-words flex-1 font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Identificador */}
          <div className="space-y-1.5">
            <label htmlFor="identificador" className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              ID / Correo
            </label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within/input:text-emerald-500 dark:group-focus-within/input:text-emerald-400 text-slate-400 dark:text-slate-500">
                <FaEnvelope className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <input
                type="text"
                id="identificador"
                placeholder="Correo o CI"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                required
                className="block w-full pl-11 pr-4 py-3 text-sm sm:text-base bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="space-y-1.5">
            <label htmlFor="contrasena" className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              Contraseña
            </label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within/input:text-emerald-500 dark:group-focus-within/input:text-emerald-400 text-slate-400 dark:text-slate-500">
                <FaLock className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <input
                type={mostrarContrasena ? 'text' : 'password'}
                id="contrasena"
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
                className="block w-full pl-11 pr-12 py-3 text-sm sm:text-base bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-inner"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  className="text-slate-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 focus:outline-none transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                >
                  {mostrarContrasena
                    ? <FaEyeSlash className="h-4 w-4 sm:h-5 sm:w-5" />
                    : <FaEye     className="h-4 w-4 sm:h-5 sm:w-5" />
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={cargando || !identificador || !contrasena}
              className={`relative w-full flex items-center justify-center gap-3 py-3 sm:py-3.5 px-4 rounded-xl font-bold transition-all duration-300 text-sm sm:text-base overflow-hidden ${
                cargando
                  ? 'bg-slate-200 dark:bg-emerald-600/50 cursor-not-allowed text-slate-400 dark:text-slate-300'
                  : 'bg-emerald-500 dark:bg-emerald-400 hover:bg-emerald-400 dark:hover:bg-emerald-300 text-white dark:text-slate-950 shadow-[0_4px_15px_rgba(16,185,129,0.3)] dark:shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:shadow-[0_6px_25px_rgba(16,185,129,0.4)] dark:hover:shadow-[0_0_30px_rgba(52,211,153,0.5)] hover:-translate-y-0.5'
              }`}
            >
              {/* Brillo en botón (solo si no está cargando) */}
              {!cargando && (
                <div className="absolute inset-0 -translate-x-full hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 dark:via-white/20 to-transparent skew-x-12" />
              )}
              
              {cargando ? (
                <>
                  <FaSpinner className="animate-spin h-5 w-5" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <span className="relative z-10 tracking-wide">INGRESAR</span>
              )}
            </button>
          </div>

        </form>

        <div className="mt-8 text-center relative z-10">
          <p className="text-slate-500 text-xs sm:text-sm font-medium">
            Acceso mediante <span className="text-emerald-600 dark:text-emerald-400/80 font-semibold">Correo</span> o <span className="text-emerald-600 dark:text-emerald-400/80 font-semibold">CI</span>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;