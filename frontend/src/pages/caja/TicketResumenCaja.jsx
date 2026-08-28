import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cajaService from '../../services/caja.service';
import { imprimirConRawBT, centrar, fila, linea } from '../../utils/rawbt';
import { useConfiguracion } from '../../contexts/ConfiguracionContext';

const fmt = (n) => Number(n ?? 0).toFixed(2);
const fmtFecha = (s) =>
  s
    ? new Date(s).toLocaleString('es-BO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

const METODO_LABEL = { EFECTIVO: 'Efectivo', QR: 'QR', TRANSFERENCIA: 'Transferencia', CREDITO: 'Crédito', OTRO: 'Otro' };

export default function TicketResumenCaja() {
  const { id }                     = useParams();
  const navigate                   = useNavigate();
  const { nombreEmpresa, logoUrl } = useConfiguracion();
  const [resumen, setResumen]      = useState(null);
  const [cargando, setCargando]    = useState(true);

  useEffect(() => {
    cajaService.obtenerResumenTurno(id)
      .then((r) => setResumen(r.data))
      .catch(() => navigate('/caja'))
      .finally(() => setCargando(false));
  }, [id]); // eslint-disable-line

  if (cargando)
    return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;
  if (!resumen) return null;

  const { turno, ventas_por_metodo, total_ventas, productos_vendidos,
          abonos_por_metodo, total_abonos, abonos_detalle,
          creditos_generados, total_creditos_pendiente, gastos, total_gastos } = resumen;

  const cerrado = turno.estado === 'CERRADA';

  const construirTexto = () => {
    const L = [];
    L.push(centrar(nombreEmpresa));
    if (turno.sucursal_nombre) L.push(centrar(turno.sucursal_nombre));
    L.push(linea());
    L.push('RESUMEN DE CIERRE DE CAJA');
    L.push(fila('Turno:', `#${turno.id_apertura.toString().padStart(5, '0')}`));
    L.push(fila('Caja:', turno.caja_nombre));
    L.push(fila('Cajero:', `${turno.usuario_nombre} ${turno.usuario_apellido}`));
    L.push(fila('Apertura:', fmtFecha(turno.fecha_apertura)));
    L.push(fila('Cierre:', cerrado ? fmtFecha(turno.fecha_cierre) : 'Turno aún abierto'));
    L.push(linea());

    L.push('VENTAS POR METODO');
    if (ventas_por_metodo.length === 0) L.push('  Sin ventas en este turno');
    ventas_por_metodo.forEach((v) => L.push(fila(`  ${METODO_LABEL[v.metodo_pago] || v.metodo_pago} (${v.cantidad})`, `Bs ${fmt(v.total)}`)));
    L.push(fila('TOTAL VENTAS', `Bs ${fmt(total_ventas)}`));
    L.push(linea());

    L.push('PRODUCTOS VENDIDOS');
    if (productos_vendidos.length === 0) L.push('  Sin productos vendidos en este turno');
    productos_vendidos.forEach((p) => L.push(fila(`  ${p.cantidad}x ${p.producto_nombre}`, `Bs ${fmt(p.subtotal)}`)));
    L.push(linea());

    L.push('ABONOS A CREDITO (COBROS)');
    if (abonos_detalle.length === 0) L.push('  Sin abonos en este turno');
    abonos_detalle.forEach((a) => {
      const cliente = a.cliente_nombre ? `${a.cliente_nombre} ${a.cliente_apellido || ''}`.trim() : 'Consumidor Final';
      L.push(fila(`  ${cliente} (${METODO_LABEL[a.metodo_pago] || a.metodo_pago})`, `Bs ${fmt(a.monto)}`));
    });
    L.push(fila('TOTAL ABONOS', `Bs ${fmt(total_abonos)}`));
    L.push(linea());

    L.push('VENTAS A CREDITO GENERADAS');
    if (creditos_generados.length === 0) L.push('  Ninguna en este turno');
    creditos_generados.forEach((c) => {
      const cliente = c.cliente_nombre ? `${c.cliente_nombre} ${c.cliente_apellido || ''}`.trim() : 'Consumidor Final';
      L.push(`  #${c.id_venta.toString().padStart(5, '0')} ${cliente}`);
      L.push(fila('    Saldo pendiente', `Bs ${fmt(Math.max(0, c.saldo_pendiente))}`));
    });
    L.push(fila('TOTAL PENDIENTE (nuevo)', `Bs ${fmt(total_creditos_pendiente)}`));
    L.push(linea());

    L.push('GASTOS DE CAJA');
    if (gastos.length === 0) L.push('  Sin gastos registrados');
    gastos.forEach((g) => L.push(fila(`  ${g.concepto}`, `-Bs ${fmt(g.monto)}`)));
    L.push(fila('TOTAL GASTOS', `-Bs ${fmt(total_gastos)}`));
    L.push(linea('='));

    L.push(fila('Monto inicial Bs:', fmt(turno.monto_inicial)));
    if (cerrado) {
      L.push(fila('Monto esperado Bs:', fmt(turno.monto_esperado)));
      L.push(fila('Monto contado Bs:', fmt(turno.monto_final)));
      L.push(fila('Diferencia Bs:', fmt(turno.diferencia)));
    }
    L.push(linea());
    L.push(centrar(nombreEmpresa));
    L.push('\n\n\n');
    return L.join('\n');
  };

  const row = { display: 'flex', justifyContent: 'space-between', marginBottom: '2px' };
  const sep = { borderTop: '1px dashed #000', margin: '4px 0' };
  const tituloSeccion = { fontWeight: 'bold', fontSize: '11px', marginBottom: '3px', marginTop: '2px' };

  return (
    <>
      <div className="no-print flex flex-wrap gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <button
          onClick={() => window.print()}
          className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors flex items-center gap-2"
        >
          🖨️ Imprimir USB (80mm)
        </button>
        <button
          onClick={() => imprimirConRawBT(construirTexto())}
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors flex items-center gap-2"
        >
          📶 Imprimir Bluetooth (RawBT)
        </button>
        <button
          onClick={() => navigate('/caja')}
          className="px-5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors"
        >
          ← Volver a Caja
        </button>
      </div>

      <div className="flex justify-center p-2 sm:p-6 bg-zinc-100 dark:bg-zinc-950 min-h-screen">
        <div
          id="ticket"
          style={{
            width: '80mm', maxWidth: '100%', fontFamily: "'Courier New', Courier, monospace",
            fontSize: '11px', lineHeight: '1.4', background: 'white', color: '#000', padding: '4mm',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            <img
              src={logoUrl}
              alt={`Logo ${nombreEmpresa}`}
              style={{ maxHeight: '120px', maxWidth: '100%', margin: '0 auto 4px', display: 'block', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{nombreEmpresa}</div>
            {turno.sucursal_nombre && <div>{turno.sucursal_nombre}</div>}
          </div>

          <div style={sep} />

          <div style={{ marginBottom: '4px' }}>
            <div style={{ ...row, fontWeight: 'bold' }}>
              <span>RESUMEN DE CIERRE</span>
              <span>#{turno.id_apertura.toString().padStart(5, '0')}</span>
            </div>
            <div style={row}><span>Caja:</span><span>{turno.caja_nombre}</span></div>
            <div style={row}><span>Cajero:</span><span>{turno.usuario_nombre} {turno.usuario_apellido}</span></div>
            <div style={row}><span>Apertura:</span><span>{fmtFecha(turno.fecha_apertura)}</span></div>
            <div style={row}><span>Cierre:</span><span>{cerrado ? fmtFecha(turno.fecha_cierre) : 'Turno abierto'}</span></div>
          </div>

          <div style={sep} />

          <div style={{ marginBottom: '4px' }}>
            <div style={tituloSeccion}>VENTAS POR MÉTODO</div>
            {ventas_por_metodo.length === 0 ? (
              <p className="text-zinc-500" style={{ fontStyle: 'italic' }}>Sin ventas en este turno</p>
            ) : ventas_por_metodo.map((v) => (
              <div key={v.metodo_pago} style={row}>
                <span>{METODO_LABEL[v.metodo_pago] || v.metodo_pago} ({v.cantidad})</span>
                <span>Bs {fmt(v.total)}</span>
              </div>
            ))}
            <div style={{ ...row, fontWeight: 'bold', marginTop: '2px' }}>
              <span>TOTAL VENTAS</span><span>Bs {fmt(total_ventas)}</span>
            </div>
          </div>

          <div style={sep} />

          <div style={{ marginBottom: '4px' }}>
            <div style={tituloSeccion}>PRODUCTOS VENDIDOS</div>
            {productos_vendidos.length === 0 ? (
              <p style={{ fontStyle: 'italic' }}>Sin productos vendidos en este turno</p>
            ) : productos_vendidos.map((p) => (
              <div key={p.producto_nombre} style={row}>
                <span style={{ maxWidth: '55mm', wordBreak: 'break-word' }}>{p.cantidad}x {p.producto_nombre}</span>
                <span style={{ whiteSpace: 'nowrap' }}>Bs {fmt(p.subtotal)}</span>
              </div>
            ))}
          </div>

          <div style={sep} />

          <div style={{ marginBottom: '4px' }}>
            <div style={tituloSeccion}>ABONOS A CRÉDITO (COBROS)</div>
            {abonos_detalle.length === 0 ? (
              <p style={{ fontStyle: 'italic' }}>Sin abonos en este turno</p>
            ) : abonos_detalle.map((a) => (
              <div key={a.id_pago} style={row}>
                <span>
                  {a.cliente_nombre ? `${a.cliente_nombre} ${a.cliente_apellido || ''}` : 'Consumidor Final'}
                  <span style={{ fontSize: '9px', color: '#666' }}> ({METODO_LABEL[a.metodo_pago] || a.metodo_pago})</span>
                </span>
                <span style={{ whiteSpace: 'nowrap' }}>Bs {fmt(a.monto)}</span>
              </div>
            ))}
            <div style={{ ...row, fontWeight: 'bold', marginTop: '2px' }}>
              <span>TOTAL ABONOS</span><span>Bs {fmt(total_abonos)}</span>
            </div>
          </div>

          <div style={sep} />

          <div style={{ marginBottom: '4px' }}>
            <div style={tituloSeccion}>VENTAS A CRÉDITO GENERADAS</div>
            {creditos_generados.length === 0 ? (
              <p style={{ fontStyle: 'italic' }}>Ninguna en este turno</p>
            ) : creditos_generados.map((c) => (
              <div key={c.id_venta} style={{ marginBottom: '2px' }}>
                <div style={row}>
                  <span>#{c.id_venta.toString().padStart(5, '0')} {c.cliente_nombre ? `${c.cliente_nombre} ${c.cliente_apellido || ''}` : 'Consumidor Final'}</span>
                </div>
                <div style={{ ...row, fontSize: '10px', color: '#444', paddingLeft: '4px' }}>
                  <span>Total Bs {fmt(c.total)}</span>
                  <span>Pendiente Bs {fmt(Math.max(0, c.saldo_pendiente))}</span>
                </div>
              </div>
            ))}
            <div style={{ ...row, fontWeight: 'bold', marginTop: '2px' }}>
              <span>TOTAL PENDIENTE (nuevo)</span><span>Bs {fmt(total_creditos_pendiente)}</span>
            </div>
          </div>

          <div style={sep} />

          <div style={{ marginBottom: '4px' }}>
            <div style={tituloSeccion}>GASTOS DE CAJA</div>
            {gastos.length === 0 ? (
              <p style={{ fontStyle: 'italic' }}>Sin gastos registrados</p>
            ) : gastos.map((g) => (
              <div key={g.id_gasto} style={row}>
                <span>{g.concepto}</span>
                <span>-Bs {fmt(g.monto)}</span>
              </div>
            ))}
            <div style={{ ...row, fontWeight: 'bold', marginTop: '2px' }}>
              <span>TOTAL GASTOS</span><span>-Bs {fmt(total_gastos)}</span>
            </div>
          </div>

          <div style={{ borderTop: '1.5px solid #000', margin: '4px 0' }} />

          <div style={{ marginBottom: '4px' }}>
            <div style={row}><span>Monto inicial:</span><span>Bs {fmt(turno.monto_inicial)}</span></div>
            {cerrado && (
              <>
                <div style={row}><span>Monto esperado:</span><span>Bs {fmt(turno.monto_esperado)}</span></div>
                <div style={{ ...row, fontWeight: 'bold', fontSize: '13px' }}>
                  <span>Monto contado:</span><span>Bs {fmt(turno.monto_final)}</span>
                </div>
                <div style={row}>
                  <span>Diferencia:</span>
                  <span style={{ color: parseFloat(turno.diferencia) < 0 ? '#c00' : '#000' }}>
                    {parseFloat(turno.diferencia) >= 0 ? '+' : ''}Bs {fmt(turno.diferencia)}
                  </span>
                </div>
              </>
            )}
          </div>

          {!cerrado && (
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px', border: '2px dashed #000', padding: '2mm', marginTop: '4px' }}>
              TURNO AÚN ABIERTO — vista previa
            </div>
          )}

          <div style={sep} />

          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '4px' }}>
            <div>{nombreEmpresa} · Sistema Agropecuario</div>
          </div>
        </div>
      </div>

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
