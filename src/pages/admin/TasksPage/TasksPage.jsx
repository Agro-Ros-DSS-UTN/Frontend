/**
 * @file TasksPage.jsx
 * @description Página de gestión y seguimiento de tareas para el rol de Administrador.
 * Actúa como contenedor/envoltorio de la ruta de administración, instanciando el
 * componente unificado `TasksBoard` configurado con la variante "admin", lo que habilita
 * la visualización global, asignación y administración de tareas de todos los vendedores.
 */

import { TasksBoard } from '../../../components/tasks/TasksBoard';

/**
 * Componente principal de la página de tareas de administración.
 * Renderiza el tablero integral de tareas (`TasksBoard`) pasando la propiedad
 * `variant="admin"` para activar las funcionalidades y permisos correspondientes al perfil administrativo.
 */
export const TasksPage = () => <TasksBoard variant="admin" />;

export default TasksPage;
