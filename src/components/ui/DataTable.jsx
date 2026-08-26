/**
 * DataTable — Componente de tabla reutilizable para todas las paginas.
 * Recibe columnas, datos y customizaciones.
 *
 * Props:
 * - columns: [{ key, label, render?, width?, align? }]
 * - data: array de objetos
 * - onRowClick?: (row) => void
 * - emptyMessage?: string
 * - className?: string
 */
export const DataTable = ({
  columns = [],
  data = [],
  onRowClick,
  emptyMessage = 'No se encontraron registros.',
  className = '',
}) => {
  return (
    <div className={`datatable-wrapper ${className}`}>
      <table className="datatable">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width || 'auto', textAlign: col.align || 'left' }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="datatable-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={row.id || idx}
                onClick={() => onRowClick && onRowClick(row)}
                className={onRowClick ? 'datatable-row--clickable' : ''}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;