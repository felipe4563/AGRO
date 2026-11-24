module.exports = {
  archivo: '02-operacion',
  modulo: 'Tutorial 2',
  titulo: 'Operación diaria',
  subtitulo: 'Vender, cobrar cuentas pendientes y manejar la caja.',
  inicio: '/ventas/nueva',
  pasos: [
    { v: 'En este video vamos a ver la operación del día a día: hacer una venta, cobrar cuentas pendientes y manejar la caja.' },
    {
      v: 'Esta es la pantalla de Ventas. A la izquierda están los productos, con su precio y el stock disponible.',
      pausa: 700,
    },
    {
      v: 'Para vender, simplemente tocá el producto que querés agregar.',
      a: async (h) => h.clic(h.p.getByRole('heading', { name: 'Fertilizante NPK 25kg' })),
    },
    {
      v: 'Aparece en el carrito, a la derecha, con su cantidad y su precio.',
      a: async (h) => h.marcar(h.p.getByText('Fertilizante NPK 25kg').last().locator('xpath=../..')),
    },
    {
      v: 'Agreguemos otro producto más.',
      a: async (h) => h.clic(h.p.getByRole('heading', { name: 'Semilla de Maíz Híbrido' })),
    },
    {
      v: 'También podés buscar un producto escribiendo su nombre, o escaneando el código de barras.',
      a: async (h) => h.marcar(h.p.getByPlaceholder(/Buscar por nombre, código/)),
    },
    {
      v: 'Acá elegís el método de pago: efectivo, QR, transferencia, u otros.',
      a: async (h) => h.marcar(h.p.getByRole('button', { name: 'Efectivo' }).locator('xpath=..')),
    },
    {
      v: 'Y cuando está todo listo, tocás Cobrar.',
      a: async (h) => h.clic(h.p.getByRole('button', { name: /^COBRAR/ })),
    },
    {
      v: 'Y se genera el comprobante de la venta, listo para imprimir o compartir.',
      pausa: 1200,
    },
    {
      v: 'Ahora vamos a Cuentas por Cobrar: acá ves las ventas a crédito que todavía tienen saldo pendiente.',
      a: async (h) => h.ir('/cobros'),
    },
    {
      v: 'Para cada venta pendiente, tocás Registrar abono para anotar un pago parcial o total.',
      a: async (h) => h.marcar(h.p.getByRole('button', { name: 'Registrar abono' }).first()),
    },
    {
      v: 'Cuentas por Pagar funciona igual, pero con las compras a crédito que le debés a tus proveedores.',
      a: async (h) => h.ir('/cuentas-pagar'),
    },
    {
      v: 'Y ahora, la Caja: acá abrís y cerrás tu turno de trabajo.',
      a: async (h) => h.ir('/caja'),
    },
    {
      v: 'Cuando el turno está abierto, lo ves marcado en verde, con el cajero y el monto con el que arrancó.',
      a: async (h) => h.marcar(h.p.getByText('Turno ABIERTO').locator('xpath=../..')),
    },
    {
      v: 'Desde acá podés registrar un gasto que salga de la caja,',
      a: async (h) => h.marcar(h.p.getByRole('button', { name: 'Registrar gasto' })),
    },
    {
      v: 'o cerrar el turno al final del día, contando el efectivo real que quedó.',
      a: async (h) => h.marcar(h.p.getByRole('button', { name: 'Cerrar Turno' })),
    },
    {
      v: 'En Historial de Turnos podés revisar los turnos que ya se cerraron.',
      a: async (h) => h.clic(h.p.getByRole('button', { name: 'Historial de Turnos' })),
    },
    {
      v: 'Y por último, el Libro de Caja: un detalle día por día de todo lo que entró y salió de la caja.',
      a: async (h) => h.ir('/caja/libro'),
      pausa: 800,
    },
    { v: 'En el próximo video vemos el Inventario: productos, catálogos, almacén, compras, combos y promociones.' },
  ],
};
