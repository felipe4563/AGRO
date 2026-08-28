const router = require('express').Router();
const ctrl = require('../controllers/reportes.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Función ayudante para mapear permisos dinámicos
const requireDynamicPermission = (mapaPermisos) => {
  return (req, res, next) => {
    const tipo = req.params.tipo;
    const permisoRequerido = mapaPermisos[tipo];
    
    if (!permisoRequerido) {
      return res.status(400).json({ error: `Tipo de reporte '${tipo}' no válido.` });
    }
    
    // Llamar al middleware original
    checkPermission(permisoRequerido, 'reportes')(req, res, next);
  };
};

// ==========================================
// RUTAS DE VENTAS
// ==========================================
router.get('/ventas/:tipo', requireDynamicPermission({
  'diarias': 'ventas_diarias',
  'rango': 'ventas_rango',
  'vendedor': 'ventas_vendedor',
  'producto': 'ventas_producto',
  'cliente': 'ventas_cliente'
}), ctrl.obtenerReporteVentas);

// ==========================================
// RUTAS DE COMPRAS
// ==========================================
router.get('/compras/:tipo', requireDynamicPermission({
  'generales': 'compras',
  'proveedor': 'compras_proveedor'
}), ctrl.obtenerReporteCompras);

// ==========================================
// RUTAS DE INVENTARIO
// ==========================================
router.get('/inventario/:tipo', requireDynamicPermission({
  'actual': 'inventario',
  'valorizado': 'inventario_valorizado',
  'stock_bajo': 'stock_bajo',
  'vencimientos': 'vencimientos',
  'kardex': 'kardex'
}), ctrl.obtenerReporteInventario);

// ==========================================
// RUTAS DE GANANCIAS / DASHBOARD
// ==========================================
router.get('/financiero',        checkPermission('ganancias',         'reportes'), ctrl.obtenerResumenFinanciero);
router.get('/top-productos',     checkPermission('top_productos',     'reportes'), ctrl.obtenerTopProductos);
router.get('/vencimientos',      checkPermission('vencimientos',      'reportes'), ctrl.obtenerAlertasVencimiento);
router.get('/ganancias/producto',checkPermission('ganancias_producto','reportes'), ctrl.obtenerReporteGananciasProducto);

// ==========================================
// RUTAS DE SUCURSALES
// ==========================================
router.get('/sucursales/traslados',   checkPermission('traslados',             'reportes'), ctrl.obtenerReporteTraslados);
router.get('/sucursales/comparativo', checkPermission('comparativo_sucursales','reportes'), ctrl.obtenerReporteComparativoSucursales);

// ==========================================
// RUTAS DE CAJA
// ==========================================
router.get('/caja', checkPermission('caja', 'reportes'), ctrl.obtenerReporteCaja);

module.exports = router;
