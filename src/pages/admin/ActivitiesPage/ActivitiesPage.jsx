/**
 * @file ActivitiesPage.jsx
 * @description Vista principal del módulo de Actividades para el rol Administrador.
 * Renderiza el tablero de control de actividades comerciales y operativas (`ActivitiesBoard`)
 * configurado con la variante de permisos de administración, lo que habilita la supervisión global,
 * asignación de tareas a cualquier colaborador y filtros avanzados para todo el equipo.
 */

// Tablero principal reutilizable que gestiona la visualización (kanban/lista) y CRUD de actividades
import { ActivitiesBoard } from '../../../components/activities/ActivitiesBoard';

/**
 * Componente de página que encapsula el tablero de actividades para administradores.
 *
 * @returns {JSX.Element} Tablero de actividades configurado con `variant="admin"`.
 */
export const ActivitiesPage = () => (
  /* Renderiza el tablero compartido especificando la variante con privilegios de administrador */
  <ActivitiesBoard variant="admin" />
);

export default ActivitiesPage;
