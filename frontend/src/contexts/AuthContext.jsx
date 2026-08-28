import { createContext, useContext, useState, useCallback } from 'react';
import authService from '../services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const raw = localStorage.getItem('usuario');
    return raw ? JSON.parse(raw) : null;
  });
  const [cargando, setCargando] = useState(false);
  const [error,    setError]    = useState(null);

  const login = useCallback(async (identificador, contrasena) => {
    setCargando(true);
    setError(null);
    try {
      // ← Usa el service, no axios directo
      const { data } = await authService.login(identificador, contrasena);
      localStorage.setItem('token',   data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      setUsuario(data.usuario);
      return data.usuario;
    } catch (err) {
      const mensaje = err.response?.data?.error || 'Error al iniciar sesión';
      setError(mensaje);
      throw new Error(mensaje);
    } finally {
      setCargando(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }, []);

  const actualizarUsuario = useCallback((patch) => {
    setUsuario((prev) => {
      if (!prev) return prev;
      const actualizado = { ...prev, ...patch };
      localStorage.setItem('usuario', JSON.stringify(actualizado));
      return actualizado;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, login, logout, actualizarUsuario, cargando, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);