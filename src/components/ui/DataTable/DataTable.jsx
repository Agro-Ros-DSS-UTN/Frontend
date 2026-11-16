/**
 * DataTable — Componente de tabla reutilizable para todas las páginas.
 * Proporciona una interfaz tabular uniforme y configurable para listar entidades
 * (empresas, contactos, tareas, usuarios, etc.), soportando renderizado personalizado
 * de celdas, estilos por columna, selección de filas y visualización de estado vacío.
 *
 * Props:
 * @param {Object} props - Propiedades del componente.
 * @param {Array<{ key: string, label: string, render?: Function, width?: string, align?: string }>} [props.columns=[]] - Configuración de columnas.
 * @param {Array<Object>} [props.data=[]] - Colección de registros u objetos a mostrar en las filas.
 * @param {Function} [props.onRowClick] - Callback opcional disparado al hacer clic en una fila: `(row) => void`.
 * @param {string} [props.emptyMessage='No se encontraron registros.'] - Mensaje descriptivo para cuando la lista está vacía.
 * @param {string} [props.className=''] - Clases CSS complementarias para el contenedor de la tabla.
 */
export const DataTable = ({
  columns = [],
  data = [],
  onRowClick,
  emptyMessage = 'No se encontraron registros.',
  className = '',
}) => {
  return (
    // Contenedor general que gestiona el scroll horizontal responsivo y bordes
    <div className={`datatable-wrapper ${className}`}>
      <table className="datatable">
        {/* Cabecera de la tabla con las columnas configuradas */}
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
        {/* Cuerpo de la tabla: maneja la visualización de datos o el mensaje de tabla vacía */}
        <tbody>
          {data.length === 0 ? (
            /* Fila de estado vacío cuando no hay registros para mostrar */
            <tr>
              <td colSpan={columns.length} className="datatable-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            /* Renderizado dinámico de cada fila de datos */
            data.map((row, idx) => (
              <tr
                key={row.id || idx}
                onClick={() => onRowClick && onRowClick(row)}
                className={onRowClick ? 'datatable-row--clickable' : ''}
              >
                {/* Renderizado de celdas según la columna: usa render() si existe, o el valor de la propiedad */}
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
