export default function TablaReporte({ columnas, datos, cargando }) {
  if (cargando) {
    return (
      <div className="flex justify-center items-center p-12 text-zinc-400">
        <svg className="animate-spin h-6 w-6 mr-2 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        Cargando datos...
      </div>
    );
  }

  if (!datos || datos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-400">
        <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        <p>No se encontraron registros para los filtros aplicados.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead>
          <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
            {columnas.map((col, idx) => (
              <th 
                key={idx} 
                className={`px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {datos.map((fila, filaIdx) => (
            <tr key={filaIdx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
              {columnas.map((col, colIdx) => (
                <td 
                  key={colIdx} 
                  className={`px-4 py-3 text-zinc-900 dark:text-zinc-100 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                >
                  {col.render ? col.render(fila[col.key], fila) : fila[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
