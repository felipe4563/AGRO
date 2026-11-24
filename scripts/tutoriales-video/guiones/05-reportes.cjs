module.exports = {
  archivo: '05-reportes',
  modulo: 'Tutorial 5',
  titulo: 'Reportes',
  subtitulo: 'Todo lo que necesitás para saber cómo va tu negocio.',
  inicio: '/reportes',
  pasos: [
    { v: 'En este video vemos el Centro de Reportes: todo lo que necesitás para saber cómo va tu negocio, con exportación a PDF y Excel.' },
    {
      v: 'La pestaña Dashboard te da un resumen gerencial: ventas, compras, flujo de caja, ticket promedio, lo que te deben y lo que debés.',
      a: async (h) => h.marcar(h.p.getByText(/ventas del per.odo/i).first().locator('xpath=..')),
    },
    {
      v: 'Más abajo, la evolución de tus ventas día por día, en un gráfico.',
      a: async (h) => h.scroll(400),
    },
    {
      v: 'Podés descargar este resumen en PDF cuando quieras.',
      a: async (h) => h.marcar(h.p.getByRole('button', { name: 'Descargar PDF' })),
    },
    {
      v: 'En Ganancias ves el detalle de tu utilidad: cuánto costó lo que vendiste, y cuánto ganaste realmente.',
      a: async (h) => h.clic(h.p.getByRole('main').getByRole('button', { name: 'Ganancias' })),
    },
    {
      v: 'En Ventas tenés el detalle completo de cada venta, filtrando por fecha, vendedor o cliente.',
      a: async (h) => h.clic(h.p.getByRole('main').getByRole('button', { name: 'Ventas', exact: true })),
    },
    {
      v: 'Compras te muestra lo mismo, pero del lado de lo que le compraste a tus proveedores.',
      a: async (h) => h.clic(h.p.getByRole('main').getByRole('button', { name: 'Compras' })),
    },
    {
      v: 'Inventario te da el valor de tu stock actual, y qué productos se mueven más o menos.',
      a: async (h) => h.clic(h.p.getByRole('main').getByRole('button', { name: 'Inventario' })),
    },
    {
      v: 'Sucursales compara el desempeño de cada una de tus sucursales, si tenés más de una.',
      a: async (h) => h.clic(h.p.getByRole('main').getByRole('button', { name: 'Sucursales' })),
    },
    {
      v: 'Y Caja te muestra el flujo de efectivo: cuánto entró, cuánto salió, y el acumulado día por día.',
      a: async (h) => h.clic(h.p.getByRole('main').getByRole('button', { name: 'Caja' })),
    },
    { v: 'En el próximo y último video vemos la Administración: sucursales, usuarios, roles y la configuración del negocio.' },
  ],
};
