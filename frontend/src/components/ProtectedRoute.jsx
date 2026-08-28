import { Navigate, useLocation } from 'react-router-dom';
import { useAuth }        from '../contexts/AuthContext';
import { usePermission }  from '../hooks/usePermission';

/**
 * Guarda de rutas con tres niveles de protección:
 *
 * Nivel 1 — Solo autenticación:
 *   <ProtectedRoute>
 *     <MiPagina />
 *   </ProtectedRoute>
 *
 * Nivel 2 — Autenticación + permiso específico:
 *   <ProtectedRoute action="ver" subject="roles">
 *     <RolesPage />
 *   </ProtectedRoute>
 *
 * Nivel 3 — Autenticación + cualquiera de varios permisos (OR):
 *   <ProtectedRoute anyPermission={[{ action: 'ventas_diarias', subject: 'reportes' }, ...]}>
 *     <ReportesPage />
 *   </ProtectedRoute>
 */
export default function ProtectedRoute({ children, action, subject, anyPermission }) {
  const { usuario }        = useAuth();
  const { noPuede, puede } = usePermission();
  const location           = useLocation();

  // ── 1. No autenticado → redirigir al login ────────────────────────────
  // Guardamos la ruta actual para redirigir de vuelta tras el login
  if (!usuario) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── 1.5. Debe cambiar contraseña → bloquear cualquier otra ruta ───────
  if (usuario.debe_cambiar_contrasena && location.pathname !== '/perfil') {
    return <Navigate to="/perfil?obligatorio=1" replace />;
  }

  // ── 2. anyPermission (OR) → acceso si tiene al menos uno ─────────────
  if (anyPermission) {
    const tieneAlguno = anyPermission.some(p => puede(p.action, p.subject));
    if (!tieneAlguno) {
      return <Navigate to="/sin-permiso" replace />;
    }
    return children;
  }

  // ── 3. Sin permiso específico → página de acceso denegado ─────────────
  if (action && subject && noPuede(action, subject)) {
    return <Navigate to="/sin-permiso" replace />;
  }

  return children;
}