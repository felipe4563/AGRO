module.exports = {
  archivo: '06-administracion',
  modulo: 'Tutorial 6',
  titulo: 'Administración',
  subtitulo: 'Sucursales, usuarios, roles y la configuración del negocio.',
  inicio: '/sucursales',
  pasos: [
    { v: 'En este último video vemos la Administración: sucursales, usuarios, roles y permisos, y la configuración del negocio.' },
    {
      v: 'En Sucursales administrás tus puntos de venta o almacenes.',
      pausa: 700,
    },
    {
      v: 'Tocando Nueva Sucursal agregás otro local, con su nombre, dirección y ciudad.',
      a: async (h) => h.marcar(h.p.getByRole('button', { name: 'Nueva Sucursal' })),
    },
    {
      v: 'Ahora, Usuarios: acá das de alta a tu personal, con su carnet, su correo y su contraseña inicial.',
      a: async (h) => h.ir('/usuarios'),
    },
    {
      v: 'A cada usuario le asignás un rol, y la sucursal donde trabaja.',
      a: async (h) => h.marcar(h.p.getByRole('row', { name: /Administrador Sistema/ })),
    },
    {
      v: 'Y si alguien deja de trabajar con vos, lo desactivás; no hace falta borrarlo, así no perdés su historial.',
      a: async (h) => h.marcar(h.p.getByRole('button', { name: /Desactivar|Activar/ }).first()),
    },
    {
      v: 'Roles y Permisos es donde definís qué puede hacer cada tipo de usuario.',
      a: async (h) => h.ir('/roles'),
    },
    {
      v: 'Tocás un rol, como Cajero,',
      a: async (h) => h.clic(h.p.getByText('Cajero', { exact: true })),
    },
    {
      v: 'y marcás exactamente qué pantallas y qué acciones puede usar: ver, crear, editar o eliminar, módulo por módulo.',
      pausa: 1500,
    },
    {
      v: 'Y por último, Configuración: acá cargás el nombre y el logo de tu empresa, que se usa en el login, el menú y en los tickets de venta.',
      a: async (h) => h.ir('/configuracion'),
    },
    {
      v: 'También podés cargar tu NIT, dirección, ciudad y datos de contacto.',
      a: async (h) => h.marcar(h.p.getByRole('heading', { name: 'Datos de la empresa' }).locator('xpath=..')),
    },
    {
      v: 'Y si tenés una impresora térmica por Bluetooth, la conectás una sola vez acá, y los tickets se imprimen directo, sin volver a preguntar.',
      a: async (h) => h.marcar(h.p.getByText('Impresora Bluetooth').locator('xpath=../..')),
    },
    { v: 'Con esto terminamos el recorrido por SIS-AGRO. Gracias por ver estos videos, y éxitos con tu negocio.' },
  ],
};
