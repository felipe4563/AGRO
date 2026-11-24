module.exports = {
  archivo: '01-introduccion',
  modulo: 'Tutorial 1',
  titulo: 'Primeros pasos',
  subtitulo: 'Entrar al sistema, el panel principal, modo oscuro y tu perfil.',
  inicio: '/login',
  sinSesion: true, // arranca sin sesión: la pantalla de login es real, no simulada
  mostrarBannerPwa: true, // este video sí narra el aviso de instalar como app
  pasos: [
    { v: 'Bienvenido a SIS-AGRO, el sistema de gestión para tu agropecuaria. Este primer video te muestra cómo entrar, el panel principal y tu perfil de usuario.' },
    {
      v: 'Para entrar, escribí tu correo o tu carnet de identidad en el primer campo.',
      a: async (h) => h.escribir(h.p.getByRole('textbox', { name: 'ID / Correo' }), 'admin@tuempresa.com'),
    },
    {
      v: 'Y tu contraseña en el segundo campo. Por seguridad, acá no te mostramos la contraseña real.',
      a: async (h) => h.escribir(h.p.getByRole('textbox', { name: 'Contraseña' }), '••••••••••••'),
    },
    {
      v: 'Después tocá Ingresar.',
      a: async (h) => h.simularClic(h.p.getByRole('button', { name: 'INGRESAR' })),
    },
    {
      v: 'Y listo, ya estamos dentro.',
      a: async (h) => h.ingresar('/dashboard'),
    },
    {
      v: 'Esta es tu pantalla de inicio: el Dashboard. Acá ves de un vistazo cómo viene el negocio.',
      pausa: 800,
    },
    {
      v: 'Arriba tenés las ventas de hoy, los ingresos y las compras del mes, y la utilidad bruta.',
      a: async (h) => h.marcar(h.p.getByText('Ventas hoy').locator('xpath=..').locator('xpath=..')),
    },
    {
      v: 'Más abajo, tus productos que más venden,',
      a: async (h) => h.marcar(h.p.getByRole('heading', { name: 'Top Productos' }).locator('xpath=../..')),
    },
    {
      v: 'los productos próximos a vencer,',
      a: async (h) => h.marcar(h.p.getByRole('heading', { name: 'Próximos a vencer' }).locator('xpath=../..')),
    },
    {
      v: 'y los que están con el stock bajo.',
      a: async (h) => h.marcar(h.p.getByRole('heading', { name: 'Stock bajo' }).locator('xpath=../..')),
    },
    {
      v: 'Al final tenés accesos rápidos a las pantallas que más vas a usar en el día a día.',
      a: async (h) => h.marcar(h.p.getByRole('heading', { name: 'Acceso rápido' }).locator('xpath=..')),
    },
    {
      v: 'Si querés instalar SIS-AGRO como una aplicación en tu celular o tu computadora, para entrar más rápido sin abrir el navegador, tenés este aviso arriba.',
      a: async (h) => h.marcar(h.p.getByText('Instalá SIS-AGRO como aplicación').locator('xpath=../..')),
    },
    {
      v: 'Arriba a la derecha podés cambiar entre modo claro y modo oscuro, el que te resulte más cómodo para trabajar.',
      a: async (h) => h.clic(h.p.getByRole('button', { name: /Modo/ })),
      pausa: 700,
    },
    {
      v: 'Y volvemos al que teníamos.',
      a: async (h) => h.clic(h.p.getByRole('button', { name: /Modo/ })),
    },
    {
      v: 'Tu nombre y tu foto están arriba a la derecha. Si tocás ahí, entrás a tu perfil.',
      a: async (h) => h.clic(h.p.getByRole('link', { name: /AS|Mi perfil/ })),
    },
    {
      v: 'Acá ves tus datos: tu nombre, tu CI, tu correo, tu rol y tu sucursal.',
      a: async (h) => h.marcar(h.p.getByRole('heading', { name: 'Mis datos' }).locator('xpath=..')),
    },
    {
      v: 'Y acá podés subir tu foto de perfil,',
      a: async (h) => h.marcar(h.p.getByRole('heading', { name: 'Foto de perfil' }).locator('xpath=..')),
    },
    {
      v: 'y cambiar tu contraseña cuando quieras.',
      a: async (h) => h.marcar(h.p.getByRole('heading', { name: 'Cambiar contraseña' }).locator('xpath=..')),
    },
    { v: 'En el próximo video vamos a ver la Operación diaria: Ventas, Cuentas por Cobrar y Pagar, y Caja.' },
  ],
};
