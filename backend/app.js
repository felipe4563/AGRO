require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

// ── Rutas ─────────────────────────────────────────────────────────────────
const authRoutes        = require('./routes/auth.Routes');
const rolesRoutes       = require('./routes/roles.Routes');
const usuariosRoutes    = require('./routes/usuarios.Routes');
const sucursalesRoutes  = require('./routes/sucursales.Routes');
const catalogosRoutes   = require('./routes/catalogos.Routes');
const productosRoutes   = require('./routes/productos.Routes');
const clientesRoutes    = require('./routes/clientes.Routes');
const proveedoresRoutes = require('./routes/proveedores.Routes');
const comprasRoutes     = require('./routes/compras.Routes');
const almacenRoutes     = require('./routes/almacen.Routes');
const ventasRoutes      = require('./routes/ventas.Routes');
const cajaRoutes        = require('./routes/caja.Routes');
const reportesRoutes    = require('./routes/reportes.Routes');
const cobrosRoutes      = require('./routes/cobros.Routes');
const cuentasPagarRoutes = require('./routes/cuentasPagar.Routes');
const combosRoutes      = require('./routes/combos.Routes');
const promocionesRoutes = require('./routes/promociones.Routes');
const fidelizacionRoutes = require('./routes/fidelizacion.Routes');
const configuracionRoutes = require('./routes/configuracion.Routes');
const perfilRoutes = require('./routes/perfil.Routes');
const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────
// ALLOWED_ORIGINS: lista separada por comas en .env (ej. para un túnel temporal
// de pruebas). No hardcodear aquí URLs de túneles — quedan obsoletas y, con
// credentials:true, seguirían siendo un origin de confianza si alguien más
// reutiliza esa URL.
const origenesExtra = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: ['http://localhost:5173', ...origenesExtra],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// ── Archivos estáticos (imágenes de productos) ────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ── Rutas API ─────────────────────────────────────────────────────────────
app.use('/api/auth',authRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/sucursales', sucursalesRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/almacen', almacenRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/cobros',   cobrosRoutes);
app.use('/api/cuentas-pagar', cuentasPagarRoutes);
app.use('/api/combos',   combosRoutes);
app.use('/api/promociones', promocionesRoutes);
app.use('/api/fidelizacion', fidelizacionRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/perfil', perfilRoutes);

// ── Servidor ──────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Conectado a la base de datos MySQL`);
    console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
  });
}

module.exports = app;