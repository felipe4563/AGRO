import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ventaService from '../../services/venta.service';
import { imprimirConRawBTyLogo, centrar, fila, linea } from '../../utils/rawbt';
import { useConfiguracion } from '../../contexts/ConfiguracionContext';

const fmt = (n) => Number(n ?? 0).toFixed(2);

// El backend guarda cada producto del combo como una línea aparte (para el FIFO de lotes),
// pero en el ticket se debe ver como un solo bloque: "COMBO: <nombre>" + lo que incluye +
// el precio total del combo, no el precio prorateado de cada componente.
function agruparParaTicket(detalles) {
  const vistos = new Set();
  const bloques = [];
  (detalles || []).forEach((d) => {
    if (d.id_combo) {
      if (vistos.has(d.id_combo)) return;
      vistos.add(d.id_combo);
      const items = detalles.filter((x) => x.id_combo === d.id_combo);
      bloques.push({
        tipo: 'combo',
        id_combo: d.id_combo,
        nombre: d.combo_nombre || 'Combo',
        items,
        subtotal: items.reduce((acc, x) => acc + (parseFloat(x.subtotal) || 0), 0),
        esRegalo: items.every((x) => parseFloat(x.precio_unitario) === 0),
      });
    } else {
      bloques.push({ tipo: 'normal', detalle: d });
    }
  });
  return bloques;
}
const fmtFecha = (s) =>
  s
    ? new Date(s).toLocaleString('es-BO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

export default function VentaTicket() {
  const { id }               = useParams();
  const navigate             = useNavigate();
  const { nombreEmpresa, logoUrl, tieneLogoPropio } = useConfiguracion();
  const [venta, setVenta]    = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    ventaService
      .obtener(id)
      .then((r) => setVenta(r.data))
      .catch(() => navigate('/ventas'))
      .finally(() => setCargando(false));
  }, [id]); // eslint-disable-line

  if (cargando)
    return (
      <div className="flex items-center justify-center py-32 text-zinc-400">
        Cargando…
      </div>
    );
  if (!venta) return null;

  const clienteNombre = venta.cliente_nombre
    ? `${venta.cliente_nombre} ${venta.cliente_apellido || ''}`.trim()
    : 'Consumidor Final';

  const construirTextoTicket = () => {
    const L = [];
    L.push(centrar(nombreEmpresa));
    if (venta.sucursal_nombre) L.push(centrar(venta.sucursal_nombre));
    if (venta.sucursal_direccion) {
      L.push(centrar(`${venta.sucursal_direccion}${venta.sucursal_ciudad ? ', ' + venta.sucursal_ciudad : ''}`));
    }
    if (venta.sucursal_telefono) L.push(centrar(`Tel: ${venta.sucursal_telefono}`));
    L.push(linea());
    L.push('COMPROBANTE DE VENTA');
    L.push(fila('Nro:', venta.id_venta.toString().padStart(6, '0')));
    L.push(fila('Fecha:', fmtFecha(venta.fecha_venta)));
    L.push(fila('Cajero:', `${venta.usuario_nombre} ${venta.usuario_apellido}`));
    L.push(fila('Tipo:', venta.tipo_venta === 'MAYOR' ? 'Por Mayor' : 'Por Menor'));
    if (venta.nro_factura) L.push(fila('N Factura:', venta.nro_factura));
    L.push(linea());
    L.push('CLIENTE');
    L.push(clienteNombre);
    if (venta.ci_nit) L.push(`CI/NIT: ${venta.ci_nit}`);
    L.push(linea());
    L.push('DETALLE');
    agruparParaTicket(venta.detalles).forEach((b) => {
      if (b.tipo === 'combo') {
        L.push(`[COMBO] ${b.nombre}`);
        b.items.forEach((it) => L.push(`  ${it.cantidad}x ${it.producto_nombre}`));
        if (b.esRegalo) L.push('  [REGALO - canje de puntos]');
        L.push(fila('  Total combo', b.esRegalo ? 'GRATIS' : `Bs ${fmt(b.subtotal)}`));
        return;
      }
      const d = b.detalle;
      const esRegalo = parseFloat(d.precio_unitario) === 0;
      const promoPct = parseFloat(d.promocion_pct) || 0;
      L.push(`${d.cantidad} ${d.tipo_cantidad === 'CAJA' ? 'cj' : 'un'} ${d.producto_nombre}`);
      if (esRegalo) L.push('  [REGALO - canje de puntos]');
      if (!esRegalo && promoPct > 0) L.push(`  [PROMOCION -${promoPct}%]`);
      L.push(fila(`  P.U. ${fmt(d.precio_unitario)}`, esRegalo ? 'GRATIS' : `Bs ${fmt(d.subtotal)}`));
    });
    L.push(linea('='));
    L.push(fila('Subtotal Bs:', fmt(venta.subtotal)));
    if (parseFloat(venta.descuento_total) > 0) L.push(fila('Descuento Bs:', '-' + fmt(venta.descuento_total)));
    L.push(fila('TOTAL Bs:', fmt(venta.total)));
    L.push(linea());
    L.push(fila('Metodo:', venta.metodo_pago));
    L.push(fila('Pagado Bs:', fmt(venta.monto_pagado)));
    L.push(fila('Cambio Bs:', fmt(venta.cambio)));
    if (venta.estado === 'ANULADA') {
      L.push(linea());
      L.push(centrar('*** ANULADA ***'));
    }
    L.push(linea());
    L.push(centrar('Gracias por su compra!'));
    L.push(centrar(nombreEmpresa));
    L.push('\n\n\n');
    return L.join('\n');
  };

  /* ── estilos reutilizables ── */
  const row = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '2px',
  };
  const sep = {
    borderTop: '1px dashed #000',
    margin: '4px 0',
  };

  return (
    <>
      {/* ── Barra de botones (se oculta al imprimir) ── */}
      <div className="no-print flex flex-wrap gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <button
          onClick={() => window.print()}
          className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors flex items-center gap-2"
        >
          Imprimir USB (80mm)
        </button>
        <button
          onClick={() => imprimirConRawBTyLogo(tieneLogoPropio ? logoUrl : null, construirTextoTicket())}
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors flex items-center gap-2"
        >
          Imprimir Bluetooth (RawBT)
        </button>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors"
        >
          ← Volver
        </button>
      </div>

      {/* ── Costo/utilidad: solo visible en pantalla para quien tiene el permiso
          (el backend ya omite estos campos si no corresponde); nunca sale impreso. */}
      {venta.costo_total !== undefined && (
        <div className="no-print flex flex-wrap gap-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-sm">
          <span className="text-amber-800 dark:text-amber-300">
            <strong>Costo:</strong> Bs {fmt(venta.costo_total)}
          </span>
          <span className="text-amber-800 dark:text-amber-300">
            <strong>Utilidad:</strong> Bs {fmt(venta.utilidad_total)}
          </span>
        </div>
      )}

      {/* ── Preview en pantalla ── */}
      <div className="flex justify-center p-2 sm:p-6 bg-zinc-100 dark:bg-zinc-950 min-h-screen">
        <div
          id="ticket"
          style={{
            width: '80mm',
            maxWidth: '100%',
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: '11px',
            lineHeight: '1.4',
            background: 'white',
            color: '#000',
            padding: '4mm',
          }}
        >
          {/* Cabecera empresa */}
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            <img
              src={logoUrl}
              alt={`Logo ${nombreEmpresa}`}
              style={{
                maxHeight: '140px',
                maxWidth: '100%',
                margin: '0 auto 4px',
                display: 'block',
                objectFit: 'contain',
              }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{nombreEmpresa}</div>
            {venta.sucursal_nombre && <div>{venta.sucursal_nombre}</div>}
            {venta.sucursal_direccion && (
              <div style={{ fontSize: '10px' }}>
                {venta.sucursal_direccion}
                {venta.sucursal_ciudad ? `, ${venta.sucursal_ciudad}` : ''}
              </div>
            )}
            {venta.sucursal_telefono && <div>Tel: {venta.sucursal_telefono}</div>}
          </div>

          <div style={sep} />

          {/* Número y datos generales */}
          <div style={{ marginBottom: '4px' }}>
            <div style={{ ...row, fontWeight: 'bold' }}>
              <span>COMPROBANTE DE VENTA</span>
              <span>Nº {venta.id_venta.toString().padStart(6, '0')}</span>
            </div>
            <div style={row}>
              <span>Fecha:</span>
              <span>{fmtFecha(venta.fecha_venta)}</span>
            </div>
            <div style={row}>
              <span>Cajero:</span>
              <span>{venta.usuario_nombre} {venta.usuario_apellido}</span>
            </div>
            <div style={row}>
              <span>Tipo:</span>
              <span>{venta.tipo_venta === 'MAYOR' ? 'Por Mayor' : 'Por Menor'}</span>
            </div>
            {venta.nro_factura && (
              <div style={row}>
                <span>N° Factura:</span>
                <span>{venta.nro_factura}</span>
              </div>
            )}
          </div>

          <div style={sep} />

          {/* Cliente */}
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontWeight: 'bold' }}>CLIENTE</div>
            <div>{clienteNombre}</div>
            {venta.ci_nit && <div>CI/NIT: {venta.ci_nit}</div>}
          </div>

          <div style={sep} />

          {/* Detalle de productos */}
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>DETALLE</div>
            {agruparParaTicket(venta.detalles).map((b) => {
              if (b.tipo === 'combo') {
                return (
                  <div key={`combo-${b.id_combo}`} style={{ marginBottom: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ maxWidth: '55mm', wordBreak: 'break-word', fontWeight: 'bold' }}>
                        COMBO: {b.nombre}
                      </span>
                      <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        {b.esRegalo ? 'GRATIS' : `Bs ${fmt(b.subtotal)}`}
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#444', paddingLeft: '4px' }}>
                      {b.items.map((it) => `${it.cantidad}x ${it.producto_nombre}`).join(' + ')}
                    </div>
                    {b.esRegalo && (
                      <div style={{ fontSize: '9px', fontWeight: 'bold', paddingLeft: '4px' }}>
                        REGALO (canje de puntos)
                      </div>
                    )}
                  </div>
                );
              }

              const d = b.detalle;
              const esRegalo = parseFloat(d.precio_unitario) === 0;
              const promoPct = parseFloat(d.promocion_pct) || 0;
              return (
                <div key={d.id_detalle_venta} style={{ marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ maxWidth: '55mm', wordBreak: 'break-word' }}>
                      {d.cantidad} {d.tipo_cantidad === 'CAJA' ? 'cj' : 'un'} — {d.producto_nombre}
                    </span>
                    <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {esRegalo ? 'GRATIS' : `Bs ${fmt(d.subtotal)}`}
                    </span>
                  </div>
                  {(esRegalo || promoPct > 0) && (
                    <div style={{ fontSize: '9px', fontWeight: 'bold', paddingLeft: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {esRegalo && <span>REGALO (canje de puntos)</span>}
                      {!esRegalo && promoPct > 0 && <span>PROMOCIÓN -{promoPct}%</span>}
                    </div>
                  )}
                  <div style={{ fontSize: '10px', color: '#444', paddingLeft: '4px' }}>
                    P.U.: Bs {fmt(d.precio_unitario)}
                    {parseFloat(d.descuento_pct) > 0 && ` (-${d.descuento_pct}%)`}
                    {' · Lote: '}{d.numero_lote || 'S/N'}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1.5px solid #000', margin: '4px 0' }} />

          {/* Totales */}
          <div style={{ marginBottom: '4px' }}>
            <div style={row}>
              <span>Subtotal Bs:</span>
              <span>{fmt(venta.subtotal)}</span>
            </div>
            {parseFloat(venta.descuento_total) > 0 && (
              <div style={row}>
                <span>Descuento Bs:</span>
                <span>- {fmt(venta.descuento_total)}</span>
              </div>
            )}
            <div style={{ ...row, fontWeight: 'bold', fontSize: '13px', marginTop: '2px' }}>
              <span>TOTAL Bs:</span>
              <span>{fmt(venta.total)}</span>
            </div>
          </div>

          <div style={sep} />

          {/* Pago */}
          <div style={{ marginBottom: '4px' }}>
            <div style={row}>
              <span>Método:</span>
              <span>{venta.metodo_pago}</span>
            </div>
            <div style={row}>
              <span>Pagado Bs:</span>
              <span>{fmt(venta.monto_pagado)}</span>
            </div>
            <div style={row}>
              <span>Cambio Bs:</span>
              <span>{fmt(venta.cambio)}</span>
            </div>
          </div>

          {/* Sello ANULADA */}
          {venta.estado === 'ANULADA' && (
            <>
              <div style={sep} />
              <div
                style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  letterSpacing: '0.2em',
                  border: '3px dashed #000',
                  padding: '3mm',
                  marginTop: '4px',
                }}
              >
                *** ANULADA ***
              </div>
            </>
          )}

          <div style={sep} />

          {/* Pie */}
          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '4px' }}>
            <div>¡Gracias por su compra!</div>
            <div style={{ marginTop: '2px' }}>{nombreEmpresa} · Sistema Agropecuario</div>
          </div>
        </div>
      </div>

      {/* CSS de impresión */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden !important; }
          #ticket, #ticket * { visibility: visible !important; }
          #ticket {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 72mm !important;
            margin: 0 !important;
            padding: 2mm !important;
            font-size: 11px !important;
            background: white !important;
            color: #000 !important;
          }
          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>
    </>
  );
}
