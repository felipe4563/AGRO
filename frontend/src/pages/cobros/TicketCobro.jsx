import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cobroService from '../../services/cobro.service';
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

export default function TicketCobro() {
  const { id }                  = useParams();
  const navigate                = useNavigate();
  const { nombreEmpresa, logoUrl } = useConfiguracion();
  const [pago, setPago]         = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cobroService
      .obtenerPago(id)
      .then((r) => setPago(r.data))
      .catch(() => navigate('/cobros'))
      .finally(() => setCargando(false));
  }, [id]); // eslint-disable-line

  if (cargando)
    return (
      <div className="flex items-center justify-center py-32 text-zinc-400">
        Cargando…
      </div>
    );
  if (!pago) return null;

  const clienteNombre = pago.cliente_nombre
    ? `${pago.cliente_nombre} ${pago.cliente_apellido || ''}`.trim()
    : 'Consumidor Final';

  const construirTextoComprobante = () => {
    const L = [];
    L.push(centrar(nombreEmpresa));
    if (pago.sucursal_nombre) L.push(centrar(pago.sucursal_nombre));
    if (pago.sucursal_direccion) {
      L.push(centrar(`${pago.sucursal_direccion}${pago.sucursal_ciudad ? ', ' + pago.sucursal_ciudad : ''}`));
    }
    if (pago.sucursal_telefono) L.push(centrar(`Tel: ${pago.sucursal_telefono}`));
    L.push(linea());
    L.push('COMPROBANTE DE ABONO');
    L.push(fila('Nro:', pago.id_pago.toString().padStart(6, '0')));
    L.push(fila('Fecha:', fmtFecha(pago.fecha_pago)));
    L.push(fila('Cajero:', `${pago.usuario_nombre} ${pago.usuario_apellido}`));
    L.push(fila('Venta:', `Nro ${pago.id_venta.toString().padStart(6, '0')}`));
    L.push(linea());
    L.push('CLIENTE');
    L.push(clienteNombre);
    if (pago.ci_nit) L.push(`CI/NIT: ${pago.ci_nit}`);
    L.push(linea('='));
    L.push(fila('Total venta Bs:', fmt(pago.venta_total)));
    L.push(fila('Saldo anterior Bs:', fmt(pago.saldo_anterior)));
    L.push(fila('ABONO PAGADO Bs:', fmt(pago.monto)));
    L.push(fila('Metodo:', pago.metodo_pago));
    if (pago.observaciones) L.push(fila('Obs.:', pago.observaciones));
    L.push(linea());
    L.push(fila('SALDO RESTANTE Bs:', fmt(Math.max(0, pago.saldo_restante))));
    if (pago.saldo_restante <= 0.01) {
      L.push(linea());
      L.push(centrar('*** DEUDA SALDADA ***'));
    }
    L.push(linea());
    L.push(centrar('Gracias por su pago!'));
    L.push(centrar(nombreEmpresa));
    L.push('\n\n\n');
    return L.join('\n');
  };

  const row = { display: 'flex', justifyContent: 'space-between', marginBottom: '2px' };
  const sep = { borderTop: '1px dashed #000', margin: '4px 0' };

  return (
    <>
      {/* ── Barra de botones (se oculta al imprimir) ── */}
      <div className="no-print flex flex-wrap gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <button
          onClick={() => window.print()}
          className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors flex items-center gap-2"
        >
          🖨️ Imprimir USB (80mm)
        </button>
        <button
          onClick={() => imprimirConRawBT(construirTextoComprobante())}
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors flex items-center gap-2"
        >
          📶 Imprimir Bluetooth (RawBT)
        </button>
        <button
          onClick={() => navigate('/cobros')}
          className="px-5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors"
        >
          ← Volver a Cobros
        </button>
      </div>

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
              style={{ maxHeight: '140px', maxWidth: '100%', margin: '0 auto 4px', display: 'block', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{nombreEmpresa}</div>
            {pago.sucursal_nombre && <div>{pago.sucursal_nombre}</div>}
            {pago.sucursal_direccion && (
              <div style={{ fontSize: '10px' }}>
                {pago.sucursal_direccion}{pago.sucursal_ciudad ? `, ${pago.sucursal_ciudad}` : ''}
              </div>
            )}
            {pago.sucursal_telefono && <div>Tel: {pago.sucursal_telefono}</div>}
          </div>

          <div style={sep} />

          <div style={{ marginBottom: '4px' }}>
            <div style={{ ...row, fontWeight: 'bold' }}>
              <span>COMPROBANTE DE ABONO</span>
              <span>Nº {pago.id_pago.toString().padStart(6, '0')}</span>
            </div>
            <div style={row}>
              <span>Fecha:</span>
              <span>{fmtFecha(pago.fecha_pago)}</span>
            </div>
            <div style={row}>
              <span>Cajero:</span>
              <span>{pago.usuario_nombre} {pago.usuario_apellido}</span>
            </div>
            <div style={row}>
              <span>Venta a crédito:</span>
              <span>Nº {pago.id_venta.toString().padStart(6, '0')}</span>
            </div>
          </div>

          <div style={sep} />

          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontWeight: 'bold' }}>CLIENTE</div>
            <div>{clienteNombre}</div>
            {pago.ci_nit && <div>CI/NIT: {pago.ci_nit}</div>}
          </div>

          <div style={{ borderTop: '1.5px solid #000', margin: '4px 0' }} />

          <div style={{ marginBottom: '4px' }}>
            <div style={row}>
              <span>Total de la venta:</span>
              <span>Bs {fmt(pago.venta_total)}</span>
            </div>
            <div style={row}>
              <span>Saldo anterior:</span>
              <span>Bs {fmt(pago.saldo_anterior)}</span>
            </div>
            <div style={{ ...row, fontWeight: 'bold', fontSize: '13px', marginTop: '2px' }}>
              <span>ABONO PAGADO:</span>
              <span>Bs {fmt(pago.monto)}</span>
            </div>
            <div style={row}>
              <span>Método:</span>
              <span>{pago.metodo_pago}</span>
            </div>
            {pago.observaciones && (
              <div style={row}>
                <span>Obs.:</span>
                <span>{pago.observaciones}</span>
              </div>
            )}
          </div>

          <div style={sep} />

          <div style={{ marginBottom: '4px' }}>
            <div style={{ ...row, fontWeight: 'bold' }}>
              <span>SALDO RESTANTE:</span>
              <span>Bs {fmt(Math.max(0, pago.saldo_restante))}</span>
            </div>
          </div>

          {pago.saldo_restante <= 0.01 && (
            <>
              <div style={sep} />
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.1em', border: '2px dashed #000', padding: '2mm', marginTop: '4px' }}>
                *** DEUDA SALDADA ***
              </div>
            </>
          )}

          <div style={sep} />

          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '4px' }}>
            <div>¡Gracias por su pago!</div>
            <div style={{ marginTop: '2px' }}>{nombreEmpresa} · Sistema Agropecuario</div>
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
