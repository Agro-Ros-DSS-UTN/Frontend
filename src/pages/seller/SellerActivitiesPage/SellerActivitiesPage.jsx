/**
 * @file SellerActivitiesPage.jsx
 * @description Página de registro y gestión de actividades comerciales para el rol de Vendedor.
 * Actúa como punto de entrada de la ruta `/seller/activities`, renderizando el componente
 * transversal `ActivitiesBoard` configurado con la variante "seller", limitando y adaptando
 * la interfaz para que el vendedor registre visitas, llamadas y tareas de su propia cartera.
 */

import { ActivitiesBoard } from '../../../components/activities/ActivitiesBoard';

/**
 * Componente principal de la página de actividades del vendedor.
 * Instancia el tablero de actividades (`ActivitiesBoard`) con la propiedad `variant="seller"`,
 * habilitando las operaciones específicas de campo y seguimiento comercial para el usuario actual.
 */
export const SellerActivitiesPage = () => <ActivitiesBoard variant="seller" />;

export default SellerActivitiesPage;
