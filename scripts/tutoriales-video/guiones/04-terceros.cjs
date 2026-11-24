module.exports = {
  archivo: '04-terceros',
  modulo: 'Tutorial 4',
  titulo: 'Clientes, Proveedores y Fidelización',
  subtitulo: 'Tu directorio de contactos y el programa de puntos.',
  inicio: '/clientes',
  pasos: [
    { v: 'En este video vemos Clientes, Proveedores y el programa de Fidelización.' },
    {
      v: 'Este es tu directorio de clientes, minoristas y mayoristas.',
      pausa: 700,
    },
    {
      v: 'Para agregar uno nuevo, tocás Nuevo Cliente.',
      a: async (h) => h.marcar(h.p.getByRole('button', { name: 'Nuevo Cliente' })),
    },
    {
      v: 'En cada cliente podés ver su historial de compras, editarlo o desactivarlo.',
      a: async (h) => h.marcar(h.p.getByRole('row', { name: /Roberto Mamani/ }).getByRole('button').first()),
    },
    {
      v: 'Proveedores funciona igual, pero con las empresas que te venden a vos.',
      a: async (h) => h.ir('/proveedores'),
    },
    {
      v: 'Nombre, NIT, contacto y teléfono, todo a mano para cuando necesites hacer un pedido.',
      a: async (h) => h.marcar(h.p.getByRole('row', { name: /AgroInsumos/ })),
    },
    {
      v: 'Y por último, Fidelización: tus clientes acumulan puntos con cada compra, y después los pueden canjear.',
      a: async (h) => h.ir('/fidelizacion'),
    },
    {
      v: 'Para canjear, buscás al cliente por su nombre o su CI.',
      a: async (h) => h.marcar(h.p.getByPlaceholder(/Buscar cliente/)),
    },
    {
      v: 'En la pestaña Recompensas armás qué puede canjear un cliente con sus puntos: un descuento, un producto de regalo, lo que vos definas.',
      a: async (h) => h.clic(h.p.getByRole('button', { name: 'Recompensas' })),
    },
    {
      v: 'Y en Configuración definís cuántos puntos da cada compra.',
      a: async (h) => h.clic(h.p.getByRole('button', { name: 'Configuración' })),
    },
    { v: 'En el próximo video vemos los Reportes: todo lo que necesitás para saber cómo va tu negocio.' },
  ],
};
