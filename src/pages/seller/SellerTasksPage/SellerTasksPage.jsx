/**
 * @file SellerTasksPage.jsx
 * @description Página de visualización y control de tareas operativas para el rol de Vendedor.
 * Actúa como punto de entrada de la ruta `/seller/tasks`, utilizando el componente modular
 * `TasksBoard` configurado con la variante "seller", asegurando que el vendedor acceda
 * exclusivamente a sus tareas asignadas y pueda gestionar su estado de cumplimiento.
 */

import { TasksBoard } from '../../../components/tasks/TasksBoard';

/**
 * Componente principal de la página de tareas para vendedores.
 * Renderiza el tablero unificado `TasksBoard` con la propiedad `variant="seller"`,
 * restringiendo el alcance de visualización y modificación a las tareas del vendedor conectado.
 */
export const SellerTasksPage = () => <TasksBoard variant="seller" />;

export default SellerTasksPage;
