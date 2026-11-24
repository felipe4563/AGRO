module.exports = {
  archivo: '03-inventario',
  modulo: 'Tutorial 3',
  titulo: 'Inventario',
  subtitulo: 'Productos, catálogos, almacén, compras, combos y promociones.',
  inicio: '/productos',
  pasos: [
    { v: 'En este video vamos a ver todo lo relacionado al inventario: productos, catálogos, almacén, compras, combos y promociones.' },
    {
      v: 'Esta es la Gestión de Productos: tu catálogo completo, con precios y stock mínimo.',
      pausa: 700,
    },
    {
      v: 'Podés buscar un producto por nombre o código de barras,',
      a: async (h) => h.escribir(h.p.getByPlaceholder(/Buscar por nombre o código/), 'Fertilizante'),
    },
    {
      v: 'o filtrar por categoría, marca o unidad de medida.',
      a: async (h) => { await h.p.getByPlaceholder(/Buscar por nombre o código/).fill(''); },
      pausa: 500,
    },
    {
      v: 'Para dar de alta un producto nuevo, tocás Nuevo Producto, arriba a la derecha.',
      a: async (h) => h.marcar(h.p.getByRole('button', { name: 'Nuevo Producto' })),
    },
    {
      v: 'Y en cada fila tenés sus acciones: imprimir etiqueta, gestionar la foto, editar o eliminar.',
      a: async (h) => h.marcar(h.p.getByRole('row', { name: /Fertilizante NPK 25kg/ })),
    },
    {
      v: 'Ahora vamos a Catálogos: acá administrás las clasificaciones, marcas y unidades de medida que usan tus productos.',
      a: async (h) => h.ir('/catalogos'),
    },
    {
      v: 'Tocando Nuevo Registro das de alta una categoría, marca o unidad nueva, según la pestaña en la que estés.',
      a: async (h) => h.marcar(h.p.getByRole('button', { name: 'Nuevo Registro' })),
    },
    {
      v: 'Si ya no la vas a usar, podés eliminarla del todo. El sistema solo te deja si no está en uso por ningún producto; si lo está, te avisa para que la desactives en su lugar.',
      a: async (h) => h.marcar(h.p.getByRole('row', { name: /Herramientas/ })),
    },
    {
      v: 'Ahora, Almacén: acá está el stock real de cada producto, por lote.',
      a: async (h) => h.ir('/almacen'),
    },
    {
      v: 'Para ingresar stock nuevo, tocás Nueva Entrada: buscás el producto, y cargás cuántas cajas entraron, cuántas unidades trae cada caja, y si quedaron unidades sueltas fuera de caja.',
      a: async (h) => h.marcar(h.p.getByRole('button', { name: 'Nueva Entrada' })),
    },
    {
      v: 'Cada lote tiene sus propias acciones: imprimir su etiqueta, ver su historial, ajustar el inventario si contaste diferente, trasladarlo a otra sucursal, o darlo de baja si se venció o se dañó.',
      a: async (h) => h.marcar(h.p.getByRole('row', { name: /Fertilizante NPK/ }).first()),
    },
    {
      v: 'En la pestaña Traslados seguís el estado de la mercadería que se mueve de una sucursal a otra,',
      a: async (h) => h.clic(h.p.getByRole('button', { name: 'Traslados' })),
    },
    {
      v: 'y en Alertas, los productos con stock bajo o próximos a vencer.',
      a: async (h) => h.clic(h.p.getByRole('button', { name: 'Alertas' })),
    },
    {
      v: 'Compras e Ingresos es donde registrás lo que le comprás a tus proveedores.',
      a: async (h) => h.ir('/compras/nueva'),
    },
    {
      v: 'Elegís el proveedor, la sucursal de destino, y después vas agregando los productos con su cantidad y su costo.',
      a: async (h) => h.marcar(h.p.getByRole('heading', { name: 'Agregar Producto' }).locator('xpath=..')),
    },
    {
      v: 'Al finalizar, esa compra queda registrada y el stock se actualiza solo.',
      pausa: 700,
    },
    {
      v: 'Los Combos te dejan armar paquetes de varios productos a un precio fijo, para venderlos juntos en el POS.',
      a: async (h) => h.ir('/combos'),
    },
    {
      v: 'Tocás Nuevo Combo, le ponés nombre y precio, y elegís qué productos lo forman.',
      a: async (h) => h.clic(h.p.getByRole('button', { name: '+ Nuevo Combo' })),
    },
    {
      v: 'Le ponés un nombre, el precio fijo del paquete, y abajo vas agregando los productos que lo forman, con su cantidad.',
      a: async (h) => h.marcar(h.p.getByText('Productos que forman el combo').locator('xpath=..')),
    },
    {
      v: 'Por ahora no lo vamos a guardar, era solo para mostrarte cómo se arma.',
      a: async (h) => h.clic(h.p.getByRole('button', { name: 'Cancelar' })),
    },
    {
      v: 'Y por último, Promociones: descuentos automáticos por rango de fechas, que se aplican solos en el POS sin que el cajero tenga que hacer nada.',
      a: async (h) => h.ir('/promociones'),
    },
    {
      v: 'Podés aplicar el descuento a una categoría completa, o a productos puntuales.',
      a: async (h) => h.marcar(h.p.getByRole('heading', { name: 'mes patrio' }).locator('xpath=../..')),
    },
    { v: 'En el próximo video vemos Clientes, Proveedores y Fidelización.' },
  ],
};
