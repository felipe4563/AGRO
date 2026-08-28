import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import configuracionService from '../services/configuracion.service';

const API_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

const ConfiguracionContext = createContext({
  nombreEmpresa: 'SIS-AGRO',
  logoUrl: '/logo.png',
  tieneLogoPropio: false,
  nit: '',
  direccion: '',
  ciudad: '',
  telefono: '',
  correo: '',
  cargando: true,
  recargar: () => {},
});

// Wrapea toda la app (incluido /login, que aún no tiene sesión) para que el
// nombre y logo del negocio configurados en /configuracion se vean en todas
// partes: sidebar, login, el ticket de venta y los reportes exportados a PDF.
export function ConfiguracionProvider({ children }) {
  const [config, setConfig] = useState({ nombre_empresa: 'SIS-AGRO', logo: null });
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(() => {
    configuracionService.obtener()
      .then((r) => setConfig(r.data))
      .catch(() => { /* se mantienen los valores por defecto */ })
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { recargar(); }, [recargar]);

  const value = {
    nombreEmpresa: config.nombre_empresa || 'SIS-AGRO',
    logoUrl: config.logo ? `${API_BASE}/uploads/${config.logo}` : '/logo.png',
    tieneLogoPropio: !!config.logo,
    nit: config.nit || '',
    direccion: config.direccion || '',
    ciudad: config.ciudad || '',
    telefono: config.telefono || '',
    correo: config.correo || '',
    cargando,
    recargar,
  };

  return (
    <ConfiguracionContext.Provider value={value}>
      {children}
    </ConfiguracionContext.Provider>
  );
}

export function useConfiguracion() {
  return useContext(ConfiguracionContext);
}
