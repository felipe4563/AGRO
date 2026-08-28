import { useState, useEffect, useCallback } from 'react';
import PageWrapper   from '../../components/PageWrapper';
import backupService from '../../services/backup.service';

function KpiCard({ label, valor, sub, color = 'text-zinc-900 dark:text-white' }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{valor}</p>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

function formatFecha(fechaStr) {
  if (!fechaStr) return '—';
  return new Date(fechaStr).toLocaleString('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function Backups() {
  const [backups,      setBackups]      = useState([]);
  const [cargando,     setCargando]     = useState(false);
  const [generando,    setGenerando]    = useState(false);
  const [descargando,  setDescargando]  = useState(null);
  const [eliminando,   setEliminando]   = useState(null);
  const [error,        setError]        = useState('');
  const [exito,        setExito]        = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const res = await backupService.listar();
      setBackups(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar backups');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const mostrarExito = (msg) => {
    setExito(msg);
    setTimeout(() => setExito(''), 4000);
  };

  const handleGenerar = async () => {
    setGenerando(true);
    setError('');
    try {
      const res = await backupService.generar();
      mostrarExito(`Backup generado: ${res.data.filename} (${res.data.sizeFormato})`);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar el backup');
    } finally {
      setGenerando(false);
    }
  };

  const handleDescargar = async (filename) => {
    setDescargando(filename);
    try {
      const res = await backupService.descargar(filename);
      const url  = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href        = url;
      link.download    = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Error al descargar el backup');
    } finally {
      setDescargando(null);
    }
  };

  const handleEliminar = async (filename) => {
    if (!confirm(`¿Eliminar "${filename}"? Esta acción no se puede deshacer.`)) return;
    setEliminando(filename);
    try {
      await backupService.eliminar(filename);
      mostrarExito('Backup eliminado correctamente');
      setBackups(prev => prev.filter(b => b.nombre !== filename));
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar el backup');
    } finally {
      setEliminando(null);
    }
  };

  const ultimoBackup  = backups[0];
  const totalSize     = backups.reduce((acc, b) => acc + (b.size || 0), 0);
  const formatBytes   = (b) => {
    if (b < 1024)    return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(2)} MB`;
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2 tracking-tight">
            💾 Gestión de Backups
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Backup automático diario a las 02:00 AM · Se conservan los últimos 30 archivos
          </p>
        </div>
        <button
          onClick={handleGenerar}
          disabled={generando}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                     bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300
                     text-white shadow-sm transition-all"
        >
          {generando ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Generando...
            </>
          ) : (
            <> 💾 Generar Backup Ahora </>
          )}
        </button>
      </div>

      {/* Alertas */}
      {error  && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm font-medium">
          ⚠️ {error}
        </div>
      )}
      {exito  && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
          ✅ {exito}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Total backups"
          valor={backups.length}
          sub="Archivos .sql almacenados"
        />
        <KpiCard
          label="Último backup"
          valor={ultimoBackup ? formatFecha(ultimoBackup.fecha) : '—'}
          sub={ultimoBackup ? ultimoBackup.sizeFormato : 'Sin backups aún'}
          color={ultimoBackup ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'}
        />
        <KpiCard
          label="Espacio total usado"
          valor={formatBytes(totalSize)}
          sub="En directorio /backups"
        />
      </div>

      {/* Tabla de backups */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
            Historial de Backups
          </h2>
          <button
            onClick={cargar}
            disabled={cargando}
            className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-white flex items-center gap-1 transition-colors"
          >
            {cargando ? '⏳ Cargando...' : '🔄 Actualizar'}
          </button>
        </div>

        {cargando ? (
          <div className="p-12 text-center text-zinc-400">Cargando backups...</div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">💾</p>
            <p className="text-zinc-500 text-sm">No hay backups aún. Genera el primero con el botón de arriba.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/60">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">Archivo</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">Fecha</th>
                  <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500">Tamaño</th>
                  <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-zinc-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {backups.map((b, idx) => (
                  <tr key={b.nombre} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      {idx === 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                          ÚLTIMO
                        </span>
                      )}
                      {b.nombre}
                    </td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {formatFecha(b.fecha)}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                      {b.sizeFormato}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDescargar(b.nombre)}
                          disabled={descargando === b.nombre}
                          title="Descargar"
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg
                                     bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50
                                     text-blue-700 dark:text-blue-400 transition-colors
                                     disabled:opacity-50"
                        >
                          {descargando === b.nombre ? '⏳' : '⬇️'} Descargar
                        </button>
                        <button
                          onClick={() => handleEliminar(b.nombre)}
                          disabled={eliminando === b.nombre}
                          title="Eliminar"
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg
                                     bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50
                                     text-red-700 dark:text-red-400 transition-colors
                                     disabled:opacity-50"
                        >
                          {eliminando === b.nombre ? '⏳' : '🗑️'} Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info del scheduler */}
      <div className="mt-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap gap-4">
        <span>⏰ <strong>Backup automático:</strong> todos los días a las 02:00 AM (hora Bolivia)</span>
        <span>🗂️ <strong>Retención:</strong> últimos 30 backups (los más antiguos se eliminan automáticamente)</span>
        <span>📁 <strong>Ubicación:</strong> <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">backend/backups/</code></span>
      </div>
    </PageWrapper>
  );
}
